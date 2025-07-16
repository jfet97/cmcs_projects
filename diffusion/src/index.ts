import { Model, Turtle, World } from "agentscript";

import { moveParticleWithCollisionAvoidance } from "./collisions";
import { MSDChart } from "./msd";
import { Simulation } from "./simulation";

export interface ParticleState {
  x0: number;
  y0: number;
}

export interface BrownianParticleTurtle extends Turtle {
  initialState: ParticleState;
  stepSize: number;
}

class BrownianModel extends Model {
  numParticles!: number;
  chart!: MSDChart;
  simulation!: Simulation;

  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;

  constructor(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) {
    super(worldBounds);
  }

  beginFromCenter(maxRadius = 10) {
    // the turtle will start quite near the center => plateau L^2 / 6
    const radius = Math.sqrt(Math.random()) * maxRadius; // max radius
    const angle = Math.random() * 2 * Math.PI; // random angle
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    return { x, y };
  }

  beginRandomly() {
    // start randomly in the canvas => plateau L^2 / 3
    const x = (Math.random() - 0.5) * this.canvas.width;
    const y = (Math.random() - 0.5) * this.canvas.height;
    return { x, y };
  }

  /**
   * Executed once, at the beginning, to config the simulation
   */
  override startup(strategy: "center" | "random") {
    this.numParticles = 2500;

    // setup turtles
    this.turtles.create(this.numParticles, (turtle: BrownianParticleTurtle) => {
      let [x, y] = [0, 0];

      switch (strategy) {
        case "center": {
          const { x: _x, y: _y } = this.beginFromCenter(25);
          x = _x;
          y = _y;
          break;
        }
        case "random": {
          const { x: _x, y: _y } = this.beginRandomly();
          x = _x;
          y = _y;
          break;
        }
      }

      turtle.setxy(x, y);

      turtle.stepSize = 4;
      turtle.color = "blue";
      turtle.shape = "circle";
      turtle.size = 1;

      // store initial position
      turtle.initialState = { x0: x, y0: y };
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

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      // should be better with high particles density
      moveParticleWithCollisionAvoidance(turtle, this.world, this.turtles);

      // more realistic
      // moveParticleWithElasticCollision(turtle, this.world, this.turtles);
    });

    this.chart.plot(this.ticks, 10);
    this.simulation.drawParticles();
  }
}

// --- AVVIO SIMULAZIONE CON CONTROLLO FPS ---
document.addEventListener("DOMContentLoaded", () => {
  // Ottieni l'elemento canvas per determinare le sue dimensioni
  const worldElement = document.getElementById("world") as HTMLCanvasElement;
  if (!worldElement) {
    console.error("Elemento #world non trovato!");
    return;
  }

  // Imposta i bounds del modello basati sulle dimensioni reali del canvas
  const halfWidth = worldElement.width / 2;
  const halfHeight = worldElement.height / 2;

  const model = new BrownianModel({
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight
  });

  // Il World viene creato, ma non lo usiamo per il ciclo di animazione.
  new World(model, worldElement);
  // model.setup()

  // Chiamiamo il nostro metodo di avvio.
  model.startup("center");

  // --- LOGICA PER RALLENTARE LA SIMULAZIONE ---

  // 1. Definiamo a quanti "passi al secondo" vogliamo andare.
  //    Meno è, più è lento. 20 è un buon valore per vedere bene.
  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS; // Calcola il tempo in ms tra un passo e l'altro

  let lastTime = 0; // Memorizza il timestamp dell'ultimo passo eseguito

  // 2. La nostra funzione di animazione, che ora controlla il tempo.
  const animate = (currentTime: number) => {
    // Chiamiamo sempre requestAnimationFrame per mantenere il loop attivo.
    requestAnimationFrame(animate);

    // Calcoliamo quanto tempo è passato dall'ultimo passo.
    const elapsed = currentTime - lastTime;

    // 3. Eseguiamo il passo del modello SOLO se è passato abbastanza tempo.
    if (elapsed > frameInterval) {
      // Aggiorniamo il tempo dell'ultimo passo.
      lastTime = currentTime - (elapsed % frameInterval);

      // Eseguiamo un singolo passo della nostra simulazione.
      model.step();
    }
  };

  // 4. Avviamo il ciclo di animazione.
  requestAnimationFrame(animate);
});
