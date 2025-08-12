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

  if (distance >= minDistance) {
    return false;
  }

  // Prevent rapid repeated collisions
  if (
    Math.abs(currentTick - particle1.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval ||
    Math.abs(currentTick - particle2.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval
  ) {
    return false;
  }

  // Separate overlapping particles first
  const overlap = minDistance - distance + CONFIG.PHYSICS.collisionBuffer;
  if (overlap > 0) {
    const separationX = (dx / distance) * (overlap / 2);
    const separationY = (dy / distance) * (overlap / 2);

    particle1.setxy(particle1.x - separationX, particle1.y - separationY);
    particle2.setxy(particle2.x + separationX, particle2.y + separationY);
  }

  // Calculate collision normal (unit vector from particle1 to particle2)
  const nx = dx / distance;
  const ny = dy / distance;

  // Relative velocity
  const rvx = particle2.vx - particle1.vx;
  const rvy = particle2.vy - particle1.vy;

  // Relative velocity in collision normal direction
  const speed = rvx * nx + rvy * ny;

  // Do not resolve if velocities are separating
  if (speed > 0) {
    return false;
  }

  // Simple elastic collision: exchange velocities proportionally to mass
  const impulse =
    (-2 * speed * particle1.mass * particle2.mass) / (particle1.mass + particle2.mass);

  // Update velocities based on elastic collision physics
  particle1.vx += (impulse / particle1.mass) * nx;
  particle1.vy += (impulse / particle1.mass) * ny;
  particle2.vx -= (impulse / particle2.mass) * nx;
  particle2.vy -= (impulse / particle2.mass) * ny;

  // Keep large particles at reasonable speed
  limitParticleSpeed(particle1, currentTick);
  limitParticleSpeed(particle2, currentTick);

  // Update collision tracking
  particle1.lastCollisionTick = currentTick;
  particle2.lastCollisionTick = currentTick;

  return true;
}

function limitParticleSpeed(particle: ElasticParticle, currentTick: number) {
  if (particle.isLarge && particle.lastCollisionTick < currentTick) {
    const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    if (speed > 0) {
      const targetSpeed = CONFIG.SMALL_PARTICLES.speed * 0.3;
      const scale = targetSpeed / speed;
      particle.vx *= scale;
      particle.vy *= scale;
    }
  }
}

function handleBoundary(
  pos: number,
  vel: number,
  min: number,
  max: number
): { pos: number; vel: number } {
  if (pos > max) {
    return { pos: max - (pos - max), vel: -Math.abs(vel) };
  } else if (pos < min) {
    return { pos: min + (min - pos), vel: Math.abs(vel) };
  }
  return { pos, vel };
}

export function moveParticle(particle: ElasticParticle, world: Model["world"]) {
  // add random motion to small particles
  if (!particle.isLarge) {
    const randomAngle = Math.random() * 2 * Math.PI;
    const thermalIntensity = particle.speed * 0.05; // 5% of target speed
    particle.vx += thermalIntensity * Math.cos(randomAngle);
    particle.vy += thermalIntensity * Math.sin(randomAngle);

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
