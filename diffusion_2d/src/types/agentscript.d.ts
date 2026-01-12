// everything inside here defines the types for `import { ... } from 'agentscript'`
declare module 'agentscript' {

  // shape of a turtles collection
  export interface Turtles {
    create(count: number, callback?: (turtle: any) => void): void;
    ask(callback: (turtle: any, i: number) => void): void;
    readonly length: number;
    some: (callback: (turtle: any, i: number) => boolean) => boolean;
  }

  // base Turtle class with its properties and methods
  export class Turtle {
    constructor(...args: any[]);

    // properties we are using in our code
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

    // methods we are using
    setxy(x: number, y: number): void;
  }

  // base Model class
  export class Model {
    constructor(...args: any[]);

    // properties we are using
    turtles: Turtles;
    ticks: number;

    world: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }

    // methods we are actually using
    startup(strategy: "center" | "random"): void;
    step(): void;
  }

  // World class
  export class World {
    constructor(model: Model, element: HTMLElement | null);

    // possible rendering methods
    start?(): void;
    draw?(): void;
    render?(): void;
  }
}
