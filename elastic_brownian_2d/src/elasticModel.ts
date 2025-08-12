import { Model } from "agentscript";
import {
  ElasticParticle,
  LargeParticleState,
  CONFIG,
  maxwellBoltzmannVelocity2D
} from "./particleTypes";
import { handleAllCollisions, moveParticle } from "./elasticCollisions";
import { BrownianAnalysis } from "./brownianAnalysis";
import { Simulation } from "./simulation";

export class ElasticModel extends Model {
  largeParticle!: ElasticParticle;
  largeParticleState!: LargeParticleState;
  analysis!: BrownianAnalysis;
  simulation!: Simulation;

  constructor(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    super(worldBounds);
  }

  override startup() {
    this.setupLargeParticle();
    this.setupSmallParticles();
    this.initializeAnalysis();
    this.initializeVisualization();
    // Initialize canvas size coordinated with world size
    this.simulation.updateCanvasVisualSize(this.world);
  }

  private setupLargeParticle() {
    // a single large particle at center
    this.turtles.create(1, (turtle: ElasticParticle) => {
      turtle.setxy(
        CONFIG.LARGE_PARTICLE.initialPosition.x,
        CONFIG.LARGE_PARTICLE.initialPosition.y
      );
      turtle.mass = CONFIG.LARGE_PARTICLE.mass;
      turtle.size = CONFIG.LARGE_PARTICLE.radius;
      turtle.color = CONFIG.LARGE_PARTICLE.color;
      turtle.shape = "circle";
      turtle.isLarge = true;
      turtle.vx = 0;
      turtle.vy = 0;
      turtle.speed = 0;
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

      this.largeParticle = turtle;
    });

    // TODO (a che serve ?)
    // init large particle state tracking
    this.largeParticleState = {
      x0: this.largeParticle.x,
      y0: this.largeParticle.y,
      positionHistory: [],
      collisionCount: 0,
      totalEnergyReceived: 0,
      lastCollisionTick: -CONFIG.PHYSICS.minCollisionInterval
    };
  }

  private setupSmallParticles(particleCount?: number) {
    // a lot of small particles around the large particle

    // TODO: use only the updated config
    const count = particleCount || CONFIG.SMALL_PARTICLES.count;

    this.turtles.create(count, (turtle: ElasticParticle) => {
      // random position avoiding the large particle - use world boundaries consistently
      // keep initial distance from large particle
      const worldWidth = this.world.maxX - this.world.minX;
      const worldHeight = this.world.maxY - this.world.minY;

      let x, y, distance;
      do {
        x = (Math.random() - 0.5) * worldWidth * 0.8;
        y = (Math.random() - 0.5) * worldHeight * 0.8;
        distance = Math.sqrt(x * x + y * y);
      } while (distance < CONFIG.LARGE_PARTICLE.radius * 3);

      turtle.setxy(x, y);
      turtle.mass = CONFIG.SMALL_PARTICLES.mass;
      turtle.size = CONFIG.SMALL_PARTICLES.radius;
      turtle.color = CONFIG.SMALL_PARTICLES.color;
      turtle.shape = "circle";
      turtle.isLarge = false;

      // Initialize velocity using Maxwell-Boltzmann distribution for thermal equilibrium
      // This provides realistic thermal motion without artificial randomness during simulation
      const thermalVelocity = maxwellBoltzmannVelocity2D(
        CONFIG.SMALL_PARTICLES.temperature,
        CONFIG.SMALL_PARTICLES.mass
      );
      turtle.vx = thermalVelocity.vx;
      turtle.vy = thermalVelocity.vy;

      // Store thermal speed for reference (RMS speed from Maxwell-Boltzmann)
      turtle.speed = Math.sqrt(
        (2 * CONFIG.SMALL_PARTICLES.temperature) / CONFIG.SMALL_PARTICLES.mass
      );
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;
    });
  }

  private initializeAnalysis() {
    this.analysis = new BrownianAnalysis(this.largeParticle, this.largeParticleState);
  }

  private initializeVisualization() {
    this.simulation = new Simulation(this.turtles, this.largeParticle, this.world);
  }

  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    // move particles
    this.turtles.ask((turtle: ElasticParticle) => {
      moveParticle(turtle, this.world);
    });

    // handle all collisions and count them
    const collisionsThisTick = handleAllCollisions(this.turtles, this.ticks);
    this.largeParticleState.collisionCount += collisionsThisTick;

    // NO ARTIFICIAL LANGEVIN DYNAMICS
    // Brownian motion emerges naturally from elastic collisions with thermal bath
    // The large particle moves purely according to Newton's laws between collisions

    // update position history for the large particle for MSD calculation
    if (this.ticks % CONFIG.ANALYSIS.msdUpdateInterval === 0) {
      this.largeParticleState.positionHistory.push({
        x: this.largeParticle.x,
        y: this.largeParticle.y,
        t: this.ticks
      });

      // limit history length for performance
      if (this.largeParticleState.positionHistory.length > CONFIG.ANALYSIS.historyLength) {
        this.largeParticleState.positionHistory = this.largeParticleState.positionHistory.slice(
          -CONFIG.ANALYSIS.historyLength
        );
      }
    }

    // update velocity history for the large particle for autocorrelation analysis
    // update velocity history every tick for better autocorrelation analysis
    this.analysis.updateVelocityHistory(this.largeParticle.vx, this.largeParticle.vy, this.ticks);

    // update analysis
    this.analysis.update(this.ticks);

    // update visualization
    this.simulation.drawParticles();
  }

  // public methods for external control
  public resetSimulation(newParticleCount?: number, preserveTemperature?: number) {
    // Save current large particle state if it exists
    const currentLargeParticle = this.largeParticle;
    const savedPosition = currentLargeParticle
      ? { x: currentLargeParticle.x, y: currentLargeParticle.y }
      : null;
    const savedVelocity = currentLargeParticle
      ? { vx: currentLargeParticle.vx, vy: currentLargeParticle.vy }
      : null;

    // clear all turtles
    this.turtles.clear();

    // create large particle
    this.setupLargeParticle();

    // Restore position and velocity if we had a previous large particle
    if (savedPosition && savedVelocity) {
      this.largeParticle.setxy(savedPosition.x, savedPosition.y);
      this.largeParticle.vx = savedVelocity.vx;
      this.largeParticle.vy = savedVelocity.vy;
    }

    // create small particles with new count if provided
    this.setupSmallParticles(newParticleCount);

    // apply preserved temperature if provided
    if (preserveTemperature !== undefined) {
      this.updateParticleTemperature(preserveTemperature);
    }

    // Update state with current particle position (preserve existing reference if particle was restored)
    if (savedPosition) {
      // If we restored a previous particle, keep the existing reference position for continuous MSD tracking
      // Just update the current position in the state
      this.largeParticleState.positionHistory = []; // Clear history but keep reference
    } else {
      // Fresh start - reset analysis and reference position
      this.analysis.reset();
      this.largeParticleState.x0 = this.largeParticle.x;
      this.largeParticleState.y0 = this.largeParticle.y;
      this.largeParticleState.positionHistory = [];
      this.analysis.updateReferencePosition();
    }

    this.largeParticleState.collisionCount = 0;
    this.largeParticleState.totalEnergyReceived = 0;
    this.largeParticleState.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

    // Canvas size should remain unchanged when just resetting particle count
    // only resize canvas when world size actually changes (in updateWorldSize method)

    // reset tick counter so everything restarts from zero
    this.ticks = 0;
  }

  public updateParticleTemperature(newTemperature: number) {
    // Update global CONFIG first
    CONFIG.SMALL_PARTICLES.temperature = newTemperature;

    // Re-initialize all small particles with new Maxwell-Boltzmann distribution
    this.turtles.ask((turtle: ElasticParticle) => {
      if (!turtle.isLarge) {
        // Generate new thermal velocity from Maxwell-Boltzmann distribution
        const thermalVelocity = maxwellBoltzmannVelocity2D(newTemperature, turtle.mass);
        turtle.vx = thermalVelocity.vx;
        turtle.vy = thermalVelocity.vy;

        // Update stored thermal speed
        turtle.speed = Math.sqrt((2 * newTemperature) / turtle.mass);
      }
    });
  }

  public updateWorldSize(newSize: number) {
    // exclude large particle
    const currentParticleCount = this.turtles.length - 1;
    const currentTemperature = this.getSmallParticleTemperature();

    this.world.minX = -newSize;
    this.world.maxX = newSize;
    this.world.minY = -newSize;
    this.world.maxY = newSize;

    this.simulation.updateCanvasVisualSize(this.world);
    this.resetSimulation(currentParticleCount, currentTemperature);
  }

  private getSmallParticleTemperature(): number {
    // Return current thermal temperature
    return CONFIG.SMALL_PARTICLES.temperature;
  }

  public getStatistics() {
    const currentMSD = this.analysis.getCurrentMSD();
    const averageVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);
    const totalDisplacement = Math.sqrt(
      (this.largeParticle.x - this.largeParticleState.x0) ** 2 +
        (this.largeParticle.y - this.largeParticleState.y0) ** 2
    );

    // TODO: rename, check if this info is needed
    return {
      ticks: this.ticks,
      msd: currentMSD,
      collisions: this.largeParticleState.collisionCount,
      velocity: averageVelocity,
      displacement: totalDisplacement,
      positionHistory: this.largeParticleState.positionHistory.length,
      smallParticleCount: this.turtles.length - 1 // exclude large particle
    };
  }
}
