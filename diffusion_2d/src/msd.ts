import { Turtles } from "agentscript";
import { Chart, registerables } from "chart.js";
import { type BrownianParticleTurtle } from "./brownianModel";
Chart.register(...registerables);

/**
 * Represents a chart for visualizing the Mean Squared Displacement (MSD) of Brownian particles over time.
 *
 * This class manages the creation and updating of a Chart.js line chart that displays the MSD as a function of time steps.
 * It collects MSD data from a collection of BrownianParticleTurtle instances and updates the chart accordingly.
 *
 * @remarks
 * - The chart is rendered on a canvas element with the ID "msd-chart".
 * - The `plot` method should be called at each simulation tick to update the MSD data and chart.
 * - The `skip` parameter in `plot` allows for performance optimization by skipping updates on certain ticks.
 *
 * @example
 * ```typescript
 * const msdChart = new MSDChart();
 * // In your simulation loop:
 * msdChart.plot(turtles, currentTick, 10); // Updates every 10 ticks
 * ```
 */
export class MSDChart {
  chart!: Chart;
  msdData: number[];
  turtles!: Turtles;
  constructor(turtles: Turtles) {
    this.msdData = [];
    this.turtles = turtles;

    const ctx = (document.getElementById("msd-chart") as HTMLCanvasElement)?.getContext("2d");
    if (!ctx) {
      throw new Error(`Cannot get 2D canvas' context for MSD chart`);
    }
    this.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Mean Squared Displacement (MSD)",
            data: [],
            borderColor: "rgba(255, 99, 132, 1)",
            backgroundColor: "rgba(255, 99, 132, 0.5)",
            borderWidth: 2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: "Time Step" } },
          y: { title: { display: true, text: "MSD" }, beginAtZero: true }
        }
      }
    });
  }

  plot(ticks: number, skip = 1) {
    if (this.turtles.length === 0 || ticks % skip !== 0) {
      // performance optimization: if skip = 10, update only every 10th tick
      return;
    }

    /**
     * Mean Squared Displacement calculation:
     * MSD(t) = ⟨[r(t) - r(0)]²⟩ = (1/N) Σᵢ [(xᵢ(t) - xᵢ(0))² + (yᵢ(t) - yᵢ(0))²]
     *
     * For 2D Brownian motion: MSD(t) = 4Dt where D is the diffusion coefficient
     */
    let totalSquaredDisplacement = 0;

    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      const dx = turtle.x - turtle.initialState.x0;
      const dy = turtle.y - turtle.initialState.y0;
      totalSquaredDisplacement += dx * dx + dy * dy;
    });

    const msd = totalSquaredDisplacement / this.turtles.length;
    this.msdData.push(msd);

    if (this.chart.data.labels) {
      // use simulation ticks as x-axis values
      this.chart.data.labels.push(ticks);
    }
    this.chart.data.datasets[0].data.push(msd);
    this.chart.update("none");
  }
}
