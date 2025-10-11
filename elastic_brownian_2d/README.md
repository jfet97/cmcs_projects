# Elastic Collision Brownian Motion Simulation

TypeScript simulation demonstrating Brownian motion through pure elastic collisions with velocity autocorrelation analysis.

## Description

Simulates Brownian motion through pure elastic collisions. One large particle (mass=30, radius=8) starts at rest, bombarded by ~1000 small thermal particles with Maxwell-Boltzmann velocity distribution. Features velocity autocorrelation analysis for Brownian motion detection. No artificial forces - motion emerges from collision physics.

## Setup

```bash
# Install dependencies
pnpm install

# Start development server (port 5124)
pnpm dev

# Build for production
pnpm build
```

## Key Features

- Large particle (mass=30, radius=8) with pure collision-driven motion
- ~1000 small particles with Maxwell-Boltzmann thermal distribution
- Elastic collision physics conserving energy and momentum
- Velocity autocorrelation function C(τ) for Brownian detection
- Spatial hashing optimization for collision detection
- Real-time Chart.js visualization of velocity autocorrelation
- Brownian motion detection when C(lag=3) < 0.7

## Technologies

- TypeScript + Vite
- AgentScript (agent-based physics modeling)
- Chart.js (velocity autocorrelation visualization)
- Canvas 2D rendering
