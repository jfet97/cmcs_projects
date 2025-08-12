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

  // Calculate collision normal (from particle1 to particle2)
  const nx = dx / distance;
  const ny = dy / distance;

  // Relative velocity along collision normal
  const relativeVelocityX = particle2.vx - particle1.vx;
  const relativeVelocityY = particle2.vy - particle1.vy;
  const relativeSpeed = relativeVelocityX * nx + relativeVelocityY * ny;

  // Skip if particles are separating
  if (relativeSpeed > 0) return false;

  // Simple elastic collision formula
  const totalMass = particle1.mass + particle2.mass;
  const impulse = (2 * particle1.mass * particle2.mass * Math.abs(relativeSpeed)) / totalMass;

  // Apply impulse: particle1 gets pushed back, particle2 gets pushed forward
  particle1.vx -= (impulse / particle1.mass) * nx;
  particle1.vy -= (impulse / particle1.mass) * ny;
  particle2.vx += (impulse / particle2.mass) * nx;
  particle2.vy += (impulse / particle2.mass) * ny;
  
  // add small random scattering to collision outcomes to break deterministic physics
  // this helps decorrelate velocities in brownian motion
  if (particle1.isLarge || particle2.isLarge) {
    const scatterAngle = (Math.random() - 0.5) * 0.2; // ±0.1 radian scatter (~±6 degrees)
    const cos = Math.cos(scatterAngle);
    const sin = Math.sin(scatterAngle);
    
    if (particle1.isLarge) {
      const vx1 = particle1.vx;
      const vy1 = particle1.vy;
      particle1.vx = vx1 * cos - vy1 * sin;
      particle1.vy = vx1 * sin + vy1 * cos;
    }
    
    if (particle2.isLarge) {
      const vx2 = particle2.vx;
      const vy2 = particle2.vy;
      particle2.vx = vx2 * cos - vy2 * sin;
      particle2.vy = vx2 * sin + vy2 * cos;
    }
  }

  // Separate overlapping particles AFTER velocity calculation with extra buffer
  const overlap = minDistance - distance;
  if (overlap > 0) {
    // Add small buffer to ensure complete separation
    const totalSeparation = overlap + 0.1;
    const separationX = (dx / distance) * (totalSeparation * 0.5);
    const separationY = (dy / distance) * (totalSeparation * 0.5);

    particle1.setxy(particle1.x - separationX, particle1.y - separationY);
    particle2.setxy(particle2.x + separationX, particle2.y + separationY);
  }

  // Apply reasonable speed limiting only to large particles
  if (particle1.isLarge) {
    const speed1 = Math.sqrt(particle1.vx * particle1.vx + particle1.vy * particle1.vy);
    const maxSpeed = particle2.speed * 1.0; // Allow large particle to move at same speed as small particles
    if (speed1 > maxSpeed) {
      const scale = maxSpeed / speed1;
      particle1.vx *= scale;
      particle1.vy *= scale;
    }
  }
  if (particle2.isLarge) {
    const speed2 = Math.sqrt(particle2.vx * particle2.vx + particle2.vy * particle2.vy);
    const maxSpeed = particle1.speed * 1.0; // Allow large particle to move at same speed as small particles
    if (speed2 > maxSpeed) {
      const scale = maxSpeed / speed2;
      particle2.vx *= scale;
      particle2.vy *= scale;
    }
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
  if (pos > max) {
    // add small randomness to boundary reflection to reduce velocity correlation
    const randomVel = -Math.abs(vel) + (Math.random() - 0.5) * 0.1;
    return { pos: max - (pos - max), vel: randomVel };
  } else if (pos < min) {
    // add small randomness to boundary reflection to reduce velocity correlation
    const randomVel = Math.abs(vel) + (Math.random() - 0.5) * 0.1;
    return { pos: min + (min - pos), vel: randomVel };
  }
  return { pos, vel };
}

export function moveParticle(particle: ElasticParticle, world: Model["world"]) {
  // add strong random motion to small particles for better brownian motion
  if (!particle.isLarge) {
    // much stronger thermal motion - small particles should be highly random
    const randomAngle = Math.random() * 2 * Math.PI;
    const thermalIntensity = particle.speed * 0.25; // increased from 5% to 25%
    particle.vx += thermalIntensity * Math.cos(randomAngle);
    particle.vy += thermalIntensity * Math.sin(randomAngle);
    
    // random direction change every few steps to break straight-line motion
    if (Math.random() < 0.1) { // 10% chance each tick
      const newDirection = Math.random() * 2 * Math.PI;
      const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
      particle.vx = currentSpeed * Math.cos(newDirection);
      particle.vy = currentSpeed * Math.sin(newDirection);
    }

    // keep small particles moving at target speed
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (speed > particle.speed * 2) {
      particle.vx *= (particle.speed * 2) / speed;
      particle.vy *= (particle.speed * 2) / speed;
    }
  }

  // move particle
  const newX = particle.x + particle.vx;
  const newY = particle.y + particle.vy;

  // handle boundaries
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
