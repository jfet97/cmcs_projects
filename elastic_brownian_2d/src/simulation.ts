import { Turtles, WorldBounds } from "agentscript";
import { ElasticParticle } from "./particleTypes";
import { CONFIG } from "./config";

/**
 * Canvas rendering system for the elastic Brownian motion simulation.
 * Handles coordinate transformation, particle visualization, and high-DPI display support.
 *
 * Transforms world coordinates (physics space with origin at center, Y-axis up) to canvas coordinates.
 * Renders large red particle and small blue thermal particles with physics-accurate sizes.
 * Provides dynamic canvas sizing and device pixel ratio scaling for crisp display.
 */
export class Simulation {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationId = 0;
  private pixelsPerUnit = 1; // higher resolution scaling
  private devicePixelRatio = window.devicePixelRatio || 1;

  constructor(
    private turtles: Turtles,
    private largeParticle: ElasticParticle,
    worldBounds: WorldBounds
  ) {
    this.initializeCanvas(worldBounds);
  }

  private initializeCanvas(worldBounds: WorldBounds) {
    this.canvas = document.getElementById("simulation-canvas") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Cannot find simulation canvas");
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get 2D canvas context");
    }
    this.ctx = ctx;

    this.setupCanvasDimensions(worldBounds);

    // visual styles
    this.canvas.style.border = "1px solid #ccc";
    this.canvas.style.background = "white";
  }

  private setupCanvasDimensions(worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;

    // calculate display size (what user sees in CSS)
    const displayWidth = worldWidth;
    const displayHeight = worldHeight;

    // set canvas buffer dimensions (actual resolution)
    this.canvas.width = displayWidth * this.devicePixelRatio;
    this.canvas.height = displayHeight * this.devicePixelRatio;

    // set canvas display dimensions (visual size in CSS)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // update pixelsPerUnit to account for devicePixelRatio in rendering
    this.pixelsPerUnit = this.devicePixelRatio;
  }

  public drawParticles() {
    if (!this.canvas || !this.ctx) return;

    // clear entire canvas in actual pixel coordinates
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    // set up world coordinate system
    this.ctx.save();
    this.ctx.scale(this.pixelsPerUnit, this.pixelsPerUnit);
    this.ctx.translate(
      this.canvas.width / (2 * this.pixelsPerUnit),
      this.canvas.height / (2 * this.pixelsPerUnit)
    );

    this.turtles.ask((turtle: ElasticParticle) => {
      this.drawParticle(turtle);
    });

    this.drawOriginMarker();

    this.ctx.restore();
  }

  private drawParticle(particle: ElasticParticle) {
    this.ctx.save();

    // set particle appearance with better visibility
    if (particle.isLarge) {
      // prominent red circle
      this.ctx.fillStyle = CONFIG.LARGE_PARTICLE.color;
      this.ctx.strokeStyle = "darkred";
      this.ctx.lineWidth = 2.5 / this.pixelsPerUnit; // scale line width to world units
    } else {
      // small particles - more visible light blue circles
      this.ctx.fillStyle = CONFIG.SMALL_PARTICLES.color;
      this.ctx.strokeStyle = "blue";
      this.ctx.lineWidth = 1.5 / this.pixelsPerUnit; // scale line width to world units
    }

    // draw particle with proper size scaling
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.restore();
  }

  private drawOriginMarker() {
    this.ctx.save();
    this.ctx.strokeStyle = "#ddd";
    this.ctx.lineWidth = 1 / this.pixelsPerUnit; // scale line width to world units
    this.ctx.setLineDash([5 / this.pixelsPerUnit, 5 / this.pixelsPerUnit]); // scale dash pattern

    // draw subtle crosshairs
    this.ctx.beginPath();
    this.ctx.moveTo(-20, 0);
    this.ctx.lineTo(20, 0);
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(0, 20);
    this.ctx.stroke();

    this.ctx.restore();
  }

  // update canvas visual size when world changes
  public updateCanvasVisualSize(worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    this.setupCanvasDimensions(worldBounds);
  }
}
