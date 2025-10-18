import { VicsekModel3D } from "./vicsekModel3D";
import { SwarmVisualization3D } from "./swarmVisualization3D";

// global variables
let model: VicsekModel3D;
let visualization: SwarmVisualization3D;

// ui elements
let nSlider: HTMLInputElement;
let nValue: HTMLElement;
let etaSlider: HTMLInputElement;
let etaValue: HTMLElement;
let orderValue: HTMLElement;
let singleAgentCheckbox: HTMLInputElement;
let resetAllBtn: HTMLButtonElement;
let restartSimBtn: HTMLButtonElement;

// flocking behavior controls
let interactionSlider: HTMLInputElement;
let interactionValue: HTMLElement;
let separationDistanceSlider: HTMLInputElement;
let separationDistanceValue: HTMLElement;
let separationStrengthSlider: HTMLInputElement;
let separationStrengthValue: HTMLElement;
let cohesionStrengthSlider: HTMLInputElement;
let cohesionStrengthValue: HTMLElement;

function initializeUI() {
  // get UI elements
  nSlider = document.getElementById("n-slider") as HTMLInputElement;
  nValue = document.getElementById("n-value") as HTMLElement;
  etaSlider = document.getElementById("eta-slider") as HTMLInputElement;
  etaValue = document.getElementById("eta-value") as HTMLElement;
  orderValue = document.getElementById("order-value") as HTMLElement;
  singleAgentCheckbox = document.getElementById("single-agent") as HTMLInputElement;
  resetAllBtn = document.getElementById("reset-all-btn") as HTMLButtonElement;
  restartSimBtn = document.getElementById("restart-sim-btn") as HTMLButtonElement;

  // flocking behavior controls
  interactionSlider = document.getElementById("interaction-slider") as HTMLInputElement;
  interactionValue = document.getElementById("interaction-value") as HTMLElement;
  separationDistanceSlider = document.getElementById(
    "separation-distance-slider"
  ) as HTMLInputElement;
  separationDistanceValue = document.getElementById("separation-distance-value") as HTMLElement;
  separationStrengthSlider = document.getElementById(
    "separation-strength-slider"
  ) as HTMLInputElement;
  separationStrengthValue = document.getElementById("separation-strength-value") as HTMLElement;
  cohesionStrengthSlider = document.getElementById("cohesion-strength-slider") as HTMLInputElement;
  cohesionStrengthValue = document.getElementById("cohesion-strength-value") as HTMLElement;

  if (
    !nSlider ||
    !nValue ||
    !etaSlider ||
    !etaValue ||
    !orderValue ||
    !singleAgentCheckbox ||
    !resetAllBtn ||
    !restartSimBtn ||
    !interactionSlider ||
    !interactionValue ||
    !separationDistanceSlider ||
    !separationDistanceValue ||
    !separationStrengthSlider ||
    !separationStrengthValue ||
    !cohesionStrengthSlider ||
    !cohesionStrengthValue
  ) {
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

  // flocking behavior event listeners
  interactionSlider.addEventListener("input", () => {
    const newRadius = parseFloat(interactionSlider.value);
    interactionValue.textContent = newRadius.toFixed(1);
    model.setInteractionRadius(newRadius);
  });

  separationDistanceSlider.addEventListener("input", () => {
    const newDistance = parseFloat(separationDistanceSlider.value);
    separationDistanceValue.textContent = newDistance.toFixed(2);
    model.setSeparationDistance(newDistance);
  });

  separationStrengthSlider.addEventListener("input", () => {
    const newStrength = parseFloat(separationStrengthSlider.value);
    separationStrengthValue.textContent = newStrength.toFixed(1);
    model.setSeparationStrength(newStrength);
  });

  cohesionStrengthSlider.addEventListener("input", () => {
    const newStrength = parseFloat(cohesionStrengthSlider.value);
    cohesionStrengthValue.textContent = newStrength.toFixed(1);
    model.setCohesionStrength(newStrength);
  });

  // reset button event listeners
  resetAllBtn.addEventListener("click", () => {
    window.location.reload();
  });

  restartSimBtn.addEventListener("click", () => {
    model.setup(); // reinitialize agents with new random positions
  });
}

function initializeSimulation() {
  // create 3D model
  model = new VicsekModel3D();
  model.setup();

  // create 3D visualization with world bounds
  const worldDimensions = {
    width: 24,
    height: 24,
    depth: 24
  };
  visualization = new SwarmVisualization3D(model.turtles, worldDimensions);

  // position the camera to frame the entire 3D world
  visualization.adjustCameraToShowWorld();

  // add a visual box to see the world boundaries
  visualization.addWorldBoundaryBox();

  console.log(`Initialized Vicsek 3D model with ${model.numAgents} agents`);
}

function animate() {
  // step the model
  model.step();

  // update 3D visualization
  visualization.drawAgents();

  // update order parameter display with fixed width to prevent flickering
  orderValue.textContent = model.orderParameter.toFixed(3);

  // continue animation
  requestAnimationFrame(animate);
}

function startSimulation() {
  console.log("Starting Vicsek 3D swarm simulation...");
  animate();
}

// main entry point
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing Vicsek 3D swarm simulation");

  try {
    initializeUI();
    initializeSimulation();
    startSimulation();
  } catch (error) {
    console.error("Failed to initialize 3D simulation:", error);
  }
});
