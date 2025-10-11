# 3D Vicsek Swarm Model Simulation

TypeScript implementation of the 3D Vicsek flocking model with Three.js visualization and interactive camera controls.

## Description

Simulates collective behavior and flocking dynamics in 3D space using the Vicsek model. 300 agents align with neighbors, maintain separation, and exhibit cohesion toward group centers. Features boundary avoidance, uniform 3D noise sampling, individual velocity variation, and real-time order parameter visualization.

## Setup

```bash
# Install dependencies
pnpm install

# Start development server (port 3000)
pnpm dev

# Build for production
pnpm build
```

## Key Features

- 300 agents with 3D Vicsek alignment dynamics
- Four behavioral forces: alignment, separation, cohesion (2.5× interaction radius), boundary avoidance
- Individual velocity variation (±15% from base speed)
- Order parameter Φ measuring 3D collective alignment
- Stochastic noise with uniform spherical sampling
- Three.js rendering with cone meshes colored by direction (RGB mapping)
- OrbitControls for interactive 3D camera (rotate, zoom, pan)
- Axes helper in corner for orientation reference

## Technologies

- TypeScript + Vite
- AgentScript (agent-based modeling, Model3D)
- Three.js (3D rendering and OrbitControls)
- WebGL
