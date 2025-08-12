# Velocity Autocorrelation per Brownian Motion Detection

## Perché è meglio di MSD in spazi confinati

- **MSD si satura** nei confini → pendenza → 0 anche se è Browniano
- **Velocity autocorrelation funziona sempre** → decade anche in spazi confinati

## Formula (classica vs implementazione)

Classica (modulo completo):
```
C(τ) = ⟨ v(t) · v(t+τ) ⟩ / ⟨ v(t) · v(t) ⟩
```
Implementata (solo direzione, più robusta quando il modulo fluttua molto):
```
C_dir(τ) = ⟨ cos θ(t, t+τ) ⟩ = ⟨ v(t)·v(t+τ) / (|v(t)| |v(t+τ)|) ⟩
```

## Implementazione pratica (versione direzionale)

```typescript
// 1. Salva storia velocità
velocityHistory = [{vx, vy, time}, ...]

// 2. Per ogni lag τ
for (let lag = 0; lag < maxLag; lag++) {
  let sum = 0, count = 0
  
  // 3. Calcola coseno angolo (direzione)
  for (let i = 0; i < history.length - lag; i++) {
    const v1 = history[i]
    const v2 = history[i+lag]
    const m1 = Math.hypot(v1.vx, v1.vy)
    const m2 = Math.hypot(v2.vx, v2.vy)
    if (m1 > 1e-6 && m2 > 1e-6) {
      const dot = v1.vx * v2.vx + v1.vy * v2.vy
      sum += dot / (m1 * m2)
      count++
    }
  }
  
  autocorr[lag] = sum / count
}

// 4. Nessuna normalizzazione necessaria: C_dir(0) ≈ 1 già per definizione
```

## Criterio Browniano (heuristico attuale)

- **Browniano**: C_dir(3) < ~0.7 e decrescente
- **Non-Browniano**: C_dir rimane alta (≈1) diversi lag oppure aumenta
- **Rumore/Transizione**: fluttuazioni senza trend chiaro (servono più dati)

## Soglie pratiche alternative
```typescript
// Variante più severa (quando c'è abbastanza agitazione):
const isBrownianStrict = autocorr[5] < 0.4

// Variante soft (fase iniziale):
const isBrownianEarly = autocorr[3] < 0.7
```

## Dove implementare

Aggiungi in `brownianAnalysis.ts` accanto al calcolo MSD esistente.

## Implementazione realizzata

### 1. Tracking velocità
- `elasticModel.ts`: aggiornamento ogni tick (non solo ogni msdUpdateInterval) per risoluzione migliore
- Buffer limitato a 500 punti

### 2. Chart real-time  
- Aggiornamento ogni `chartUpdateInterval`
- Nessuna normalizzazione esplicita (valore già tra -1 e 1)
- Scala Y scelta: [-0.5, 1.0]

### 3. Detection Browniano
- Metodo `isBrownianByAutocorrelation()` controlla C_dir(lag=3)
- Soglia corrente: < 0.7
- Combinato con test su MSD per valutazione finale