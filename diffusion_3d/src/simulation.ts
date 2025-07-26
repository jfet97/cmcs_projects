// file: Simulation.ts (versione aggiornata)
import { Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";
import * as THREE from "three";

export class Simulation {
  private turtles: Turtles;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private points: THREE.Points;
  private positions: Float32Array;
  private dimensions: { width: number; height: number; depth: number };

  constructor(turtles: Turtles, dimensions: { width: number; height: number; depth: number }) {
    const canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }

    this.dimensions = dimensions;

    this.turtles = turtles;
    const numParticles = turtles.length;

    this.scene = new THREE.Scene();

    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    // The FOV (75) is the vertical field of view.
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(numParticles * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.5 });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);
  }

  /**
   * Adjusts the camera's Z position to ensure the entire specified
   * world width and height are visible.
   */
  public adjustCameraToShowWorld() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;

    // calculate the distance required to fit the world height
    const distanceForHeight = this.dimensions.height / 2 / Math.tan(fovInRadians / 2);

    // calculate the distance required to fit the world width
    const distanceForWidth =
      this.dimensions.width / 2 / (Math.tan(fovInRadians / 2) * this.camera.aspect);

    // the camera must be at the greater of the two distances to see everything
    this.camera.position.z = Math.max(distanceForHeight, distanceForWidth) * 1.05; // 5% buffer
    this.camera.updateProjectionMatrix();
  }

  /**
   * Adds a visible wireframe box to the scene representing the world boundaries.
   * This is very useful for debugging.
   */
  public addWorldBoundaryBox() {
    const geometry = new THREE.BoxGeometry(
      this.dimensions.width,
      this.dimensions.height,
      this.dimensions.depth
    );
    const material = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true });
    const wireframeBox = new THREE.Mesh(geometry, material);
    this.scene.add(wireframeBox);
  }

  public drawParticles() {
    let i = 0;
    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      const index = i * 3;
      this.positions[index] = turtle.x;
      this.positions[index + 1] = turtle.y;
      this.positions[index + 2] = turtle.z ?? 0;
      i++;
    });

    // tells the GPU that the positions have changed
    this.points.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
