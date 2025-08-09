import { ElasticModel } from "./elasticModel";
import { CONFIG } from "./particleTypes";

class ElasticBrownianApp {
  private model!: ElasticModel;
  private animationId: number = 0;
  private isPaused: boolean = false;
  private lastStatsUpdate: number = 0;

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

    // Particle count slider
    const particleCountSlider = document.getElementById("particle-count") as HTMLInputElement;
    const particleCountValue = document.getElementById("particle-count-value");
    
    particleCountSlider?.addEventListener("input", (e) => {
      const count = (e.target as HTMLInputElement).value;
      if (particleCountValue) {
        particleCountValue.textContent = count;
      }
      // Note: Changing particle count requires simulation restart
      // This could be implemented as a future enhancement
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
    
    // Update Brownian motion indicator
    this.updateBrownianIndicator(analysis);
  }

  private updateElement(id: string, value: string) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  private updateBrownianIndicator(analysis: ReturnType<typeof this.model.analysis.getAnalysisSummary>) {
    const indicator = document.getElementById("brownian-indicator");
    if (!indicator) return;

    // Remove existing classes
    indicator.classList.remove("positive", "negative");

    if (analysis.dataPoints < 50) {
      indicator.textContent = "Initializing...";
      return;
    }

    if (analysis.isBrownianMotion && analysis.msdSlope > 0.1) {
      indicator.textContent = "Yes - Detected";
      indicator.classList.add("positive");
    } else if (analysis.msdSlope < 0.01) {
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

  private handleResize() {
    // Handle responsive behavior if needed
    // Canvas size is fixed, but we could adjust chart sizes here
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