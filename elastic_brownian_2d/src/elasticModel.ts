import { Model, SingleParticleState, WorldBounds } from "agentscript";
import { ElasticParticle, LargeParticleState, maxwellBoltzmannVelocity2D } from "./particleTypes";
import { handleAllCollisions, moveParticle } from "./elasticCollisions";
import { BrownianAnalysis } from "./brownianAnalysis";
import { Simulation } from "./simulation";
import { CONFIG } from "./config";

/**
 * Main physics simulation controller for elastic collision brownian motion.
 * Manages particles, world boundaries, collision detection, and canvas rendering.
 */
export class ElasticModel extends Model {
  largeParticle!: ElasticParticle;
  largeParticleState!: LargeParticleState;
  analysis!: BrownianAnalysis;
  simulation!: Simulation;

  constructor(worldBounds: WorldBounds) {
    super(worldBounds);
  }

  override startup(prevState?: SingleParticleState[]) {
    this.setupLargeParticle(prevState?.find(s => s.isLarge));
    this.setupSmallParticles(prevState?.filter(s => !s.isLarge));

    this.analysis = new BrownianAnalysis(this.largeParticle, this.largeParticleState);
    this.simulation = new Simulation(this.turtles, this.largeParticle, this.world);

    // initialize canvas size coordinated with world size
    this.simulation.updateCanvasVisualSize(this.world);
  }

  private setupLargeParticle(prevState?: SingleParticleState) {
    // create a single large particle at center position

    this.turtles.create(1, (turtle: ElasticParticle) => {
      if (prevState) {
        turtle.setxy(prevState.x, prevState.y);
        turtle.vx = prevState.vx;
        turtle.vy = prevState.vy;
      } else {
        turtle.setxy(
          CONFIG.LARGE_PARTICLE.initialPosition.x,
          CONFIG.LARGE_PARTICLE.initialPosition.y
        );
        turtle.vx = 0;
        turtle.vy = 0;
      }

      turtle.mass = CONFIG.LARGE_PARTICLE.mass;
      turtle.size = CONFIG.LARGE_PARTICLE.radius;
      turtle.color = CONFIG.LARGE_PARTICLE.color;
      turtle.shape = "circle";
      turtle.isLarge = true;
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;
      this.largeParticle = turtle;
    });

    // init large particle state tracking
    this.largeParticleState = {
      x0: this.largeParticle.x,
      y0: this.largeParticle.y,
      positionHistory: [],
      collisionCount: 0,
      lastCollisionTick: -CONFIG.PHYSICS.minCollisionInterval
    };
  }

  private setupSmallParticles(prevStates?: SingleParticleState[]) {
    // create multiple small particles distributed around the large particle

    // use only the updated config
    const { count } = CONFIG.SMALL_PARTICLES;

    let useSavedState = false;
    if (prevStates && prevStates.length !== count) {
      console.error(
        new Error(
          `State length ${prevStates.length} does not match configured small particle count ${count}, ignoring saved state.`
        )
      );
    } else if (prevStates) {
      useSavedState = true;
    }

    let ctr = 0;
    this.turtles.create(count, (turtle: ElasticParticle) => {
      // random position avoiding the large particle while using world boundaries consistently
      // maintain minimum initial distance from large particle to avoid immediate collisions

      const worldWidth = this.world.maxX - this.world.minX;
      const worldHeight = this.world.maxY - this.world.minY;

      if (useSavedState && prevStates && prevStates[ctr]) {
        turtle.setxy(prevStates[ctr].x, prevStates[ctr].y);
        turtle.vx = prevStates[ctr].vx;
        turtle.vy = prevStates[ctr].vy;
      } else {
        let x, y, distance;
        do {
          x = (Math.random() - 0.5) * worldWidth * 0.95;
          y = (Math.random() - 0.5) * worldHeight * 0.95;

          // calculate distance from large particle's actual position
          const dx = x - this.largeParticle.x;
          const dy = y - this.largeParticle.y;
          distance = Math.sqrt(dx * dx + dy * dy);
        } while (distance < CONFIG.LARGE_PARTICLE.radius * 3);

        turtle.setxy(x, y);

        /**
         * Initialize velocities using Maxwell-Boltzmann distribution
         * For 2D: P(v) ∝ v·exp(-mv²/2kT) where k is Boltzmann constant
         * This ensures thermal equilibrium from the start without artificial randomness
         */
        const thermalVelocity = maxwellBoltzmannVelocity2D(
          CONFIG.SMALL_PARTICLES.temperature,
          CONFIG.SMALL_PARTICLES.mass
        );
        turtle.vx = thermalVelocity.vx;
        turtle.vy = thermalVelocity.vy;
      }

      turtle.mass = CONFIG.SMALL_PARTICLES.mass;
      turtle.size = CONFIG.SMALL_PARTICLES.radius;
      turtle.color = CONFIG.SMALL_PARTICLES.color;
      turtle.shape = "circle";
      turtle.isLarge = false;
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

      ctr++;
    });
  }

  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    // update particle positions based on velocity (deterministic motion)
    this.turtles.ask((turtle: ElasticParticle) => {
      moveParticle(turtle, this.world);
    });

    // detect and resolve all elastic collisions, count collisions with large particle
    const collisionsThisTick = handleAllCollisions(this.turtles, this.ticks);
    this.largeParticleState.collisionCount += collisionsThisTick;

    /**
     * Sample velocity history for autocorrelation analysis
     * Sample every 10 ticks to reduce noise and computational cost
     * Velocity autocorrelation: C(τ) = ⟨v(t)·v(t+τ)⟩ / ⟨v²⟩
     */
    if (this.ticks % 10 === 0) {
      this.analysis.updateVelocityHistory(this.largeParticle.vx, this.largeParticle.vy, this.ticks);
    }

    // update statistical analysis and charts
    this.analysis.update(this.ticks);

    // render visualization
    this.simulation.drawParticles();
  }

  // public methods for external control (UI interactions)
  public resetSimulation(update: "temperature" | "count" | "all" | "nothing") {
    switch (update) {
      case "all": {
        this.turtles.clear();
        this.setupLargeParticle();
        this.setupSmallParticles();
        break;
      }

      case "count": {
        // save current large particle state if it exists
        const savedPosition = this.largeParticle
          ? { x: this.largeParticle.x, y: this.largeParticle.y }
          : null;
        const savedVelocity = this.largeParticle
          ? { vx: this.largeParticle.vx, vy: this.largeParticle.vy }
          : null;

        this.turtles.clear();

        this.setupLargeParticle();

        // restore previous large particle state to maintain continuity
        if (savedPosition && savedVelocity) {
          this.largeParticle.setxy(savedPosition.x, savedPosition.y);
          this.largeParticle.vx = savedVelocity.vx;
          this.largeParticle.vy = savedVelocity.vy;
        }

        this.setupSmallParticles();

        break;
      }

      case "temperature": {
        // re-sample velocities from Maxwell-Boltzmann distribution at new temperature
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
        break;
      }

      case "nothing": {
        break;
      }
    }

    // reset statistical analysis and collision tracking
    this.analysis.reset();
    this.largeParticleState.collisionCount = 0;
    this.largeParticleState.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

    // reset simulation time to t=0
    this.ticks = 0;
  }

  public getState() {
    const toRet: { x: number; y: number; vx: number; vy: number; isLarge: boolean }[] = [];
    this.turtles.ask((turtle: ElasticParticle) => {
      toRet.push({
        x: turtle.x,
        y: turtle.y,
        vx: turtle.vx,
        vy: turtle.vy,
        isLarge: turtle.isLarge
      });
    });
    return toRet;
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

  public destroy() {
    if (this.analysis) {
      this.analysis.destroy();
    }
  }
}
