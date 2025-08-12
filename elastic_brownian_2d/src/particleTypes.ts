import { Turtle } from "agentscript";

export interface ElasticParticle extends Turtle {
  mass: number;

  // velocity components
  vx: number;
  vy: number;

  isLarge: boolean; // particle type identifier
  speed: number; // current speed magnitude

  // TODO: freca?
  lastCollisionTick: number; // track last collision to prevent rapid repeated collisions
}

// TODO: per troppi campi mi chiedo se freca
export interface LargeParticleState {
  x0: number;
  y0: number; // initial position
  positionHistory: Array<{ x: number; y: number; t: number }>;
  collisionCount: number;
  totalEnergyReceived: number;
  lastCollisionTick: number;
}

// Gaussian random number generator using Box-Muller transform
// Returns normally distributed random number with mean=0, std=1
let spare: number | null = null;
export function gaussianRandom(): number {
  if (spare !== null) {
    const result = spare;
    spare = null;
    return result;
  }

  // Box-Muller transform generates two independent standard normal variates
  const u = Math.random();
  const v = Math.random();
  const magnitude = Math.sqrt(-2 * Math.log(u));
  const angle = 2 * Math.PI * v;

  spare = magnitude * Math.sin(angle);
  return magnitude * Math.cos(angle);
}

// Maxwell-Boltzmann velocity distribution for 2D thermal particles
// In 2D: each velocity component follows Gaussian distribution with σ = √(kT/m)
export function maxwellBoltzmannVelocity2D(
  temperature: number,
  mass: number
): { vx: number; vy: number } {
  // Standard deviation for each velocity component in 2D
  const sigma = Math.sqrt(temperature / mass);

  // Generate two independent Gaussian-distributed velocity components
  const vx = sigma * gaussianRandom();
  const vy = sigma * gaussianRandom();

  return { vx, vy };
}

// Calculate thermal equilibrium temperature from average kinetic energy
export function calculateTemperatureFromKineticEnergy(averageKineticEnergy: number): number {
  // In 2D: ⟨½mv²⟩ = ⟨½m(vx² + vy²)⟩ = kT  (equipartition theorem)
  // Therefore: kT = ⟨½mv²⟩, so T = ⟨½mv²⟩/k
  return averageKineticEnergy; // In reduced units where k=1
}

// Maxwell-Boltzmann thermal equilibrium calculations for emergent Brownian motion
// No dynamic calculations needed - using fundamental statistical mechanics

export function calculateEffectiveTemperature(
  particleSpeed: number,
  particleCount: number,
  worldSize: number
): number {
  // effective thermal energy from particle bombardment
  // calibrated to match actual simulation behavior
  const worldArea = 2 * worldSize * (2 * worldSize);
  const particleDensity = particleCount / worldArea;
  const collisionCrossSection =
    Math.PI * (CONFIG.LARGE_PARTICLE.radius + CONFIG.SMALL_PARTICLES.radius) ** 2;

  // base effective temperature from speed squared (kinetic energy scaling)
  const baseKT = particleSpeed * particleSpeed * 0.5; // kinetic energy scale

  // density scaling: more particles → more bombardment → higher effective temperature
  const densityFactor = Math.sqrt(particleDensity * collisionCrossSection * 1000); // scaled for reasonable values

  const kT_effective = baseKT * densityFactor;

  return Math.max(0.01, Math.min(2.0, kT_effective)); // tighter bounds for realism
}

export function calculateEffectiveFriction(
  particleCount: number,
  worldSize: number,
  particleSpeed: number
): number {
  // effective friction from collision frequency
  // calibrated to match simulation behavior and give realistic τ values
  const worldArea = 2 * worldSize * (2 * worldSize);
  const particleDensity = particleCount / worldArea;
  const collisionCrossSection =
    Math.PI * (CONFIG.LARGE_PARTICLE.radius + CONFIG.SMALL_PARTICLES.radius) ** 2;

  // collision frequency scaling
  const collisionFreq = particleDensity * collisionCrossSection * particleSpeed;

  // momentum transfer efficiency (small mass vs large mass)
  const massRatio = CONFIG.SMALL_PARTICLES.mass / CONFIG.LARGE_PARTICLE.mass;

  // effective friction: higher collision rate → higher friction
  // scaled to give τ = M/γ in range 5-20 ticks for typical parameters
  const gamma_effective = collisionFreq * massRatio * 20.0; // adjusted scaling

  return Math.max(1.0, Math.min(10.0, gamma_effective)); // bounds for τ ≈ 5-50
}

export function calculateBoundaryCorrection(worldSize: number): number {
  // boundary effects in confined systems - calibrated for realistic values
  // smaller confined space → faster decorrelation → smaller τ
  const largeParticleRadius = CONFIG.LARGE_PARTICLE.radius;
  const effectiveSize = worldSize - largeParticleRadius;

  // for current world sizes (200-600), give corrections in range 0.5-0.9
  // smaller world → stronger boundary effects → smaller correction
  const sizeRatio = effectiveSize / 200.0; // normalize to typical size
  const correction = Math.max(0.4, Math.min(0.9, 0.5 + 0.4 * Math.sqrt(sizeRatio)));

  return correction;
}

export function calculateDynamicExpectedValues(
  particleCount: number,
  particleSpeed: number,
  worldSize: number
) {
  const kT_eff = calculateEffectiveTemperature(particleSpeed, particleCount, worldSize);
  const gamma_eff = calculateEffectiveFriction(particleCount, worldSize, particleSpeed);

  return {
    expectedDiffusion: kT_eff / gamma_eff, // D = kT/γ (Einstein relation in reduced units)
    expectedEquipartition: (2 * kT_eff) / CONFIG.LARGE_PARTICLE.mass, // ⟨v²⟩ = 2*kT/M in 2D
    expectedDecayTime: CONFIG.LARGE_PARTICLE.mass / gamma_eff // τ = M/γ
  };
}

export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 30, // Increased mass ratio 30:1 for better Brownian motion visibility
    radius: 8, // Slightly larger size for better visibility and collision cross-section
    initialPosition: { x: 0, y: 0 }, // center of the world
    color: "red"
  } as const,
  SMALL_PARTICLES: {
    count: 2000, // Increased density for better Brownian motion
    mass: 1 as const,
    radius: 1.5 as const, // Slightly larger for better collision detection
    temperature: 0.5, // Lower temperature for gentler thermal motion
    color: "lightblue" as const
  },
  PHYSICS: {
    worldSize: 150, // Smaller world for higher effective density
    timeStep: 1 as const, // simulation time unit
    collisionBuffer: 0.2 as const, // Smaller buffer for precise physics
    minCollisionInterval: 1 as const // minimum interval to prevent sticking
  },
  LANGEVIN: {
    // DISABLED - Brownian motion emerges naturally from collisions
    gamma: 0, // Not used when disabled
    kT: 0, // Not used when disabled
    enabled: false // DISABLED for emergent Brownian motion
  },
  ANALYSIS: {
    msdUpdateInterval: 2, // Frequent MSD updates for better resolution
    historyLength: 20000, // Longer history for better statistics
    chartUpdateInterval: 5 // Faster chart updates for real-time feedback
  } as const
};

export function updateConfig(
  newConfig: Partial<{
    smallParticles: Partial<Pick<typeof CONFIG.SMALL_PARTICLES, "count" | "temperature">>;
    physics: Partial<Pick<typeof CONFIG.PHYSICS, "worldSize">>;
  }>
) {
  if (newConfig.smallParticles) {
    CONFIG.SMALL_PARTICLES = {
      ...CONFIG.SMALL_PARTICLES,
      count: newConfig.smallParticles.count ?? CONFIG.SMALL_PARTICLES.count,
      temperature: newConfig.smallParticles.temperature ?? CONFIG.SMALL_PARTICLES.temperature
    };
  }
  if (newConfig.physics) {
    CONFIG.PHYSICS = {
      ...CONFIG.PHYSICS,
      worldSize: newConfig.physics.worldSize ?? CONFIG.PHYSICS.worldSize
    };
  }
}
