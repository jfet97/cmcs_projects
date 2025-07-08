# Brownian Motion Simulation

An interactive Brownian motion (random walk) simulation written in TypeScript with AgentScript and Chart.js.

## Features

- **Real-time simulation** of 500 particles following a random walk
- **Graphical visualization** of particles in a 2D world
- **Advanced collision detection** with optimized spatial grid algorithm
- **Multiple collision handling methods** (avoidance vs elastic collision)
- **MSD Chart** (Mean Squared Displacement) showing temporal evolution
- **Modern interface** with custom CSS
- **Type-safe architecture** with TypeScript

## Getting Started

### Prerequisites

- Node.js (>= 18.0.0)
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository or download the files
cd brownian_motion/diffusion

# Install dependencies
pnpm install
```

### Development

```bash
# Start the development server with Vite
pnpm dev

# The server will be available at http://localhost:3000
```

### Production Build

```bash
# Build for production
pnpm build

# Preview the production build
pnpm preview
```

### Available Commands

- `pnpm dev` - Start development server with Vite
- `pnpm build` - Build for production with Vite
- `pnpm preview` - Preview the production build
- `pnpm start` - Alias for `pnpm dev`
- `pnpm clean` - Remove build artifacts

## Project Structure

```
diffusion/
├── index.html          # Main HTML page
├── index.ts            # Main TypeScript code
├── style.css           # CSS styles
├── package.json        # npm/pnpm configuration
├── tsconfig.json       # TypeScript configuration
└── README.md          # This file
```

## Technologies Used

- **TypeScript** - Type-safe programming language
- **AgentScript** - Agent-based modeling framework
- **Chart.js** - Interactive charting library
- **HTML5 Canvas** - Particle rendering
- **CSS3** - Modern styling

## How It Works

1. **Initialization**: 500 particles are created at the center of the world
2. **Random Walk**: At each step, each particle attempts to move in a random direction
3. **Collision Detection**: Advanced collision detection prevents particles from overlapping
4. **Collision Handling**: Two methods available:
   - **Collision Avoidance**: Particles try multiple random directions until finding a valid position
   - **Elastic Collision**: Particles bounce off each other in a physically realistic manner
5. **Boundary Handling**: Particles bounce off the world boundaries
6. **MSD Calculation**: Mean Squared Displacement is calculated for each timestep
7. **Visualization**: The MSD chart is updated in real-time

## Customization

You can modify simulation parameters in the `index.ts` file:

```typescript
// Number of particles
this.numParticles = 500;

// Step size
turtle.stepSize = 4;

// Particle color and shape
turtle.color = "blue";
turtle.shape = "circle";
turtle.size = 2;

// Switch collision handling method
// Method 1: Advanced collision avoidance (default)
this.moveParticleWithCollisionAvoidance(turtle);

// Method 2: Elastic collision (more realistic physics)
// this.moveParticleWithElasticCollision(turtle);
```

## Scientific Theory

Brownian motion is the random movement of particles suspended in a fluid. The Mean Squared Displacement (MSD) is a statistical measure that quantifies how far particles move from their initial position over time.

For a 2D random walk, theory predicts that MSD ∝ t (linear growth over time).

## License

MIT License - See package.json file for details.
