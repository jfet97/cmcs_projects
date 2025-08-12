import { Chart, registerables } from "chart.js";
import { ElasticParticle, LargeParticleState, CONFIG } from "./particleTypes";

Chart.register(...registerables);

export class BrownianAnalysis {
  private msdChart!: Chart;
  private velocityChart!: Chart;
  private msdData: number[] = [];
  private timeData: number[] = [];
  private velocityHistory: Array<{ vx: number; vy: number; time: number }> = [];
  private velocityAutocorrelationData: number[] = [];

  constructor(
    private largeParticle: ElasticParticle,
    private largeParticleState: LargeParticleState
  ) {
    this.initializeMSDChart();
    this.initializeVelocityChart();
  }

  private initializeMSDChart() {
    const msdc = document.getElementById("msd-chart") as HTMLCanvasElement;
    if (!msdc) {
      throw new Error("Cannot find MSD chart canvas");
    }

    const ctx = msdc.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot get MSD chart context");
    }

    this.msdChart = new Chart(ctx, {
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

  public update(currentTick: number) {
    // Simple check: if particle hasn't moved much in a while, reset
    if (this.msdData.length > 100 && currentTick % 200 === 0) {
      const currentMSD = this.getCurrentMSD();
      if (currentMSD < 0.1) {
        this.resetReferencePosition();
      }
    }

    // Update MSD chart
    if (currentTick % CONFIG.ANALYSIS.chartUpdateInterval === 0) {
      this.updateMSD(currentTick);
      this.updateVelocityAutocorrelation();
    }
  }

  private updateMSD(currentTick: number) {
    const dx = this.largeParticle.x - this.largeParticleState.x0;
    const dy = this.largeParticle.y - this.largeParticleState.y0;
    const msd = dx * dx + dy * dy;

    this.msdData.push(msd);
    this.timeData.push(currentTick);

    // keep only recent data for performance
    if (this.msdData.length > 2000) {
      this.msdData = this.msdData.slice(-2000);
      this.timeData = this.timeData.slice(-2000);
    }

    // update chart data
    this.msdChart.data.labels = this.timeData;
    this.msdChart.data.datasets[0].data = this.msdData;
    this.msdChart.update("none");
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

  public getCurrentMSD(): number {
    const dx = this.largeParticle.x - this.largeParticleState.x0;
    const dy = this.largeParticle.y - this.largeParticleState.y0;
    return dx * dx + dy * dy;
  }

  public getMSDSlope(): number {
    if (this.msdData.length < 50) return 0;

    // use proper linear regression on recent data with correct time units
    // take last 200 points (or all if less) for stable slope calculation
    const nPoints = Math.min(200, this.msdData.length);
    const startIdx = this.msdData.length - nPoints;

    let sumX = 0,
      sumY = 0,
      sumXY = 0,
      sumX2 = 0;
    let validPoints = 0;

    for (let i = 0; i < nPoints; i++) {
      const arrayIdx = startIdx + i;
      // timeData already contains the correct tick values (currentTick when MSD was measured)
      const realTime = this.timeData[arrayIdx];
      const msdValue = this.msdData[arrayIdx];

      // filter out clearly invalid data (negative MSD shouldn't happen in theory)
      if (msdValue >= 0 && isFinite(msdValue) && isFinite(realTime)) {
        sumX += realTime;
        sumY += msdValue;
        sumXY += realTime * msdValue;
        sumX2 += realTime * realTime;
        validPoints++;
      }
    }

    if (validPoints < 10) return 0; // need minimum data for reliable slope

    // least squares linear regression: slope = (n*ΣXY - ΣX*ΣY) / (n*ΣX² - (ΣX)²)
    const denominator = validPoints * sumX2 - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) return 0; // avoid division by zero

    const slope = (validPoints * sumXY - sumX * sumY) / denominator;

    // sanity check: diffusion coefficient D = slope/4 should be reasonable (0.01 < D < 100)
    const estimatedD = slope / 4;
    if (estimatedD < 0.001 || estimatedD > 100 || !isFinite(estimatedD)) {
      return 0; // slope is unrealistic, probably noise or reset artifact
    }

    return slope;
  }

  public updateVelocityHistory(vx: number, vy: number, time: number) {
    this.velocityHistory.push({ vx, vy, time });

    // keep only last 500 velocity points for performance (reduced for better autocorrelation)
    if (this.velocityHistory.length > 500) {
      this.velocityHistory = this.velocityHistory.slice(-500);
    }
  }

  private calculateVelocityAutocorrelation(): number[] {
    if (this.velocityHistory.length < 30) return [];

    const maxLag = Math.min(25, Math.floor(this.velocityHistory.length / 4));
    const autocorr: number[] = [];

    // calculate DIRECTIONAL autocorrelation for each lag
    for (let lag = 0; lag < maxLag; lag++) {
      let sum = 0;
      let count = 0;

      // calculate directional correlation: cos(angle between v(t) and v(t+lag))
      for (let i = 0; i < this.velocityHistory.length - lag; i++) {
        const v1 = this.velocityHistory[i];
        const v2 = this.velocityHistory[i + lag];

        const mag1 = Math.sqrt(v1.vx * v1.vx + v1.vy * v1.vy);
        const mag2 = Math.sqrt(v2.vx * v2.vx + v2.vy * v2.vy);

        // only consider if both velocities are non-zero
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
      // create lag labels (0, 1, 2, ...)
      const lagLabels = this.velocityAutocorrelationData.map((_, i) => i);

      // update chart
      this.velocityChart.data.labels = lagLabels;
      this.velocityChart.data.datasets[0].data = this.velocityAutocorrelationData;
      this.velocityChart.update("none");
    }
  }

  public isBrownianByAutocorrelation(): boolean {
    if (this.velocityAutocorrelationData.length < 5) return false;

    // simplified Brownian motion detection - just check if correlation decays
    const lag3Index = Math.min(3, this.velocityAutocorrelationData.length - 1);
    const lag3Corr = this.velocityAutocorrelationData[lag3Index];

    // for Brownian motion, velocity correlation should decay significantly by lag=3
    // use more relaxed threshold since real brownian motion can have some persistence
    return lag3Corr < 0.7; // if correlation drops below 70% by lag=3, it's brownian
  }

  public reset() {
    this.msdData = [];
    this.timeData = [];
    this.velocityHistory = [];
    this.velocityAutocorrelationData = [];
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.velocityChart.data.labels = [];
    this.velocityChart.data.datasets[0].data = [];
    this.msdChart.update();
    this.velocityChart.update();
  }

  public updateReferencePosition() {
    // store the initial state to then calculate MSD with respect to this position
    this.largeParticleState.x0 = this.largeParticle.x;
    this.largeParticleState.y0 = this.largeParticle.y;
  }

  public resetReferencePosition() {
    this.updateReferencePosition();
    this.msdData = [];
    this.timeData = [];
    this.velocityHistory = [];
    this.velocityAutocorrelationData = [];
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.velocityChart.data.labels = [];
    this.velocityChart.data.datasets[0].data = [];
    this.msdChart.update();
    this.velocityChart.update();
  }

  public resetMSD() {
    this.resetReferencePosition();
  }

  public resizeCharts() {
    this.msdChart?.resize();
    this.velocityChart?.resize();
  }

  public getAnalysisSummary() {
    const slope = this.getMSDSlope();
    const isBrownianByAutocorr = this.isBrownianByAutocorrelation();
    const isBrownianByMSD = slope > 0.01;

    // get current velocity magnitude for analysis
    const currentVelocity = Math.sqrt(this.largeParticle.vx ** 2 + this.largeParticle.vy ** 2);

    // get autocorrelation at different lags for better analysis
    const lag3Corr =
      this.velocityAutocorrelationData.length > 3 ? this.velocityAutocorrelationData[3] : null;
    const lag5Corr =
      this.velocityAutocorrelationData.length > 5 ? this.velocityAutocorrelationData[5] : null;

    // langevin diagnostics - verify theoretical predictions
    const equipartition = this.calculateEquipartition();
    const diffusionCoeff = this.calculateDiffusionCoefficient();
    const theoreticalDiffusion = CONFIG.LANGEVIN.kT / CONFIG.LANGEVIN.gamma;
    const velocityDecayTime = this.calculateVelocityDecayTime();
    const theoreticalDecayTime = this.largeParticle.mass / CONFIG.LANGEVIN.gamma;
    // In 2D: <v^2> = <vx^2 + vy^2> = 2 kT / M (each component contributes kT/M)
    const theoreticalEquipartition = (2 * CONFIG.LANGEVIN.kT) / this.largeParticle.mass;

    return {
      currentMSD: this.getCurrentMSD(),
      msdSlope: slope,
      dataPoints: this.msdData.length,
      velocityDataPoints: this.velocityHistory.length,
      isBrownianMotion: isBrownianByAutocorr && isBrownianByMSD, // require both criteria
      isBrownianByMSD: isBrownianByMSD,
      isBrownianByAutocorrelation: isBrownianByAutocorr,
      currentVelocity: currentVelocity,
      velocityAutocorrelationLag3: lag3Corr,
      velocityAutocorrelationLag5: lag5Corr,
      autocorrelationDataPoints: this.velocityAutocorrelationData.length,
      // langevin diagnostics
      equipartition: equipartition, // measured ⟨v²⟩
      theoreticalEquipartition: theoreticalEquipartition, // expected ⟨v²⟩ = 2*kT/M in 2D
      diffusionCoeff: diffusionCoeff, // measured D from MSD slope
      theoreticalDiffusion: theoreticalDiffusion, // expected D = kT/gamma
      velocityDecayTime: velocityDecayTime, // measured autocorr decay time
      theoreticalDecayTime: theoreticalDecayTime // expected tau = M/gamma
    };
  }

  private calculateEquipartition(): number {
    // equipartition theorem: ⟨v²⟩ = kT/M for each velocity component
    // in 2D: ⟨vx²⟩ + ⟨vy²⟩ = 2*kT/M
    if (this.velocityHistory.length < 50) return 0;

    let sumVSquared = 0;
    let count = 0;

    // calculate ⟨v²⟩ over recent velocity history
    const recentVelocities = this.velocityHistory.slice(-200); // use last 200 points
    for (const v of recentVelocities) {
      sumVSquared += v.vx * v.vx + v.vy * v.vy;
      count++;
    }

    return count > 0 ? sumVSquared / count : 0;
  }

  private calculateDiffusionCoefficient(): number {
    // diffusion coefficient from MSD slope: MSD = 4*D*t in 2D
    // so D = slope/4
    const slope = this.getMSDSlope();
    return slope / 4;
  }

  private calculateVelocityDecayTime(): number {
    // estimate exponential decay time from autocorrelation function
    // find where autocorr drops to 1/e ≈ 0.37
    if (this.velocityAutocorrelationData.length < 10) return 0;

    const target = 1 / Math.E; // ≈ 0.37

    for (let i = 1; i < this.velocityAutocorrelationData.length; i++) {
      if (this.velocityAutocorrelationData[i] <= target) {
        return i; // return lag at which correlation drops to 1/e
      }
    }

    return this.velocityAutocorrelationData.length; // fallback if never reaches target
  }
}
