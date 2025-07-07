// --- IMPORTS ---
// Importiamo le classi corrette dai pacchetti che abbiamo installato.
// Turtle è la classe base per gli agenti mobili in questa versione di agentscript.
import { Model, Turtle, World } from 'agentscript';
// Importiamo Chart.js per i grafici.
import { Chart, registerables } from 'chart.js';
// È necessario registrare i componenti di Chart.js per farli funzionare.
Chart.register(...registerables);
// --- AGENT DEFINITION ---
// La nostra classe per la particella. Estende 'Turtle', non 'Agent'.
// Estendendo 'Turtle', la nostra classe eredita automaticamente tutte le sue
// proprietà (x, y, color, world) e metodi (setXY, etc.).
// Non abbiamo bisogno di ridichiararli.
class BrownianParticle extends Turtle {
    /**
     * Il metodo setup() viene chiamato dalla libreria alla creazione dell'agente.
     * Qui inizializziamo le proprietà.
     */
    setup() {
        // Parametri del nostro agente
        this.stepSize = 1.5;
        this.color = "purple";
        this.shape = "circle";
        this.size = 6;
        // Memorizziamo la posizione iniziale.
        // this.x e this.y sono ereditate da Turtle.
        this.state = {
            x0: this.x,
            y0: this.y,
        };
    }
    /**
     * Il metodo step() viene chiamato ad ogni tick della simulazione.
     * Contiene la logica del movimento casuale.
     */
    step() {
        // 1. Genera un angolo casuale
        const angle = Math.random() * 2 * Math.PI;
        // 2. Calcola lo spostamento (dx, dy)
        const dx = this.stepSize * Math.cos(angle);
        const dy = this.stepSize * Math.sin(angle);
        // 3. Calcola la nuova posizione
        let newX = this.x + dx;
        let newY = this.y + dy;
        // 4. Gestione dei confini (rimbalzo)
        // La proprietà 'this.world' è ereditata da Turtle e ci dà accesso al mondo.
        if (newX > this.world.width / 2 || newX < -this.world.width / 2) {
            newX = this.x - dx; // Inverti il passo orizzontale
        }
        if (newY > this.world.height / 2 || newY < -this.world.height / 2) {
            newY = this.y - dy; // Inverti il passo verticale
        }
        // Applica la nuova posizione usando il metodo ereditato 'setXY'.
        this.setXY(newX, newY);
    }
}
// --- MODEL DEFINITION ---
// La classe che gestisce l'intera simulazione.
class BrownianModel extends Model {
    /**
     * Setup del modello.
     */
    setup() {
        this.numParticles = 100;
        this.msdData = [];
        // Usiamo il metodo 'make' (ereditato da Model) per creare i nostri agenti.
        this.make(this.numParticles, BrownianParticle, { x: 0, y: 0 });
        this.setupChart();
    }
    /**
     * Step del modello, eseguito ad ogni tick.
     */
    step() {
        // 'this.agents' è una collezione di tutti gli agenti, ereditata da Model.
        // 'ask("step")' esegue il metodo step() su ogni agente nella collezione.
        this.agents.ask("step");
        this.calculateAndPlotMSD();
    }
    /**
     * Calcola lo Spostamento Quadratico Medio (MSD) e aggiorna il grafico.
     */
    calculateAndPlotMSD() {
        let totalSquaredDisplacement = 0;
        // Qui il type casting è FONDAMENTALE.
        // this.agents.get() restituisce un array di 'Turtle'.
        // Dobbiamo dire a TypeScript: "Tratta questi oggetti come se fossero del nostro
        // tipo più specifico, BrownianParticle, così posso accedere alla proprietà 'state'".
        const particles = this.agents.get();
        for (const particle of particles) {
            const dx = particle.x - particle.state.x0;
            const dy = particle.y - particle.state.y0;
            totalSquaredDisplacement += dx * dx + dy * dy;
        }
        const msd = totalSquaredDisplacement / this.agents.length;
        this.msdData.push(msd);
        // Aggiorna i dati del grafico.
        this.chart.data.labels.push(this.msdData.length - 1);
        this.chart.data.datasets[0].data.push(msd);
        this.chart.update('none'); // 'none' disattiva l'animazione per performance migliori.
    }
    /**
     * Inizializza l'oggetto Chart.js.
     */
    setupChart() {
        const ctx = document.getElementById('msd-chart')?.getContext('2d');
        if (!ctx) {
            console.error("Canvas del grafico non trovato!");
            return;
        }
        this.chart = new Chart(ctx, {
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
// --- AVVIO SIMULAZIONE ---
// Questo codice viene eseguito quando il DOM è pronto.
// 1. Crea un'istanza del nostro modello.
const model = new BrownianModel();
// 2. Crea il mondo, passandogli il modello e l'elemento HTML.
// Questa operazione, in questa versione della libreria, AVVIA automaticamente
// il ciclo di simulazione e rendering.
new World(model, document.getElementById('world'));
//# sourceMappingURL=index.js.map