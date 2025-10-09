import { Model3D, Turtle3D } from "agentscript";

export interface VicsekAgent3D extends Turtle3D {
  direction: { x: number; y: number; z: number }; // normalized 3D direction vector (unit length)
  velocity: number; // individual speed magnitude with ±15% variation
}

export class VicsekModel3D extends Model3D {
  numAgents = 300;
  interactionRadius = 0.8; // radius for alignment (direction averaging)
  velocity = 0.03; // base speed for all agents
  velocityVariation = 0.15; // velocity variation range (±15%)
  noiseLevel = 0; // η parameter: angular noise strength
  orderParameter = 0; // Φ: measures collective alignment (0=random, 1=aligned)

  worldSize = 24; // cubic world dimensions with boundary avoidance
  boundaryAvoidanceDistance = 3.0; // distance from edge to start avoiding boundaries
  boundaryAvoidanceStrength = 0.5; // strength of boundary avoidance force

  separationDistance = 0.5; // minimum distance to maintain between agents
  separationStrength = 0.8; // strength of separation force

  // cohesion radius is automatically 2.5× the interaction radius (biologically realistic)
  // agents are attracted to a larger group than they align with
  get cohesionRadius(): number {
    return this.interactionRadius * 2.5;
  }
  cohesionStrength = 0.2; // strength of cohesion force (attraction to group center)

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
  override setup() {
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

      // assign random initial 3D direction using spherical coordinates
      // θ (theta): polar angle [0, π] via inverse CDF for uniform sphere sampling
      const theta = Math.acos(1 - 2 * Math.random());
      // φ (phi): azimuthal angle [0, 2π] uniformly distributed
      const phi = Math.random() * 2 * Math.PI;

      agent.direction = {
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta)
      };

      // assign variable velocity: v_i = v_base × (1 + ε) where ε ~ U(-0.15, +0.15)
      const variation = (Math.random() - 0.5) * 2 * this.velocityVariation;
      agent.velocity = this.velocity * (1 + variation);

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
   * 5. Add cohesion forces (attraction to group center)
   * 6. Add random noise to create realistic flocking behavior
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
      const avgDirection = this.calculateMeanDirection([agent, ...neighbors]);

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

      // add cohesion force to maintain group cohesion
      const cohesionForce = this.calculateCohesion(agent, agents);
      avgDirection.x += cohesionForce.x;
      avgDirection.y += cohesionForce.y;
      avgDirection.z += cohesionForce.z;

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
   * Generates random 3D noise vector using spherical coordinates
   * Uses uniform distribution on unit sphere to avoid directional bias
   */
  generate3DNoise(): { x: number; y: number; z: number } {
    // θ (theta): polar angle [0, π] via inverse CDF: arccos(1 - 2u) where u ~ U(0,1)
    const theta = Math.acos(1 - 2 * Math.random());
    // φ (phi): azimuthal angle [0, 2π] uniformly distributed
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
   * Formula: d_avg = (Σ d_i) / ||Σ d_i|| where d_i are unit direction vectors
   * @param agents Array of agents to average directions for
   * @returns Mean direction as normalized 3D vector
   */
  calculateMeanDirection(agents: VicsekAgent3D[]): { x: number; y: number; z: number } {
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    // compute vector sum: Σ d_i
    for (const agent of agents) {
      sumX += agent.direction.x;
      sumY += agent.direction.y;
      sumZ += agent.direction.z;
    }

    // divide by count to get average vector
    const count = agents.length;
    const avgX = sumX / count;
    const avgY = sumY / count;
    const avgZ = sumZ / count;

    // normalize to unit length: ||v|| = √(x² + y² + z²)
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
   * Adds randomness to prevent synchronized turning
   * Force formula: F = -α × s(d) × r where:
   *   α = boundaryAvoidanceStrength (force magnitude)
   *   s(d) = (d_max - d) / d_max (linear decay with distance)
   *   r ~ U(0.8, 1.2) (random factor ±20%)
   * @param agent The agent to calculate avoidance for
   * @returns 3D force vector to avoid boundaries
   */
  calculateBoundaryAvoidance(agent: VicsekAgent3D): { x: number; y: number; z: number } {
    const halfSize = this.worldSize / 2;
    let forceX = 0;
    let forceY = 0;
    let forceZ = 0;

    // calculate distance to each boundary face
    const distToRight = halfSize - agent.x;
    const distToLeft = agent.x + halfSize;
    const distToTop = halfSize - agent.y;
    const distToBottom = agent.y + halfSize;
    const distToFront = halfSize - agent.z;
    const distToBack = agent.z + halfSize;

    // apply repulsive force if within avoidance threshold (with ±20% randomization)
    if (distToRight < this.boundaryAvoidanceDistance) {
      // s(d) = (d_max - d) / d_max: linear strength decay from 1 (at boundary) to 0 (at threshold)
      const strength =
        (this.boundaryAvoidanceDistance - distToRight) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4; // r ~ U(0.8, 1.2)
      forceX -= this.boundaryAvoidanceStrength * strength * randomFactor;
    }
    if (distToLeft < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToLeft) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4;
      forceX += this.boundaryAvoidanceStrength * strength * randomFactor;
    }
    if (distToTop < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToTop) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4;
      forceY -= this.boundaryAvoidanceStrength * strength * randomFactor;
    }
    if (distToBottom < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToBottom) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4;
      forceY += this.boundaryAvoidanceStrength * strength * randomFactor;
    }
    if (distToFront < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToFront) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4;
      forceZ -= this.boundaryAvoidanceStrength * strength * randomFactor;
    }
    if (distToBack < this.boundaryAvoidanceDistance) {
      const strength =
        (this.boundaryAvoidanceDistance - distToBack) / this.boundaryAvoidanceDistance;
      const randomFactor = 0.8 + Math.random() * 0.4;
      forceZ += this.boundaryAvoidanceStrength * strength * randomFactor;
    }

    // scale down by damping factor (0.1) for gradual turning
    return {
      x: forceX * 0.1,
      y: forceY * 0.1,
      z: forceZ * 0.1
    };
  }

  /**
   * Calculates separation force to maintain minimum distance between agents in 3D
   * Creates repulsive forces from nearby agents to prevent clustering
   * Force formula: F_sep = Σ β × s(d) × n̂ where:
   *   β = separationStrength (repulsion magnitude)
   *   s(d) = (d_min - d) / d_min (linear increase as distance decreases)
   *   n̂ = normalized direction away from neighbor
   * @param agent The focal agent
   * @param neighbors Array of neighboring agents
   * @returns 3D force vector for maintaining separation
   */
  calculateSeparation(
    agent: VicsekAgent3D,
    neighbors: VicsekAgent3D[]
  ): { x: number; y: number; z: number } {
    let forceX = 0;
    let forceY = 0;
    let forceZ = 0;

    // accumulate repulsive forces from all neighbors within separation distance
    for (const neighbor of neighbors) {
      const distance = this.calculateDistance3D(agent, neighbor);

      if (distance < this.separationDistance && distance > 0) {
        // compute direction away from neighbor
        const dx = agent.x - neighbor.x;
        const dy = agent.y - neighbor.y;
        const dz = agent.z - neighbor.z;

        // normalize to unit vector: n̂ = Δr / ||Δr||
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;
        const normalizedDz = dz / length;

        // s(d) = (d_min - d) / d_min: strength increases as agents get closer
        const strength = (this.separationDistance - distance) / this.separationDistance;

        // accumulate repulsive force: F += β × s(d) × n̂
        forceX += normalizedDx * this.separationStrength * strength;
        forceY += normalizedDy * this.separationStrength * strength;
        forceZ += normalizedDz * this.separationStrength * strength;
      }
    }

    // scale down by damping factor (0.3) for smooth separation behavior
    return {
      x: forceX * 0.3,
      y: forceY * 0.3,
      z: forceZ * 0.3
    };
  }

  /**
   * Calculates cohesion force to steer agent toward the center of nearby agents
   * Creates attractive force toward the average position of neighbors within cohesion radius
   * Force formula: F_coh = γ × (c - p) / ||c - p|| where:
   *   γ = cohesionStrength (attraction magnitude)
   *   c = center of mass of nearby agents: c = (1/N) × Σ p_i
   *   p = agent's current position
   * @param agent The focal agent
   * @param agents Array of all agents to search through
   * @returns 3D force vector toward local group center
   */
  calculateCohesion(
    agent: VicsekAgent3D,
    agents: VicsekAgent3D[]
  ): { x: number; y: number; z: number } {
    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;
    let count = 0;

    // find all agents within cohesion radius and compute their center of mass
    for (const other of agents) {
      if (other === agent) continue;
      const distance = this.calculateDistance3D(agent, other);

      if (distance <= this.cohesionRadius) {
        centerX += other.x;
        centerY += other.y;
        centerZ += other.z;
        count++;
      }
    }

    // no neighbors found: no cohesion force applied
    if (count === 0) {
      return { x: 0, y: 0, z: 0 };
    }

    // compute center of mass: c = (1/N) × Σ p_i
    centerX /= count;
    centerY /= count;
    centerZ /= count;

    // compute direction toward center: Δr = c - p
    const dx = centerX - agent.x;
    const dy = centerY - agent.y;
    const dz = centerZ - agent.z;

    // normalize and scale by cohesion strength: F = γ × (Δr / ||Δr||)
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (distance > 0) {
      return {
        x: (dx / distance) * this.cohesionStrength,
        y: (dy / distance) * this.cohesionStrength,
        z: (dz / distance) * this.cohesionStrength
      };
    }

    return { x: 0, y: 0, z: 0 };
  }

  /**
   * Moves all agents forward at their individual velocity in their current 3D direction
   * Applies boundary constraints to keep agents within world bounds
   */
  updatePositions() {
    this.turtles.ask((agent: VicsekAgent3D) => {
      // move agent forward: agent's individual velocity * direction vector
      const newX = agent.x + agent.velocity * agent.direction.x;
      const newY = agent.y + agent.velocity * agent.direction.y;
      const newZ = agent.z + agent.velocity * agent.direction.z;

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
   * Calculates the order parameter Φ (phi) for 3D, which measures collective alignment
   *
   * Formula: Φ = (1/N) × ||Σ v̂_i|| where:
   *   N = total number of agents
   *   v̂_i = unit direction vector of agent i
   *   Σ v̂_i = vector sum of all directions
   *   ||·|| = Euclidean norm (magnitude)
   *
   * Interpretation:
   *   Φ = 0: completely random/disordered movement (no collective motion)
   *   Φ = 1: perfect alignment, all agents moving in same direction
   *   0 < Φ < 1: partial alignment, typical during flocking transitions
   */
  calculateOrderParameter() {
    if (this.turtles.length === 0) {
      this.orderParameter = 0;
      return;
    }

    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    // compute vector sum: Σ v̂_i
    this.turtles.ask((agent: VicsekAgent3D) => {
      sumX += agent.direction.x;
      sumY += agent.direction.y;
      sumZ += agent.direction.z;
    });

    // compute average direction vector: (1/N) × Σ v̂_i
    const invN = 1 / this.turtles.length;
    const avgX = sumX * invN;
    const avgY = sumY * invN;
    const avgZ = sumZ * invN;

    // compute magnitude: Φ = ||(1/N) × Σ v̂_i|| = √(x² + y² + z²)
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

  /**
   * Changes the strength of cohesion force
   * @param strength New cohesion strength
   */
  setCohesionStrength(strength: number) {
    this.cohesionStrength = strength;
  }
}
