import { Turtle } from "agentscript";

export interface ElasticParticle extends Turtle {
  mass: number;
  vx: number;           // velocity components for physics
  vy: number;
  isLarge: boolean;     // particle type identifier
  stepSize: number;     // for random walk
  speed: number;        // current speed magnitude
}

export interface LargeParticleState {
  x0: number;
  y0: number;           // initial position
  positionHistory: Array<{x: number; y: number; t: number}>;
  collisionCount: number;
  totalEnergyReceived: number;
  lastCollisionTick: number;
}

export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 50,
    radius: 8,
    initialPosition: {x: 0, y: 0},
    friction: 0.99,  // mild velocity decay
    color: "red"
  },
  SMALL_PARTICLES: {
    count: 500,     // scalable 100-1000
    mass: 1,
    radius: 1.5,
    stepSize: 3.5,  // random walk step size
    speed: 4,       // thermal motion speed
    color: "lightblue"
  },
  PHYSICS: {
    worldSize: 400, // simulation boundaries
    timeStep: 1,    // simulation time unit
    collisionBuffer: 0.5,  // collision detection margin
    minCollisionInterval: 3  // minimum ticks between collisions for same pair
  },
  ANALYSIS: {
    msdUpdateInterval: 5,    // calculate MSD every 5 steps
    historyLength: 10000,    // position history buffer
    chartUpdateInterval: 10  // update charts every 10 steps
  }
} as const;