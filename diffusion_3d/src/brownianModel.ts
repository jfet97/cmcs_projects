import { Model3D, Turtle3D } from "agentscript";
import { MSDChart } from "./msd";
import { Simulation } from "./simulation";
import { createSpatialGrid, moveParticleWithOptimizedCollisions } from "./collisions";

export interface ParticleState {
  x0: number;
  y0: number;
  z0: number;
}

export interface BrownianParticleTurtle extends Turtle3D {
  initialState: ParticleState;
  stepSize: number;
}

const TURTLE_SIZE = 1;
const STEP_SIZE = 2; // at least 2*TURTLE_SIZE

export class BrownianModel extends Model3D {
  numParticles!: number;
  chart!: MSDChart;
  simulation!: Simulation;

  // to avoid names collisions
  viewWidth: number;
  viewHeight: number;
  viewDepth: number;

  constructor(
    worldBounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
      minZ: number;
      maxZ: number;
    },
    viewWidth: number,
    viewHeight: number,
    viewDepth: number
  ) {
    super(worldBounds);
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.viewDepth = viewDepth;
  }

  beginFromCenter(maxRadius = 10) {
    // the turtle will start quite near the center => plateau L^2 / 4
    const radius = Math.cbrt(Math.random()) * maxRadius;
    const theta = Math.acos(1 - 2 * Math.random());
    const phi = Math.random() * 2 * Math.PI;
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(theta);
    return [x, y, z] as const;
  }

  beginRandomly() {
    // start randomly in the world => plateau L^2 / 2
    const x = (Math.random() - 0.5) * this.viewWidth;
    const y = (Math.random() - 0.5) * this.viewHeight;
    const z = (Math.random() - 0.5) * this.viewDepth; // assuming 3D
    return [x, y, z] as const;
  }

  /**
   * Executed once, at the beginning, to config the simulation
   */
  override startup(strategy: "center" | "random", numParticles = 4000) {
    this.numParticles = numParticles;

    // setup turtles
    this.turtles.create(this.numParticles, (turtle: BrownianParticleTurtle) => {
      let xyz: readonly [number, number, number] = [0, 0, 0];
      switch (strategy) {
        case "center": {
          xyz = this.beginFromCenter(15);
          break;
        }
        case "random": {
          xyz = this.beginRandomly();
          break;
        }
      }

      turtle.setxyz(...xyz);

      turtle.stepSize = STEP_SIZE;
      turtle.color = "blue";
      turtle.shape = "circle";
      turtle.size = TURTLE_SIZE;

      // store initial position
      turtle.initialState = { x0: turtle.x, y0: turtle.y, z0: turtle.z };
    });

    this.chart = new MSDChart(this.turtles);

    // Three.js 3D simulation view
    this.simulation = new Simulation(this.turtles, {
      depth: this.viewDepth,
      height: this.viewHeight,
      width: this.viewWidth
    });

    // position the camera to frame the entire world
    this.simulation.adjustCameraToShowWorld();

    // a visual box to see the world boundaries
    this.simulation.addWorldBoundaryBox();
  }

  /**
   * Executed at each tick
   */
  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    // to ensure that two turtles that are touching (i.e., at most diameter distance apart) are at most in adjacent cells, the cell side must be at least as large as the diameter.
    const grid = createSpatialGrid(this.turtles, TURTLE_SIZE * 2);

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      // should be better with high particles density
      moveParticleWithOptimizedCollisions(turtle, this.world, grid);

      // more realistic
      // moveParticleWithElasticCollision(turtle, this.world, this.turtles);
    });

    // update the chart and draw particles
    this.chart.plot(this.ticks, 10);
    this.simulation.drawParticles();
  }
}
