import { Model3D, Turtle3D } from "agentscript";
import { MSDChart } from "./msd";
import { Simulation } from "./simulation";
import { createSpatialGrid, moveParticleWithOptimizedCollisions, SpatialGrid } from "./collisions";

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
const STEP_SIZE = TURTLE_SIZE * 2; // at least 2*TURTLE_SIZE

export class BrownianModel extends Model3D {
  numParticles!: number;
  chart!: MSDChart;
  simulation!: Simulation;
  grid!: SpatialGrid;

  // to avoid name collisions
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
    /**
     * Particles start near the center in 3D space
     * Expected MSD plateau: L²/4 for 3D radial distribution
     * Using spherical coordinates with cbrt(random) ensures uniform radial distribution
     * θ ∈ [0, π] (polar angle), φ ∈ [0, 2π] (azimuthal angle)
     */
    const radius = Math.cbrt(Math.random()) * maxRadius; // uniform 3D radial distribution
    const theta = Math.acos(1 - 2 * Math.random()); // polar angle with uniform distribution
    const phi = Math.random() * 2 * Math.PI; // azimuthal angle [0, 2π]
    const x = radius * Math.sin(theta) * Math.cos(phi);
    const y = radius * Math.sin(theta) * Math.sin(phi);
    const z = radius * Math.cos(theta);
    return [x, y, z] as const;
  }

  beginRandomly() {
    /**
     * Particles start randomly distributed across the entire 3D domain
     * Expected MSD plateau: L²/2 for 3D uniform distribution
     * This represents diffusion in an unbounded 3D system
     */
    const x = (Math.random() - 0.5) * this.viewWidth;
    const y = (Math.random() - 0.5) * this.viewHeight;
    const z = (Math.random() - 0.5) * this.viewDepth;
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

      // store initial position for MSD calculation: MSD = ⟨(r(t) - r(0))²⟩
      turtle.initialState = { x0: turtle.x, y0: turtle.y, z0: turtle.z };
    });

    this.chart = new MSDChart(this.turtles);

    // initialize Three.js 3D visualization
    this.simulation = new Simulation(this.turtles, {
      depth: this.viewDepth,
      height: this.viewHeight,
      width: this.viewWidth
    });

    // position the camera to frame the entire world
    this.simulation.adjustCameraToShowWorld();

    // add visual wireframe box to show world boundaries
    this.simulation.addWorldBoundaryBox();

    /**
     * Spatial grid optimization for 3D collision detection
     * Cell size = 2×radius ensures particles within collision range are in adjacent cells
     * This reduces collision checks from O(N²) to O(N×k) where k ≈ 27 cells (3×3×3 cube)
     */
    this.grid = createSpatialGrid(this.turtles, TURTLE_SIZE * 2);
  }

  /**
   * Executed at each tick
   */
  override step() {
    if (!this.turtles || this.turtles.length === 0) {
      return;
    }

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      // optimized collision detection for high particle density (O(N×k) vs O(N²))
      moveParticleWithOptimizedCollisions(turtle, this.world, this.grid);

      // alternative: more realistic elastic collisions (conserves momentum, higher computational cost)
      // moveParticleWithElasticCollision(turtle, this.world, this.turtles);
    });

    // update MSD chart every 10 ticks and render particles
    this.chart.plot(this.ticks, 10);
    this.simulation.drawParticles();
  }
}
