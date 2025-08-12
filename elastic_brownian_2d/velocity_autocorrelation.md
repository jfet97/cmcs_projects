# Velocity Autocorrelation for Brownian Motion Detection

## Why Superior to MSD in Confined Spaces

- **MSD saturates** at boundaries → slope → 0 even for Brownian motion
- **Velocity autocorrelation always works** → decays even in confined spaces

## Formula (Classical vs Implementation)

Classical (full magnitude correlation):
```
C(τ) = ⟨ v(t) · v(t+τ) ⟩ / ⟨ v(t) · v(t) ⟩
```

Implemented (directional only, more robust when magnitude fluctuates):
```
C_dir(τ) = ⟨ cos θ(t, t+τ) ⟩ = ⟨ v(t)·v(t+τ) / (|v(t)| |v(t+τ)|) ⟩
```

## Practical Implementation (Directional Version)

```typescript
// 1. Save velocity history (sampled every 10 ticks for optimal decorrelation)
if (this.ticks % 10 === 0) {
  this.analysis.updateVelocityHistory(this.largeParticle.vx, this.largeParticle.vy, this.ticks);
}

// 2. Keep last 500 points for performance
if (this.velocityHistory.length > 500) {
  this.velocityHistory = this.velocityHistory.slice(-500);
}

// 3. Calculate cosine of angle (direction correlation) for each lag τ
for (let lag = 0; lag < maxLag; lag++) {
  let sum = 0, count = 0
  
  for (let i = 0; i < history.length - lag; i++) {
    const v1 = history[i]
    const v2 = history[i+lag]
    const m1 = Math.sqrt(v1.vx * v1.vx + v1.vy * v1.vy)
    const m2 = Math.sqrt(v2.vx * v2.vx + v2.vy * v2.vy)
    
    if (m1 > 1e-6 && m2 > 1e-6) {
      const dot = v1.vx * v2.vx + v1.vy * v2.vy
      sum += dot / (m1 * m2)  // Normalized dot product = cos(angle)
      count++
    }
  }
  
  autocorr[lag] = count > 0 ? sum / count : 0
}

// 4. No normalization needed: C_dir(0) ≈ 1 by definition
```

## Brownian Motion Detection Criteria

### Current Implementation
- **Brownian**: C_dir(3) < 0.7 (significant memory loss by lag 3)
- **Non-Brownian**: C_dir remains high (≈1) for several lags or increases
- **Transitional**: Fluctuations without clear trend (need more data)

### Alternative Thresholds
```typescript
// Stricter criterion (when sufficient thermal agitation):
const isBrownianStrict = autocorr[5] < 0.4

// Softer criterion (early phase or low energy):
const isBrownianEarly = autocorr[3] < 0.7
```

## Implementation Details

### 1. Velocity Tracking
- `elasticModel.ts`: Updates every 10 ticks (not every tick) for better decorrelation resolution
- Buffer limited to 500 points for memory efficiency and performance
- Requires minimum 30 points before calculation begins

### 2. Real-time Chart
- Updates every 5 ticks (CONFIG.ANALYSIS.chartUpdateInterval)
- No explicit normalization needed (values already between -1 and 1)
- Y-axis scale: [-0.5, 1.0] for optimal visualization

### 3. Brownian Motion Detection
- Method `isBrownianByAutocorrelation()` checks C_dir(lag=3)
- Current threshold: < 0.7 for velocity memory loss
- Used as primary detection method (no MSD needed)

### 4. Performance Optimizations
- Maximum lag limited to min(25, historyLength/4) for computational efficiency
- Skip calculation if velocity magnitude < 1e-6 (numerical stability)
- Chart updates throttled to maintain 60 FPS rendering

## Scientific Foundation

### Physical Interpretation
- **C(0) = 1**: Perfect correlation at zero lag (particle with itself)
- **C(τ) → 0**: Memory loss indicates random thermal bombardment
- **C(τ) ≈ 1**: Persistent motion indicates ballistic or systematic forces
- **Decay time τ**: Time scale for velocity decorrelation (~ M/γ in theory)

### Advantages Over MSD
1. **Boundary independence**: Works in any confinement geometry
2. **Fast convergence**: Detects Brownian motion within seconds
3. **Physical insight**: Directly measures fundamental Brownian property
4. **Numerical stability**: Less sensitive to reference position drift
5. **Real-time capable**: Immediate feedback for interactive exploration