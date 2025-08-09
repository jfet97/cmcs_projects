# Elastic Collision Brownian Motion Simulation

A TypeScript-based simulation demonstrating **Brownian motion** through elastic collisions between one large particle and many small particles. This project showcases how random thermal motion of small particles can induce characteristic Brownian motion in a larger particle through momentum transfer during collisions.

![Simulation Preview](https://img.shields.io/badge/TypeScript-Physics_Simulation-blue?style=flat-square&logo=typescript)
![Build Status](https://img.shields.io/badge/Build-Vite-brightgreen?style=flat-square&logo=vite)
![Framework](https://img.shields.io/badge/Framework-AgentScript-orange?style=flat-square)

## 🎯 Overview

This simulation implements a **physically accurate elastic collision system** where:
- **One large red particle** (mass=50, radius=8) starts at rest at the center
- **Many small blue particles** (mass=1, radius=1.5) undergo thermal motion
- **Elastic collisions** transfer momentum from small to large particles
- **Real-time analysis** tracks Mean Squared Displacement (MSD) and velocity autocorrelation
- **Interactive controls** allow parameter adjustments during simulation

The large particle's motion emerges naturally from the cumulative effect of random collisions, demonstrating the fundamental principles of Brownian motion discovered by Robert Brown in 1827 and explained by Einstein in 1905.

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
| **Large Particle** | 50 | 8 units | Red | Initially at rest, moves via collisions |
| **Small Particles** | 1 | 1.5 units | Light Blue | Random thermal motion |

### Collision Mechanics
- **Fully elastic collisions** with momentum and energy conservation
- **Collision detection** optimized with spatial grid system (O(n) complexity)
- **Separation handling** prevents particle overlap
- **Collision throttling** prevents rapid repeated collisions
- **Boundary reflection** at simulation edges

### Physics Parameters
```typescript
CONFIG = {
  LARGE_PARTICLE: { mass: 50, radius: 8 },
  SMALL_PARTICLES: { count: 500, mass: 1, radius: 1.5, speed: 4 },
  PHYSICS: { worldSize: 200, minCollisionInterval: 3 },
  ANALYSIS: { msdUpdateInterval: 5, chartUpdateInterval: 10 }
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

### **🔴 CRITICAL ISSUES (FIXED):**
- ~~**TypeScript compilation errors** in velocity autocorrelation function~~ ✅ **FIXED**
- ~~**Missing resetMSD method** referenced in UI~~ ✅ **FIXED**

### **🟡 LOGIC ISSUES (IDENTIFIED - READY TO FIX):**

#### **Coordinate System Problems:**
- **Inconsistent positioning**: Small particles placed using `viewWidth` but world uses `worldSize` boundaries
- **Broken resize logic**: Canvas scaling receives diameter but stores as radius, causing visual inconsistencies
- **Mixed coordinate systems**: ElasticModel, Simulation, and world boundaries use different coordinate references

#### **MSD Calculation Issues:**  
- **Over-aggressive auto-reset**: MSD reference resets even when particle is moving correctly
- **Logic conflict**: Auto-reset triggers when `msdVariation < 0.1` AND `currentVelocity > 0.1` (wrong condition)
- **Timing conflicts**: Multiple reset detection mechanisms interfere with each other

#### **Resize & View Logic:**
- **Parameter confusion**: `updateCanvasSize(worldSizeTotal)` - unclear if diameter or radius
- **Scaling inconsistency**: Canvas visual size vs world coordinate scaling mismatch
- **Particle density issues**: World resize doesn't maintain proper particle distribution

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
- **Logic analysis**: ✅ Complete with detailed fix plan
- **Ready for implementation**: 🚀 Critical fixes ready to apply

*The simulation runs but has coordinate placement and MSD calculation issues that affect accuracy. All problems are identified with specific fixes planned.*

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