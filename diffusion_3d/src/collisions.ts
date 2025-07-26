import { Model3D, Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";

interface SpatialGridEntry {
  data: BrownianParticleTurtle[];
  links: `${number},${number},${number}`[];
}

// a spacial grid is a map where the key is a string representation of the cell coordinates
export interface SpatialGrid {
  grid: Map<`${number},${number},${number}`, SpatialGridEntry>;
  size: number;
}

function hash(x: number, y: number, z: number): `${number},${number},${number}` {
  return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}` as const;
}

/**
 * Creates a spatial grid mapping cell coordinates to arrays of turtles (particles).
 * Each turtle is assigned to a grid cell based on its position and the specified cell size.
 * This grid can be used to efficiently query nearby particles for collision detection or other spatial operations.
 *
 * @param turtles - The collection of BrownianParticleTurtle instances to be placed in the grid.
 * @param cellSize - The size of each grid cell, used to determine cell coordinates for each turtle.
 * @returns A SpatialGrid, which is a Map where keys are cell coordinates in the format "cellX,cellY,cellZ" and values are arrays of turtles in those cells.
 */
export function createSpatialGrid(turtles: Turtles, cellSize: number): SpatialGrid {
  const grid: SpatialGrid["grid"] = new Map();

  turtles.ask((turtle: BrownianParticleTurtle) => {
    const cellX = Math.floor(turtle.x / cellSize);
    const cellY = Math.floor(turtle.y / cellSize);
    const cellZ = Math.floor(turtle.z / cellSize);
    const key = hash(cellX, cellY, cellZ);

    if (!grid.has(key)) {
      const links: SpatialGridEntry["links"] = [];
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue; // skip the current cell
            const key = hash(cellX + dx, cellY + dy, cellZ + dz);
            links.push(key);
          }
        }
      }

      grid.set(key, { data: [turtle], links });
    } else {
      const entry = grid.get(key)!;
      entry.data.push(turtle);
    }
  });

  return {
    grid,
    size: cellSize
  };
}

/**
 * Updates the position of a turtle in the spatial grid.
 * This function removes the turtle from its old cell and adds it to the new cell based on its updated position.
 *
 * @param turtle - The BrownianParticleTurtle whose position is being updated.
 * @param grid - The spatial grid where turtles are stored, represented as a Map.
 * @param size - The size of each cell in the grid.
 * @param oldX - The previous x-coordinate of the turtle.
 * @param oldY - The previous y-coordinate of the turtle.
 * @param oldZ - The previous z-coordinate of the turtle.
 * @param newX - The new x-coordinate of the turtle after movement.
 * @param newY - The new y-coordinate of the turtle after movement.
 * @param newZ - The new z-coordinate of the turtle after movement.
 */
function updateParticleInGrid(
  turtle: BrownianParticleTurtle,
  oldX: number,
  oldY: number,
  oldZ: number,
  newX: number,
  newY: number,
  newZ: number,
  { grid, size }: SpatialGrid
) {
  const oldCellX = Math.floor(oldX / size);
  const oldCellY = Math.floor(oldY / size);
  const oldCellZ = Math.floor(oldZ / size);

  const newCellX = Math.floor(newX / size);
  const newCellY = Math.floor(newY / size);
  const newCellZ = Math.floor(newZ / size);

  const oldKey = hash(oldCellX, oldCellY, oldCellZ);
  const newKey = hash(newCellX, newCellY, newCellZ);

  // remove from old cell
  if (grid.has(oldKey)) {
    const turtlesInOldCell = grid.get(oldKey)!;
    const index = turtlesInOldCell.data.indexOf(turtle);
    if (index !== -1) {
      turtlesInOldCell.data.splice(index, 1);
    }
  }

  // add to new cell
  if (!grid.has(newKey)) {
    const links: SpatialGridEntry["links"] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue; // skip the current cell
          const key = hash(newX + dx, newY + dy, newZ + dz);
          links.push(key);
        }
      }
    }

    grid.set(newKey, { data: [turtle], links });
  } else {
    grid.get(newKey)!.data.push(turtle);
  }
}

/**
 * Retrieves all BrownianParticleTurtle instances located in the 3x3x3 grid cells surrounding a given (x, y, z) position.
 *
 * @param x - The x-coordinate of the position to search around.
 * @param y - The y-coordinate of the position to search around.
 * @param z - The z-coordinate of the position to search around.
 * @param grid - The spatial grid containing turtles, along with the cell size.
 * @returns An array of BrownianParticleTurtle objects found in the neighboring cells.
 */
function getNearbyTurtles(
  x: number,
  y: number,
  z: number,
  { grid, size }: SpatialGrid
): BrownianParticleTurtle[] {
  const nearbyTurtles: BrownianParticleTurtle[] = [];
  const mainCellX = Math.floor(x / size);
  const mainCellY = Math.floor(y / size);
  const mainCellZ = Math.floor(z / size);

  const key = hash(mainCellX, mainCellY, mainCellZ);

  // iterate through the 3x3x3 grid cells surrounding the main cell
  for (const link of grid.get(key)?.links ?? []) {
    nearbyTurtles.push(...(grid.get(link)?.data ?? []));
  }

  return nearbyTurtles;
}

/**
 * Moves a Brownian particle (turtle) within the simulation world, handling boundary conditions
 * and optimized collision detection using a spatial grid. The particle's movement is randomized,
 * and collisions with nearby particles are detected and resolved by simulating a simple bounce.
 *
 * @param turtle - The Brownian particle to move.
 * @param world - The simulation world boundaries.
 * @param grid - The spatial grid used for efficient collision detection.
 * @param size - The size of each cell in the spatial grid.
 *
 * @remarks
 * - Boundary conditions are handled by reflecting the particle off the world edges.
 * - Collisions are detected with nearby particles using the spatial grid for performance.
 * - When a collision is detected, the particle is moved away from the colliding particle,
 *   simulating a simple bounce (not a physically accurate elastic collision).
 *
 * **Differences from perfect elastic collision:**
 * 1. **Momentum conservation**: Always bounces in opposite direction regardless of particle velocities
 * 2. **Energy conservation**: Maintains constant stepSize instead of realistic energy transfer
 * 3. **Bidirectional interaction**: Only the moving particle is affected, the collided particle stays stationary
 * 4. **Realistic bounce angles**: Uses 180° bounce instead of physics-based reflection angles
 *
 * **Why this approach is suitable for Brownian motion:**
 * - Maintains the random character of Brownian movement
 * - Prevents particle clustering and overlap
 * - Computationally efficient for large particle systems
 * - Visually convincing for the simulation purpose
 * - In real Brownian motion, collisions are primarily with fluid molecules (not visible particles)
 * - The macroscopic effect is well-represented without microscopic physics complexity
 */
export function moveParticleWithOptimizedCollisions(
  turtle: BrownianParticleTurtle,
  world: Model3D["world"],
  { grid, size }: SpatialGrid
) {
  // casual movement
  const theta = Math.acos(1 - 2 * Math.random()); // angolo polare [0, pi]
  const phi = Math.random() * 2 * Math.PI; // angolo azimutale [0, 2pi]

  const dx = turtle.stepSize * Math.sin(theta) * Math.cos(phi);
  const dy = turtle.stepSize * Math.sin(theta) * Math.sin(phi);
  const dz = turtle.stepSize * Math.cos(theta);

  const oldX = turtle.x;
  const oldY = turtle.y;
  const oldZ = turtle.z;

  let newX = turtle.x + dx;
  let newY = turtle.y + dy;
  let newZ = turtle.z + dz;

  // check for collisions with other turtles surrounding the new position
  const nearbyTurtles = getNearbyTurtles(newX, newY, newZ, { grid, size });

  for (const other of nearbyTurtles) {
    // ignore self-collision
    if (other === turtle) continue;

    const distance = Math.sqrt(
      (other.x - newX) ** 2 + (other.y - newY) ** 2 + (other.z - newZ) ** 2
    );
    const minDistance = turtle.size + other.size;

    // check for actual collision
    if (distance < minDistance) {
      // collision detected: simulate bounce
      // this is a simple bounce, not a perfect elastic collision which would conserve momentum
      // but it is visually effective and performant

      // in 3D, instead of angles, we use a normalized direction vector (a "unit vector")
      // the bounce vector points from the 'other' turtle to this 'turtle'
      const bounceVectorX = turtle.x - other.x;
      const bounceVectorY = turtle.y - other.y;
      const bounceVectorZ = turtle.z - other.z;

      // 1. check for distance > 0 to avoid a division by zero error if particles are perfectly overlapped
      // 2. normalize the vector by dividing by the current distance
      if (distance > 0) {
        const unitBounceX = bounceVectorX / distance;
        const unitBounceY = bounceVectorY / distance;
        const unitBounceZ = bounceVectorZ / distance;

        // move away from the collision instead of taking the original step
        // we move by 'stepSize' along the calculated bounce direction.
        newX = turtle.x + turtle.stepSize * unitBounceX;
        newY = turtle.y + turtle.stepSize * unitBounceY;
        newZ = turtle.z + turtle.stepSize * unitBounceZ;
      } else {
        // let the original random move happen, which will separate the two turtles
      }

      // early exit the loop after handling the first collision
      // break;
    }
  }

  // handle boundary conditions
  if (newX > world.maxX) {
    newX = world.maxX - (newX - world.maxX);
  } else if (newX < world.minX) {
    newX = world.minX + (world.minX - newX);
  }

  if (newY > world.maxY) {
    newY = world.maxY - (newY - world.maxY);
  } else if (newY < world.minY) {
    newY = world.minY + (world.minY - newY);
  }

  if (newZ > world.maxZ) {
    newZ = world.maxZ - (newZ - world.maxZ);
  } else if (newZ < world.minZ) {
    newZ = world.minZ + (world.minZ - newZ);
  }

  // update the turtle's position
  turtle.setxyz(newX, newY, newZ);
  updateParticleInGrid(turtle, oldX, oldY, oldZ, newX, newY, newZ, { grid, size });
}
