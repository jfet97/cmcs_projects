import { Turtles } from "agentscript";
import { ElasticParticle, CONFIG } from "./particleTypes";

export class Simulation {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationId = 0;

  constructor(
    private turtles: Turtles,
    private largeParticle: ElasticParticle,
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ) {
    this.initializeCanvas(worldBounds);
  }

  private initializeCanvas(worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    this.canvas = document.getElementById("simulation-canvas") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Cannot find simulation canvas");
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get 2D canvas context");
    }
    this.ctx = ctx;

    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;

    this.canvas.width = worldWidth;
    this.canvas.height = worldHeight;
    this.canvas.style.width = `${worldWidth}px`;
    this.canvas.style.height = `${worldHeight}px`;

    // visual styles only (size is set by resizeCanvasForWorld)
    this.canvas.style.border = "1px solid #ccc";
    this.canvas.style.background = "white";
  }

  public drawParticles() {
    if (!this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

    this.turtles.ask((turtle: ElasticParticle) => {
      this.drawParticle(turtle);
    });

    this.drawOriginMarker();

    this.ctx.restore();
  }

  private drawParticle(particle: ElasticParticle) {
    this.ctx.save();

    // set particle appearance
    if (particle.isLarge) {
      // prominent red circle
      this.ctx.fillStyle = CONFIG.LARGE_PARTICLE.color;
      this.ctx.strokeStyle = "darkred";
      this.ctx.lineWidth = 2;
    } else {
      // Small particles - subtle light blue circles
      this.ctx.fillStyle = CONFIG.SMALL_PARTICLES.color;
      this.ctx.strokeStyle = "blue";
      this.ctx.lineWidth = 0.5;
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
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);

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
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;

    if (this.canvas.width === worldWidth && this.canvas.height === worldHeight) return;

    this.canvas.width = worldWidth;
    this.canvas.height = worldHeight;
    this.canvas.style.width = `${worldWidth}px`;
    this.canvas.style.height = `${worldHeight}px`;
  }
}
