import { Turtle } from "agentscript";
import { CONFIG } from "./config";

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

  lastCollisionTick: number;
}

/**
 * Generates random numbers with Gaussian (normal) distribution
 *
 * Uses Box-Muller transform to convert uniform random numbers into normal distribution
 * mean = 0, standard deviation = 1 (standard normal distribution)
 *
 * Efficient: generates two values per calculation, caches one for next call
 *
 * @returns random number from standard normal distribution (mean=0, std=1)
 */
export const gaussianRandom = (() => {
  let spare: number | null = null;

  return function (): number {
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
  };
})();

/* Maxwell-Boltzmann velocity distribution for 2D thermal particles
 *
 * Creates realistic thermal velocities: at temperature T, particles naturally distribute
 * with some slow, many medium, few very fast.
 *
 * Formula: each velocity component follows Gaussian distribution with  σ = √(kT/m)
 * where:
 *   - k = Boltzmann constant (here normalized to 1 for simple physics)
 *   - T = temperature (higher = more agitated particles, faster average speeds)
 *   - m = particle mass (heavier particles move slower at same temperature)
 *   - σ = standard deviation (velocity spread - how much velocities vary around the average)
 *
 * Result: small particles get realistic thermal motion that creates brownian motion
 * when they bombard the big particle through elastic collisions
 */
export function maxwellBoltzmannVelocity2D(
  temperature: number,
  mass: number
): { vx: number; vy: number } {
  // standard deviation for each velocity component in 2D
  const sigma = Math.sqrt(temperature / mass);

  // generate two independent Gaussian-distributed velocity components
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
