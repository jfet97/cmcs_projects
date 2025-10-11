# 3D Brownian Motion Simulation

TypeScript simulation of 3D Brownian motion with Three.js visualization and Mean Squared Displacement (MSD) analysis.

## Description

Simulates 20000 particles performing random walks in 3D space with collision detection. Features optimized spatial grid collision system, interactive 3D camera controls, and live MSD tracking.

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

- 20000 particles with 3D random walk dynamics using spherical coordinates
- Spatial grid collision detection (O(N×k) complexity, k=27 cells)
- Interactive Three.js visualization with OrbitControls
- Real-time MSD chart (MSD(t) = 6Dt for 3D diffusion)
- Two initialization modes: center and random distribution
- Reflective boundary conditions

## Technologies

- TypeScript + Vite
- AgentScript (agent-based modeling, Model3D)
- Three.js (3D rendering and camera controls)
- Chart.js (MSD visualization)
