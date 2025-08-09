import { Model } from "agentscript";
import { ElasticParticle, LargeParticleState, CONFIG } from "./particleTypes";
import { 
  handleAllCollisions,
  moveSmallParticleWithRandomWalk,
  moveLargeParticle
} from "./elasticCollisions";
import { BrownianAnalysis } from "./brownianAnalysis";
import { Simulation } from "./simulation";

export class ElasticModel extends Model {
  largeParticle!: ElasticParticle;
  largeParticleState!: LargeParticleState;
  analysis!: BrownianAnalysis;
  simulation!: Simulation;

  viewWidth: number;
  viewHeight: number;

  constructor(
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number },
    viewWidth: number,
    viewHeight: number
  ) {
    super(worldBounds);
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
  }

  override startup() {
    this.setupLargeParticle();
    this.setupSmallParticles();
    this.initializeAnalysis();
    this.initializeVisualization();
  }

  private setupLargeParticle() {
    // Create single large particle at center
    this.turtles.create(1, (turtle: ElasticParticle) => {
      turtle.setxy(CONFIG.LARGE_PARTICLE.initialPosition.x, CONFIG.LARGE_PARTICLE.initialPosition.y);
      turtle.mass = CONFIG.LARGE_PARTICLE.mass;
      turtle.size = CONFIG.LARGE_PARTICLE.radius;
      turtle.color = CONFIG.LARGE_PARTICLE.color;
      turtle.shape = "circle";
      turtle.isLarge = true;
      turtle.vx = 0;
      turtle.vy = 0;
      turtle.stepSize = 0; // Large particle doesn't do random walk
      turtle.speed = 0;
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;

      this.largeParticle = turtle;
    });

    // Initialize large particle state tracking
    this.largeParticleState = {
      x0: this.largeParticle.x,
      y0: this.largeParticle.y,
      positionHistory: [],
      collisionCount: 0,
      totalEnergyReceived: 0,
      lastCollisionTick: -1
    };
  }

  private setupSmallParticles() {
    this.turtles.create(CONFIG.SMALL_PARTICLES.count, (turtle: ElasticParticle) => {
      // Random position avoiding the large particle
      let x, y, distance;
      do {
        x = (Math.random() - 0.5) * this.viewWidth * 0.8;
        y = (Math.random() - 0.5) * this.viewHeight * 0.8;
        distance = Math.sqrt(x * x + y * y);
      } while (distance < CONFIG.LARGE_PARTICLE.radius * 3); // Keep initial distance from large particle

      turtle.setxy(x, y);
      turtle.mass = CONFIG.SMALL_PARTICLES.mass;
      turtle.size = CONFIG.SMALL_PARTICLES.radius;
      turtle.color = CONFIG.SMALL_PARTICLES.color;
      turtle.shape = "circle";
      turtle.isLarge = false;
      
      // Initial random velocity for thermal motion
      const angle = Math.random() * 2 * Math.PI;
      turtle.vx = CONFIG.SMALL_PARTICLES.speed * Math.cos(angle);
      turtle.vy = CONFIG.SMALL_PARTICLES.speed * Math.sin(angle);
      turtle.stepSize = CONFIG.SMALL_PARTICLES.stepSize;
      turtle.speed = CONFIG.SMALL_PARTICLES.speed;
      turtle.lastCollisionTick = -CONFIG.PHYSICS.minCollisionInterval;
    });
  }

  private initializeAnalysis() {
    this.analysis = new BrownianAnalysis(this.largeParticle, this.largeParticleState);
  }

  private initializeVisualization() {
    this.simulation = new Simulation(this.turtles, this.largeParticle);
  }

  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    // Move particles
    this.turtles.ask((turtle: ElasticParticle) => {
      if (turtle.isLarge) {
        moveLargeParticle(turtle, this.world);
      } else {
        moveSmallParticleWithRandomWalk(turtle, this.world);
      }
    });

    // Handle all collisions and count them
    const collisionsThisTick = handleAllCollisions(this.turtles, this.ticks);
    this.largeParticleState.collisionCount += collisionsThisTick;

    // Update position history for the large particle
    if (this.ticks % CONFIG.ANALYSIS.msdUpdateInterval === 0) {
      this.largeParticleState.positionHistory.push({
        x: this.largeParticle.x,
        y: this.largeParticle.y,
        t: this.ticks
      });

      // Limit history length for performance
      if (this.largeParticleState.positionHistory.length > CONFIG.ANALYSIS.historyLength) {
        this.largeParticleState.positionHistory = this.largeParticleState.positionHistory.slice(-CONFIG.ANALYSIS.historyLength);
      }
    }

    // Update analysis and visualization
    this.analysis.update(this.ticks);
    this.simulation.drawParticles();
  }

  // Public methods for external control
  public resetSimulation() {
    this.largeParticle.setxy(CONFIG.LARGE_PARTICLE.initialPosition.x, CONFIG.LARGE_PARTICLE.initialPosition.y);
    this.largeParticle.vx = 0;
    this.largeParticle.vy = 0;
    
    this.largeParticleState.x0 = this.largeParticle.x;
    this.largeParticleState.y0 = this.largeParticle.y;
    this.largeParticleState.positionHistory = [];
    this.largeParticleState.collisionCount = 0;
    this.largeParticleState.totalEnergyReceived = 0;

    this.analysis.reset();
  }

  public getStatistics() {
    const currentMSD = this.analysis.getCurrentMSD();
    const averageVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);
    const totalDisplacement = Math.sqrt(
      (this.largeParticle.x - this.largeParticleState.x0) ** 2 + 
      (this.largeParticle.y - this.largeParticleState.y0) ** 2
    );

    return {
      ticks: this.ticks,
      msd: currentMSD,
      collisions: this.largeParticleState.collisionCount,
      velocity: averageVelocity,
      displacement: totalDisplacement,
      positionHistory: this.largeParticleState.positionHistory.length
    };
  }
}