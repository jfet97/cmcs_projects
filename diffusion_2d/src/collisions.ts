import { Model, Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";

// a spatial grid is a map where the key is a string representation of the cell coordinates
export interface SpatialGrid {
  grid: Map<`${number},${number}`, BrownianParticleTurtle[]>;
  size: number;
}

/**
 * Creates a spatial grid mapping cell coordinates to arrays of turtles (particles).
 * Each turtle is assigned to a grid cell based on its position and the specified cell size.
 * This grid can be used to efficiently query nearby particles for collision detection or other spatial operations.
 *
 * @param turtles - The collection of BrownianParticleTurtle instances to be placed in the grid.
 * @param cellSize - The size of each grid cell, used to determine cell coordinates for each turtle.
 * @returns A SpatialGrid, which is a Map where keys are cell coordinates in the format "cellX,cellY" and values are arrays of turtles in those cells.
 */
export function createSpatialGrid(turtles: Turtles, cellSize: number): SpatialGrid {
  const grid: SpatialGrid["grid"] = new Map();

  turtles.ask((turtle: BrownianParticleTurtle) => {
    const cellX = Math.floor(turtle.x / cellSize);
    const cellY = Math.floor(turtle.y / cellSize);
    const key = `${cellX},${cellY}` as const;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(turtle);
  });

  return {
    grid,
    size: cellSize
  };
}

/**
 * Retrieves all BrownianParticleTurtle instances located in the 3x3 grid cells surrounding a given (x, y) position.
 *
 * @param x - The x-coordinate of the position to search around.
 * @param y - The y-coordinate of the position to search around.
 * @param grid - The spatial grid containing turtles, along with the cell size.
 * @returns An array of BrownianParticleTurtle objects found in the neighboring cells.
 */
function getNearbyTurtles(
  x: number,
  y: number,
  { grid, size }: SpatialGrid
): BrownianParticleTurtle[] {
  const nearbyTurtles: BrownianParticleTurtle[] = [];
  const mainCellX = Math.floor(x / size);
  const mainCellY = Math.floor(y / size);

  // iterate through the 3×3 grid cells surrounding the main cell
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const key = `${mainCellX + i},${mainCellY + j}` as const;
      if (grid.has(key)) {
        nearbyTurtles.push(...grid.get(key)!);
      }
    }
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
  world: Model["world"],
  { grid, size }: SpatialGrid
) {
  /**
   * Random walk step: θ ~ U[0, 2π]
   * Displacement: Δr = stepSize × (cos θ, sin θ)
   */
  const angle = Math.random() * 2 * Math.PI;
  const dx = turtle.stepSize * Math.cos(angle);
  const dy = turtle.stepSize * Math.sin(angle);

  let newX = turtle.x + dx;
  let newY = turtle.y + dy;

  // check for collisions with other turtles surrounding the new position
  const nearbyTurtles = getNearbyTurtles(newX, newY, { grid, size });

  for (const other of nearbyTurtles) {
    // ignore self-collision
    if (other === turtle) continue;

    // euclidean distance: d = √[(x₂-x₁)² + (y₂-y₁)²]
    const distance = Math.sqrt((other.x - newX) ** 2 + (other.y - newY) ** 2);
    const minDistance = turtle.size + other.size;

    // collision occurs when d < r₁ + r₂
    if (distance < minDistance) {
      /**
       * Simple bounce collision (not physically accurate elastic collision)
       * - Collision angle φ = atan2(Δy, Δx)
       * - Bounce direction: φ + π (180° reversal)
       * - No momentum/energy conservation (particles have no velocity memory)
       */
      const collisionAngle = Math.atan2(other.y - turtle.y, other.x - turtle.x);
      const bounceAngle = collisionAngle + Math.PI; // 180° reversal

      // move away from the collision instead of taking the original step
      newX = turtle.x + turtle.stepSize * Math.cos(bounceAngle);
      newY = turtle.y + turtle.stepSize * Math.sin(bounceAngle);

      // break;
    }
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

  // update the turtle's position
  turtle.setxy(newX, newY);
}
