import { Model, Turtles } from "agentscript";
import { ElasticParticle, CONFIG } from "./particleTypes";

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

  // Apply velocity changes (pure physics - no artificial noise!)
  particle1.vx += dv1_normal * nx;
  particle1.vy += dv1_normal * ny;
  particle2.vx += dv2_normal * nx;
  particle2.vy += dv2_normal * ny;

  // Separate overlapping particles AFTER velocity calculation
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
  // Pure deterministic motion - no artificial thermalization
  // Real thermal motion emerges from inter-particle collisions only

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
  const smallParticles = getAllSmallParticles(turtles);

  if (!largeParticle) return 0;

  // 1. Handle collisions between large particle and small particles
  for (const smallParticle of smallParticles) {
    if (performElasticCollision(smallParticle, largeParticle, currentTick)) {
      collisionCount++;
    }
  }

  // 2. Handle collisions between small particles (thermal interactions)
  // This is crucial for realistic thermal motion!
  for (let i = 0; i < smallParticles.length; i++) {
    for (let j = i + 1; j < smallParticles.length; j++) {
      performElasticCollision(smallParticles[i], smallParticles[j], currentTick);
    }
  }

  return collisionCount;
}
