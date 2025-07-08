import { Model, Turtle, World } from 'agentscript';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface ParticleState {
    x0: number;
    y0: number;
}

// Estendiamo la definizione di Turtle per includere le nostre proprietà custom
// Questo rende il type casting più pulito dopo.
interface BrownianParticleTurtle extends Turtle {
    state: ParticleState;
    stepSize: number;
}

class BrownianModel extends Model {
    numParticles!: number;
    msdData!: number[];
    chart!: Chart;
    canvas!: HTMLCanvasElement;
    ctx!: CanvasRenderingContext2D;

    constructor(worldBounds: { minX: number; maxX: number; minY: number; maxY: number }) {
      super(worldBounds)
    }

    /**
     * Il metodo di avvio, chiamato una volta.
     */
    override startup() {
        this.numParticles = 500;
        this.msdData = [];

        // Ottieni il canvas e il contesto
        this.canvas = document.getElementById('world') as HTMLCanvasElement;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Impossibile ottenere il contesto 2D del canvas');
        }
        this.ctx = ctx;

        // Creiamo le particelle usando this.turtles.create
        this.turtles.create(this.numParticles, (turtle: BrownianParticleTurtle) => {
            
            // const x = this.world.minX + Math.random() * (this.world.maxX - this.world.minX);
            // const y = this.world.minY + Math.random() * (this.world.maxY - this.world.minY);

            // iniziano al centro
            const x = (Math.random() - 0.5) * 2
            const y = (Math.random() - 0.5) * 2
            turtle.setxy(x, y);

            // Inizializza le proprietà
            turtle.stepSize = 4;
            turtle.color = "blue";
            turtle.shape = "circle";
            turtle.size = 2;

            // Memorizza la posizione iniziale
            turtle.state = { x0: x, y0: y };
        });


        this.setupChart();
        this.drawParticles();
    }

    /**
     * Eseguito ad ogni tick della simulazione.
     */
    override step() {
        if (!this.turtles || this.turtles.length === 0) {
            return;
        }

        this.turtles.ask((turtle: BrownianParticleTurtle) => {
            // Usa uno dei seguenti metodi per gestire le collisioni:
            
            // 1. Metodo avanzato con tentativi multipli (migliore per alta densità)
            this.moveParticleWithCollisionAvoidance(turtle);
            
            // 2. Metodo con rimbalzo elastico (più realistico fisicamente)
            // this.moveParticleWithElasticCollision(turtle);
        });

        this.calculateAndPlotMSD();
        this.drawParticles();
    }

    /**
     * Disegna manualmente le particelle sul canvas.
     */
    drawParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        
        // Disegna ogni particella
        this.turtles.ask((turtle: BrownianParticleTurtle) => {
            this.ctx.beginPath();
            this.ctx.arc(turtle.x, turtle.y, turtle.size, 0, 2 * Math.PI);
            this.ctx.fillStyle = turtle.color;
            this.ctx.fill();
        });
        
        this.ctx.restore();
    }
    
    calculateAndPlotMSD() {
        if (this.turtles.length === 0 || this.ticks % 10 !== 0) {
            return; // Calcola meno spesso per performance
        }

        let totalSquaredDisplacement = 0;
        this.turtles.ask((turtle: BrownianParticleTurtle) => {
            const dx = turtle.x - turtle.state.x0;
            const dy = turtle.y - turtle.state.y0;
            totalSquaredDisplacement += dx * dx + dy * dy;
        });

        const msd = totalSquaredDisplacement / this.turtles.length;
        this.msdData.push(msd);
        
        if (this.chart.data.labels) {
            this.chart.data.labels.push(this.ticks); // Usa i tick reali come asse x
        }
        this.chart.data.datasets[0].data.push(msd);
        this.chart.update('none');
    }

    setupChart() {
        const ctx = (document.getElementById('msd-chart') as HTMLCanvasElement)?.getContext('2d');
        if (!ctx) {
            return;
        }
        this.chart = new Chart(ctx, { /* ...il codice del grafico rimane uguale... */
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Mean Squared Displacement (MSD)',
                    data: [],
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderWidth: 2,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { title: { display: true, text: 'Time Step' } },
                    y: { title: { display: true, text: 'MSD' }, beginAtZero: true }
                }
            }
        });
    }

    /**
     * Muove una particella evitando le collisioni con altre particelle e i confini.
     * Utilizza un approccio iterativo per trovare una posizione valida.
     */
    moveParticleWithCollisionAvoidance(turtle: BrownianParticleTurtle) {
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
            if (newX > this.world.maxX) {
                newX = this.world.maxX - (newX - this.world.maxX); // Rimbalzo
            } else if (newX < this.world.minX) {
                newX = this.world.minX + (this.world.minX - newX); // Rimbalzo
            }
            
            if (newY > this.world.maxY) {
                newY = this.world.maxY - (newY - this.world.maxY); // Rimbalzo
            } else if (newY < this.world.minY) {
                newY = this.world.minY + (this.world.minY - newY); // Rimbalzo
            }

            // Verifica se la nuova posizione è libera da collisioni
            if (this.isPositionValidOptimized(turtle, newX, newY)) {
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
    isPositionValid(turtle: BrownianParticleTurtle, x: number, y: number): boolean {
        // Controlla collisioni con altre particelle
        let hasCollision = false;
        
        this.turtles.ask((other: BrownianParticleTurtle) => {
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
    isPositionValidOptimized(turtle: BrownianParticleTurtle, x: number, y: number): boolean {
        // Dimensione della cella della griglia per l'ottimizzazione spaziale
        const cellSize = turtle.size * 4; // Un po' più grande del diametro delle particelle
        
        // Calcola le celle della griglia da controllare
        const minCellX = Math.floor((x - turtle.size * 2) / cellSize);
        const maxCellX = Math.floor((x + turtle.size * 2) / cellSize);
        const minCellY = Math.floor((y - turtle.size * 2) / cellSize);
        const maxCellY = Math.floor((y + turtle.size * 2) / cellSize);
        
        // Controlla solo le particelle nelle celle vicine
        let hasCollision = false;
        
        this.turtles.ask((other: BrownianParticleTurtle) => {
            if (other !== turtle && !hasCollision) {
                // Calcola la cella dell'altra particella
                const otherCellX = Math.floor(other.x / cellSize);
                const otherCellY = Math.floor(other.y / cellSize);
                
                // Controlla solo se è in una cella vicina
                if (otherCellX >= minCellX && otherCellX <= maxCellX &&
                    otherCellY >= minCellY && otherCellY <= maxCellY) {
                    
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
    moveParticleWithElasticCollision(turtle: BrownianParticleTurtle) {
        const angle = Math.random() * 2 * Math.PI;
        const dx = turtle.stepSize * Math.cos(angle);
        const dy = turtle.stepSize * Math.sin(angle);

        let newX = turtle.x + dx;
        let newY = turtle.y + dy;

        // Gestione rimbalzo sui confini
        if (newX > this.world.maxX || newX < this.world.minX) {
            newX = turtle.x - dx; // Rimbalzo semplice
        }
        if (newY > this.world.maxY || newY < this.world.minY) {
            newY = turtle.y - dy; // Rimbalzo semplice
        }

        // Controllo collisioni con rimbalzo elastico
        let collisionDetected = false;
        this.turtles.ask((other: BrownianParticleTurtle) => {
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

}

// --- AVVIO SIMULAZIONE CON CONTROLLO FPS ---
document.addEventListener('DOMContentLoaded', () => {
  // Ottieni l'elemento canvas per determinare le sue dimensioni
  const worldElement = document.getElementById('world') as HTMLCanvasElement;
  if (!worldElement) {
      console.error("Elemento #world non trovato!");
      return;
  }
  
  // Imposta i bounds del modello basati sulle dimensioni reali del canvas
  const halfWidth = worldElement.width / 2;
  const halfHeight = worldElement.height / 2;
  
  const model = new BrownianModel({
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight
  });
  
  // Il World viene creato, ma non lo usiamo per il ciclo di animazione.
  new World(model, worldElement);
  // model.setup()

  // Chiamiamo il nostro metodo di avvio.
  model.startup();

  // --- LOGICA PER RALLENTARE LA SIMULAZIONE ---
  
  // 1. Definiamo a quanti "passi al secondo" vogliamo andare.
  //    Meno è, più è lento. 20 è un buon valore per vedere bene.
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS; // Calcola il tempo in ms tra un passo e l'altro

  let lastTime = 0; // Memorizza il timestamp dell'ultimo passo eseguito

  // 2. La nostra funzione di animazione, che ora controlla il tempo.
  const animate = (currentTime: number) => {
      // Chiamiamo sempre requestAnimationFrame per mantenere il loop attivo.
      requestAnimationFrame(animate);

      // Calcoliamo quanto tempo è passato dall'ultimo passo.
      const elapsed = currentTime - lastTime;

      // 3. Eseguiamo il passo del modello SOLO se è passato abbastanza tempo.
      if (elapsed > frameInterval) {
          // Aggiorniamo il tempo dell'ultimo passo.
          lastTime = currentTime - (elapsed % frameInterval);

          // Eseguiamo un singolo passo della nostra simulazione.
          model.step();
      }
  };

  // 4. Avviamo il ciclo di animazione.
  requestAnimationFrame(animate);
});