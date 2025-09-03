declare module 'agentscript' {
  export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }

  export interface Turtles {
    toArray(): unknown;
    create(count: number, callback?: (turtle: any) => void): void;
    ask(callback: (turtle: any, i: number) => void): void;
    clear(): void;
    readonly length: number;
    some: (callback: (turtle: any, i: number) => boolean) => boolean;
  }

  export class Turtle {
    constructor(...args: any[]);

    x: number;
    y: number;
    color: string;
    shape: string;
    size: number;
    world: {
      width: number;
      height: number;
    };

    setxy(x: number, y: number): void;
  }

  export class Model {
    constructor(...args: any[]);

    turtles: Turtles;
    ticks: number;
    world: World;

    startup(strategy: "center" | "random"): void;
    step(): void;
  }

  export class World {
    constructor(model: Model, element: HTMLElement | null);

    start?(): void;
    draw?(): void;
    render?(): void;

    setWorld(): void;

    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }
}
