import { Model, WorldBounds } from "agentscript";
import { ElasticParticle, LargeParticleState, maxwellBoltzmannVelocity2D } from "./particleTypes";
import { handleAllCollisions, moveParticle } from "./elasticCollisions";
import { BrownianAnalysis } from "./brownianAnalysis";
import { Simulation } from "./simulation";
import { CONFIG } from "./config";

export class ElasticModel extends Model {
  largeParticle!: ElasticParticle;
  largeParticleState!: LargeParticleState;
  analysis!: BrownianAnalysis;
  simulation!: Simulation;

  constructor(worldBounds: WorldBounds) {
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

  private setupSmallParticles() {
    // a lot of small particles around the large particle

    // use only the updated config
    const { count } = CONFIG.SMALL_PARTICLES;

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

      // initialize velocity using Maxwell-Boltzmann distribution for thermal equilibrium
      // this provides realistic thermal motion without artificial randomness during simulation
      const thermalVelocity = maxwellBoltzmannVelocity2D(
        CONFIG.SMALL_PARTICLES.temperature,
        CONFIG.SMALL_PARTICLES.mass
      );
      turtle.vx = thermalVelocity.vx;
      turtle.vy = thermalVelocity.vy;

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

    // update velocity history for autocorrelation analysis
    // sample velocity every 10 ticks for better autocorrelation measurement
    if (this.ticks % 10 === 0) {
      this.analysis.updateVelocityHistory(this.largeParticle.vx, this.largeParticle.vy, this.ticks);
    }

    // update analysis
    this.analysis.update(this.ticks);

    // update visualization
    this.simulation.drawParticles();
  }

  // public methods for external control
  public resetSimulation() {
    // save current large particle state if it exists
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

    // restore position and velocity if we had a previous large particle
    if (savedPosition && savedVelocity) {
      this.largeParticle.setxy(savedPosition.x, savedPosition.y);
      this.largeParticle.vx = savedVelocity.vx;
      this.largeParticle.vy = savedVelocity.vy;
    }

    // create small particles with new count if provided
    this.setupSmallParticles();

    // apply preserved temperature
    this.updateParticleTemperature();

    // Update state - simply reset analysis
    this.analysis.reset();
    this.largeParticleState.collisionCount = 0;
    this.largeParticleState.totalEnergyReceived = 0;
    this.largeParticleState.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

    // reset tick counter so everything restarts from zero
    this.ticks = 0;
  }

  public updateParticleTemperature() {
    // re-initialize all small particles with new Maxwell-Boltzmann distribution
    this.turtles.ask((turtle: ElasticParticle) => {
      if (!turtle.isLarge) {
        const thermalVelocity = maxwellBoltzmannVelocity2D(
          CONFIG.SMALL_PARTICLES.temperature,
          turtle.mass
        );
        turtle.vx = thermalVelocity.vx;
        turtle.vy = thermalVelocity.vy;
      }
    });
  }

  public updateWorldSize(newSize: number) {
    this.world.minX = -newSize;
    this.world.maxX = newSize;
    this.world.minY = -newSize;
    this.world.maxY = newSize;

    this.simulation.updateCanvasVisualSize(this.world);
    this.resetSimulation();
  }

  public getStatistics() {
    const averageVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);

    return {
      ticks: this.ticks,
      collisions: this.largeParticleState.collisionCount,
      velocity: averageVelocity,
      smallParticleCount: this.turtles.length - 1 // exclude large particle
    };
  }
}
