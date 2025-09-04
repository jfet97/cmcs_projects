import { Model, Turtles } from "agentscript";
import { ElasticParticle } from "./particleTypes";
import { CONFIG } from "./config";

class SpatialHash {
  private grid: Map<string, ElasticParticle[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear() {
    this.grid.clear();
  }

  hash(x: number, y: number): string {
    const gridX = Math.floor(x / this.cellSize);
    const gridY = Math.floor(y / this.cellSize);
    return `${gridX},${gridY}`;
  }

  insert(particle: ElasticParticle) {
    const key = this.hash(particle.x, particle.y);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(particle);
  }

  getNearby(particle: ElasticParticle): ElasticParticle[] {
    const nearby: ElasticParticle[] = [];
    const gridX = Math.floor(particle.x / this.cellSize);
    const gridY = Math.floor(particle.y / this.cellSize);

    // check 3x3 neighborhood around particle
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const particles = this.grid.get(key);
        if (particles) {
          nearby.push(...particles);
        }
      }
    }

    return nearby;
  }

  getNearbyLarge(particle: ElasticParticle): ElasticParticle[] {
    const nearby: ElasticParticle[] = [];
    const gridX = Math.floor(particle.x / this.cellSize);
    const gridY = Math.floor(particle.y / this.cellSize);

    // check 9x9 neighborhood for large particle (radius 8 + 1.5 = 9.5, cell size 3, need 4 cells radius)
    for (let dx = -4; dx <= 4; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const particles = this.grid.get(key);
        if (particles) {
          nearby.push(...particles);
        }
      }
    }

    return nearby;
  }
}

function getAllSmallParticles(turtles: Turtles): ElasticParticle[] {
  const smallParticles: ElasticParticle[] = [];
  turtles.ask((turtle: ElasticParticle) => {
    if (!turtle.isLarge) {
      smallParticles.push(turtle);
    }
  });
  return smallParticles;
}

function getLargeParticle(turtles: Turtles): ElasticParticle | undefined {
  let largeParticle: ElasticParticle | undefined;
  turtles.ask((turtle: ElasticParticle) => {
    if (turtle.isLarge) {
      largeParticle = turtle;
    }
  });
  return largeParticle;
}

/**
 * Performs a perfectly elastic collision between two particles using 2D hard sphere physics.
 *
 * This function implements the complete elastic collision pipeline:
 * 1. Distance and overlap detection
 * 2. Collision throttling to prevent rapid repeated collisions
 * 3. Relative velocity analysis to skip separating particles
 * 4. Conservation of momentum and energy calculations
 * 5. Particle separation to prevent overlapping
 *
 * Physics Implementation:
 * - Uses reduced mass formula for correct momentum transfer
 * - Applies impulse along collision normal only (tangential velocities unchanged)
 * - Perfectly elastic: kinetic energy is conserved
 * - Handles particles of different masses correctly
 *
 * @param particle1 First particle in the collision
 * @param particle2 Second particle in the collision
 * @param currentTick Current simulation tick for collision throttling
 * @returns true if collision occurred and was processed, false if collision was skipped
 *
 *
 * Collision Conditions:
 * - Particles must be overlapping: distance < (radius1 + radius2)
 * - Collision throttling: minimum interval since last collision
 * - Velocity check: particles must be approaching (not separating)
 *
 * Physics Formula:
 * v1_new = ((m1-m2)*v1 + 2*m2*v2) / (m1+m2)  [along collision normal]
 * v2_new = ((m2-m1)*v2 + 2*m1*v1) / (m1+m2)  [along collision normal]
 */
export function performElasticCollision(
  particle1: ElasticParticle,
  particle2: ElasticParticle,
  currentTick: number
): boolean {
  const dx = particle2.x - particle1.x;
  const dy = particle2.y - particle1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = particle1.size + particle2.size;

  // only collide if particles are ACTUALLY touching or overlapping
  if (distance >= minDistance) {
    return false;
  }

  // prevent rapid repeated collisions
  if (
    Math.abs(currentTick - particle1.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval ||
    Math.abs(currentTick - particle2.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval
  ) {
    return false;
  }

  // calculate collision normal (unit vector from particle1 to particle2)
  const nx = dx / distance;
  const ny = dy / distance;

  // relative velocity components
  const relativeVx = particle2.vx - particle1.vx;
  const relativeVy = particle2.vy - particle1.vy;

  // relative velocity along collision normal
  const relativeVelNormal = relativeVx * nx + relativeVy * ny;

  // skip if particles are separating (no collision needed)
  if (relativeVelNormal > 0) return false;

  const m1 = particle1.mass;
  const m2 = particle2.mass;
  const totalMass = m1 + m2;

  // velocity components along normal for each particle
  const v1_normal = particle1.vx * nx + particle1.vy * ny;
  const v2_normal = particle2.vx * nx + particle2.vy * ny;

  // new normal velocities after elastic collision
  const v1_normal_new = ((m1 - m2) * v1_normal + 2 * m2 * v2_normal) / totalMass;
  const v2_normal_new = ((m2 - m1) * v2_normal + 2 * m1 * v1_normal) / totalMass;

  // change in normal velocity
  const dv1_normal = v1_normal_new - v1_normal;
  const dv2_normal = v2_normal_new - v2_normal;

  // apply velocity changes
  particle1.vx += dv1_normal * nx;
  particle1.vy += dv1_normal * ny;
  particle2.vx += dv2_normal * nx;
  particle2.vy += dv2_normal * ny;

  // separate overlapping particles AFTER velocity calculation
  const overlap = minDistance - distance;
  if (overlap > 0) {
    const totalSeparation = overlap + CONFIG.PHYSICS.collisionBuffer;
    const separationX = (dx / distance) * (totalSeparation * 0.5);
    const separationY = (dy / distance) * (totalSeparation * 0.5);

    particle1.setxy(particle1.x - separationX, particle1.y - separationY);
    particle2.setxy(particle2.x + separationX, particle2.y + separationY);
  }

  // update collision tracking
  particle1.lastCollisionTick = currentTick;
  particle2.lastCollisionTick = currentTick;

  return true;
}

function handleBoundary(
  pos: number,
  vel: number,
  min: number,
  max: number
): { pos: number; vel: number } {
  // perfect elastic boundary reflection - no randomness
  // conserves energy exactly

  if (pos > max) {
    // perfect elastic reflection: reverse velocity component
    return { pos: max - (pos - max), vel: -Math.abs(vel) };
  } else if (pos < min) {
    // perfect elastic reflection: reverse velocity component
    return { pos: min + (min - pos), vel: Math.abs(vel) };
  }
  return { pos, vel };
}

export function moveParticle(particle: ElasticParticle, world: Model["world"]) {
  // pure deterministic motion - no artificial thermalization
  // "real" thermal motion emerges from inter-particle collisions only

  // move particle according to current velocity (Newton's 1st law)
  const newX = particle.x + particle.vx;
  const newY = particle.y + particle.vy;

  // handle boundary collisions with perfect elastic reflection
  const radius = particle.size;
  const xResult = handleBoundary(newX, particle.vx, world.minX + radius, world.maxX - radius);
  const yResult = handleBoundary(newY, particle.vy, world.minY + radius, world.maxY - radius);

  particle.vx = xResult.vel;
  particle.vy = yResult.vel;
  particle.setxy(xResult.pos, yResult.pos);
}

export function handleAllCollisions(turtles: Turtles, currentTick: number): number {
  let collisionCount = 0;
  const largeParticle = getLargeParticle(turtles);
  const smallParticles = getAllSmallParticles(turtles);

  if (!largeParticle) return 0;

  // spatial hash with cell size = small particle radius * 2
  const spatialHash = new SpatialHash(CONFIG.SMALL_PARTICLES.radius * 2);

  // insert all particles into spatial hash
  spatialHash.insert(largeParticle);
  for (const particle of smallParticles) {
    spatialHash.insert(particle);
  }

  // 1. handle collisions between large particle and small particles using spatial hash
  const nearbyLarge = spatialHash.getNearbyLarge(largeParticle);
  for (const particle of nearbyLarge) {
    if (!particle.isLarge && particle !== largeParticle) {
      if (performElasticCollision(particle, largeParticle, currentTick)) {
        collisionCount++;
      }
    }
  }

  // 2. handle collisions between small particles using spatial hash
  const checkedPairs = new Set<string>();
  for (const particle of smallParticles) {
    const nearby = spatialHash.getNearby(particle);
    for (const other of nearby) {
      if (other !== particle && !other.isLarge) {
        // avoid duplicate checks using consistent key generation
        const key1 = spatialHash.hash(particle.x, particle.y);
        const key2 = spatialHash.hash(other.x, other.y);
        const pairKey = key1 < key2 ? `${key1}|${key2}` : `${key2}|${key1}`;

        if (!checkedPairs.has(pairKey)) {
          checkedPairs.add(pairKey);
          performElasticCollision(particle, other, currentTick);
        }
      }
    }
  }

  return collisionCount;
}
