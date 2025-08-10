import { Turtle } from "agentscript";

export interface ElasticParticle extends Turtle {
  mass: number;
  vx: number; // velocity components for physics
  vy: number;
  isLarge: boolean; // particle type identifier
  stepSize: number; // for random walk
  speed: number; // current speed magnitude
  lastCollisionTick: number; // track last collision to prevent rapid repeated collisions
}

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
    mass: 100, // increased for better momentum transfer ratio
    radius: 6, // slightly smaller for better dynamics
    initialPosition: { x: 0, y: 0 },
    color: "red"
  },
  SMALL_PARTICLES: {
    count: 300, // reduced for better performance and realistic density
    mass: 1,
    radius: 1.2, // slightly smaller for better packing
    stepSize: 2.0, // reduced random walk for more realistic thermal motion
    speed: 3.0, // optimal speed for observable Brownian motion
    color: "lightblue"
  },
  PHYSICS: {
    worldSize: 300, // increased for proper particle density
    timeStep: 1, // simulation time unit
    collisionBuffer: 0.3, // reduced buffer for more precise collisions
    minCollisionInterval: 2 // reduced to allow more natural collision frequency
  },
  ANALYSIS: {
    msdUpdateInterval: 3, // more frequent MSD updates for smoother analysis
    historyLength: 15000, // increased buffer for longer analysis
    chartUpdateInterval: 8 // slightly faster chart updates
  }
} as const;
