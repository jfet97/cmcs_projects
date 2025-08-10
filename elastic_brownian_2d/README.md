# Elastic Collision Brownian Motion Simulation

A TypeScript-based physics simulation demonstrating **Brownian motion** through elastic collisions between thermal particles and a large particle. Built with AgentScript physics engine and real-time statistical analysis.

![TypeScript](https://img.shields.io/badge/TypeScript-Physics_Simulation-blue?style=flat-square&logo=typescript)
![Build Status](https://img.shields.io/badge/Build-Vite-brightgreen?style=flat-square&logo=vite)
![Framework](https://img.shields.io/badge/Framework-AgentScript-orange?style=flat-square)

## 🎯 Overview

This simulation recreates the fundamental physics behind Brownian motion:
- **One large red particle** (mass=25, radius=6) starts at rest at the origin
- **300 small blue particles** (mass=1, radius=1.2) undergo continuous thermal motion
- **Elastic collisions** transfer momentum from small to large particles
- **Cumulative random collisions** cause the large particle to exhibit characteristic Brownian motion
- **Real-time analysis** tracks Mean Squared Displacement (MSD) and velocity autocorrelation

The simulation demonstrates how microscopic thermal motion creates observable macroscopic phenomena, validating Einstein's 1905 theory of Brownian motion.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- pnpm (recommended) or npm

### Installation & Running
```bash
# Install dependencies
pnpm install

# Start development server (opens at http://localhost:3000)
pnpm dev

# Alternative start command
pnpm start
```

### Build for Production
```bash
# Build optimized version
pnpm build

# Preview production build
pnpm preview

# Clean build artifacts
pnpm clean
```

### Development Tools
```bash
# Lint TypeScript code
pnpm lint

# Auto-fix linting issues
pnpm lint:fix
```

## 📊 Physics Model

### Particle System
| Component | Mass | Radius | Color | Behavior |
|-----------|------|--------|-------|----------|
| **Large Particle** | 25 | 6 units | Red | Initially at rest, moves via collisions |
| **Small Particles** | 1 | 1.2 units | Light Blue | Maxwell-Boltzmann thermal motion |

### Collision Mechanics
- **Perfectly elastic collisions** with momentum and energy conservation
- **Reduced mass formula** for accurate momentum transfer between different masses
- **Spatial grid optimization** reduces collision detection from O(n²) to O(n)
- **Collision throttling** prevents numerical instability
- **Elastic boundary reflection** at simulation edges

### Physics Parameters
```typescript
CONFIG = {
  LARGE_PARTICLE: { mass: 100, radius: 6, initialPosition: {x: 0, y: 0} },
  SMALL_PARTICLES: { count: 300, mass: 1, radius: 1.2, speed: 3.0 },
  PHYSICS: { worldSize: 300, collisionBuffer: 0.3, minCollisionInterval: 2 },
  ANALYSIS: { msdUpdateInterval: 3, historyLength: 15000, chartUpdateInterval: 8 }
}
```

## 🏗️ Architecture

### Core Components

#### 1. **ElasticModel** (`elasticModel.ts`) - Main Simulation Controller
- Extends AgentScript's Model class for physics simulation lifecycle
- Manages large particle setup (red, mass=100, radius=6) and small particles (blue, mass=1, radius=1.2)
- Coordinates collision detection, position tracking, and analysis updates
- Provides public API for resets, statistics, and parameter updates

#### 2. **ElasticCollisions** (`elasticCollisions.ts`) - Physics Engine
- **Spatial Grid**: O(n) collision detection using cell-based partitioning
- **Elastic Collision Mathematics**: Impulse formula with reduced mass for momentum conservation
- **Thermal Motion**: Maxwell-Boltzmann distribution for realistic thermal behavior
- **Boundary Conditions**: Elastic wall reflections with velocity damping

#### 3. **BrownianAnalysis** (`brownianAnalysis.ts`) - Statistical Analysis
- **MSD Calculation**: Real-time Mean Squared Displacement with slope analysis
- **Velocity Autocorrelation**: Time-lagged correlation for memory loss detection
- **Chart.js Integration**: Live visualization of statistical metrics
- **Auto-Reset Logic**: Intelligent detection of stuck particles

#### 4. **Simulation** (`simulation.ts`) - Canvas Rendering
- **Coordinate Transformation**: Bidirectional mapping between world space and screen space
- **Dynamic Canvas Sizing**: Adaptive dimensions (400-800px, 1.5 px/unit optimal)
- **Particle Visualization**: Physics-accurate rendering with optional debug features
- **Performance Optimization**: Efficient drawing pipeline with transform caching

#### 5. **ElasticBrownianApp** (`index.ts`) - UI Controller
- **State Management**: Synchronizes UI sliders with simulation parameters
- **Event Handling**: Real-time parameter updates and simulation controls
- **Statistics Display**: Live metrics updating every 100ms
- **Responsive Layout**: Grid-based design adapting to screen size

### Data Flow Architecture
```
ElasticBrownianApp (UI Controller)
├── UI State Management (sliders, buttons)
├── Event Handlers (real-time parameter updates)  
└── Statistics Display (live metrics every 100ms)
    ↓
ElasticModel (Main Simulation Controller)
├── Particle Setup & Management
├── Physics Step Loop
└── Analysis Coordination
    ↓
ElasticCollisions (Physics Engine)        BrownianAnalysis (Statistical Engine)
├── Spatial Grid (O(n) detection)         ├── MSD Calculation & Slope Analysis
├── Impulse-based Elastic Collisions      ├── Velocity Autocorrelation 
├── Maxwell-Boltzmann Thermal Motion      ├── Chart.js Real-time Visualization
└── Boundary Reflections                  └── Brownian Motion Detection
    ↓                                         ↓
Simulation (Canvas Rendering System)
├── Coordinate Transformation (world ↔ screen)
├── Dynamic Canvas Sizing (responsive)
├── Particle Visualization (physics-accurate)
└── Performance-Optimized Drawing Pipeline
```

## 🎮 Interactive Features

### Real-Time Controls
- **Reset Simulation**: Restart with new random particle positions
- **Pause/Resume**: Stop and continue simulation
- **Reset MSD**: Clear displacement history for fresh analysis

### Parameter Adjustment  
- **Small Particles**: 100-800 particles (slider control)
- **Speed**: 1.0-8.0 thermal motion speed (affects collision frequency)
- **Field Size**: 200-600 simulation boundary size

### Live Statistics Dashboard
- **Time Steps**: Current simulation tick count
- **Current MSD**: Real-time mean squared displacement
- **Collisions**: Total collision count with large particle
- **Large Particle Speed**: Current velocity magnitude  
- **Total Displacement**: Distance traveled from starting position
- **Brownian Motion Indicator**: Automatic detection status (Yes/No/Developing)

## 📈 Analysis & Visualization

### Mean Squared Displacement (MSD) Analysis
- **Real-time Chart.js visualization** of MSD vs time with smooth updates
- **Linear growth detection** using least-squares regression with time normalization
- **Slope calculation**: MSD slope > 0.01 indicates true Brownian motion
- **Intelligent auto-reset**: Multi-criteria detection of stuck particles (velocity < 0.005, slope < 0.0001)
- **15,000 data point history** for long-term statistical analysis

### Velocity Autocorrelation Analysis  
- **Time-lagged correlation calculation**: C(τ) = ⟨v(t)·v(t+τ)⟩ / ⟨v(t)·v(t)⟩
- **Memory loss detection**: Autocorrelation decay indicates memoryless motion
- **Normalized visualization**: Scaling by lag-0 autocorrelation for consistent interpretation  
- **Brownian motion signature**: Exponential decay to zero correlation

### Brownian Motion Detection Criteria
For validated Brownian motion, the system checks:
- **MSD Linear Growth**: Slope > 0.01 (diffusive behavior)
- **Velocity Decorrelation**: Autocorrelation → 0 (memory loss)
- **Sustained Motion**: No preferred direction or static states
- **Statistical Significance**: >50 data points for reliable analysis

### Real-Time Visualization
- **Particle rendering** with physics-accurate sizes and colors
- **Coordinate transformation** between world physics space and screen pixels
- **Dynamic canvas sizing** adapts to world size (400-800px constraints)
- **Optional velocity vectors** for debugging particle motion

## 🛠️ Technical Architecture

### Build System & Dependencies
- **Vite 7.0.2**: Modern build tool with HMR on port 3000
- **TypeScript 5.0+**: Strict typing with ES2020 target  
- **AgentScript 0.10.26**: Agent-based modeling physics framework
- **Chart.js 4.5.0**: Real-time statistical data visualization
- **ESLint + Prettier**: Code quality enforcement and formatting

### Core Physics Implementation

#### Elastic Collision Mathematics
```typescript
// Impulse formula: J = -(1 + e) * v_rel_n * μ  
const reducedMass = (m1 * m2) / (m1 + m2);
const impulse = -(1 + restitution) * relativeVelocity * reducedMass;

// Momentum conservation through impulse application
particle1.vx += (impulse / particle1.mass) * normalX;
particle2.vx -= (impulse / particle2.mass) * normalX;
```

#### Thermal Motion System
```typescript
// Maxwell-Boltzmann thermal energy distribution
const thermalEnergy = 0.1; // kT parameter
const thermalMagnitude = Math.sqrt(2 * thermalEnergy / particle.mass);
// Random thermal perturbations maintain realistic temperature
```

#### Spatial Grid Optimization
```typescript
// O(n) collision detection vs O(n²) brute force
const grid = createSpatialGrid(turtles, cellSize);
const nearbyParticles = getNearbyParticles(particle.x, particle.y, grid);
// Only check particles in adjacent 3×3 cell neighborhood
```

### Performance Features
- **Spatial grid collision detection**: Reduces complexity from O(n²) to O(n)
- **Throttled updates**: Charts every 8 ticks, statistics every 100ms
- **Bounded history buffers**: 15,000 MSD points, 1,000 velocity samples
- **Adaptive canvas sizing**: 400-800px with 1.5 px/unit optimal density

## 🧪 Configuration & Extension

### Physics Parameter Tuning
All physics parameters centralized in `particleTypes.ts`:
```typescript
export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 25,               // Optimal mass ratio (25:1) for responsive Brownian motion
    radius: 6,              // Collision cross-section optimization
    initialPosition: {x: 0, y: 0},
    color: "red"
  },
  SMALL_PARTICLES: {
    count: 300,             // Optimal density for collision frequency vs performance
    mass: 1,                // Unit mass for simple calculations
    radius: 1.2,            // Sized for realistic collisions without overcrowding  
    speed: 3.0,             // Thermal speed tuned for observable Brownian motion
    color: "lightblue"
  },
  PHYSICS: {
    worldSize: 300,         // Simulation boundaries (-300 to +300)
    collisionBuffer: 0.3,   // Overlap tolerance for numerical stability
    minCollisionInterval: 2 // Collision throttling to prevent oscillation
  }
}
```

### Statistical Analysis Extensions
The `BrownianAnalysis` class can be extended for additional metrics:
```typescript
// Example: Add diffusion coefficient calculation
public calculateDiffusionCoefficient(): number {
  const msdSlope = this.getMSDSlope();
  return msdSlope / 4; // D = slope/4 for 2D diffusion
}

// Example: Add Einstein relation validation  
public validateEinsteinRelation(): boolean {
  const D = this.calculateDiffusionCoefficient();
  const kT = 0.1; // Thermal energy
  const expectedD = kT / (6 * Math.PI * viscosity * radius);
  return Math.abs(D - expectedD) < tolerance;
}
```

## 🔬 Scientific Foundation

### Brownian Motion Physics
This simulation validates fundamental statistical mechanics principles:

#### Einstein's Theory (1905)
- **Diffusion Equation**: MSD(t) = 4Dt where D is the diffusion coefficient
- **Random Walk Model**: Particle position follows stochastic process
- **Fluctuation-Dissipation**: Thermal energy drives observable motion
- **Scale Invariance**: Self-similar behavior across time scales

#### Implementation Features
- **Kinetic Theory**: Models molecular collision dynamics
- **Momentum Transfer**: Demonstrates microscopic → macroscopic emergence  
- **Statistical Validation**: Real-time verification of theoretical predictions
- **Thermal Equilibrium**: Maxwell-Boltzmann energy distribution

### Applications & Context
- **Colloidal Physics**: Suspended particles in fluids
- **Molecular Dynamics**: Protein and polymer motion
- **Financial Modeling**: Random walk models in economics
- **Biophysics**: Cellular transport and diffusion processes

## 🔧 Development & Debugging

### Console Debug Interface
```typescript
// Browser console access for real-time debugging
window.elasticBrownianApp.getStatistics()           // Current metrics
window.elasticBrownianApp.getModel().analysis.getAnalysisSummary() // Analysis state
window.elasticBrownianApp.getCurrentUIState()       // UI parameter values
```

### Performance Monitoring
- **Frame Rate**: Target 60 FPS with 300 particles
- **Collision Detection**: <1ms per frame with spatial grid
- **Memory Usage**: Stable with bounded history buffers
- **MSD Accuracy**: <1% error with time-normalized calculations

### Troubleshooting Common Issues
- **Large particle not moving**: Check small particle count and speed settings
- **MSD shows no growth**: Use "Reset MSD" button to clear reference position
- **Canvas display issues**: Verify world size changes trigger canvas resize
- **Performance degradation**: Reduce particle count or check collision optimization

## 📚 Documentation

For comprehensive implementation details, see `CLAUDE.md` which includes:
- Complete physics implementation with mathematical formulas
- State management architecture and synchronization protocols  
- Performance optimization strategies and memory management
- Error handling, edge cases, and numerical stability safeguards
- Debugging guide and troubleshooting procedures

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Enhancement opportunities:
- **Temperature control system** for thermal energy scaling
- **Multiple large particles** for complex interaction dynamics
- **3D visualization** with WebGL for enhanced depth perception
- **Export capabilities** for simulation data and analysis results
- **Mobile optimization** for touch-based parameter control

## 🔧 Development Setup

```bash
# Clone and setup
git clone <repository-url>
cd elastic_brownian_2d
pnpm install

# Development with hot reload  
pnpm dev

# Type checking
pnpm lint

# Production build
pnpm build
```

---

*This simulation demonstrates fundamental physics principles through interactive visualization, making complex statistical mechanics concepts accessible through real-time experimentation.*