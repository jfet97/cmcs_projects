// File: src/types/agentscript.d.ts

declare module 'agentscript' {

  export interface Turtles {
    create(count: number, callback?: (turtle: any) => void): void;
    ask(callback: (turtle: any, i: number) => void): void;
    clear(): void;
    readonly length: number;
    some: (callback: (turtle: any, i: number) => boolean) => boolean;
  }

  export class Turtle3D {
    constructor(...args: any[]);

    x: number;
    y: number;
    z: number;
    color: string;
    shape: string;
    size: number;
    world: {
      width: number;
      height: number;
      depth: number;
    };

    setxyz(x: number, y: number, z: number): void;
  }

  export class Model3D {
    constructor(...args: any[]);

    turtles: Turtles;
    ticks: number;

    world: {
      minX: number;
      minY: number;
      minZ: number;
      maxX: number;
      maxY: number;
      maxZ: number;
    }

    setup(): void;
    step(): void;
  }

  export class World {
    constructor(model: Model3D, element: HTMLElement | null);

    start?(): void;
    draw?(): void;
    render?(): void;
  }
}