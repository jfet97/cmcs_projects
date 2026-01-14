import { Turtle } from "agentscript";

export interface ElasticParticle extends Turtle {
  mass: number;

  // velocity components
  vx: number;
  vy: number;

  isLarge: boolean; // particle type identifier
  speed: number; // current speed magnitude

  lastCollisionTick: number; // track last collision to prevent rapid repeated collisions
}

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
