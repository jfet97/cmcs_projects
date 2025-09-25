import { Model, Turtle } from "agentscript";

export interface VicsekAgent extends Turtle {
  direction: number; // movement angle in radians
  velocity: number; // speed magnitude (constant for all agents)
}

export class VicsekModel extends Model {
  numAgents = 300;
  interactionRadius = 1; // radius within which agents influence each other
  velocity = 0.03; // constant speed for all agents
  noiseLevel = 0.1; // η parameter: angular noise strength
  orderParameter = 0; // Φ: measures collective alignment (0=random, 1=aligned)

  worldSize = 20; // square world dimensions with periodic boundaries

  constructor() {
    // set up periodic boundary conditions - AgentScript requires integer bounds
    const bounds = {
      minX: -10,
      maxX: 10,
      minY: -10,
      maxY: 10
    };
    super(bounds);
  }

  /**
   * Initializes the model by creating all agents
   */
  setup() {
    this.initializeAgents();
  }

  /**
   * Creates agents with random positions and directions
   * Each agent starts with uniform velocity and random orientation
   */
  initializeAgents() {
    this.turtles.clear();

    this.turtles.create(this.numAgents, (agent: VicsekAgent) => {
      // place agent randomly within world bounds
      agent.x = (Math.random() - 0.5) * this.worldSize;
      agent.y = (Math.random() - 0.5) * this.worldSize;

      // assign random initial direction [0, 2π]
      agent.direction = Math.random() * 2 * Math.PI;
      agent.velocity = this.velocity;

      // set visual rendering size
      agent.size = 0.03;
    });
  }

  /**
   * Performs one simulation step: update directions, move agents, calculate order
   */
  override step() {
    this.updateDirections();
    this.updatePositions();
    this.calculateOrderParameter();
  }

  /**
   * Updates agent directions based on Vicsek model rules:
   * 1. Find neighbors within interaction radius
   * 2. Calculate mean direction of neighbors (including self)
   * 3. Add random noise to create realistic flocking behavior
   */
  updateDirections() {
    const agents: VicsekAgent[] = [];
    const newDirections: number[] = [];

    // collect all agents into array for processing
    this.turtles.ask((agent: VicsekAgent) => {
      agents.push(agent);
    });

    // calculate new direction for each agent based on neighbors
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const neighbors = this.findNeighbors(agent, agents);
      let avgDirection = this.calculateMeanDirection([agent, ...neighbors]);

      // add random noise: ξ ~ U(-η/2, η/2) where η is noiseLevel
      const noise = (Math.random() - 0.5) * this.noiseLevel;
      avgDirection += noise;
      newDirections[i] = avgDirection;
    }

    // apply new directions simultaneously to avoid temporal bias
    for (let i = 0; i < agents.length; i++) {
      agents[i].direction = newDirections[i];
    }
  }

  /**
   * Finds all neighbors within interaction radius of given agent
   * @param agent The focal agent to find neighbors for
   * @param agents Array of all agents to search through
   * @returns Array of neighboring agents (excluding the focal agent itself)
   */
  findNeighbors(agent: VicsekAgent, agents: VicsekAgent[]): VicsekAgent[] {
    const neighbors: VicsekAgent[] = [];
    for (const other of agents) {
      if (other === agent) continue;
      const distance = this.calculateDistance(agent, other);
      if (distance <= this.interactionRadius) neighbors.push(other);
    }
    return neighbors;
  }

  /**
   * Calculates distance between two agents accounting for periodic boundaries
   * In a toroidal world, agents can be closer by wrapping around edges
   * @param agent1 First agent
   * @param agent2 Second agent
   * @returns Shortest distance considering periodic wrapping
   */
  calculateDistance(agent1: VicsekAgent, agent2: VicsekAgent): number {
    const dx = Math.abs(agent1.x - agent2.x);
    const dy = Math.abs(agent1.y - agent2.y);

    // find shortest path considering periodic boundaries
    const periodicDx = Math.min(dx, this.worldSize - dx);
    const periodicDy = Math.min(dy, this.worldSize - dy);

    return Math.sqrt(periodicDx * periodicDx + periodicDy * periodicDy);
  }

  /**
   * Calculates mean direction of a group of agents using vector averaging
   * Converts angles to unit vectors, averages them, then converts back to angle
   * This prevents issues with angle wrapping (e.g., averaging 350° and 10°)
   * @param agents Array of agents to average directions for
   * @returns Mean direction in radians [0, 2π]
   */
  calculateMeanDirection(agents: VicsekAgent[]): number {
    let sumSin = 0;
    let sumCos = 0;

    // convert each angle to unit vector and sum components
    for (const agent of agents) {
      sumSin += Math.sin(agent.direction);
      sumCos += Math.cos(agent.direction);
    }

    // convert back to angle using atan2 for proper quadrant handling
    return Math.atan2(sumSin / agents.length, sumCos / agents.length);
  }

  /**
   * Moves all agents forward at constant velocity in their current direction
   * Applies periodic boundary conditions so agents wrap around world edges
   */
  updatePositions() {
    this.turtles.ask((agent: VicsekAgent) => {
      // move agent forward: velocity * direction vector
      agent.x += this.velocity * Math.cos(agent.direction);
      agent.y += this.velocity * Math.sin(agent.direction);

      // handle periodic boundaries (toroidal world)
      agent.x = this.wrapCoordinate(agent.x);
      agent.y = this.wrapCoordinate(agent.y);
    });
  }

  /**
   * Wraps coordinate to stay within world bounds using periodic boundaries
   * @param coord Coordinate value to wrap
   * @returns Wrapped coordinate within [-worldSize/2, worldSize/2]
   */
  wrapCoordinate(coord: number): number {
    const halfSize = this.worldSize / 2;
    if (coord > halfSize) {
      return coord - this.worldSize;
    } else if (coord < -halfSize) {
      return coord + this.worldSize;
    }
    return coord;
  }

  /**
   * Calculates the order parameter Φ, which measures collective alignment
   *
   * Formula: Φ = (1/N) * ||Σ(cos θᵢ, sin θᵢ)||
   * - Converts each agent direction to unit vector (cos θᵢ, sin θᵢ)
   * - Sums all direction vectors to get collective direction
   * - Normalizes by agent count and takes magnitude
   *
   * Interpretation:
   * - Φ = 0: Completely random/disordered movement
   * - Φ = 1: Perfect alignment, all agents moving in same direction
   * - 0 < Φ < 1: Partial alignment, typical during flocking transitions
   */
  calculateOrderParameter() {
    if (this.turtles.length === 0) {
      this.orderParameter = 0;
      return;
    }

    let sumX = 0;
    let sumY = 0;

    // sum up direction vectors: each agent contributes (cos θ, sin θ)
    this.turtles.ask((agent: VicsekAgent) => {
      sumX += Math.cos(agent.direction);
      sumY += Math.sin(agent.direction);
    });

    // normalize by population size and compute magnitude
    const invN = 1 / this.turtles.length;
    const avgX = sumX * invN;
    const avgY = sumY * invN;

    this.orderParameter = Math.sqrt(avgX * avgX + avgY * avgY);
  }

  /**
   * Changes the number of agents and recreates the population
   * @param n New number of agents
   */
  setNumAgents(n: number) {
    this.numAgents = n;
    this.initializeAgents();
  }

  /**
   * Adjusts the noise level (η parameter) affecting directional randomness
   * @param eta Noise strength from 0 (no noise) to 1 (maximum randomness)
   */
  setNoiseLevel(eta: number) {
    this.noiseLevel = eta;
  }
}
