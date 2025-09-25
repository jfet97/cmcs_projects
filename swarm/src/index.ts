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
let singleAgentCheckbox: HTMLInputElement;

function initializeUI() {
  // get UI elements
  nSlider = document.getElementById("n-slider") as HTMLInputElement;
  nValue = document.getElementById("n-value") as HTMLElement;
  etaSlider = document.getElementById("eta-slider") as HTMLInputElement;
  etaValue = document.getElementById("eta-value") as HTMLElement;
  orderValue = document.getElementById("order-value") as HTMLElement;
  singleAgentCheckbox = document.getElementById("single-agent") as HTMLInputElement;

  if (!nSlider || !nValue || !etaSlider || !etaValue || !orderValue || !singleAgentCheckbox) {
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

  singleAgentCheckbox.addEventListener("change", () => {
    const singleMode = singleAgentCheckbox.checked;
    const targetAgents = singleMode ? 1 : parseInt(nSlider.value);
    model.setNumAgents(targetAgents);

    // disable/enable the slider based on checkbox state
    nSlider.disabled = singleMode;
    if (singleMode) {
      nValue.textContent = "1";
    } else {
      nValue.textContent = nSlider.value;
    }
  });
}

function initializeSimulation() {
  // create model
  model = new VicsekModel();
  model.setup();

  // create visualization with world bounds
  const worldBounds = {
    minX: -12,
    maxX: 12,
    minY: -12,
    maxY: 12
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