import { VicsekModel } from "./vicsekModel";
import { SwarmVisualization } from "./swarmVisualization";

// global variables
let model: VicsekModel;
let visualization: SwarmVisualization;
let animationId: number;

// UI elements
let nSlider: HTMLInputElement;
let nValue: HTMLElement;
let etaSlider: HTMLInputElement;
let etaValue: HTMLElement;
let orderValue: HTMLElement;

function initializeUI() {
  // get UI elements
  nSlider = document.getElementById("n-slider") as HTMLInputElement;
  nValue = document.getElementById("n-value") as HTMLElement;
  etaSlider = document.getElementById("eta-slider") as HTMLInputElement;
  etaValue = document.getElementById("eta-value") as HTMLElement;
  orderValue = document.getElementById("order-value") as HTMLElement;

  if (!nSlider || !nValue || !etaSlider || !etaValue || !orderValue) {
    throw new Error("Required UI elements not found");
  }

  // setup event listeners
  nSlider.addEventListener("input", () => {
    const newN = parseInt(nSlider.value);
    nValue.textContent = newN.toString();
    model.setNumAgents(newN);
  });

  etaSlider.addEventListener("input", () => {
    const newEta = parseFloat(etaSlider.value);
    etaValue.textContent = newEta.toFixed(2);
    model.setNoiseLevel(newEta);
  });
}

function initializeSimulation() {
  // create model
  model = new VicsekModel();
  model.setup();

  // create visualization with world bounds
  const worldBounds = {
    minX: -4,
    maxX: 4,
    minY: -4,
    maxY: 4
  };
  visualization = new SwarmVisualization(model.turtles, worldBounds);

  console.log(`Initialized Vicsek model with ${model.numAgents} agents`);
}

function animate() {
  // step the model
  model.step();

  // update visualization
  visualization.drawAgents();

  // update order parameter display
  orderValue.textContent = model.orderParameter.toFixed(3);

  // continue animation
  animationId = requestAnimationFrame(animate);
}

function startSimulation() {
  console.log("Starting Vicsek swarm simulation...");
  animate();
}

// main entry point
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Vicsek swarm simulation");

  try {
    initializeUI();
    initializeSimulation();
    startSimulation();
  } catch (error) {
    console.error("Failed to initialize simulation:", error);
  }
});