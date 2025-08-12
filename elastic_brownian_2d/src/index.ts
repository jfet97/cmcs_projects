import { ElasticModel } from "./elasticModel";
import { CONFIG } from "./particleTypes";

// handles UI

class ElasticBrownianApp {
  private model!: ElasticModel;
  private isPaused = false;
  private lastStatsUpdate = 0;

  // UI State Management
  private uiState = {
    particleCount: CONFIG.SMALL_PARTICLES.count, // Now 2000
    particleTemperature: CONFIG.SMALL_PARTICLES.temperature, // Now 0.5
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
    const particleTemperatureSlider = document.getElementById(
      "particle-temperature"
    ) as HTMLInputElement;
    const worldSizeSlider = document.getElementById("world-size") as HTMLInputElement;

    if (particleCountSlider) this.uiState.particleCount = parseInt(particleCountSlider.value);
    if (particleTemperatureSlider)
      this.uiState.particleTemperature = parseFloat(particleTemperatureSlider.value);
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
      this.uiState.particleCount = count;
      this.updateElement("particle-count-value", count.toString());
      // reset simulation with new particle count
      this.model.resetSimulation(count, this.uiState.particleTemperature);
    });

    // particle temperature slider
    const particleTemperatureSlider = document.getElementById(
      "particle-temperature"
    ) as HTMLInputElement;

    particleTemperatureSlider?.addEventListener("input", e => {
      const temperature = parseFloat((e.target as HTMLInputElement).value);
      this.uiState.particleTemperature = temperature;
      this.updateElement("particle-temperature-value", temperature.toFixed(1));
      this.model.updateParticleTemperature(temperature);
    });

    // world size slider
    const worldSizeSlider = document.getElementById("world-size") as HTMLInputElement;

    worldSizeSlider?.addEventListener("input", e => {
      const size = parseInt((e.target as HTMLInputElement).value);
      this.uiState.worldSize = size;
      this.updateElement("world-size-value", size.toString());
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

    // update DOM elements with basic statistics
    this.updateElement("ticks-value", stats.ticks.toString());
    this.updateElement("collision-count", stats.collisions.toString());
    this.updateElement("velocity-value", stats.velocity.toFixed(2));
    this.updateElement("velocity-decay-time", analysis.velocityDecayTime.toFixed(0));
    this.updateElement("velocity-data-points", analysis.velocityDataPoints.toString());

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

      // need sufficient data for analysis
      if (analysis.velocityDataPoints < 30 || analysis.autocorrelationDataPoints < 5) {
        indicator.textContent = "Initializing...";
        return;
      }

      // detection based only on velocity autocorrelation
      if (analysis.isBrownianByAutocorrelation) {
        indicator.textContent = "✅ Brownian Motion";
        indicator.classList.add("positive");
      } else if (analysis.currentVelocity < 0.01) {
        indicator.textContent = "❌ Static";
        indicator.classList.add("negative");
      } else {
        // debug info for developing state
        const lag3 = analysis.velocityAutocorrelationLag3;
        const debugInfo =
          lag3 !== null
            ? `(lag3: ${lag3.toFixed(2)})`
            : `(${analysis.autocorrelationDataPoints} pts)`;
        indicator.textContent = `🔄 Developing... ${debugInfo}`;
      }
    });
  }

  private resetSimulation() {
    this.model.resetSimulation(this.uiState.particleCount, this.uiState.particleTemperature);

    // reset UI elements - only essential ones
    this.updateElement("ticks-value", "0");
    this.updateElement("collision-count", "0");
    this.updateElement("velocity-value", "0.00");
    this.updateElement("velocity-decay-time", "N/A");
    this.updateElement("velocity-data-points", "0");

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
