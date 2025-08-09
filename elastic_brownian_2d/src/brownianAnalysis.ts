import { Chart, registerables } from "chart.js";
import { ElasticParticle, LargeParticleState, CONFIG } from "./particleTypes";

Chart.register(...registerables);

export class BrownianAnalysis {
  private msdChart!: Chart;
  private velocityChart!: Chart;
  private msdData: number[] = [];
  private timeData: number[] = [];
  private velocityAutocorrelationData: number[] = [];
  private velocityHistory: Array<{ vx: number; vy: number; t: number }> = [];

  constructor(
    private largeParticle: ElasticParticle,
    private largeParticleState: LargeParticleState
  ) {
    this.initializeMSDChart();
    this.initializeVelocityChart();
  }

  private initializeMSDChart() {
    const ctx = document.getElementById("msd-chart") as HTMLCanvasElement;
    if (!ctx) {
      throw new Error("Cannot find MSD chart canvas");
    }

    this.msdChart = new Chart(ctx.getContext("2d")!, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Mean Squared Displacement",
            data: [],
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.1)",
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
            title: { display: true, text: "Time Steps" },
            type: "linear"
          },
          y: {
            title: { display: true, text: "MSD" },
            beginAtZero: true
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

  private initializeVelocityChart() {
    const ctx = document.getElementById("velocity-chart") as HTMLCanvasElement;
    if (!ctx) {
      console.warn("Velocity chart canvas not found, skipping velocity analysis");
      return;
    }

    this.velocityChart = new Chart(ctx.getContext("2d")!, {
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
            title: { display: true, text: "Autocorrelation" }
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

  public update(currentTick: number) {
    // Update velocity history
    this.velocityHistory.push({
      vx: this.largeParticle.vx,
      vy: this.largeParticle.vy,
      t: currentTick
    });

    // Limit velocity history for performance
    if (this.velocityHistory.length > 1000) {
      this.velocityHistory = this.velocityHistory.slice(-1000);
    }

    // Only reset MSD if particle is truly stuck (very low velocity for extended period)
    if (this.msdData.length > 100 && currentTick % 100 === 0) {
      const recentVelocities = this.velocityHistory.slice(-50);
      const currentVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);

      // Calculate average velocity over recent history
      let avgVelocity = 0;
      if (recentVelocities.length > 0) {
        avgVelocity =
          recentVelocities.reduce((sum, v) => {
            return sum + Math.sqrt(v.vx * v.vx + v.vy * v.vy);
          }, 0) / recentVelocities.length;
      }

      // Only reset if particle is truly stuck (very low average velocity)
      if (avgVelocity < 0.01 && currentVelocity < 0.01) {
        this.resetReferencePosition();
        console.log(
          `MSD auto-reset: particle stuck (avg velocity: ${avgVelocity.toFixed(3)}, current: ${currentVelocity.toFixed(3)})`
        );
      }
    }

    // Removed duplicate MSD reset logic - now handled above with better conditions

    // Update charts periodically
    if (currentTick % CONFIG.ANALYSIS.chartUpdateInterval === 0) {
      this.updateMSD(currentTick);

      if (this.velocityChart && currentTick % (CONFIG.ANALYSIS.chartUpdateInterval * 5) === 0) {
        this.updateVelocityAutocorrelation();
      }
    }
  }

  private updateMSD(currentTick: number) {
    const dx = this.largeParticle.x - this.largeParticleState.x0;
    const dy = this.largeParticle.y - this.largeParticleState.y0;
    const msd = dx * dx + dy * dy;

    this.msdData.push(msd);
    this.timeData.push(currentTick);

    // Keep only recent data for performance
    if (this.msdData.length > 2000) {
      this.msdData = this.msdData.slice(-2000);
      this.timeData = this.timeData.slice(-2000);
    }

    // Update chart data
    this.msdChart.data.labels = this.timeData;
    this.msdChart.data.datasets[0].data = this.msdData;
    this.msdChart.update("none");

    // Debug logging to see what's happening with MSD
    if (currentTick % 100 === 0) {
      console.log(
        `Tick ${currentTick}: MSD = ${msd.toFixed(2)}, particle at (${this.largeParticle.x.toFixed(2)}, ${this.largeParticle.y.toFixed(2)}), ref at (${this.largeParticleState.x0.toFixed(2)}, ${this.largeParticleState.y0.toFixed(2)})`
      );
    }
  }

  private updateVelocityAutocorrelation() {
    if (!this.velocityChart || this.velocityHistory.length < 20) return;

    const maxLag = Math.min(50, Math.floor(this.velocityHistory.length / 2));
    const autocorrelations: number[] = [];
    const lags: number[] = [];

    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      let count = 0;

      for (let i = 0; i < this.velocityHistory.length - lag; i++) {
        const v1 = this.velocityHistory[i];
        const v2 = this.velocityHistory[i + lag];

        // Dot product of velocity vectors
        sum += v1.vx * v2.vx + v1.vy * v2.vy;
        count++;
      }

      if (count > 0) {
        autocorrelations.push(sum / count);
        lags.push(lag);
      }
    }

    // Normalize by the autocorrelation at lag 0
    if (autocorrelations.length > 0 && autocorrelations[0] > 0) {
      const normalizedAutocorrelations = autocorrelations.map(ac => ac / autocorrelations[0]);

      this.velocityChart.data.labels = lags;
      this.velocityChart.data.datasets[0].data = normalizedAutocorrelations;
      this.velocityChart.update("none");
    }
  }

  public getCurrentMSD(): number {
    // Use reference position from state to ensure consistency
    const dx = this.largeParticle.x - this.largeParticleState.x0;
    const dy = this.largeParticle.y - this.largeParticleState.y0;
    const msd = dx * dx + dy * dy;

    // Add some logging to debug MSD calculation issues
    if (this.msdData.length % 100 === 0) {
      console.log(
        `MSD calc: particle at (${this.largeParticle.x.toFixed(2)}, ${this.largeParticle.y.toFixed(2)}), ` +
          `ref at (${this.largeParticleState.x0.toFixed(2)}, ${this.largeParticleState.y0.toFixed(2)}), ` +
          `displacement: (${dx.toFixed(2)}, ${dy.toFixed(2)}), MSD: ${msd.toFixed(2)}`
      );
    }

    return msd;
  }

  public getMSDSlope(): number {
    if (this.msdData.length < 10) return 0;

    // Calculate slope using least squares regression on recent data
    const recentData = Math.min(500, this.msdData.length);
    const startIdx = this.msdData.length - recentData;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;

    for (let i = 0; i < recentData; i++) {
      const x = this.timeData[startIdx + i];
      const y = this.msdData[startIdx + i];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const n = recentData;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  public getAverageKineticEnergy(): number {
    if (this.velocityHistory.length === 0) return 0;

    const recent = this.velocityHistory.slice(-50);
    const totalKE = recent.reduce((sum, v) => {
      return sum + 0.5 * this.largeParticle.mass * (v.vx * v.vx + v.vy * v.vy);
    }, 0);

    return totalKE / recent.length;
  }

  public reset() {
    this.msdData = [];
    this.timeData = [];
    this.velocityAutocorrelationData = [];
    this.velocityHistory = [];

    // Clear charts
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.msdChart.update();

    if (this.velocityChart) {
      this.velocityChart.data.labels = [];
      this.velocityChart.data.datasets[0].data = [];
      this.velocityChart.update();
    }

    console.log("Brownian analysis reset - MSD data cleared");
  }

  public updateReferencePosition() {
    // Update reference position to current particle position
    // This can be called when the simulation is reset or when issues are detected
    this.largeParticleState.x0 = this.largeParticle.x;
    this.largeParticleState.y0 = this.largeParticle.y;
    console.log(`Reference position updated to (${this.largeParticle.x}, ${this.largeParticle.y})`);
  }

  public resetReferencePosition() {
    // Reset the reference position and clear MSD data for a fresh start
    this.largeParticleState.x0 = this.largeParticle.x;
    this.largeParticleState.y0 = this.largeParticle.y;

    // Clear MSD data to start fresh
    this.msdData = [];
    this.timeData = [];

    // Update the chart
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.msdChart.update();

    console.log(
      `MSD reference position reset to (${this.largeParticle.x.toFixed(2)}, ${this.largeParticle.y.toFixed(2)})`
    );
  }

  public resetMSD() {
    // Public method to reset MSD data (called from UI)
    this.resetReferencePosition();
  }

  public getAnalysisSummary() {
    return {
      currentMSD: this.getCurrentMSD(),
      msdSlope: this.getMSDSlope(),
      averageKineticEnergy: this.getAverageKineticEnergy(),
      dataPoints: this.msdData.length,
      isBrownianMotion: this.getMSDSlope() > 0.01 // Lowered threshold for detection
    };
  }
}
