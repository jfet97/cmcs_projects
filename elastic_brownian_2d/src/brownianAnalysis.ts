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
  private velocityAutocorrelationData: number[] = []; // C(τ) values

  constructor(
    private largeParticle: ElasticParticle,
    private largeParticleState: LargeParticleState
  ) {
    this.initializeVelocityChart();
  }

  public update(currentTick: number) {
    // update autocorrelation chart periodically
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

    // keep only last 500 points for computational efficiency
    if (this.velocityHistory.length > 500) {
      this.velocityHistory = this.velocityHistory.slice(-500);
    }
  }

  /**
   * Calculate Velocity Autocorrelation Function (VACF)
   *
   * Measures directional correlation decay: how long particle "remembers" its velocity direction
   * In Brownian motion, VACF decays exponentially: C(τ) ∝ exp(-τ/τ_c) where τ_c is correlation time
   *
   * Formula: C(τ) = ⟨v̂(t) · v̂(t+τ)⟩ = ⟨cos θ(t,t+τ)⟩
   * where v̂ is normalized velocity (unit vector), θ is angle between velocities at different times
   */
  private calculateVelocityAutocorrelation(): number[] {
    if (this.velocityHistory.length < 30) return [];

    const maxLag = Math.min(25, Math.floor(this.velocityHistory.length / 4));
    const autocorr: number[] = [];

    // compute directional autocorrelation for each time lag
    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      let count = 0;

      // directional correlation: C(τ) = ⟨v̂(t) · v̂(t+τ)⟩ = ⟨cos θ⟩
      for (let i = 0; i < this.velocityHistory.length - lag; i++) {
        const v1 = this.velocityHistory[i];
        const v2 = this.velocityHistory[i + lag];

        const mag1 = Math.sqrt(v1.vx * v1.vx + v1.vy * v1.vy);
        const mag2 = Math.sqrt(v2.vx * v2.vx + v2.vy * v2.vy);

        // only include if both velocities are non-zero
        if (mag1 > 1e-6 && mag2 > 1e-6) {
          const dotProduct = v1.vx * v2.vx + v1.vy * v2.vy;
          const cosAngle = dotProduct / (mag1 * mag2); // v̂₁ · v̂₂ = cos θ
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
      // create lag labels (0, 1, 2, ...)
      const lagLabels = this.velocityAutocorrelationData.map((_, i) => i);

      // update chart data
      this.velocityChart.data.labels = lagLabels;
      this.velocityChart.data.datasets[0].data = this.velocityAutocorrelationData;
      this.velocityChart.update("none");
    }
  }

  /**
   * Detect Brownian motion by checking velocity autocorrelation decay rate
   *
   * Brownian motion signature: rapid correlation decay
   * If C(τ=3) < 0.7, the particle loses directional memory quickly → Brownian behavior
   * For ballistic motion: C(τ) ≈ 1 (persistent direction)
   */
  public isBrownianByAutocorrelation(): boolean {
    if (this.velocityAutocorrelationData.length < 5) return false;

    // check correlation decay at lag=3
    const lag3Index = Math.min(3, this.velocityAutocorrelationData.length - 1);
    const lag3Corr = this.velocityAutocorrelationData[lag3Index];

    // threshold: C(3) < 0.7 indicates significant decorrelation → Brownian motion
    return lag3Corr < 0.7;
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
   * Get comprehensive analysis summary
   */
  public getAnalysisSummary() {
    const isBrownianByAutocorr = this.isBrownianByAutocorrelation();

    // current velocity magnitude: |v| = √(vₓ² + vᵧ²)
    const currentVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);

    // autocorrelation values at specific lags for analysis
    const lag3Corr =
      this.velocityAutocorrelationData.length > 3 ? this.velocityAutocorrelationData[3] : null;
    const lag5Corr =
      this.velocityAutocorrelationData.length > 5 ? this.velocityAutocorrelationData[5] : null;

    // velocity decorrelation time (τ_c when C(τ_c) = 1/e)
    const velocityDecayTime = this.calculateVelocityDecayTime();

    return {
      // main Brownian motion indicators
      isBrownianByAutocorrelation: isBrownianByAutocorr,
      velocityDecayTime: velocityDecayTime,

      // data quality metrics
      velocityDataPoints: this.velocityHistory.length,
      autocorrelationDataPoints: this.velocityAutocorrelationData.length,

      // detailed correlation values
      currentVelocity: currentVelocity,
      velocityAutocorrelationLag3: lag3Corr,
      velocityAutocorrelationLag5: lag5Corr
    };
  }

  /**
   * Calculate velocity decorrelation time τ_c
   *
   * Finds the lag at which C(τ) = 1/e ≈ 0.37
   * For exponential decay: C(τ) = exp(-τ/τ_c), so C(τ_c) = 1/e
   * τ_c represents the characteristic time for velocity memory loss
   */
  private calculateVelocityDecayTime(): number {
    if (this.velocityAutocorrelationData.length < 10) return 0;

    const target = 1 / Math.E; // ≈ 0.37 (exponential decay threshold)

    for (let i = 1; i < this.velocityAutocorrelationData.length; i++) {
      if (this.velocityAutocorrelationData[i] <= target) {
        return i; // lag at which C(τ) drops to 1/e
      }
    }

    return this.velocityAutocorrelationData.length; // correlation hasn't decayed to 1/e yet
  }
}
