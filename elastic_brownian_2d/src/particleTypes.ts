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

export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 25, // reduced for more responsive Brownian motion
    radius: 6, // slightly smaller for better dynamics
    initialPosition: { x: 0, y: 0 }, // center of the world
    color: "red"
  } as const,
  SMALL_PARTICLES: {
    count: 300, // limited for better performance and realistic density;
    mass: 1 as const,
    radius: 1 as const,
    speed: 3.0, // nice speed for observable Brownian motion
    color: "lightblue" as const
  },
  PHYSICS: {
    worldSize: 200, // it's x (-size, +size), y (-size, +size)
    timeStep: 1 as const, // simulation time unit
    collisionBuffer: 0.3 as const, // reduced buffer for more precise collisions
    minCollisionInterval: 1 as const // minimum interval to prevent sticking
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
