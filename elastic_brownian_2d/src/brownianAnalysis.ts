import { Chart, registerables } from "chart.js";
import { ElasticParticle, LargeParticleState, CONFIG } from "./particleTypes";

Chart.register(...registerables);

export class BrownianAnalysis {
  private msdChart!: Chart;
  private msdData: number[] = [];
  private timeData: number[] = [];

  constructor(
    private largeParticle: ElasticParticle,
    private largeParticleState: LargeParticleState
  ) {
    this.initializeMSDChart();
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

  public getCurrentMSD(): number {
    const dx = this.largeParticle.x - this.largeParticleState.x0;
    const dy = this.largeParticle.y - this.largeParticleState.y0;
    return dx * dx + dy * dy;
  }

  public getMSDSlope(): number {
    if (this.msdData.length < 20) return 0;

    // just compare current MSD to MSD from 100 steps ago
    const recent = this.msdData[this.msdData.length - 1];
    const past = this.msdData[Math.max(0, this.msdData.length - 100)];
    const timeGap = Math.min(100, this.msdData.length - 1);

    return timeGap > 0 ? (recent - past) / timeGap : 0;
  }

  public reset() {
    this.msdData = [];
    this.timeData = [];
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.msdChart.update();
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
    this.msdChart.data.labels = [];
    this.msdChart.data.datasets[0].data = [];
    this.msdChart.update();
  }

  public resetMSD() {
    this.resetReferencePosition();
  }

  // TODO: freca?
  public resizeCharts() {
    this.msdChart?.resize();
  }

  public getAnalysisSummary() {
    const slope = this.getMSDSlope();
    return {
      currentMSD: this.getCurrentMSD(),
      msdSlope: slope,
      dataPoints: this.msdData.length
    };
  }
}
