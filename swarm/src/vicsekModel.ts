import { Model, Turtle } from "agentscript";

export interface VicsekAgent extends Turtle {
  direction: number; // movement angle in radians
  velocity: number; // speed magnitude (constant for all agents)
}

export class VicsekModel extends Model {
  numAgents = 300;
  interactionRadius = 0.8; // radius within which agents influence each other
  velocity = 0.03; // constant speed for all agents
  noiseLevel = 0.1; // η parameter: angular noise strength
  orderParameter = 0; // Φ: measures collective alignment (0=random, 1=aligned)

  worldSize = 24; // square world dimensions with boundary avoidance
  boundaryAvoidanceDistance = 1.5; // distance from edge to start avoiding boundaries
  boundaryAvoidanceStrength = 0.3; // strength of boundary avoidance force

  separationDistance = 0.3; // minimum distance to maintain between agents
  separationStrength = 0.6; // strength of separation force

  constructor() {
    // set up periodic boundary conditions - AgentScript requires integer bounds
    const bounds = {
      minX: -12,
      maxX: 12,
      minY: -12,
      maxY: 12
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

      // add boundary avoidance if agent is near edges
      const boundaryAvoidance = this.calculateBoundaryAvoidance(agent);
      avgDirection += boundaryAvoidance;

      // add separation force to avoid overcrowding
      const separationForce = this.calculateSeparation(agent, neighbors);
      avgDirection += separationForce;

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
   * Calculates Euclidean distance between two agents
   * @param agent1 First agent
   * @param agent2 Second agent
   * @returns Distance between agents
   */
  calculateDistance(agent1: VicsekAgent, agent2: VicsekAgent): number {
    const dx = agent1.x - agent2.x;
    const dy = agent1.y - agent2.y;
    return Math.sqrt(dx * dx + dy * dy);
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
   * Calculates boundary avoidance force for agents near world edges
   * Creates a repulsive force vector pointing away from the nearest boundary
   * @param agent The agent to calculate avoidance for
   * @returns Angular adjustment in radians to avoid boundaries
   */
  calculateBoundaryAvoidance(agent: VicsekAgent): number {
    const halfSize = this.worldSize / 2;
    let forceX = 0;
    let forceY = 0;

    // calculate repulsive force from each boundary
    const distToRight = halfSize - agent.x;
    const distToLeft = agent.x + halfSize;
    const distToTop = halfSize - agent.y;
    const distToBottom = agent.y + halfSize;

    // add repulsive forces if within avoidance distance
    if (distToRight < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToRight) / this.boundaryAvoidanceDistance;
      forceX -= this.boundaryAvoidanceStrength * strength; // push left
    }
    if (distToLeft < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToLeft) / this.boundaryAvoidanceDistance;
      forceX += this.boundaryAvoidanceStrength * strength; // push right
    }
    if (distToTop < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToTop) / this.boundaryAvoidanceDistance;
      forceY -= this.boundaryAvoidanceStrength * strength; // push down
    }
    if (distToBottom < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToBottom) / this.boundaryAvoidanceDistance;
      forceY += this.boundaryAvoidanceStrength * strength; // push up
    }

    // convert force vector to angle adjustment if there's any force
    if (forceX === 0 && forceY === 0) {
      return 0;
    }

    // calculate desired direction away from boundaries
    const desiredDirection = Math.atan2(forceY, forceX);

    // calculate angle difference between current direction and desired direction
    let angleDiff = desiredDirection - agent.direction;

    // normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // apply a fraction of the desired turn to make it gradual
    return angleDiff * 0.1;
  }

  /**
   * Calculates separation force to maintain minimum distance between agents
   * Creates repulsive forces from nearby agents to prevent clustering
   * @param agent The focal agent
   * @param neighbors Array of neighboring agents
   * @returns Angular adjustment to maintain separation
   */
  calculateSeparation(agent: VicsekAgent, neighbors: VicsekAgent[]): number {
    let forceX = 0;
    let forceY = 0;

    // check all neighbors for separation
    for (const neighbor of neighbors) {
      const distance = this.calculateDistance(agent, neighbor);

      if (distance < this.separationDistance && distance > 0) {
        // calculate direction away from neighbor
        const dx = agent.x - neighbor.x;
        const dy = agent.y - neighbor.y;

        // normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        // force strength inversely proportional to distance
        const strength = (this.separationDistance - distance) / this.separationDistance;

        // add repulsive force
        forceX += normalizedDx * this.separationStrength * strength;
        forceY += normalizedDy * this.separationStrength * strength;
      }
    }

    // convert force to angle adjustment
    if (forceX === 0 && forceY === 0) {
      return 0;
    }

    // calculate desired direction for separation
    const desiredDirection = Math.atan2(forceY, forceX);

    // calculate angle difference
    let angleDiff = desiredDirection - agent.direction;

    // normalize angle difference to [-π, π]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    // apply gradual adjustment
    return angleDiff * 0.3;
  }

  /**
   * Moves all agents forward at constant velocity in their current direction
   * Applies boundary constraints to keep agents within world bounds
   */
  updatePositions() {
    this.turtles.ask((agent: VicsekAgent) => {
      // move agent forward: velocity * direction vector
      agent.x += this.velocity * Math.cos(agent.direction);
      agent.y += this.velocity * Math.sin(agent.direction);

      // clamp positions to world boundaries (no wrapping)
      const halfSize = this.worldSize / 2;
      agent.x = Math.max(-halfSize, Math.min(halfSize, agent.x));
      agent.y = Math.max(-halfSize, Math.min(halfSize, agent.y));
    });
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

  /**
   * Changes the interaction radius for neighbor detection
   * @param radius New interaction radius
   */
  setInteractionRadius(radius: number) {
    this.interactionRadius = radius;
  }

  /**
   * Changes the minimum separation distance between agents
   * @param distance New separation distance
   */
  setSeparationDistance(distance: number) {
    this.separationDistance = distance;
  }

  /**
   * Changes the strength of separation force
   * @param strength New separation strength
   */
  setSeparationStrength(strength: number) {
    this.separationStrength = strength;
  }
}
