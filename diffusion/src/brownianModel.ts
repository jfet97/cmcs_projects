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

  // to avoid names collisions
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
    // the turtle will start quite near the center => plateau L^2 / 6
    const radius = Math.sqrt(Math.random()) * maxRadius; // max radius
    const angle = Math.random() * 2 * Math.PI; // random angle
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return [x, y] as const;
  }

  beginRandomly() {
    // start randomly in the canvas => plateau L^2 / 3
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

      // store initial position
      turtle.initialState = { x0: turtle.x, y0: turtle.y };
    });

    this.chart = new MSDChart(this.turtles);
    this.simulation = new Simulation(this.turtles);
  }

  /**
   * Executed at each tick
   */
  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    const grid = createSpatialGrid(this.turtles, TURTLE_SIZE * 2);

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      // should be better with high particles density
      moveParticleWithOptimizedCollisions(turtle, this.world, grid, TURTLE_SIZE * 2);

      // more realistic
      // moveParticleWithElasticCollision(turtle, this.world, this.turtles);
    });

    // update the chart and draw particles
    this.chart.plot(this.ticks, 10);
    this.simulation.drawParticles();
  }
}
