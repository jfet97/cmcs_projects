import { Model, Turtle } from "agentscript";
import { MSDChart } from "./msd";
import { Simulation } from "./simulation";
import { createSpatialGrid, moveParticleWithOptimizedCollisions } from "./collisions";

export interface ParticleState {
  x0: number;
  y0: number;
}

export interface BrownianParticleTurtle extends Turtle {
  initialState: ParticleState;
  stepSize: number;
}

const TURTLE_SIZE = 1;

export class BrownianModel extends Model {
  numParticles!: number;
  chart!: MSDChart;
  simulation!: Simulation;

  // to avoid name collisions
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

  beginFromCenter(maxRadius = 10) {
    /**
     * Particles start near the center, demonstrating confined diffusion
     * Expected MSD plateau: L²/6 for 2D radial distribution
     * Using polar coordinates with sqrt(random) ensures uniform radial distribution
     */
    const radius = Math.sqrt(Math.random()) * maxRadius; // uniform radial distribution
    const angle = Math.random() * 2 * Math.PI; // random angle [0, 2π]
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return [x, y] as const;
  }

  beginRandomly() {
    /**
     * Particles start randomly distributed across the entire domain
     * Expected MSD plateau: L²/3 for 2D uniform distribution
     * This represents diffusion in an unbounded system (before hitting walls)
     */
    const x = (Math.random() - 0.5) * this.viewWidth;
    const y = (Math.random() - 0.5) * this.viewHeight;
    return [x, y] as const;
  }

  /**
   * Executed once, at the beginning, to config the simulation
   */
  override startup(strategy: "center" | "random") {
    this.numParticles = 4000;

    // setup turtles
    this.turtles.create(this.numParticles, (turtle: BrownianParticleTurtle) => {
      let xy: readonly [number, number] = [0, 0];
      switch (strategy) {
        case "center": {
          xy = this.beginFromCenter(25);
          break;
        }
        case "random": {
          xy = this.beginRandomly();
          break;
        }
      }

      turtle.setxy(...xy);

      turtle.stepSize = 4;
      turtle.color = "blue";
      turtle.shape = "circle";
      turtle.size = TURTLE_SIZE;

      // store initial position for MSD calculation: MSD = ⟨(r(t) - r(0))²⟩
      turtle.initialState = { x0: turtle.x, y0: turtle.y };
    });

    // expected MSD plateau depends on initialization strategy:
    // center: L²/6, random: L²/3 (where L is the world size, for 2D)
    const L = this.viewWidth;
    const expectedPlateau = strategy === "center" ? (L * L) / 6 : (L * L) / 3;

    this.chart = new MSDChart(this.turtles, expectedPlateau);
    this.simulation = new Simulation(this.turtles);
  }

  /**
   * Executed at each tick
   */
  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    /**
     * Spatial grid optimization for collision detection
     * Cell size = 2×radius ensures particles within collision range are in adjacent cells
     * This reduces collision checks from O(N²) to O(N×k) where k ≈ 9 cells
     */
    const grid = createSpatialGrid(this.turtles, TURTLE_SIZE * 2);

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      // optimized collision detection for high particle density (O(N×k) vs O(N²))
      moveParticleWithOptimizedCollisions(turtle, this.world, grid);

      // alternative: more realistic elastic collisions (conserves momentum, higher computational cost)
      // moveParticleWithElasticCollision(turtle, this.world, this.turtles);
    });

    // update MSD chart every 10 ticks and render particles
    this.chart.plot(this.ticks, 10);
    this.simulation.drawParticles();
  }
}
