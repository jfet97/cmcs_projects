import { Model, Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";

/**
 * Muove una particella evitando le collisioni con altre particelle e i confini.
 * Utilizza un approccio iterativo per trovare una posizione valida.
 */
export function moveParticleWithCollisionAvoidance(
  turtle: BrownianParticleTurtle,
  world: Model["world"],
  turtles: Turtles
) {
  const maxAttempts = 10; // Massimo numero di tentativi per trovare una posizione valida
  let attempts = 0;

  while (attempts < maxAttempts) {
    // Genera un movimento casuale
    const angle = Math.random() * 2 * Math.PI;
    const dx = turtle.stepSize * Math.cos(angle);
    const dy = turtle.stepSize * Math.sin(angle);

    let newX = turtle.x + dx;
    let newY = turtle.y + dy;

    // Controlla i confini del mondo e applica il rimbalzo
    if (newX > world.maxX) {
      newX = world.maxX - (newX - world.maxX); // Rimbalzo
    } else if (newX < world.minX) {
      newX = world.minX + (world.minX - newX); // Rimbalzo
    }

    if (newY > world.maxY) {
      newY = world.maxY - (newY - world.maxY); // Rimbalzo
    } else if (newY < world.minY) {
      newY = world.minY + (world.minY - newY); // Rimbalzo
    }

    // Verifica se la nuova posizione è libera da collisioni
    if (isPositionValidOptimized(turtle, newX, newY, turtles)) {
      turtle.setxy(newX, newY);
      return; // Posizione valida trovata, esci
    }

    attempts++;
  }

  // Se non troviamo una posizione valida dopo maxAttempts,
  // la particella rimane nella posizione attuale
  // Questo previene loop infiniti in situazioni di alta densità
}

/**
 * Verifica se una posizione è valida per una particella (senza collisioni).
 */
export function isPositionValid(
  turtle: BrownianParticleTurtle,
  x: number,
  y: number,
  turtles: Turtles
): boolean {
  // Controlla collisioni con altre particelle
  let hasCollision = false;

  turtles.ask((other: BrownianParticleTurtle) => {
    if (other !== turtle && !hasCollision) {
      const distance = Math.sqrt((other.x - x) ** 2 + (other.y - y) ** 2);
      const minDistance = turtle.size + other.size;

      if (distance < minDistance) {
        hasCollision = true;
      }
    }
  });

  return !hasCollision; // Posizione valida se non ci sono collisioni
}

/**
 * Versione ottimizzata per verificare le collisioni usando una griglia spaziale.
 * Questa funzione è più efficiente quando ci sono molte particelle.
 */
export function isPositionValidOptimized(
  turtle: BrownianParticleTurtle,
  x: number,
  y: number,
  turtles: Turtles
): boolean {
  // Dimensione della cella della griglia per l'ottimizzazione spaziale
  const cellSize = turtle.size * 8; // Un po' più grande del diametro delle particelle

  // Calcola le celle della griglia da controllare
  const minCellX = Math.floor((x - turtle.size * 2) / cellSize);
  const maxCellX = Math.floor((x + turtle.size * 2) / cellSize);
  const minCellY = Math.floor((y - turtle.size * 2) / cellSize);
  const maxCellY = Math.floor((y + turtle.size * 2) / cellSize);

  // Controlla solo le particelle nelle celle vicine
  let hasCollision = false;

  turtles.ask((other: BrownianParticleTurtle) => {
    if (other !== turtle && !hasCollision) {
      // Calcola la cella dell'altra particella
      const otherCellX = Math.floor(other.x / cellSize);
      const otherCellY = Math.floor(other.y / cellSize);

      // Controlla solo se è in una cella vicina
      if (
        otherCellX >= minCellX &&
        otherCellX <= maxCellX &&
        otherCellY >= minCellY &&
        otherCellY <= maxCellY
      ) {
        const distance = Math.sqrt((other.x - x) ** 2 + (other.y - y) ** 2);
        const minDistance = turtle.size + other.size;

        if (distance < minDistance) {
          hasCollision = true;
        }
      }
    }
  });

  return !hasCollision;
}

/**
 * Alternativa: gestione delle collisioni con rimbalzo elastico.
 * Questa versione simula un rimbalzo più realistico tra le particelle.
 */
export function moveParticleWithElasticCollision(
  turtle: BrownianParticleTurtle,
  world: Model["world"],
  turtles: Turtles
) {
  const angle = Math.random() * 2 * Math.PI;
  const dx = turtle.stepSize * Math.cos(angle);
  const dy = turtle.stepSize * Math.sin(angle);

  let newX = turtle.x + dx;
  let newY = turtle.y + dy;

  // Gestione rimbalzo sui confini
  if (newX > world.maxX || newX < world.minX) {
    newX = turtle.x - dx; // Rimbalzo semplice
  }
  if (newY > world.maxY || newY < world.minY) {
    newY = turtle.y - dy; // Rimbalzo semplice
  }

  // Controllo collisioni con rimbalzo elastico
  let collisionDetected = false;
  turtles.ask((other: BrownianParticleTurtle) => {
    if (other !== turtle && !collisionDetected) {
      const distance = Math.sqrt((other.x - newX) ** 2 + (other.y - newY) ** 2);
      if (distance < turtle.size + other.size) {
        // Calcola l'angolo di collisione e rimbalza
        const collisionAngle = Math.atan2(other.y - turtle.y, other.x - turtle.x);
        const bounceAngle = collisionAngle + Math.PI; // Direzione opposta

        newX = turtle.x + turtle.stepSize * Math.cos(bounceAngle);
        newY = turtle.y + turtle.stepSize * Math.sin(bounceAngle);
        collisionDetected = true;
      }
    }
  });

  turtle.setxy(newX, newY);
}
