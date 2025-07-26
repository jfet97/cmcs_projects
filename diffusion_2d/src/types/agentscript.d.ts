// File: src/types/agentscript.d.ts

// Dichiariamo un modulo per 'agentscript'.
// Tutto ciò che è qui dentro definisce i tipi per `import { ... } from 'agentscript'`
declare module 'agentscript' {

  // Definiamo la forma di una collezione di turtles
  export interface Turtles {
    create(count: number, callback?: (turtle: any) => void): void;
    ask(callback: (turtle: any, i: number) => void): void;
    readonly length: number;
    some: (callback: (turtle: any, i: number) => boolean) => boolean;
  }

  // Definiamo la classe base Turtle con le sue proprietà e metodi
  export class Turtle {
    constructor(...args: any[]);

    // Proprietà che stiamo usando nel nostro codice
    x: number;
    y: number;
    color: string;
    shape: string;
    size: number;
    stepSize: number;
    world: {
        width: number;
        height: number;
    };

    // Metodi che stiamo usando
    setxy(x: number, y: number): void;
  }

  // Definiamo la classe base Model
  export class Model {
    constructor(...args: any[]);

    // Proprietà che stiamo usando
    turtles: Turtles;
    ticks: number;

    world: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }

    // Metodi che stiamo usando
    startup(strategy: "center" | "random"): void;
    step(): void;
  }

  // Definiamo la classe World
  export class World {
    constructor(model: Model, element: HTMLElement | null);
    
    // Metodi di rendering possibili
    start?(): void;
    draw?(): void;
    render?(): void;
  }
}