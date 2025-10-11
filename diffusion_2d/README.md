# 2D Brownian Motion Simulation

TypeScript simulation of 2D Brownian motion with real-time particle visualization and Mean Squared Displacement (MSD) analysis.

## Description

Simulates 4000 particles performing random walks with collision detection. Features optimized spatial grid collision system and live MSD tracking using AgentScript and Chart.js.

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

- 4000 particles with random walk dynamics
- Spatial grid collision detection (O(N×k) complexity)
- Real-time MSD visualization
- Two initialization modes: center and random distribution
- Reflective boundary conditions

## Technologies

- TypeScript + Vite
- AgentScript (agent-based modeling)
- Chart.js (MSD visualization)
