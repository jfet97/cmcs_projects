import { Model3D, Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";

interface SpatialGridEntry {
  data: BrownianParticleTurtle[];
  links: number[];
}

// a spatial grid is a map where the key is a numeric hash of the cell coordinates
export interface SpatialGrid {
  grid: Map<number, SpatialGridEntry>;
  size: number;
}

// spatial hashing using large primes to minimize collisions
const P1 = 73856093;
const P2 = 19349663;
const P3 = 83492791;

function hash(x: number, y: number, z: number): number {
  return (Math.floor(x) * P1) ^ (Math.floor(y) * P2) ^ (Math.floor(z) * P3);
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
            if (dx === 0 && dy === 0 && dz === 0) continue; // skip the center cell
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

  // skip update if particle stays in the same cell
  if (oldKey === newKey) return;

  // remove particle from old grid cell
  const oldEntry = grid.get(oldKey);
  if (oldEntry) {
    const data = oldEntry.data;
    const index = data.indexOf(turtle);
    if (index !== -1) {
      // swap with last element and pop: O(1) instead of splice O(n)
      data[index] = data[data.length - 1];
      data.pop();
    }
  }

  // add particle to new grid cell
  if (!grid.has(newKey)) {
    const links: SpatialGridEntry["links"] = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue; // skip the center cell
          const key = hash(newCellX + dx, newCellY + dy, newCellZ + dz);
          links.push(key);
        }
      }
    }

    grid.set(newKey, { data: [turtle], links });
  } else {
    grid.get(newKey)!.data.push(turtle);
  }
}

// module-level bounce result to avoid allocating an object per collision
let bounceX = 0;
let bounceY = 0;
let bounceZ = 0;

/**
 * Computes the bounce position for a particle colliding with another.
 * Result is stored in module-level bounceX/bounceY/bounceZ variables to avoid allocation.
 * Returns true if a bounce was applied, false if particles are perfectly overlapped.
 */
function computeBounce(
  turtle: BrownianParticleTurtle,
  other: BrownianParticleTurtle,
  distSq: number
): boolean {
  // particles are perfectly overlapped; allow original random move to separate them
  if (distSq === 0) return false;

  // sqrt only computed on actual collisions (rare), not on every distance check
  const distance = Math.sqrt(distSq);
  const invDist = 1 / distance;

  // move particle away from the collision along the unit bounce direction:
  // bounce = position + stepSize × (position - other) / |position - other|
  bounceX = turtle.x + turtle.stepSize * (turtle.x - other.x) * invDist;
  bounceY = turtle.y + turtle.stepSize * (turtle.y - other.y) * invDist;
  bounceZ = turtle.z + turtle.stepSize * (turtle.z - other.z) * invDist;

  return true;
}

/**
 * Checks for a collision between turtle and a cell's particles.
 * Returns true on first collision found (and sets bounceX/Y/Z).
 */
function checkCellCollisions(
  turtle: BrownianParticleTurtle,
  data: BrownianParticleTurtle[],
  newX: number,
  newY: number,
  newZ: number,
  minDistSq: number
): boolean {
  for (let i = 0; i < data.length; i++) {
    const other = data[i];
    if (other === turtle) continue;

    // squared euclidean distance: avoids sqrt for non-colliding pairs
    const distSq = (other.x - newX) ** 2 + (other.y - newY) ** 2 + (other.z - newZ) ** 2;

    // collision occurs when d² < (r₁ + r₂)²
    if (distSq < minDistSq) {
      computeBounce(turtle, other, distSq);
      return true;
    }
  }

  return false;
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
  /**
   * Random walk step in 3D using spherical coordinates
   * θ ∈ [0, π] (polar angle), φ ∈ [0, 2π] (azimuthal angle)
   * Displacement: Δr = stepSize × (sin θ cos φ, sin θ sin φ, cos θ)
   */
  const theta = Math.acos(1 - 2 * Math.random()); // polar angle [0, π] with uniform distribution
  const phi = Math.random() * 2 * Math.PI; // azimuthal angle [0, 2π]

  const dx = turtle.stepSize * Math.sin(theta) * Math.cos(phi);
  const dy = turtle.stepSize * Math.sin(theta) * Math.sin(phi);
  const dz = turtle.stepSize * Math.cos(theta);

  const oldX = turtle.x;
  const oldY = turtle.y;
  const oldZ = turtle.z;

  let newX = turtle.x + dx;
  let newY = turtle.y + dy;
  let newZ = turtle.z + dz;

  /**
   * Inline collision detection: iterates directly over grid cells instead of
   * collecting nearby particles into an intermediate array. This avoids
   * allocating a new array per particle per step (200k allocations/step at scale).
   * Early exit on first collision via checkCellCollisions + break.
   */
  const mainKey = hash(Math.floor(newX / size), Math.floor(newY / size), Math.floor(newZ / size));
  const mainEntry = grid.get(mainKey);

  // all particles have the same size, so minDistance² is constant
  const minDistSq = (turtle.size + turtle.size) ** 2;

  let collided = false;

  if (mainEntry) {
    // check particles in the same cell first (most likely collision candidates)
    collided = checkCellCollisions(turtle, mainEntry.data, newX, newY, newZ, minDistSq);

    // check the 26 neighboring cells only if no collision found yet
    if (!collided) {
      for (let l = 0; l < mainEntry.links.length; l++) {
        const linkedEntry = grid.get(mainEntry.links[l]);
        if (!linkedEntry) continue;

        collided = checkCellCollisions(turtle, linkedEntry.data, newX, newY, newZ, minDistSq);
        if (collided) break;
      }
    }
  }

  // apply bounce result from module-level variables (set by computeBounce)
  if (collided) {
    newX = bounceX;
    newY = bounceY;
    newZ = bounceZ;
  }

  /**
   * Reflective boundary conditions at domain edges
   * When particle crosses boundary at x_max: x_new = x_max - (x - x_max)
   * This preserves distance from boundary (mirror reflection)
   */
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

  // update the turtle's position and spatial grid
  turtle.setxyz(newX, newY, newZ);
  updateParticleInGrid(turtle, oldX, oldY, oldZ, newX, newY, newZ, { grid, size });
}
