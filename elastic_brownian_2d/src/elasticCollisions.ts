import { Model, Turtles } from "agentscript";
import { ElasticParticle, CONFIG, maxwellBoltzmannVelocity2D } from "./particleTypes";

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

export function performElasticCollision(
  particle1: ElasticParticle,
  particle2: ElasticParticle,
  currentTick: number
): boolean {
  const dx = particle2.x - particle1.x;
  const dy = particle2.y - particle1.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = particle1.size + particle2.size;

  // Only collide if particles are ACTUALLY touching or overlapping
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

  // Calculate collision normal (unit vector from particle1 to particle2)
  const nx = dx / distance;
  const ny = dy / distance;

  // Relative velocity components
  const relativeVx = particle2.vx - particle1.vx;
  const relativeVy = particle2.vy - particle1.vy;

  // Relative velocity along collision normal
  const relativeVelNormal = relativeVx * nx + relativeVy * ny;

  // Skip if particles are separating (no collision needed)
  if (relativeVelNormal > 0) return false;

  // CORRECT ELASTIC COLLISION PHYSICS FOR 2D HARD SPHERES
  // Standard formula: exchange velocity components along collision normal
  // v1_new = v1 - (2*m2/(m1+m2)) * (v1-v2)·n̂ * n̂
  // v2_new = v2 - (2*m1/(m1+m2)) * (v2-v1)·n̂ * n̂

  const m1 = particle1.mass;
  const m2 = particle2.mass;
  const totalMass = m1 + m2;

  // Velocity components along normal for each particle
  const v1_normal = particle1.vx * nx + particle1.vy * ny;
  const v2_normal = particle2.vx * nx + particle2.vy * ny;

  // New normal velocities after elastic collision
  const v1_normal_new = ((m1 - m2) * v1_normal + 2 * m2 * v2_normal) / totalMass;
  const v2_normal_new = ((m2 - m1) * v2_normal + 2 * m1 * v1_normal) / totalMass;

  // Change in normal velocity
  const dv1_normal = v1_normal_new - v1_normal;
  const dv2_normal = v2_normal_new - v2_normal;

  // Apply velocity changes (only along normal direction)
  particle1.vx += dv1_normal * nx;
  particle1.vy += dv1_normal * ny;
  particle2.vx += dv2_normal * nx;
  particle2.vy += dv2_normal * ny;

  // Prevent large particle from accumulating infinite velocity
  // Apply gentle velocity damping to large particle only
  if (particle1.isLarge) {
    const speed1 = Math.sqrt(particle1.vx * particle1.vx + particle1.vy * particle1.vy);
    const maxReasonableSpeed =
      Math.sqrt((2 * CONFIG.SMALL_PARTICLES.temperature) / CONFIG.LARGE_PARTICLE.mass) * 3;
    if (speed1 > maxReasonableSpeed) {
      const scale = maxReasonableSpeed / speed1;
      particle1.vx *= scale;
      particle1.vy *= scale;
    }
  }
  if (particle2.isLarge) {
    const speed2 = Math.sqrt(particle2.vx * particle2.vx + particle2.vy * particle2.vy);
    const maxReasonableSpeed =
      Math.sqrt((2 * CONFIG.SMALL_PARTICLES.temperature) / CONFIG.LARGE_PARTICLE.mass) * 3;
    if (speed2 > maxReasonableSpeed) {
      const scale = maxReasonableSpeed / speed2;
      particle2.vx *= scale;
      particle2.vy *= scale;
    }
  }

  // Separate overlapping particles AFTER velocity calculation
  // This maintains the collision physics while preventing interpenetration
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
  // PERFECT ELASTIC BOUNDARY REFLECTION - no randomness
  // Conserves energy exactly

  if (pos > max) {
    // Perfect elastic reflection: reverse velocity component
    return { pos: max - (pos - max), vel: -Math.abs(vel) };
  } else if (pos < min) {
    // Perfect elastic reflection: reverse velocity component
    return { pos: min + (min - pos), vel: Math.abs(vel) };
  }
  return { pos, vel };
}

export function moveParticle(particle: ElasticParticle, world: Model["world"]) {
  // For small particles: maintain thermal equilibrium with frequent velocity redistribution
  // This prevents them from becoming "projectiles" and maintains proper temperature
  if (!particle.isLarge) {
    // More frequent re-thermalization to maintain realistic thermal motion
    // This simulates the effect of collisions with other small particles (thermal reservoir)
    if (Math.random() < 0.08) {
      // 8% chance per tick for re-thermalization - more balanced
      const thermalVelocity = maxwellBoltzmannVelocity2D(
        CONFIG.SMALL_PARTICLES.temperature,
        CONFIG.SMALL_PARTICLES.mass
      );
      // Mix current velocity with thermal velocity for smoother transition
      const mixingFactor = 0.2; // Reduced mixing for gentler effect
      particle.vx = particle.vx * (1 - mixingFactor) + thermalVelocity.vx * mixingFactor;
      particle.vy = particle.vy * (1 - mixingFactor) + thermalVelocity.vy * mixingFactor;
    }

    // Also add small thermal fluctuations every tick
    const thermalNoise = 0.02 * Math.sqrt(CONFIG.SMALL_PARTICLES.temperature); // Reduced from 0.05
    particle.vx += (Math.random() - 0.5) * thermalNoise;
    particle.vy += (Math.random() - 0.5) * thermalNoise;
  }

  // Move particle according to current velocity (Newton's 1st law)
  const newX = particle.x + particle.vx;
  const newY = particle.y + particle.vy;

  // Handle boundary collisions with perfect elastic reflection
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

  if (!largeParticle) return 0;

  // check collisions of large particle with small particles

  const smallParticles = getAllSmallParticles(turtles);
  for (const smallParticle of smallParticles) {
    if (performElasticCollision(smallParticle, largeParticle, currentTick)) {
      collisionCount++;
    }
  }

  return collisionCount;
}
