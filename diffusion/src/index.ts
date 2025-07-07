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

    /**
     * Il metodo di avvio, chiamato una volta.
     */
    override startup() {
        this.numParticles = 10;
        this.msdData = [];

        // Ottieni il canvas e il contesto
        this.canvas = document.getElementById('world') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        
        // Creiamo le particelle usando this.turtles.create
        this.turtles.create(this.numParticles, (turtle: BrownianParticleTurtle) => {
            // Posiziona la particella casualmente in TUTTO il canvas
            const x = (Math.random() - 0.5) * this.canvas.width;
            const y = (Math.random() - 0.5) * this.canvas.height;
            turtle.setxy(x, y);
            
            // Inizializza le proprietà
            turtle.stepSize = 2;
            turtle.color = "purple";
            turtle.shape = "circle";
            turtle.size = 5;
            
            // Memorizza la posizione iniziale
            turtle.state = { x0: x, y0: y };
        });

        this.setupChart();
    }

    /**
     * Eseguito ad ogni tick della simulazione.
     */
    override step() {
        if (!this.turtles || this.turtles.length === 0) return;
        
        // --- CAMBIAMENTO CHIAVE #2: USA CONFINI DINAMICI ---
        const boundX = this.canvas.width / 2;
        const boundY = this.canvas.height / 2;

        this.turtles.ask((turtle: BrownianParticleTurtle) => {
            const angle = Math.random() * 2 * Math.PI;
            const dx = turtle.stepSize * Math.cos(angle);
            const dy = turtle.stepSize * Math.sin(angle);

            let newX = turtle.x + dx;
            let newY = turtle.y + dy;
            
            // Gestione del rimbalzo usando i confini del canvas
            if (newX > boundX || newX < -boundX) {
                newX = turtle.x - dx;
            }
            if (newY > boundY || newY < -boundY) {
                newY = turtle.y - dy;
            }
            
            turtle.setxy(newX, newY);
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
        if (this.turtles.length === 0 || this.ticks % 10 !== 0) return; // Calcola meno spesso per performance

        let totalSquaredDisplacement = 0;
        this.turtles.ask((turtle: BrownianParticleTurtle) => {
            const dx = turtle.x - turtle.state.x0;
            const dy = turtle.y - turtle.state.y0;
            totalSquaredDisplacement += dx * dx + dy * dy;
        });

        const msd = totalSquaredDisplacement / this.turtles.length;
        this.msdData.push(msd);
        
        this.chart.data.labels!.push(this.ticks); // Usa i tick reali come asse x
        this.chart.data.datasets[0].data.push(msd);
        this.chart.update('none');
    }

    setupChart() {
        const ctx = (document.getElementById('msd-chart') as HTMLCanvasElement)?.getContext('2d');
        if (!ctx) return;
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
}

// --- AVVIO SIMULAZIONE CON CONTROLLO FPS ---
document.addEventListener('DOMContentLoaded', () => {
  const model = new BrownianModel();
  const worldElement = document.getElementById('world');
  if (!worldElement) {
      console.error("Elemento #world non trovato!");
      return;
  }
  
  // Il World viene creato, ma non lo usiamo per il ciclo di animazione.
  new World(model, worldElement);

  // Chiamiamo il nostro metodo di avvio.
  model.startup();

  // --- LOGICA PER RALLENTARE LA SIMULAZIONE ---
  
  // 1. Definiamo a quanti "passi al secondo" vogliamo andare.
  //    Meno è, più è lento. 20 è un buon valore per vedere bene.
  const targetFPS = 20;
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