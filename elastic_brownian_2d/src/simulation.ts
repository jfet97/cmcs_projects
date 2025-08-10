import { Turtles } from "agentscript";
import { ElasticParticle, CONFIG } from "./particleTypes";

export class Simulation {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationId = 0;
  // pixels per world unit – by default 1px = 1 world unit for a 1:1 mapping
  private pixelsPerUnit = 1;

  constructor(
    private turtles: Turtles,
    private largeParticle: ElasticParticle
  ) {
    this.initializeCanvas();
  }

  private initializeCanvas() {
    this.canvas = document.getElementById("simulation-canvas") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Cannot find simulation canvas");
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get 2D canvas context");
    }
    this.ctx = ctx;

    // Visual styles only (size is set by resizeCanvasForWorld)
    this.canvas.style.border = "1px solid #ccc";
    this.canvas.style.background = "white";
  }

  public drawParticles(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    if (!this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.pixelsPerUnit, -this.pixelsPerUnit);

    this.turtles.ask((turtle: ElasticParticle) => {
      this.drawParticle(turtle);
    });

    this.drawOriginMarker();
    this.ctx.restore();
  }

  private drawParticle(particle: ElasticParticle) {
    this.ctx.save();

    // Set particle appearance
    if (particle.isLarge) {
      // Large particle - prominent red circle
      this.ctx.fillStyle = CONFIG.LARGE_PARTICLE.color;
      this.ctx.strokeStyle = "darkred";
      this.ctx.lineWidth = 2 / Math.abs(this.ctx.getTransform().a); // Scale line width correctly
    } else {
      // Small particles - subtle light blue circles
      this.ctx.fillStyle = CONFIG.SMALL_PARTICLES.color;
      this.ctx.strokeStyle = "blue";
      this.ctx.lineWidth = 0.5 / Math.abs(this.ctx.getTransform().a); // Scale line width correctly
    }

    // Draw particle with proper size scaling
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

    // Draw subtle crosshairs
    this.ctx.beginPath();
    this.ctx.moveTo(-20, 0);
    this.ctx.lineTo(20, 0);
    this.ctx.moveTo(0, -20);
    this.ctx.lineTo(0, 20);
    this.ctx.stroke();

    this.ctx.restore();
  }



  // Method to update canvas visual size when world changes
  public updateCanvasVisualSize(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const currentWorldWidth = this.canvas.width / this.pixelsPerUnit;
    
    if (Math.abs(worldWidth - currentWorldWidth) < worldWidth * 0.1) return;
    
    const canvasSize = Math.max(400, Math.min(800, worldWidth * 1.5));
    this.pixelsPerUnit = canvasSize / worldWidth;
    this.resizeCanvasForWorld(worldBounds, this.pixelsPerUnit);
  }


  public resizeCanvasForWorld(
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number },
    pixelsPerUnit: number
  ) {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;
    const canvasWidth = worldWidth * pixelsPerUnit;
    const canvasHeight = worldHeight * pixelsPerUnit;

    this.canvas.width = canvasWidth;
    this.canvas.height = canvasHeight;
    this.canvas.style.width = `${canvasWidth}px`;
    this.canvas.style.height = `${canvasHeight}px`;
  }
}
