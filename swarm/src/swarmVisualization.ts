import { Turtles } from "agentscript";
import { VicsekAgent } from "./vicsekModel";

export class SwarmVisualization {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private agents!: Turtles;
  private pixelsPerUnit = 1;
  private devicePixelRatio = window.devicePixelRatio || 1;

  constructor(
    agents: Turtles,
    worldBounds: { minX: number; maxX: number; minY: number; maxY: number }
  ) {
    this.agents = agents;
    this.initializeCanvas(worldBounds);
  }

  private initializeCanvas(worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    this.canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get 2D canvas context");
    }
    this.ctx = ctx;

    this.setupCanvasDimensions(worldBounds);

    // visual styles
    this.canvas.style.border = "2px solid #555";
    this.canvas.style.background = "#000";
  }

  private setupCanvasDimensions(worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }) {
    const worldWidth = worldBounds.maxX - worldBounds.minX;
    const worldHeight = worldBounds.maxY - worldBounds.minY;

    // calculate display size - make it fit nicely in 735
    const displaySize = 735;
    const displayWidth = displaySize;
    const displayHeight = displaySize;

    // set canvas buffer dimensions (actual resolution)
    this.canvas.width = displayWidth * this.devicePixelRatio;
    this.canvas.height = displayHeight * this.devicePixelRatio;

    // set canvas display dimensions (visual size in CSS)
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // calculate pixels per world unit
    this.pixelsPerUnit = (displaySize / Math.max(worldWidth, worldHeight)) * this.devicePixelRatio;
  }

  public drawAgents() {
    if (!this.canvas || !this.ctx || this.agents.length === 0) {
      return;
    }

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

    // draw each agent
    this.agents.ask((agent: VicsekAgent) => {
      this.drawAgent(agent);
    });

    this.ctx.restore();
  }

  private drawAgent(agent: VicsekAgent) {
    const size = 0.08; // triangle size in world units

    this.ctx.save();
    this.ctx.translate(agent.x, agent.y);
    this.ctx.rotate(agent.direction);

    // draw triangle pointing to the right (direction 0)
    this.ctx.beginPath();
    this.ctx.moveTo(size, 0); // tip
    this.ctx.lineTo(-size / 2, size / 2); // bottom left
    this.ctx.lineTo(-size / 2, -size / 2); // top left
    this.ctx.closePath();

    // color based on direction for visual effect
    const hue = ((agent.direction * 180) / Math.PI + 180) % 360;
    this.ctx.fillStyle = `hsl(${hue}, 80%, 60%)`;
    this.ctx.fill();

    // add a small white outline for visibility
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = 0.02; // line width in world units
    this.ctx.stroke();

    this.ctx.restore();
  }
}
