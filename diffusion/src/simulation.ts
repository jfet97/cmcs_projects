import { Turtles } from "agentscript";
import { type BrownianParticleTurtle } from ".";

export class Simulation {
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  turtles!: Turtles;

  constructor(turtles: Turtles) {
    this.turtles = turtles;

    const canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }
    this.canvas = canvas;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error(`Cannot get 2D canvas' context`);
    }
    this.ctx = ctx;
  }

  drawParticles() {
    if (this.turtles.length === 0) {
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

    // Disegna ogni particella
    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      this.ctx.beginPath();
      this.ctx.arc(turtle.x, turtle.y, turtle.size, 0, 2 * Math.PI);
      this.ctx.fillStyle = turtle.color;
      this.ctx.fill();
    });

    this.ctx.restore();
  }
}
