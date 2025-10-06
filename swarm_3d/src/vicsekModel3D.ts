import { Model3D, Turtle3D } from "agentscript";

export interface VicsekAgent3D extends Turtle3D {
  direction: { x: number; y: number; z: number }; // 3D direction vector (normalized)
  velocity: number; // speed magnitude (constant for all agents)
}

export class VicsekModel3D extends Model3D {
  numAgents = 300;
  interactionRadius = 0.8; // radius within which agents influence each other
  velocity = 0.03; // constant speed for all agents
  noiseLevel = 0.1; // η parameter: angular noise strength
  orderParameter = 0; // Φ: measures collective alignment (0=random, 1=aligned)

  worldSize = 24; // cubic world dimensions with boundary avoidance
  boundaryAvoidanceDistance = 1.5; // distance from edge to start avoiding boundaries
  boundaryAvoidanceStrength = 0.3; // strength of boundary avoidance force

  separationDistance = 0.3; // minimum distance to maintain between agents
  separationStrength = 0.6; // strength of separation force

  constructor() {
    // set up cubic boundary conditions - AgentScript requires integer bounds
    const bounds = {
      minX: -12,
      maxX: 12,
      minY: -12,
      maxY: 12,
      minZ: -12,
      maxZ: 12
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
   * Creates agents with random positions and 3D directions
   * Each agent starts with uniform velocity and random 3D orientation
   */
  initializeAgents() {
    this.turtles.clear();

    this.turtles.create(this.numAgents, (agent: VicsekAgent3D) => {
      // place agent randomly within world bounds
      const x = (Math.random() - 0.5) * this.worldSize;
      const y = (Math.random() - 0.5) * this.worldSize;
      const z = (Math.random() - 0.5) * this.worldSize;

      agent.setxyz(x, y, z);

      // assign random initial 3D direction (normalized vector)
      const theta = Math.acos(1 - 2 * Math.random()); // polar angle [0, π]
      const phi = Math.random() * 2 * Math.PI; // azimuthal angle [0, 2π]

      agent.direction = {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta)
      };

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
   * Updates agent directions based on 3D Vicsek model rules:
   * 1. Find neighbors within interaction radius
   * 2. Calculate mean direction of neighbors (including self)
   * 3. Add boundary avoidance forces
   * 4. Add separation forces
   * 5. Add random noise to create realistic flocking behavior
   */
  updateDirections() {
    const agents: VicsekAgent3D[] = [];
    const newDirections: { x: number; y: number; z: number }[] = [];

    // collect all agents into array for processing
    this.turtles.ask((agent: VicsekAgent3D) => {
      agents.push(agent);
    });

    // calculate new direction for each agent based on neighbors
    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const neighbors = this.findNeighbors(agent, agents);
      let avgDirection = this.calculateMeanDirection([agent, ...neighbors]);

      // add boundary avoidance if agent is near edges
      const boundaryAvoidance = this.calculateBoundaryAvoidance(agent);
      avgDirection.x += boundaryAvoidance.x;
      avgDirection.y += boundaryAvoidance.y;
      avgDirection.z += boundaryAvoidance.z;

      // add separation force to avoid overcrowding
      const separationForce = this.calculateSeparation(agent, neighbors);
      avgDirection.x += separationForce.x;
      avgDirection.y += separationForce.y;
      avgDirection.z += separationForce.z;

      // add random noise in 3D space
      const noise = this.generate3DNoise();
      avgDirection.x += noise.x * this.noiseLevel;
      avgDirection.y += noise.y * this.noiseLevel;
      avgDirection.z += noise.z * this.noiseLevel;

      // normalize the resulting direction vector
      const magnitude = Math.sqrt(
        avgDirection.x * avgDirection.x +
        avgDirection.y * avgDirection.y +
        avgDirection.z * avgDirection.z
      );

      if (magnitude > 0) {
        avgDirection.x /= magnitude;
        avgDirection.y /= magnitude;
        avgDirection.z /= magnitude;
      }

      newDirections[i] = avgDirection;
    }

    // apply new directions simultaneously to avoid temporal bias
    for (let i = 0; i < agents.length; i++) {
      agents[i].direction = newDirections[i];
    }
  }

  /**
   * Generates random 3D noise vector
   */
  generate3DNoise(): { x: number; y: number; z: number } {
    // Generate random point on unit sphere for unbiased 3D noise
    const theta = Math.acos(1 - 2 * Math.random());
    const phi = Math.random() * 2 * Math.PI;

    return {
      x: Math.sin(theta) * Math.cos(phi),
      y: Math.sin(theta) * Math.sin(phi),
      z: Math.cos(theta)
    };
  }

  /**
   * Finds all neighbors within interaction radius of given agent
   * @param agent The focal agent to find neighbors for
   * @param agents Array of all agents to search through
   * @returns Array of neighboring agents (excluding the focal agent itself)
   */
  findNeighbors(agent: VicsekAgent3D, agents: VicsekAgent3D[]): VicsekAgent3D[] {
    const neighbors: VicsekAgent3D[] = [];
    for (const other of agents) {
      if (other === agent) continue;
      const distance = this.calculateDistance3D(agent, other);
      if (distance <= this.interactionRadius) neighbors.push(other);
    }
    return neighbors;
  }

  /**
   * Calculates Euclidean distance between two agents in 3D space
   * @param agent1 First agent
   * @param agent2 Second agent
   * @returns Distance between agents
   */
  calculateDistance3D(agent1: VicsekAgent3D, agent2: VicsekAgent3D): number {
    const dx = agent1.x - agent2.x;
    const dy = agent1.y - agent2.y;
    const dz = agent1.z - agent2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculates mean direction of a group of agents using 3D vector averaging
   * @param agents Array of agents to average directions for
   * @returns Mean direction as normalized 3D vector
   */
  calculateMeanDirection(agents: VicsekAgent3D[]): { x: number; y: number; z: number } {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    // sum direction vectors
    for (const agent of agents) {
      sumX += agent.direction.x;
      sumY += agent.direction.y;
      sumZ += agent.direction.z;
    }

    // average the vectors
    const count = agents.length;
    const avgX = sumX / count;
    const avgY = sumY / count;
    const avgZ = sumZ / count;

    // normalize the result
    const magnitude = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);

    if (magnitude > 0) {
      return {
        x: avgX / magnitude,
        y: avgY / magnitude,
        z: avgZ / magnitude
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Calculates boundary avoidance force for agents near world edges in 3D
   * Creates repulsive force vectors pointing away from the nearest boundaries
   * @param agent The agent to calculate avoidance for
   * @returns 3D force vector to avoid boundaries
   */
  calculateBoundaryAvoidance(agent: VicsekAgent3D): { x: number; y: number; z: number } {
    const halfSize = this.worldSize / 2;
    let forceX = 0;
    let forceY = 0;
    let forceZ = 0;

    // calculate repulsive force from each boundary face
    const distToRight = halfSize - agent.x;
    const distToLeft = agent.x + halfSize;
    const distToTop = halfSize - agent.y;
    const distToBottom = agent.y + halfSize;
    const distToFront = halfSize - agent.z;
    const distToBack = agent.z + halfSize;

    // add repulsive forces if within avoidance distance
    if (distToRight < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToRight) / this.boundaryAvoidanceDistance;
      forceX -= this.boundaryAvoidanceStrength * strength;
    }
    if (distToLeft < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToLeft) / this.boundaryAvoidanceDistance;
      forceX += this.boundaryAvoidanceStrength * strength;
    }
    if (distToTop < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToTop) / this.boundaryAvoidanceDistance;
      forceY -= this.boundaryAvoidanceStrength * strength;
    }
    if (distToBottom < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToBottom) / this.boundaryAvoidanceDistance;
      forceY += this.boundaryAvoidanceStrength * strength;
    }
    if (distToFront < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToFront) / this.boundaryAvoidanceDistance;
      forceZ -= this.boundaryAvoidanceStrength * strength;
    }
    if (distToBack < this.boundaryAvoidanceDistance) {
      const strength = (this.boundaryAvoidanceDistance - distToBack) / this.boundaryAvoidanceDistance;
      forceZ += this.boundaryAvoidanceStrength * strength;
    }

    // apply gradual adjustment factor
    return {
      x: forceX * 0.1,
      y: forceY * 0.1,
      z: forceZ * 0.1
    };
  }

  /**
   * Calculates separation force to maintain minimum distance between agents in 3D
   * Creates repulsive forces from nearby agents to prevent clustering
   * @param agent The focal agent
   * @param neighbors Array of neighboring agents
   * @returns 3D force vector for maintaining separation
   */
  calculateSeparation(agent: VicsekAgent3D, neighbors: VicsekAgent3D[]): { x: number; y: number; z: number } {
    let forceX = 0;
    let forceY = 0;
    let forceZ = 0;

    // check all neighbors for separation
    for (const neighbor of neighbors) {
      const distance = this.calculateDistance3D(agent, neighbor);

      if (distance < this.separationDistance && distance > 0) {
        // calculate direction away from neighbor
        const dx = agent.x - neighbor.x;
        const dy = agent.y - neighbor.y;
        const dz = agent.z - neighbor.z;

        // normalize direction vector
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const normalizedDz = dz / length;

        // force strength inversely proportional to distance
        const strength = (this.separationDistance - distance) / this.separationDistance;

        // add repulsive force
        forceX += normalizedDx * this.separationStrength * strength;
        forceY += normalizedDy * this.separationStrength * strength;
        forceZ += normalizedDz * this.separationStrength * strength;
      }
    }

    // apply gradual adjustment factor
    return {
      x: forceX * 0.3,
      y: forceY * 0.3,
      z: forceZ * 0.3
    };
  }

  /**
   * Moves all agents forward at constant velocity in their current 3D direction
   * Applies boundary constraints to keep agents within world bounds
   */
  updatePositions() {
    this.turtles.ask((agent: VicsekAgent3D) => {
      // move agent forward: velocity * direction vector
      const newX = agent.x + this.velocity * agent.direction.x;
      const newY = agent.y + this.velocity * agent.direction.y;
      const newZ = agent.z + this.velocity * agent.direction.z;

      // clamp positions to world boundaries (no wrapping)
      const halfSize = this.worldSize / 2;
      const clampedX = Math.max(-halfSize, Math.min(halfSize, newX));
      const clampedY = Math.max(-halfSize, Math.min(halfSize, newY));
      const clampedZ = Math.max(-halfSize, Math.min(halfSize, newZ));

      // use setxyz to properly update AgentScript's internal coordinate system
      agent.setxyz(clampedX, clampedY, clampedZ);
    });
  }

  /**
   * Calculates the order parameter Φ for 3D, which measures collective alignment
   *
   * Formula: Φ = (1/N) * ||Σ(dir_i)||
   * - Sums all agent direction vectors to get collective direction
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
    let sumZ = 0;

    // sum up direction vectors: each agent contributes its direction vector
    this.turtles.ask((agent: VicsekAgent3D) => {
      sumX += agent.direction.x;
      sumY += agent.direction.y;
      sumZ += agent.direction.z;
    });

    // normalize by population size and compute magnitude
    const invN = 1 / this.turtles.length;
    const avgX = sumX * invN;
    const avgY = sumY * invN;
    const avgZ = sumZ * invN;

    this.orderParameter = Math.sqrt(avgX * avgX + avgY * avgY + avgZ * avgZ);
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