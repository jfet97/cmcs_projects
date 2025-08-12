# Velocity Autocorrelation per Brownian Motion Detection

## Perché è meglio di MSD in spazi confinati

- **MSD si satura** nei confini → pendenza → 0 anche se è Browniano
- **Velocity autocorrelation funziona sempre** → decade anche in spazi confinati

## Formula semplice

```
C(τ) = ⟨v(t) · v(t+τ)⟩ / ⟨v(t) · v(t)⟩

Dove:
- v(t) = velocità al tempo t
- τ = ritardo temporale (lag)  
- ⟨⟩ = media su tutti i tempi t
```

## Implementazione pratica

```typescript
// 1. Salva storia velocità
velocityHistory = [{vx, vy, time}, ...]

// 2. Per ogni lag τ
for (let lag = 0; lag < maxLag; lag++) {
  let sum = 0, count = 0
  
  // 3. Calcola prodotto scalare v(t) · v(t+lag)
  for (let i = 0; i < history.length - lag; i++) {
    const dotProduct = history[i].vx * history[i+lag].vx + 
                       history[i].vy * history[i+lag].vy
    sum += dotProduct
    count++
  }
  
  autocorr[lag] = sum / count
}

// 4. Normalizza per lag=0
for (let lag = 0; lag < maxLag; lag++) {
  autocorr[lag] = autocorr[lag] / autocorr[0]
}
```

## Criterio Browniano

- **Browniano**: C(τ) decade verso 0 entro pochi step
- **Non-Browniano**: C(τ) rimane alta o oscilla

## Soglia pratica

```typescript
// Se dopo lag=10 la correlazione è < 0.1 → Browniano
const isBrownian = autocorr[10] < 0.1
```

## Dove implementare

Aggiungi in `brownianAnalysis.ts` accanto al calcolo MSD esistente.