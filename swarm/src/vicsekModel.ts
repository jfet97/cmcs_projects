import { Model, Turtle } from "agentscript";

export interface VicsekAgent extends Turtle {
  direction: number; // angle in radians
  velocity: number;
}

export class VicsekModel extends Model {
  numAgents = 300;
  interactionRadius = 1;
  velocity = 0.03;
  noiseLevel = 0.1; // eta parameter
  orderParameter = 0;

  // world size
  worldSize = 8;

  constructor() {
    // periodic boundary conditions - AgentScript requires integer bounds
    const bounds = {
      minX: -4,
      maxX: 4,
      minY: -4,
      maxY: 4
    };
    super(bounds);
  }

  setup() {
    this.initializeAgents();
  }

  initializeAgents() {
    // clear existing agents
    this.turtles.clear();

    // Create agents using AgentScript API
    this.turtles.create(this.numAgents, (agent: VicsekAgent) => {
      // random position in world bounds [-4, 4] x [-4, 4]
      agent.x = (Math.random() - 0.5) * this.worldSize;
      agent.y = (Math.random() - 0.5) * this.worldSize;

      // random direction in [0, 2π]
      agent.direction = Math.random() * 2 * Math.PI;
      agent.velocity = this.velocity;

      // visual size
      agent.size = 0.05;
    });
  }

  override step() {
    this.updateDirections();
    this.updatePositions();
    this.calculateOrderParameter();
  }

  updateDirections() {
    // Collect all agents and their new directions
    const agents: VicsekAgent[] = [];
    const newDirections: number[] = [];

    // First pass: collect agents
    this.turtles.ask((agent: VicsekAgent) => {
      agents.push(agent);
    });

    // Second pass: calculate new directions
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const neighbors = this.findNeighbors(agent, agents);
      let avgDirection = this.calculateMeanDirection([agent, ...neighbors]);
      const noise = (Math.random() - 0.5) * this.noiseLevel; // ξ ~ U(-η/2, η/2)
      avgDirection += noise;
      newDirections[i] = avgDirection;
    }

    // Third pass: apply new directions
    for (let i = 0; i < agents.length; i++) {
      agents[i].direction = newDirections[i];
    }
  }

  findNeighbors(agent: VicsekAgent, agents: VicsekAgent[]): VicsekAgent[] {
    const neighbors: VicsekAgent[] = [];
    for (const other of agents) {
      if (other === agent) continue;
      const distance = this.calculateDistance(agent, other);
      if (distance <= this.interactionRadius) neighbors.push(other);
    }
    return neighbors;
  }

  calculateDistance(agent1: VicsekAgent, agent2: VicsekAgent): number {
    // periodic boundary conditions - find minimum distance
    const dx = Math.abs(agent1.x - agent2.x);
    const dy = Math.abs(agent1.y - agent2.y);

    const periodicDx = Math.min(dx, this.worldSize - dx);
    const periodicDy = Math.min(dy, this.worldSize - dy);

    return Math.sqrt(periodicDx * periodicDx + periodicDy * periodicDy);
  }

  calculateMeanDirection(agents: VicsekAgent[]): number {
    // calculate average direction using complex number approach
    let sumSin = 0;
    let sumCos = 0;

    for (const agent of agents) {
      sumSin += Math.sin(agent.direction);
      sumCos += Math.cos(agent.direction);
    }

    return Math.atan2(sumSin / agents.length, sumCos / agents.length);
  }

  updatePositions() {
    this.turtles.ask((agent: VicsekAgent) => {
      agent.x += this.velocity * Math.cos(agent.direction);
      agent.y += this.velocity * Math.sin(agent.direction);
      agent.x = this.wrapCoordinate(agent.x);
      agent.y = this.wrapCoordinate(agent.y);
    });
  }

  wrapCoordinate(coord: number): number {
    const halfSize = this.worldSize / 2;
    if (coord > halfSize) {
      return coord - this.worldSize;
    } else if (coord < -halfSize) {
      return coord + this.worldSize;
    }
    return coord;
  }

  calculateOrderParameter() {
    // Guard against zero agents to avoid NaN
    if (this.turtles.length === 0) {
      this.orderParameter = 0;
      return;
    }

    // Φ = (1/N) * ||Σ(cos θ_i, sin θ_i)||
    let sumX = 0;
    let sumY = 0;

    this.turtles.ask((agent: VicsekAgent) => {
      sumX += Math.cos(agent.direction);
      sumY += Math.sin(agent.direction);
    });

    const invN = 1 / this.turtles.length;
    const avgX = sumX * invN;
    const avgY = sumY * invN;

    this.orderParameter = Math.sqrt(avgX * avgX + avgY * avgY);
  }

  // parameter setters
  setNumAgents(n: number) {
    this.numAgents = n;
    this.initializeAgents();
  }

  setNoiseLevel(eta: number) {
    this.noiseLevel = eta;
  }
}
