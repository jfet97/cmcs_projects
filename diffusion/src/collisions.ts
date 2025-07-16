import { Model, Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";

// Tipo per la nostra griglia spaziale. La chiave è una stringa "x,y" che rappresenta la cella.
type SpatialGrid = Map<string, BrownianParticleTurtle[]>;

/**
 * Crea e popola una griglia spaziale per ottimizzare la ricerca dei vicini.
 * Questa funzione va chiamata UNA SOLA VOLTA per ogni tick della simulazione.
 * @param turtles L'insieme di tutte le tartarughe.
 * @param cellSize La dimensione di una cella della griglia.
 * @returns Una mappa che rappresenta la griglia.
 */
export function createSpatialGrid(turtles: Turtles, cellSize: number): SpatialGrid {
  const grid: SpatialGrid = new Map();

  turtles.ask((turtle: BrownianParticleTurtle) => {
    const cellX = Math.floor(turtle.x / cellSize);
    const cellY = Math.floor(turtle.y / cellSize);
    const key = `${cellX},${cellY}`;

    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(turtle);
  });

  return grid;
}

/**
 * Recupera le tartarughe vicine a una data posizione usando la griglia spaziale.
 * Controlla la cella della posizione e tutte le 8 celle circostanti.
 * @param x Posizione x.
 * @param y Posizione y.
 * @param grid La griglia spaziale pre-calcolata.
 * @param cellSize La dimensione della cella.
 * @returns Un array di tartarughe potenzialmente in collisione.
 */
function getNearbyTurtles(
  x: number,
  y: number,
  grid: SpatialGrid,
  cellSize: number
): BrownianParticleTurtle[] {
  const nearbyTurtles: BrownianParticleTurtle[] = [];
  const mainCellX = Math.floor(x / cellSize);
  const mainCellY = Math.floor(y / cellSize);

  // Itera sulla griglia 3x3 di celle intorno alla posizione data
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const key = `${mainCellX + i},${mainCellY + j}`;
      if (grid.has(key)) {
        nearbyTurtles.push(...grid.get(key)!);
      }
    }
  }

  return nearbyTurtles;
}

/**
 * Funzione unificata e ottimizzata che muove una particella gestendo
 * sia il rimbalzo sui bordi che le collisioni elastiche con le altre particelle.
 *
 * @param turtle La tartaruga da muovere.
 * @param world I confini del mondo.
 * @param grid La griglia spaziale pre-calcolata per il tick corrente.
 */
export function moveParticleWithOptimizedCollisions(
  turtle: BrownianParticleTurtle,
  world: Model["world"],
  grid: SpatialGrid,
  cellSize: number
) {
  // 1. Calcola il movimento casuale proposto
  const angle = Math.random() * 2 * Math.PI;
  const dx = turtle.stepSize * Math.cos(angle);
  const dy = turtle.stepSize * Math.sin(angle);

  let newX = turtle.x + dx;
  let newY = turtle.y + dy;

  // 2. Gestione del rimbalzo sui confini del mondo (versione robusta)
  if (newX > world.maxX) {
    newX = world.maxX - (newX - world.maxX);
  } else if (newX < world.minX) {
    newX = world.minX + (world.minX - newX);
  }

  if (newY > world.maxY) {
    newY = world.maxY - (newY - world.maxY);
  } else if (newY < world.minY) {
    newY = world.minY + (world.minY - newY);
  }

  // 3. Controllo collisioni con altre particelle usando la griglia
  const nearbyTurtles = getNearbyTurtles(newX, newY, grid, cellSize);

  for (const other of nearbyTurtles) {
    // Non collidere con se stessi
    if (other === turtle) continue;

    const distance = Math.sqrt((other.x - newX) ** 2 + (other.y - newY) ** 2);
    const minDistance = turtle.size + other.size;

    if (distance < minDistance) {
      // Collisione rilevata! Calcola un rimbalzo.
      // Questa è una simulazione di "repulsione", non un urto elastico perfetto
      // che conserverebbe il momento, ma è visivamente efficace e performante.
      const collisionAngle = Math.atan2(other.y - turtle.y, other.x - turtle.x);
      const bounceAngle = collisionAngle + Math.PI; // Inverti la direzione dalla collisione

      // Allontanati dalla collisione invece di fare il passo originale
      newX = turtle.x + turtle.stepSize * Math.cos(bounceAngle);
      newY = turtle.y + turtle.stepSize * Math.sin(bounceAngle);

      // Dopo aver gestito una collisione, interrompiamo il ciclo per semplicità.
      // Gestire collisioni multiple simultaneamente è molto più complesso.
      break;
    }
  }

  // 4. Applica la posizione finale
  turtle.setxy(newX, newY);
}
