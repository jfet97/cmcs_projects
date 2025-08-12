import { ElasticModel } from "./elasticModel";
import { CONFIG } from "./particleTypes";

// handles UI

class ElasticBrownianApp {
  private model!: ElasticModel;
  private isPaused = false;
  private lastStatsUpdate = 0;

  // UI State Management
  private uiState = {
    particleCount: CONFIG.SMALL_PARTICLES.count,
    particleSpeed: CONFIG.SMALL_PARTICLES.speed,
    worldSize: CONFIG.PHYSICS.worldSize
  };

  constructor() {
    this.initializeUIState();
    this.initializeModel();
    this.setupEventListeners();
    this.startSimulation();
  }

  private initializeUIState() {
    const particleCountSlider = document.getElementById("particle-count") as HTMLInputElement;
    const particleSpeedSlider = document.getElementById("particle-speed") as HTMLInputElement;
    const worldSizeSlider = document.getElementById("world-size") as HTMLInputElement;

    if (particleCountSlider) this.uiState.particleCount = parseInt(particleCountSlider.value);
    if (particleSpeedSlider) this.uiState.particleSpeed = parseFloat(particleSpeedSlider.value);
    if (worldSizeSlider) this.uiState.worldSize = parseInt(worldSizeSlider.value);
  }

  private initializeModel() {
    const size = this.uiState.worldSize;
    this.model = new ElasticModel({ minX: -size, maxX: size, minY: -size, maxY: size });
    this.model.startup();
  }

  private setupEventListeners() {
    // reset button
    const resetBtn = document.getElementById("reset-btn");
    resetBtn?.addEventListener("click", () => this.resetSimulation());

    // pause button
    const pauseBtn = document.getElementById("pause-btn");
    pauseBtn?.addEventListener("click", () => this.togglePause());

    // particle count slider
    const particleCountSlider = document.getElementById("particle-count") as HTMLInputElement;

    particleCountSlider?.addEventListener("input", e => {
      const count = parseInt((e.target as HTMLInputElement).value);

      // TODO: update CONFIG (?)
      this.uiState.particleCount = count;

      this.updateElement("particle-count-value", count.toString());

      // reset simulation with new particle count, preserving current speed
      this.model.resetSimulation(count, this.uiState.particleSpeed);
    });

    // particle speed slider
    const particleSpeedSlider = document.getElementById("particle-speed") as HTMLInputElement;

    particleSpeedSlider?.addEventListener("input", e => {
      const speed = parseFloat((e.target as HTMLInputElement).value);

      // TODO: update CONFIG (?)
      this.uiState.particleSpeed = speed;

      this.updateElement("particle-speed-value", speed.toFixed(1));

      this.model.updateParticleSpeed(speed);
    });

    // world size slider
    const worldSizeSlider = document.getElementById("world-size") as HTMLInputElement;

    worldSizeSlider?.addEventListener("input", e => {
      const size = parseInt((e.target as HTMLInputElement).value);

      // TODO: update CONFIG (?)
      this.uiState.worldSize = size;

      this.updateElement("world-size-value", size.toString());

      // TODO: CONFIG MUST BE UP TO DATE BEFORE CALLING THIS
      this.model.updateWorldSize(size);
    });
  }

  private startSimulation() {
    const animate = () => {
      if (!this.isPaused) {
        this.model.step();
        this.updateStatistics();
      }
      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }

  private updateStatistics() {
    // number of ms since Jan 1, 1970
    const now = Date.now();

    // update statistics every 100ms for smooth UI
    if (now - this.lastStatsUpdate < 100) {
      return;
    }

    // do not access analysis before it is initialized
    if (!this.model.analysis) {
      return;
    }

    this.lastStatsUpdate = now;

    // get statistics and analysis
    const stats = this.model.getStatistics();
    const analysis = this.model.analysis.getAnalysisSummary();

    // update DOM elements with statistics and analysis
    this.updateElement("ticks-value", stats.ticks.toString());
    this.updateElement("msd-value", stats.msd.toFixed(2));
    this.updateElement("collision-count", stats.collisions.toString());
    this.updateElement("velocity-value", stats.velocity.toFixed(2));
    this.updateElement("displacement-value", stats.displacement.toFixed(2));

    // update Brownian motion indicator
    this.updateBrownianIndicator(analysis);
  }

  private updateElement(
    id: string,
    value: string,
    moreover: (element: HTMLElement) => void = () => {}
  ) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      moreover(element);
    }
  }

  private updateBrownianIndicator(
    analysis: ReturnType<typeof this.model.analysis.getAnalysisSummary>
  ) {
    this.updateElement("brownian-indicator", "Analyzing...", indicator => {
      // remove existing classes
      indicator.classList.remove("positive", "negative");

      if (analysis.dataPoints < 50) {
        indicator.textContent = "Initializing...";
        return;
      }

      // TODO: use velocity autocorrelation and Motion Character (?)
      // if (analysis.isBrownianMotion && analysis.msdSlope > 0.01) {
      //   indicator.textContent = "Yes - Detected";
      //   indicator.classList.add("positive");
      // } else if (analysis.msdSlope < 0.001) {
      //   indicator.textContent = "No - Static";
      //   indicator.classList.add("negative");
      // } else {
      //   indicator.textContent = "Developing...";
      // }
    });
  }

  private resetSimulation() {
    this.model.resetSimulation(this.uiState.particleCount, this.uiState.particleSpeed);

    // TODO: canvas is broken, check
    // Canvas size is already handled by resetSimulation() in the model

    // reset UI elements
    this.updateElement("ticks-value", "0");
    this.updateElement("msd-value", "0.00");
    this.updateElement("collision-count", "0");
    this.updateElement("velocity-value", "0.00");
    this.updateElement("displacement-value", "0.00");

    this.updateElement("brownian-indicator", "Initializing...", indicator => {
      indicator.classList.remove("positive", "negative");
    });
  }

  private togglePause() {
    this.isPaused = !this.isPaused;

    this.updateElement("pause-btn", this.isPaused ? "Resume" : "Pause", pauseBtn => {
      pauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
    });
  }

  // public methods for debugging/testing
  public getModel(): ElasticModel {
    return this.model;
  }

  public getStatistics() {
    return this.model.getStatistics();
  }

  public getCurrentUIState() {
    return { ...this.uiState };
  }
}

// initialize the application when DOM is loaded and expose globally for debugging
declare global {
  interface Window {
    elasticBrownianApp: ElasticBrownianApp;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  if (!window.elasticBrownianApp) {
    window.elasticBrownianApp = new ElasticBrownianApp();
  }
});
