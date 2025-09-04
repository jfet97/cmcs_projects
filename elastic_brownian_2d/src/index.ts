import { ElasticModel } from "./elasticModel";
import { CONFIG, updateConfig } from "./config";

/**
 * Main application controller that orchestrates the UI and physics simulation.
 * Manages user interactions, displays real-time statistics, and coordinates
 * the elastic collision-based Brownian motion simulation.
 */
class ElasticBrownianApp {
  private model!: ElasticModel;
  private isPaused = false;
  private lastStatsUpdate = 0;

  // UI State Management

  // UI elements
  private particleCountSlider!: HTMLInputElement;
  private particleCountValue!: HTMLElement;
  private particleTemperatureSlider!: HTMLInputElement;
  private particleTemperatureValue!: HTMLElement;
  private worldSizeSlider!: HTMLInputElement;
  private worldSizeValue!: HTMLElement;
  private resetBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private ticksValue!: HTMLElement;
  private collisionCount!: HTMLElement;
  private velocityValue!: HTMLElement;
  private velocityDecayTime!: HTMLElement;
  private velocityDataPoints!: HTMLElement;
  private brownianIndicator!: HTMLElement;

  constructor() {
    this.initUI();
    this.initializeModel();
    this.startSimulation();
  }

  private initUI() {
    const particleCountSlider = document.getElementById("particle-count");
    const particleCountValue = document.getElementById("particle-count-value");
    const particleTemperatureSlider = document.getElementById("particle-temperature");
    const particleTemperatureValue = document.getElementById("particle-temperature-value");
    const worldSizeSlider = document.getElementById("world-size");
    const worldSizeValue = document.getElementById("world-size-value");
    const resetBtn = document.getElementById("reset-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const ticksValue = document.getElementById("ticks-value");
    const collisionCount = document.getElementById("collision-count");
    const velocityValue = document.getElementById("velocity-value");
    const velocityDecayTime = document.getElementById("velocity-decay-time");
    const velocityDataPoints = document.getElementById("velocity-data-points");
    const brownianIndicator = document.getElementById("brownian-indicator");

    if (!particleCountSlider) {
      throw new Error("Particle count slider with id 'particle-count' not found");
    } else {
      this.particleCountSlider = particleCountSlider as HTMLInputElement;

      this.particleCountSlider.value = CONFIG.SMALL_PARTICLES.count.toString();
      this.particleCountSlider.addEventListener("input", e => {
        const count = parseInt((e.target as HTMLInputElement).value);

        updateConfig({
          smallParticles: {
            count
          }
        });

        this.updateElementTextContent(this.particleCountValue, count.toString());
        // reset simulation with new particle count
        this.model.resetSimulation("count");
      });
    }

    if (!particleCountValue) {
      throw new Error("Particle count value element with id 'particle-count-value' not found");
    } else {
      this.particleCountValue = particleCountValue as HTMLElement;

      this.updateElementTextContent(
        this.particleCountValue,
        CONFIG.SMALL_PARTICLES.count.toString()
      );
    }

    if (!particleTemperatureSlider) {
      throw new Error("Particle temperature slider with id 'particle-temperature' not found");
    } else {
      this.particleTemperatureSlider = particleTemperatureSlider as HTMLInputElement;

      this.particleTemperatureSlider.value = CONFIG.SMALL_PARTICLES.temperature.toString();
      this.particleTemperatureSlider.addEventListener("input", e => {
        const temperature = parseFloat((e.target as HTMLInputElement).value);

        updateConfig({
          smallParticles: {
            temperature
          }
        });

        this.updateElementTextContent(this.particleTemperatureValue, temperature.toFixed(1));
        this.model.resetSimulation("temperature");
      });
    }

    if (!particleTemperatureValue) {
      throw new Error(
        "Particle temperature value element with id 'particle-temperature-value' not found"
      );
    } else {
      this.particleTemperatureValue = particleTemperatureValue as HTMLElement;

      this.updateElementTextContent(
        this.particleTemperatureValue,
        CONFIG.SMALL_PARTICLES.temperature.toFixed(1)
      );
    }

    if (!worldSizeSlider) {
      throw new Error("World size slider with id 'world-size' not found");
    } else {
      this.worldSizeSlider = worldSizeSlider as HTMLInputElement;

      this.worldSizeSlider.value = CONFIG.PHYSICS.worldSize.toString();
      this.worldSizeSlider.addEventListener("input", e => {
        const size = parseInt((e.target as HTMLInputElement).value);

        updateConfig({
          physics: {
            worldSize: size
          }
        });

        this.updateElementTextContent(this.worldSizeValue, size.toString());
        const state = this.model.getState();
        this.model.destroy();
        this.model = new ElasticModel({
          minX: -CONFIG.PHYSICS.worldSize,
          maxX: CONFIG.PHYSICS.worldSize,
          minY: -CONFIG.PHYSICS.worldSize,
          maxY: CONFIG.PHYSICS.worldSize
        });
        this.model.startup(state);
      });
    }

    if (!worldSizeValue) {
      throw new Error("World size value element with id 'world-size-value' not found");
    } else {
      this.worldSizeValue = worldSizeValue as HTMLElement;

      this.updateElementTextContent(this.worldSizeValue, CONFIG.PHYSICS.worldSize.toString());
    }

    if (!resetBtn) {
      throw new Error("Reset button with id 'reset-btn' not found");
    } else {
      this.resetBtn = resetBtn as HTMLButtonElement;

      this.resetBtn.addEventListener("click", () => {
        // reset UI elements - only essential ones
        this.updateElementTextContent(this.ticksValue, "0");
        this.updateElementTextContent(this.collisionCount, "0");
        this.updateElementTextContent(this.velocityValue, "0.00");
        this.updateElementTextContent(this.velocityDecayTime, "N/A");
        this.updateElementTextContent(this.velocityDataPoints, "0");

        this.model.resetSimulation("all");

        this.updateElementTextContent(this.brownianIndicator, "Initializing...", indicator => {
          indicator.classList.remove("positive", "negative");
        });
      });
    }

    if (!pauseBtn) {
      throw new Error("Pause button with id 'pause-btn' not found");
    } else {
      this.pauseBtn = pauseBtn as HTMLButtonElement;

      this.pauseBtn.addEventListener("click", () => {
        this.isPaused = !this.isPaused;
        this.updateElementTextContent(this.pauseBtn, this.isPaused ? "Resume" : "Pause");
      });
    }

    if (!ticksValue) {
      throw new Error("Ticks value element with id 'ticks-value' not found");
    } else {
      this.ticksValue = ticksValue;
      this.ticksValue.textContent = "0";
    }

    if (!collisionCount) {
      throw new Error("Collision count element with id 'collision-count' not found");
    } else {
      this.collisionCount = collisionCount;
      this.collisionCount.textContent = "0";
    }

    if (!velocityValue) {
      throw new Error("Velocity value element with id 'velocity-value' not found");
    } else {
      this.velocityValue = velocityValue;
      this.velocityValue.textContent = "0.00";
    }

    if (!velocityDecayTime) {
      throw new Error("Velocity decay time element with id 'velocity-decay-time' not found");
    } else {
      this.velocityDecayTime = velocityDecayTime;
      this.velocityDecayTime.textContent = "N/A";
    }

    if (!velocityDataPoints) {
      throw new Error("Velocity data points element with id 'velocity-data-points' not found");
    } else {
      this.velocityDataPoints = velocityDataPoints;
      this.velocityDataPoints.textContent = "0";
    }

    if (!brownianIndicator) {
      throw new Error("Brownian indicator element with id 'brownian-indicator' not found");
    } else {
      this.brownianIndicator = brownianIndicator;
    }
  }

  private initializeModel() {
    this.model = new ElasticModel({
      minX: -CONFIG.PHYSICS.worldSize,
      maxX: CONFIG.PHYSICS.worldSize,
      minY: -CONFIG.PHYSICS.worldSize,
      maxY: CONFIG.PHYSICS.worldSize
    });
    this.model.startup();
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

    // get statistics and analysis
    const stats = this.model.getStatistics();
    const analysis = this.model.analysis.getAnalysisSummary();

    // update DOM elements with basic statistics
    this.updateElementTextContent(this.ticksValue, stats.ticks.toString());
    this.updateElementTextContent(this.collisionCount, stats.collisions.toString());
    this.updateElementTextContent(this.velocityValue, stats.velocity.toFixed(2));
    this.updateElementTextContent(this.velocityDecayTime, analysis.velocityDecayTime.toFixed(0));
    this.updateElementTextContent(this.velocityDataPoints, analysis.velocityDataPoints.toString());

    // update Brownian motion indicator
    this.updateBrownianIndicator(analysis);

    // update last stats timestamp
    this.lastStatsUpdate = now;
  }

  private updateBrownianIndicator(
    analysis: ReturnType<typeof this.model.analysis.getAnalysisSummary>
  ) {
    this.updateElementTextContent(this.brownianIndicator, "Analyzing...", indicator => {
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

  private updateElementTextContent<E extends HTMLElement>(
    e: E,
    value: string,
    moreover: (element: E) => void = () => {}
  ) {
    e.textContent = value;
    moreover(e);
  }

  // public methods for debugging/testing
  public getModel(): ElasticModel {
    return this.model;
  }

  public getStatistics() {
    return this.model.getStatistics();
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
