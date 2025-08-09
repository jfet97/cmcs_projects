import { Model, Turtles } from "agentscript";
import { ElasticParticle, CONFIG } from "./particleTypes";

export interface SpatialGrid {
  grid: Map<`${number},${number}`, ElasticParticle[]>;
  size: number;
}

export function createSpatialGrid(turtles: Turtles, cellSize: number): SpatialGrid {
  const grid: SpatialGrid["grid"] = new Map();

  turtles.ask((turtle: ElasticParticle) => {
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

function getNearbyParticles(
  x: number,
  y: number,
  { grid, size }: SpatialGrid
): ElasticParticle[] {
  const nearbyParticles: ElasticParticle[] = [];
  const mainCellX = Math.floor(x / size);
  const mainCellY = Math.floor(y / size);

  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const key = `${mainCellX + i},${mainCellY + j}` as const;
      if (grid.has(key)) {
        nearbyParticles.push(...grid.get(key)!);
      }
    }
  }

  return nearbyParticles;
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
  if (Math.abs(currentTick - particle1.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval ||
      Math.abs(currentTick - particle2.lastCollisionTick) < CONFIG.PHYSICS.minCollisionInterval) {
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

  // Calculate impulse scalar
  const impulse = 2 * speed / (particle1.mass + particle2.mass);

  // Update velocities based on elastic collision
  particle1.vx += impulse * particle2.mass * nx;
  particle1.vy += impulse * particle2.mass * ny;
  particle2.vx -= impulse * particle1.mass * nx;
  particle2.vy -= impulse * particle1.mass * ny;

  // Update collision tracking
  particle1.lastCollisionTick = currentTick;
  particle2.lastCollisionTick = currentTick;

  return true;
}

export function moveSmallParticleWithRandomWalk(
  particle: ElasticParticle,
  world: Model["world"]
) {
  if (particle.isLarge) return;

  // Add small random thermal motion to maintain energy (much smaller)
  const thermalAngle = Math.random() * 2 * Math.PI;
  const thermalMagnitude = particle.speed * 0.02; // very small thermal kick
  particle.vx += thermalMagnitude * Math.cos(thermalAngle);
  particle.vy += thermalMagnitude * Math.sin(thermalAngle);
  
  // Limit maximum speed to target speed
  const currentSpeed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
  if (currentSpeed > particle.speed * 1.2) {
    const scale = (particle.speed * 1.2) / currentSpeed;
    particle.vx *= scale;
    particle.vy *= scale;
  }

  // Move based on velocity
  let newX = particle.x + particle.vx;
  let newY = particle.y + particle.vy;

  // Handle boundary conditions with elastic reflection
  if (newX > world.maxX) {
    newX = world.maxX - (newX - world.maxX);
    particle.vx = -Math.abs(particle.vx); // reverse x velocity
  } else if (newX < world.minX) {
    newX = world.minX + (world.minX - newX);
    particle.vx = Math.abs(particle.vx);
  }

  if (newY > world.maxY) {
    newY = world.maxY - (newY - world.maxY);
    particle.vy = -Math.abs(particle.vy); // reverse y velocity
  } else if (newY < world.minY) {
    newY = world.minY + (world.minY - newY);
    particle.vy = Math.abs(particle.vy);
  }

  particle.setxy(newX, newY);
}

export function moveLargeParticle(
  particle: ElasticParticle,
  world: Model["world"]
) {
  if (!particle.isLarge) return;

  // Account for particle radius to prevent going through walls
  const radius = particle.size;
  
  // Limit velocity to prevent tunneling through boundaries
  const maxStep = Math.min(world.maxX - world.minX, world.maxY - world.minY) / 10;
  const currentStep = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
  if (currentStep > maxStep) {
    const scale = maxStep / currentStep;
    particle.vx *= scale;
    particle.vy *= scale;
  }

  // Move based on current velocity (from collisions)
  let newX = particle.x + particle.vx;
  let newY = particle.y + particle.vy;

  // Handle boundary conditions with elastic reflection - robust approach
  let hitBoundary = false;
  
  // X boundaries - check both current and new position
  if (newX + radius >= world.maxX) {
    newX = world.maxX - radius - 0.1; // clamp with small buffer
    particle.vx = -Math.abs(particle.vx); // ensure velocity points inward
    hitBoundary = true;
  } else if (newX - radius <= world.minX) {
    newX = world.minX + radius + 0.1; // clamp with small buffer
    particle.vx = Math.abs(particle.vx); // ensure velocity points inward
    hitBoundary = true;
  }

  // Y boundaries - check both current and new position
  if (newY + radius >= world.maxY) {
    newY = world.maxY - radius - 0.1; // clamp with small buffer
    particle.vy = -Math.abs(particle.vy); // ensure velocity points inward
    hitBoundary = true;
  } else if (newY - radius <= world.minY) {
    newY = world.minY + radius + 0.1; // clamp with small buffer
    particle.vy = Math.abs(particle.vy); // ensure velocity points inward
    hitBoundary = true;
  }
  
  // Apply slight velocity damping when hitting boundaries to prevent infinite bouncing
  if (hitBoundary) {
    particle.vx *= 0.98;
    particle.vy *= 0.98;
  }

  // Final safety check - ensure particle stays within bounds
  newX = Math.max(world.minX + radius, Math.min(world.maxX - radius, newX));
  newY = Math.max(world.minY + radius, Math.min(world.maxY - radius, newY));

  particle.setxy(newX, newY);
}

export function handleAllCollisions(
  turtles: Turtles,
  currentTick: number
): number {
  let collisionCount = 0;
  const grid = createSpatialGrid(turtles, CONFIG.LARGE_PARTICLE.radius * 3);
  
  let largeParticle: ElasticParticle | null = null;
  
  // Find the large particle
  turtles.ask((turtle: ElasticParticle) => {
    if (turtle.isLarge) {
      largeParticle = turtle;
    }
  });

  if (!largeParticle) return 0;

  // Check collisions only between small particles and the large particle
  const nearbyParticles = getNearbyParticles(
    largeParticle.x,
    largeParticle.y,
    grid
  );

  for (const smallParticle of nearbyParticles) {
    if (smallParticle === largeParticle || smallParticle.isLarge) continue;

    if (performElasticCollision(smallParticle, largeParticle, currentTick)) {
      collisionCount++;
    }
  }

  return collisionCount;
}