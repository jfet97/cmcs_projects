import { Turtles } from "agentscript";
import { ElasticParticle, CONFIG } from "./particleTypes";

export class Simulation {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private animationId: number = 0;

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

    // Set canvas size
    this.canvas.width = CONFIG.PHYSICS.worldSize * 2;
    this.canvas.height = CONFIG.PHYSICS.worldSize * 2;
    
    // Set canvas style for clean appearance
    this.canvas.style.border = "1px solid #ccc";
    this.canvas.style.background = "white";
  }

  public drawParticles() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Transform coordinates: world coordinates to canvas coordinates
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(1, -1); // Flip Y axis to match mathematical coordinates

    // Draw all particles
    this.turtles.ask((turtle: ElasticParticle) => {
      this.drawParticle(turtle);
    });

    // Draw subtle crosshairs at origin for reference
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
      this.ctx.lineWidth = 2;
    } else {
      // Small particles - subtle light blue circles
      this.ctx.fillStyle = CONFIG.SMALL_PARTICLES.color;
      this.ctx.strokeStyle = "blue";
      this.ctx.lineWidth = 0.5;
    }

    // Draw particle
    this.ctx.beginPath();
    this.ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.stroke();

    // Optional: Draw velocity vector for large particle (can be enabled for debugging)
    if (particle.isLarge && this.shouldDrawVelocityVector()) {
      this.drawVelocityVector(particle);
    }

    this.ctx.restore();
  }

  private drawVelocityVector(particle: ElasticParticle) {
    const velocityMagnitude = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
    
    // Only draw if velocity is significant
    if (velocityMagnitude < 0.5) return;

    // Scale velocity for visibility (but keep it reasonable)
    const scale = Math.min(20, 100 / velocityMagnitude);
    const endX = particle.x + particle.vx * scale;
    const endY = particle.y + particle.vy * scale;

    this.ctx.save();
    this.ctx.strokeStyle = "darkred";
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([2, 2]);

    // Draw arrow line
    this.ctx.beginPath();
    this.ctx.moveTo(particle.x, particle.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Draw arrow head
    const angle = Math.atan2(particle.vy, particle.vx);
    const arrowLength = 5;
    
    this.ctx.setLineDash([]);
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle - Math.PI / 6),
      endY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(
      endX - arrowLength * Math.cos(angle + Math.PI / 6),
      endY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
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

  private shouldDrawVelocityVector(): boolean {
    // Can be controlled by a UI toggle or configuration
    // For now, return false for clean visualization
    return false;
  }

  // Method to enable/disable velocity vector drawing
  public toggleVelocityVectors() {
    // Implementation for UI control if needed
  }

  // Method to get canvas for external manipulation if needed
  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  // Method to get current canvas image data (for screenshots, etc.)
  public getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }
}