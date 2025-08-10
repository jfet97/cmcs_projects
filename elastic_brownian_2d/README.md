# Elastic Collision Brownian Motion Simulation

A TypeScript-based physics simulation demonstrating **Brownian motion** through elastic collisions between thermal particles and a large particle. Built with AgentScript physics engine and real-time statistical analysis.

![TypeScript](https://img.shields.io/badge/TypeScript-Physics_Simulation-blue?style=flat-square&logo=typescript)
![Build Status](https://img.shields.io/badge/Build-Vite-brightgreen?style=flat-square&logo=vite)
![Framework](https://img.shields.io/badge/Framework-AgentScript-orange?style=flat-square)

## 🎯 Overview

This simulation recreates the fundamental physics behind Brownian motion:
- **One large red particle** (mass=100, radius=6) starts at rest at the origin
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
| **Large Particle** | 100 | 6 units | Red | Initially at rest, moves via collisions |
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

#### 1. **ElasticModel** (`elasticModel.ts`)
- Main simulation controller extending AgentScript's `Model`
- Manages particle lifecycle and physics stepping
- Coordinates collision detection and analysis updates
- Handles parameter changes and simulation resets

#### 2. **Collision System** (`elasticCollisions.ts`)
- **Spatial Grid Optimization**: Particles organized in spatial cells for efficient collision detection
- **Elastic Collision Physics**: Implements conservation of momentum and energy
- **Boundary Handling**: Elastic reflection at world boundaries
- **Movement Logic**: Separate handling for large vs small particles

#### 3. **Brownian Analysis** (`brownianAnalysis.ts`)
- **Real-time MSD calculation**: Tracks mean squared displacement over time
- **Velocity autocorrelation**: Measures memory loss in particle motion
- **Chart.js integration**: Live plotting of analysis metrics
- **Brownian motion detection**: Automatic analysis of motion characteristics

#### 4. **Visualization** (`simulation.ts`)
- **Canvas rendering** with proper coordinate transformation
- **Particle drawing** with size and color differentiation
- **Responsive scaling** adapts to world size changes
- **Optional velocity vectors** for debugging

#### 5. **User Interface** (`index.ts`)
- **Real-time controls**: Pause/resume, reset, parameter adjustment
- **Live statistics**: Collision count, MSD, velocity, displacement
- **Interactive sliders**: Particle count, speed, world size
- **Responsive design**: Adapts to different screen sizes

### Data Flow
```
User Input → ElasticModel → Collision Detection → Physics Update
                ↓              ↓                    ↓
           Visualization ← Analysis Update ← Particle State
```

## 🎮 Interactive Features

### Real-time Controls
- **Reset Simulation**: Restart with new random particle positions
- **Pause/Resume**: Stop and continue simulation
- **Reset MSD**: Clear displacement history for fresh analysis

### Parameter Adjustment
- **Small Particles**: 100-1000 particles (slider control)
- **Speed**: 1.0-10.0 thermal motion speed
- **Field Size**: 100-500 simulation boundary size

### Live Statistics
- **Time Steps**: Current simulation tick count
- **Current MSD**: Real-time mean squared displacement
- **Collisions**: Total collision count with large particle
- **Large Particle Speed**: Current velocity magnitude
- **Total Displacement**: Distance from starting position
- **Brownian Motion Indicator**: Automatic detection status

## 📈 Analysis & Visualization

### Mean Squared Displacement (MSD)
- **Real-time plotting** of MSD vs time
- **Linear growth detection** indicates diffusive behavior
- **Slope calculation** using least-squares regression
- **Auto-reset mechanism** if particle gets stuck

### Velocity Autocorrelation
- **Correlation analysis** of velocity vectors over time
- **Memory loss detection** shows approach to zero correlation
- **Normalized display** for consistent interpretation
- **Lag-based calculation** up to reasonable time scales

### Expected Behavior
For true Brownian motion:
- **MSD should increase linearly** with time (slope > 0)
- **Velocity autocorrelation should decay** to zero
- **Motion should be non-directional** and continuous
- **Large particle should exhibit erratic movement**

## 🛠️ Technical Details

### Build System
- **Vite**: Modern build tool with HMR support
- **TypeScript**: Strict typing with ES2020 target
- **ESLint + Prettier**: Code quality and formatting
- **Source maps**: Development debugging support

### Dependencies
```json
{
  "agentscript": "^0.10.26",    // Agent-based modeling framework
  "chart.js": "^4.5.0",        // Real-time data visualization
  "typescript": "^5.0.0",      // Static typing
  "vite": "^7.0.2"             // Build tool and dev server
}
```

### Performance Optimizations
- **Spatial grid collision detection**: O(n) instead of O(n²)
- **Throttled chart updates**: Reduces rendering overhead  
- **Position history limiting**: Prevents memory leaks
- **Canvas optimization**: Fixed resolution with CSS scaling

### Browser Compatibility
- **Modern browsers** with ES2020 support
- **Canvas 2D API** required for visualization
- **Chart.js** handles cross-browser charting

## 🧪 Customization

### Modifying Physics Parameters
Edit `CONFIG` object in `particleTypes.ts`:
```typescript
export const CONFIG = {
  LARGE_PARTICLE: {
    mass: 50,           // Adjust mass ratio
    radius: 8,          // Change collision cross-section
    color: "red"        // Visual appearance
  },
  SMALL_PARTICLES: {
    count: 500,         // Number of thermal particles
    mass: 1,            // Small particle mass
    speed: 4,           // Thermal motion speed
    stepSize: 3.5       // Random walk step size
  }
}
```

### Adding New Analysis
Extend `BrownianAnalysis` class:
```typescript
public addCustomMetric() {
  // Calculate your custom physics metric
  // Update visualization
  // Store in history for analysis
}
```

### Visualization Customization
Modify `Simulation` class for different rendering:
```typescript
private drawParticle(particle: ElasticParticle) {
  // Custom particle appearance
  // Additional visual elements
  // Performance optimizations
}
```

## 🔬 Scientific Background

### Brownian Motion Theory
- **Random walk process**: Particle position changes randomly over time
- **Diffusion equation**: ⟨x²⟩ = 2Dt (Einstein's relation)  
- **Temperature relation**: Motion intensity proportional to thermal energy
- **Scale invariance**: Fractal-like behavior at different time scales

### This Simulation
- Models **kinetic theory** of gases through particle collisions
- Demonstrates **momentum transfer** from thermal motion
- Shows **emergence** of macroscopic behavior from microscopic interactions
- Validates **statistical mechanics** predictions

### Applications
- **Colloidal physics**: Particles suspended in fluids
- **Financial modeling**: Random walk in stock prices
- **Molecular dynamics**: Protein folding simulations
- **Statistical analysis**: Testing random process theories

## 📚 References

1. **Einstein, A.** (1905). "Über die von der molekularkinetischen Theorie der Wärme geforderte Bewegung von in ruhenden Flüssigkeiten suspendierten Teilchen"
2. **Perrin, J.** (1908). "Brownian Movement and Molecular Reality"
3. **Langevin, P.** (1908). "Sur la théorie du mouvement brownien"
4. **AgentScript Documentation**: https://agentscript.org/
5. **Chart.js Documentation**: https://www.chartjs.org/

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- **3D collision physics** for more realistic simulations
- **Temperature controls** for thermal energy adjustment  
- **Additional analysis metrics** (diffusion coefficient, etc.)
- **Performance optimizations** for larger particle counts
- **Mobile responsive controls** for touch interfaces

## 🐛 Known Issues & Status

### **🟢 CRITICAL ISSUES (FIXED):**
- ~~**TypeScript compilation errors** in velocity autocorrelation function~~ ✅ **FIXED**
- ~~**Missing resetMSD method** referenced in UI~~ ✅ **FIXED**
- ~~**Coordinate System Problems**: Inconsistent positioning using viewWidth vs worldSize~~ ✅ **FIXED**
- ~~**Broken resize logic**: Canvas scaling parameter confusion (diameter vs radius)~~ ✅ **FIXED**
- ~~**Over-aggressive MSD auto-reset**: Logic conflict resetting during correct motion~~ ✅ **FIXED**

### **✅ PHASE 1 FIXES COMPLETED:**

#### **Coordinate System Unified:**
- **ElasticModel.setupSmallParticles()** now uses world boundaries consistently
- **Removed viewWidth/viewHeight properties** - all systems use world.minX/maxX boundaries
- **Particle positioning** now correctly aligned with simulation boundaries

#### **Canvas Scaling Fixed:**  
- **updateCanvasSize(worldDiameter)** parameter clearly defined as diameter
- **Consistent coordinate transformation** between world and canvas space
- **Proper visual scaling** maintains aspect ratio and performance

#### **MSD Logic Improved:**
- **Removed aggressive auto-reset** that triggered during normal motion
- **Smart particle stuck detection** only resets when avgVelocity < 0.01 for 50+ samples
- **Eliminated timing conflicts** between multiple reset mechanisms

### **🟢 PERFORMANCE ISSUES (MINOR):**
- **High particle counts** (>1000) may impact performance
- **Chart performance** with very long simulation runs  
- **Collision detection** timing sensitive to frame rate

### **📋 FIX IMPLEMENTATION PLAN:**

#### **Phase 1: Critical Coordinate Fixes**
1. **Fix ElasticModel.setupSmallParticles()** to use world boundaries instead of viewWidth
2. **Fix Simulation.updateCanvasSize()** parameter handling (radius vs diameter)
3. **Remove over-aggressive MSD auto-reset** logic

#### **Phase 2: Architecture Cleanup**
4. **Remove viewWidth/viewHeight properties** from ElasticModel (use world bounds)
5. **Fix all resize method calls** to pass consistent parameters
6. **Improve MSD reset detection** to only trigger when particle is actually stuck

#### **Phase 3: Polish & Optimization**  
7. **Add boundary validation** after world size changes
8. **Optimize canvas coordinate transformations**
9. **Add comprehensive debugging information**

### **🔧 Current Development Status:**
- **Type errors**: ✅ All fixed and linting passes
- **Critical logic issues**: ✅ **ALL FIXED** - Phase 1 complete
- **Build system**: ✅ Clean builds with no errors
- **Simulation accuracy**: ✅ **SIGNIFICANTLY IMPROVED**

### **🚀 READY FOR USE:**
The simulation now has:
- ✅ **Accurate particle positioning** using consistent world coordinates
- ✅ **Proper canvas scaling** with clear parameter handling  
- ✅ **Intelligent MSD analysis** that only resets when particle is actually stuck
- ✅ **No compilation errors** and clean TypeScript code

*All critical issues resolved. The simulation now provides accurate physics behavior and reliable Brownian motion analysis.*

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