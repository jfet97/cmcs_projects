# Brownian Motion Simulation

A TypeScript-based interactive simulation of Brownian motion (random walk) using AgentScript and Chart.js for real-time visualization of particle movement and Mean Squared Displacement (MSD) analysis.

## Overview

This project simulates the Brownian motion of particles in a 2D environment, demonstrating the fundamental physical phenomenon where particles suspended in a fluid move randomly due to collisions with fast-moving molecules. The simulation includes:

- **Real-time particle visualization**: 4000 particles moving in random walks
- **Collision detection**: Optimized spatial grid-based collision system
- **MSD tracking**: Live plotting of Mean Squared Displacement over time
- **Interactive canvas**: Visual representation of particle movements

## Features

### Particle Simulation

- **4000 particles** with configurable step size and properties
- **Two initialization strategies**:
  - `center`: Particles start near the center (plateau L²/6)
  - `random`: Particles start randomly distributed (plateau L²/3)
- **Elastic collision handling** with optimized spatial grid algorithm
- **Boundary constraints** to keep particles within the simulation area

### Visualization

- **Real-time canvas rendering** at 30 FPS
- **Interactive MSD chart** showing displacement patterns over time
- **Responsive design** with side-by-side particle view and analytics

### Technical Implementation

- **TypeScript** for type safety and modern JavaScript features
- **AgentScript** framework for agent-based modeling
- **Chart.js** for real-time data visualization
- **Vite** for fast development and optimized builds

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- pnpm package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd brownian_motion/diffusion

# Install dependencies
pnpm install
```

### Running the Simulation

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

Open your browser and navigate to the local development server (typically `http://localhost:5173`) to view the simulation.

## Project Structure

```
src/
├── brownianModel.ts    # Main simulation model and particle logic
├── collisions.ts       # Spatial grid and collision detection algorithms
├── msd.ts             # Mean Squared Displacement calculation and charting
├── simulation.ts      # Particle rendering and visualization
├── index.ts           # Application entry point
├── index.html         # Main HTML template
└── style.css          # Styling for the interface
```

## Physics Background

The simulation demonstrates key principles of Brownian motion:

- **Random Walk**: Each particle moves in random directions with fixed step sizes
- **Mean Squared Displacement**: The average of the squared distances particles travel from their starting positions, showing the diffusive nature of the motion
- **Collision Dynamics**: Particles interact through elastic collisions, affecting their trajectories

## Customization

Key parameters that can be modified in `brownianModel.ts`:

- `numParticles`: Number of particles in the simulation (default: 4000)
- `stepSize`: Distance each particle moves per step (default: 4)
- `TURTLE_SIZE`: Size of each particle for collision detection (default: 1)

## Development

### Scripts

- `pnpm dev`: Start development server with hot reload
- `pnpm build`: Create optimized production build
- `pnpm lint`: Run ESLint for code quality
- `pnpm lint:fix`: Auto-fix linting issues

### Technologies Used

- **TypeScript**: Static typing and modern JavaScript
- **AgentScript**: Agent-based modeling framework
- **Chart.js**: Data visualization library
- **Vite**: Build tool and development server
- **ESLint**: Code linting and formatting

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
