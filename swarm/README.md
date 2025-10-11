# Vicsek Swarm Model Simulation

TypeScript implementation of the Vicsek flocking model with real-time visualization and order parameter analysis.

## Description

Simulates collective behavior and flocking dynamics using the Vicsek model. 300 agents align with neighbors within interaction radius while adding random noise to their direction. Features boundary avoidance, separation forces, and real-time order parameter visualization showing transition from chaotic to coordinated movement.

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

- 300 agents with Vicsek alignment dynamics
- Adjustable parameters: interaction radius, noise level, separation distance/strength
- Order parameter Φ measuring collective alignment (0=chaotic, 1=coordinated)
- Boundary avoidance with repulsive forces from walls
- Separation forces preventing agent clustering
- Triangle visualization colored by direction (HSL color mapping)
- Real-time parameter controls with sliders

## Technologies

- TypeScript + Vite
- AgentScript (agent-based modeling)
- HTML5 Canvas 2D rendering
