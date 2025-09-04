export const CONFIG = {
  LARGE_PARTICLE: {
    // heavy mass creates strong momentum contrast (30:1 ratio) with small particles for clear brownian motion
    mass: 30,
    // large radius improves visibility and increases collision cross-section for more interactions
    radius: 8,
    // starts at world center for symmetric initial conditions
    initialPosition: { x: 0, y: 0 },
    // red color for high contrast visibility against small particles
    color: "red"
  } as const,
  SMALL_PARTICLES: {
    // high particle count creates dense thermal environment (reduced from 2000 for better autocorrelation)
    count: 1200,
    // unit mass provides simple reference for momentum calculations
    mass: 1 as const,
    // radius sized for reliable collision detection while maintaining performance
    radius: 1.5 as const,
    // controls initial Maxwell-Boltzmann velocity distribution (lower for gentler thermal motion)
    temperature: 0.5,
    // subtle color to not overwhelm large particle visualization
    color: "lightblue" as const
  },
  PHYSICS: {
    // compact world boundaries (smaller than default) increase particle density for more collisions
    worldSize: 150,
    // small separation buffer (0.2) prevents particles from getting stuck overlapping during precise physics
    collisionBuffer: 0.2 as const,
    // prevents rapid repeated collisions between same particle pairs
    minCollisionInterval: 1 as const
  },
  ANALYSIS: {
    // frequency of chart.js visualization updates for real-time feedback while maintaining performance
    chartUpdateInterval: 5
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
