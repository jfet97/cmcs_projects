import { Chart, registerables } from "chart.js";
import { ElasticParticle, LargeParticleState } from "./particleTypes";
import { CONFIG } from "./config";

Chart.register(...registerables);

/**
 * 🎯 SIMPLIFIED: Only Velocity Autocorrelation
 *
 * This analyzes ONLY the velocity autocorrelation of the large particle.
 * Autocorrelation tells you how long it takes for the particle to "forget"
 * its direction of movement - this is the signature of Brownian motion!
 */
export class BrownianAnalysis {
  private velocityChart!: Chart;
  private velocityHistory: Array<{ vx: number; vy: number; time: number }> = [];
  private velocityAutocorrelationData: number[] = [];

  constructor(
    private largeParticle: ElasticParticle,
    private largeParticleState: LargeParticleState
  ) {
    this.initializeVelocityChart();
  }

  public update(currentTick: number) {
    // Update autocorrelation chart periodically
    if (currentTick % CONFIG.ANALYSIS.chartUpdateInterval === 0) {
      this.updateVelocityAutocorrelation();
    }
  }

  private initializeVelocityChart() {
    const velc = document.getElementById("velocity-chart") as HTMLCanvasElement;
    if (!velc) {
      throw new Error("Cannot find velocity chart canvas");
    }

    const ctx = velc.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get velocity chart context");
    }

    this.velocityChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Velocity Autocorrelation",
            data: [],
            borderColor: "rgba(54, 162, 235, 1)",
            backgroundColor: "rgba(54, 162, 235, 0.1)",
            borderWidth: 2,
            pointRadius: 0,
            tension: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: { display: true, text: "Time Lag" },
            type: "linear"
          },
          y: {
            title: { display: true, text: "Correlation" },
            beginAtZero: false,
            min: -0.5,
            max: 1.0
          }
        },
        plugins: {
          legend: {
            display: true,
            position: "top"
          }
        }
      }
    });
  }

  public updateVelocityHistory(vx: number, vy: number, time: number) {
    this.velocityHistory.push({ vx, vy, time });

    // Keep only last 500 points for performance
    if (this.velocityHistory.length > 500) {
      this.velocityHistory = this.velocityHistory.slice(-500);
    }
  }

  /**
   * 🔬 CORE OF THE SYSTEM: Calculate Velocity Autocorrelation
   *
   * This is what you really care about! It measures how long the particle
   * "remembers" its direction. In Brownian motion, this correlation decays
   * exponentially - the particle gradually loses memory of its direction.
   */
  private calculateVelocityAutocorrelation(): number[] {
    if (this.velocityHistory.length < 30) return [];

    const maxLag = Math.min(25, Math.floor(this.velocityHistory.length / 4));
    const autocorr: number[] = [];

    // Calculate directional autocorrelation for each lag
    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      let count = 0;

      // Calculate directional correlation: cos(angle between v(t) and v(t+lag))
      for (let i = 0; i < this.velocityHistory.length - lag; i++) {
        const v1 = this.velocityHistory[i];
        const v2 = this.velocityHistory[i + lag];

        const mag1 = Math.sqrt(v1.vx * v1.vx + v1.vy * v1.vy);
        const mag2 = Math.sqrt(v2.vx * v2.vx + v2.vy * v2.vy);

        // Only consider if both velocities are non-zero
        if (mag1 > 1e-6 && mag2 > 1e-6) {
          const dotProduct = v1.vx * v2.vx + v1.vy * v2.vy;
          const cosAngle = dotProduct / (mag1 * mag2); // normalized dot product = cos(θ)
          sum += cosAngle;
          count++;
        }
      }

      autocorr[lag] = count > 0 ? sum / count : 0;
    }

    return autocorr;
  }

  private updateVelocityAutocorrelation() {
    this.velocityAutocorrelationData = this.calculateVelocityAutocorrelation();

    if (this.velocityAutocorrelationData.length > 0) {
      // Create lag labels (0, 1, 2, ...)
      const lagLabels = this.velocityAutocorrelationData.map((_, i) => i);

      // Update chart
      this.velocityChart.data.labels = lagLabels;
      this.velocityChart.data.datasets[0].data = this.velocityAutocorrelationData;
      this.velocityChart.update("none");
    }
  }

  /**
   * 🎯 SIMPLE DETECTION: Is it Brownian motion?
   *
   * If autocorrelation decays quickly (within 3 time steps),
   * then the particle "forgets" its direction quickly = Brownian motion!
   */
  public isBrownianByAutocorrelation(): boolean {
    if (this.velocityAutocorrelationData.length < 5) return false;

    // Simply check if correlation decays
    const lag3Index = Math.min(3, this.velocityAutocorrelationData.length - 1);
    const lag3Corr = this.velocityAutocorrelationData[lag3Index];

    // For Brownian motion, correlation should decay significantly by lag=3
    return lag3Corr < 0.7; // If correlation drops below 70% at lag=3, it's Brownian
  }

  public reset() {
    this.velocityHistory = [];
    this.velocityAutocorrelationData = [];
    this.velocityChart.data.labels = [];
    this.velocityChart.data.datasets[0].data = [];
    this.velocityChart.update();
  }

  public resizeCharts() {
    this.velocityChart?.resize();
  }

  public destroy() {
    if (this.velocityChart) {
      this.velocityChart.destroy();
    }
  }

  /**
   * 📊 ESSENTIAL STATISTICS (Only what you need!)
   */
  public getAnalysisSummary() {
    const isBrownianByAutocorr = this.isBrownianByAutocorrelation();

    // Current velocity for analysis
    const currentVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);

    // Autocorrelation at different lags for deeper analysis
    const lag3Corr =
      this.velocityAutocorrelationData.length > 3 ? this.velocityAutocorrelationData[3] : null;
    const lag5Corr =
      this.velocityAutocorrelationData.length > 5 ? this.velocityAutocorrelationData[5] : null;

    // Velocity decay time (when correlation drops to 1/e ≈ 0.37)
    const velocityDecayTime = this.calculateVelocityDecayTime();

    return {
      // 🎯 Main info you care about
      isBrownianByAutocorrelation: isBrownianByAutocorr,
      velocityDecayTime: velocityDecayTime,

      // 📈 Chart data
      velocityDataPoints: this.velocityHistory.length,
      autocorrelationDataPoints: this.velocityAutocorrelationData.length,

      // 🔍 Correlation details
      currentVelocity: currentVelocity,
      velocityAutocorrelationLag3: lag3Corr,
      velocityAutocorrelationLag5: lag5Corr
    };
  }

  /**
   * 📉 DECAY TIME: How long to "forget" the direction
   *
   * Find when autocorrelation drops to 1/e ≈ 0.37 (exponential decay)
   */
  private calculateVelocityDecayTime(): number {
    if (this.velocityAutocorrelationData.length < 10) return 0;

    const target = 1 / Math.E; // ≈ 0.37

    for (let i = 1; i < this.velocityAutocorrelationData.length; i++) {
      if (this.velocityAutocorrelationData[i] <= target) {
        return i; // Return lag at which correlation drops to 1/e
      }
    }

    return this.velocityAutocorrelationData.length; // fallback if never reaches target
  }
}
