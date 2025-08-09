import { ElasticModel } from "./elasticModel";
import { CONFIG } from "./particleTypes";

class ElasticBrownianApp {
  private model!: ElasticModel;
  private animationId = 0;
  private isPaused = false;
  private lastStatsUpdate = 0;

  constructor() {
    this.initializeModel();
    this.setupEventListeners();
    this.startSimulation();
  }

  private initializeModel() {
    const worldSize = CONFIG.PHYSICS.worldSize;
    const viewSize = worldSize * 2;

    this.model = new ElasticModel(
      { minX: -worldSize, maxX: worldSize, minY: -worldSize, maxY: worldSize },
      viewSize,
      viewSize
    );

    this.model.startup();
  }

  private setupEventListeners() {
    // Reset button
    const resetBtn = document.getElementById("reset-btn");
    resetBtn?.addEventListener("click", () => this.resetSimulation());

    // Pause button
    const pauseBtn = document.getElementById("pause-btn");
    pauseBtn?.addEventListener("click", () => this.togglePause());

    // Reset MSD button
    const resetMsdBtn = document.getElementById("reset-msd-btn");
    resetMsdBtn?.addEventListener("click", () => this.resetMSD());

    // Particle count slider
    const particleCountSlider = document.getElementById("particle-count") as HTMLInputElement;
    const particleCountValue = document.getElementById("particle-count-value");

    particleCountSlider?.addEventListener("input", e => {
      const count = parseInt((e.target as HTMLInputElement).value);
      if (particleCountValue) {
        particleCountValue.textContent = count.toString();
      }
      // Reset simulation with new particle count
      this.model.resetSimulation(count);
    });

    // Particle speed slider
    const particleSpeedSlider = document.getElementById("particle-speed") as HTMLInputElement;
    const particleSpeedValue = document.getElementById("particle-speed-value");

    particleSpeedSlider?.addEventListener("input", e => {
      const speed = parseFloat((e.target as HTMLInputElement).value);
      if (particleSpeedValue) {
        particleSpeedValue.textContent = speed.toFixed(1);
      }
      this.model.updateParticleSpeed(speed);
    });

    // World size slider
    const worldSizeSlider = document.getElementById("world-size") as HTMLInputElement;
    const worldSizeValue = document.getElementById("world-size-value");

    worldSizeSlider?.addEventListener("input", e => {
      const size = parseInt((e.target as HTMLInputElement).value);
      if (worldSizeValue) {
        worldSizeValue.textContent = size.toString();
      }
      this.model.updateWorldSize(size);
    });

    // Handle window resize
    window.addEventListener("resize", () => this.handleResize());
  }

  private startSimulation() {
    const animate = () => {
      if (!this.isPaused) {
        this.model.step();
        this.updateStatistics();
      }

      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  private updateStatistics() {
    const now = Date.now();

    // Update statistics every 100ms for smooth UI
    if (now - this.lastStatsUpdate < 100) {
      return;
    }

    this.lastStatsUpdate = now;
    const stats = this.model.getStatistics();
    const analysis = this.model.analysis.getAnalysisSummary();

    // Update DOM elements
    this.updateElement("ticks-value", stats.ticks.toString());
    this.updateElement("msd-value", stats.msd.toFixed(2));
    this.updateElement("collision-count", stats.collisions.toString());
    this.updateElement("velocity-value", stats.velocity.toFixed(2));
    this.updateElement("displacement-value", stats.displacement.toFixed(2));

    // Update particle count display
    const particleCountValue = document.getElementById("particle-count-value");
    if (particleCountValue) {
      particleCountValue.textContent = stats.smallParticleCount.toString();
    }

    // Update Brownian motion indicator
    this.updateBrownianIndicator(analysis);
  }

  private updateElement(id: string, value: string) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  private updateBrownianIndicator(
    analysis: ReturnType<typeof this.model.analysis.getAnalysisSummary>
  ) {
    const indicator = document.getElementById("brownian-indicator");
    if (!indicator) return;

    // Remove existing classes
    indicator.classList.remove("positive", "negative");

    if (analysis.dataPoints < 50) {
      indicator.textContent = "Initializing...";
      return;
    }

    if (analysis.isBrownianMotion && analysis.msdSlope > 0.01) {
      indicator.textContent = "Yes - Detected";
      indicator.classList.add("positive");
    } else if (analysis.msdSlope < 0.001) {
      indicator.textContent = "No - Static";
      indicator.classList.add("negative");
    } else {
      indicator.textContent = "Developing...";
    }
  }

  private resetSimulation() {
    this.model.resetSimulation();

    // Reset UI elements
    this.updateElement("ticks-value", "0");
    this.updateElement("msd-value", "0.00");
    this.updateElement("collision-count", "0");
    this.updateElement("velocity-value", "0.00");
    this.updateElement("displacement-value", "0.00");

    const indicator = document.getElementById("brownian-indicator");
    if (indicator) {
      indicator.textContent = "Initializing...";
      indicator.classList.remove("positive", "negative");
    }
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    const pauseBtn = document.getElementById("pause-btn");
    if (pauseBtn) {
      pauseBtn.textContent = this.isPaused ? "Resume" : "Pause";
    }
  }

  private resetMSD() {
    this.model.analysis.resetMSD();
  }

  private handleResize() {
    // Force a redraw of the simulation after window resize
    // This ensures the canvas scaling is properly updated
    if (this.model && this.model.simulation) {
      this.model.simulation.drawParticles();
    }

    // Also update charts if they exist
    if (this.model && this.model.analysis) {
      const msdChart = (this.model.analysis as any).msdChart;
      const velocityChart = (this.model.analysis as any).velocityChart;

      if (msdChart) {
        msdChart.resize();
      }
      if (velocityChart) {
        velocityChart.resize();
      }
    }
  }

  // Public methods for debugging/testing
  public getModel(): ElasticModel {
    return this.model;
  }

  public getStatistics() {
    return this.model.getStatistics();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new ElasticBrownianApp();
});

// Export for debugging in console
declare global {
  interface Window {
    elasticBrownianApp: ElasticBrownianApp;
  }
}

// Make app available globally for debugging
window.addEventListener("load", () => {
  if (!window.elasticBrownianApp) {
    window.elasticBrownianApp = new ElasticBrownianApp();
  }
});
