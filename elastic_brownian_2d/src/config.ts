export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 30, // Increased mass ratio 30:1 for better Brownian motion visibility
    radius: 8, // Slightly larger size for better visibility and collision cross-section
    initialPosition: { x: 0, y: 0 }, // center of the world
    color: "red"
  } as const,
  SMALL_PARTICLES: {
    count: 1200, // Reduced from 2000 for better autocorrelation behavior
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
