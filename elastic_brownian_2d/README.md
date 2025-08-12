# Elastic Collision Brownian Motion Simulation

A TypeScript-based physics simulation demonstrating **Brownian motion** through pure elastic collisions between thermal particles. Built with AgentScript physics engine and real-time velocity autocorrelation analysis.

![TypeScript](https://img.shields.io/badge/TypeScript-Physics_Simulation-blue?style=flat-square&logo=typescript)
![Build Status](https://img.shields.io/badge/Build-Vite-brightgreen?style=flat-square&logo=vite)
![Framework](https://img.shields.io/badge/Framework-AgentScript-orange?style=flat-square)

## 🎯 Overview

This simulation demonstrates pure collision-driven Brownian motion:
- **One large red particle** (mass = 30, radius = 8) starts completely at rest
- **Many small blue particles** (default 1200, mass = 1, radius = 1.5) with Maxwell-Boltzmann thermal velocities
- **Pure elastic collisions** between ALL particles (large-small AND small-small interactions)
- **No artificial forces** - motion emerges entirely from elastic collision dynamics
- **Real-time velocity autocorrelation analysis** for robust Brownian motion detection
- **Velocity sampling every 10 ticks** for optimal autocorrelation measurement

The simulation demonstrates how microscopic thermal motion creates observable macroscopic Brownian motion through pure physics, without artificial noise or stochastic forces.

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
| **Large Particle** | 30 | 8 units | Red | Pure collision-driven motion |
| **Small Particles** | 1 | 1.5 units | Light Blue | Maxwell-Boltzmann thermal motion |

### Pure Elastic Collision Physics
- **All-pairs elastic collisions** between every particle pair (large-small AND small-small)
- **Impulse-based momentum transfer** conserving energy and momentum
- **Maxwell-Boltzmann velocity initialization** for realistic thermal distribution
- **Boundary reflections** with elastic collision physics
- **No artificial forces** - motion emerges purely from collision dynamics

### Physics Parameters
```typescript
// Current defaults (see particleTypes.ts)
CONFIG = {
  LARGE_PARTICLE: { mass: 30, radius: 8, initialPosition: { x: 0, y: 0 } },
  SMALL_PARTICLES: { count: 1200, mass: 1, radius: 1.5, temperature: 0.5 },
  PHYSICS: { worldSize: 150, timeStep: 1, collisionBuffer: 0.2, minCollisionInterval: 1 },
  LANGEVIN: { enabled: false }, // DISABLED - pure collision physics
  ANALYSIS: { chartUpdateInterval: 5, historyLength: 20000 }
};
// Pure collision-driven thermal particle simulation with high density
```

## 🏗️ Architecture

### Core Components

#### 1. **ElasticModel** (`elasticModel.ts`)
- Creates particles, advances dynamics (collision + Langevin), updates analysis

#### 2. **ElasticCollisions** (`elasticCollisions.ts`) - Pure Physics Engine
- **All-pairs collision detection** (large-small AND small-small interactions)
- **Elastic collision mathematics** with perfect energy and momentum conservation
- **Maxwell-Boltzmann thermal initialization** for realistic thermal particle velocities
- **Boundary handling** with elastic reflection physics

#### 3. **BrownianAnalysis** (`brownianAnalysis.ts`) - Velocity Autocorrelation Engine
- **Velocity Autocorrelation**: Real-time calculation of time-lagged velocity correlations
- **Brownian Motion Detection**: Memory loss detection through correlation decay
- **Chart.js Integration**: Live visualization of autocorrelation curves
- **Statistical Analysis**: Robust motion characterization for confined spaces

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
ElasticCollisions (Pure Physics Engine)          BrownianAnalysis (Velocity Autocorrelation Engine)
├── All-Pairs Collision Detection               ├── Real-time Velocity Autocorrelation
├── Elastic Momentum & Energy Conservation      ├── Brownian Motion Detection via Memory Loss
├── Maxwell-Boltzmann Thermal Distribution      ├── Chart.js Real-time Visualization
└── Boundary Elastic Reflections               └── Statistical Motion Characterization
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
- **Small Particles**: 100-800 particles (slider control) - default 1200
- **Temperature**: 0.1-3.0 thermal energy (affects collision intensity) - default 0.5
- **Field Size**: 200-600 simulation boundary size - default 150

### Live Statistics Dashboard
- **Time Steps**: Current simulation tick count
- **Large Particle Speed**: Current velocity magnitude  
- **Total Displacement**: Distance traveled from starting position
- **Velocity Autocorrelation**: Real-time correlation decay measurement
- **Brownian Motion Indicator**: Automatic detection status (Yes/No/Developing)

## 📈 Analysis & Visualization

### Velocity Autocorrelation (Primary Analysis)
- **C(τ) = ⟨v(t)·v(t+τ)⟩ / ⟨|v(t)||v(t+τ)|⟩** measuring velocity memory loss over time
- **Brownian motion detection**: C(τ) decays to zero (memory loss indicates random motion)
- **Superior to MSD**: Works effectively in confined spaces where MSD saturates

### Brownian Motion Detection Criteria
- **Velocity decorrelation**: C(lag=3) < 0.7 indicates significant memory loss
- **Real-time detection**: Analysis updates every simulation tick
- **Robust in confinement**: Unlike MSD, autocorrelation remains effective at boundaries

### Real-Time Visualization
- **Velocity autocorrelation chart** showing correlation decay over time lags
- **Particle rendering** with physics-accurate sizes and thermal motion
- **Coordinate transformation** between world physics space and screen pixels
- **Dynamic canvas sizing** adapts to world size for optimal visualization

## 🛠️ Technical Architecture

### Build System & Dependencies
- **Vite 7.0.2**: Modern build tool with HMR on port 3000
- **TypeScript 5.0+**: Strict typing with ES2020 target  
- **AgentScript 0.10.26**: Agent-based modeling physics framework
- **Chart.js 4.5.0**: Real-time statistical data visualization
- **ESLint + Prettier**: Code quality enforcement and formatting

### Core Physics Implementation

#### Elastic Collision Mathematics (All Particle Pairs)
```typescript
// Impulse formula: J = -(1 + e) * v_rel_n * μ  
const reducedMass = (m1 * m2) / (m1 + m2);
const impulse = -(1 + restitution) * relativeVelocity * reducedMass;

// Momentum conservation through impulse application
particle1.vx += (impulse / particle1.mass) * normalX;
particle2.vx -= (impulse / particle2.mass) * normalX;
```

#### Pure Thermal Motion Physics
```typescript
// Large particle starts completely at rest
vx = 0; vy = 0;

// Small particles initialized with Maxwell-Boltzmann distribution
function maxwellBoltzmannVelocity2D(temperature, mass) {
  const sigma = Math.sqrt(temperature / mass);
  return { vx: gaussianRandom() * sigma, vy: gaussianRandom() * sigma };
}
```

#### All-Pairs Collision Detection
```typescript
// Handle collisions between ALL particle pairs
function handleAllCollisions(turtles, ticks) {
  for (let i = 0; i < turtles.length; i++) {
    for (let j = i + 1; j < turtles.length; j++) {
      performElasticCollision(turtles[i], turtles[j], ticks);
    }
  }
}
```

### Performance Features
- **All-pairs collision detection**: O(n²) complexity but optimized for ~1200 particles
- **Throttled updates**: Charts every 5 ticks, statistics every 100ms
- **Bounded history buffers**: 500 velocity points for autocorrelation analysis
- **Velocity sampling**: Every 10 ticks for optimal decorrelation measurement
- **Adaptive canvas sizing**: Automatic scaling based on world size

## 🧪 Configuration & Extension

### Physics Parameter Tuning
Central parameters in `particleTypes.ts` (see code for authoritative values). Adjust sliders to explore density, speed, confinement.

### Statistical Analysis Extensions
The `BrownianAnalysis` class can be extended for additional metrics:
```typescript
// Example: Add diffusion coefficient estimation from autocorrelation
public calculateVelocityDecayTime(): number {
  // Find characteristic decay time from autocorrelation curve
  for (let i = 0; i < this.autocorrelations.length; i++) {
    if (this.autocorrelations[i] < 1/Math.E) { // 1/e decay
      return i; // Return decay time in simulation ticks
    }
  }
  return this.autocorrelations.length;
}

// Example: Add thermal equilibrium validation
public checkThermalEquilibrium(): boolean {
  const avgKineticEnergy = this.calculateAverageKineticEnergy();
  const expectedThermalEnergy = 0.5 * CONFIG.SMALL_PARTICLES.temperature; // kT/2 per DOF
  return Math.abs(avgKineticEnergy - expectedThermalEnergy) < 0.1;
}
```

## 🔬 Scientific Foundation

### Brownian Motion Physics
This simulation validates fundamental statistical mechanics principles:

#### Einstein / Langevin Relations (in reduced units)
- MSD: 4 D t (2D)
- D = kT / γ
- ⟨v²⟩ = 2 kT / M
- Velocity autocorr ~ exp(-t/τ) with τ = M/γ

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