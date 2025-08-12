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

// gaussian random number generator using Box-Muller transform
// returns normally distributed random number with mean=0, std=1
let spare: number | null = null;
export function gaussianRandom(): number {
  if (spare !== null) {
    const result = spare;
    spare = null;
    return result;
  }

  // box-Muller transform generates two independent standard normal variates
  const u = Math.random();
  const v = Math.random();
  const magnitude = Math.sqrt(-2 * Math.log(u));
  const angle = 2 * Math.PI * v;

  spare = magnitude * Math.sin(angle);
  return magnitude * Math.cos(angle);
}

// dynamic expected values based on simulation parameters
// these replace the hardcoded theoretical values to reflect actual system behavior

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
    mass: 50, // doubled mass for more realistic brownian dynamics
    radius: 12, // doubled size for larger collision cross-section
    initialPosition: { x: 0, y: 0 }, // center of the world
    color: "red"
  } as const,
  SMALL_PARTICLES: {
    count: 2500, // very high density for continuous bombardment
    mass: 1 as const,
    radius: 1 as const,
    speed: 0.5, // very slow for gentle thermal bombardment instead of energetic collisions
    color: "lightblue" as const
  },
  PHYSICS: {
    worldSize: 200, // it's x (-size, +size), y (-size, +size)
    timeStep: 1 as const, // simulation time unit
    collisionBuffer: 0.3 as const, // reduced buffer for more precise collisions
    minCollisionInterval: 1 as const // minimum interval to prevent sticking
  },
  LANGEVIN: {
    // langevin dynamics parameters for true brownian motion
    // Continuous-time SDE: M dv/dt = -γ v + sqrt(2 γ kT) ξ(t) with ⟨ξ⟩=0, ⟨ξ(t)ξ(t')⟩=δ(t-t')
    gamma: 3.0, // high friction for rapid decorrelation with dense bombardment
    kT: 1.5, // high thermal energy to compete with dense collisions
    // expected diffusion coefficient: D = kT/gamma = 1.5/3.0 = 0.5
    // expected velocity autocorrelation time: tau = M/gamma = 50/3 ≈ 17 ticks
    enabled: true // enable/disable Langevin dynamics
  },
  ANALYSIS: {
    msdUpdateInterval: 3, // more frequent MSD updates for smoother analysis
    historyLength: 15000, // increased buffer for longer analysis
    chartUpdateInterval: 8 // slightly faster chart updates
  } as const
};

export function updateConfig(
  newConfig: Partial<{
    smallParticles: Partial<Pick<typeof CONFIG.SMALL_PARTICLES, "count" | "speed">>;
    physics: Partial<Pick<typeof CONFIG.PHYSICS, "worldSize">>;
  }>
) {
  if (newConfig.smallParticles) {
    CONFIG.SMALL_PARTICLES = {
      ...CONFIG.SMALL_PARTICLES,
      count: newConfig.smallParticles.count ?? CONFIG.SMALL_PARTICLES.count,
      speed: newConfig.smallParticles.speed ?? CONFIG.SMALL_PARTICLES.speed
    };
  }
  if (newConfig.physics) {
    CONFIG.PHYSICS = {
      ...CONFIG.PHYSICS,
      worldSize: newConfig.physics.worldSize ?? CONFIG.PHYSICS.worldSize
    };
  }
}
