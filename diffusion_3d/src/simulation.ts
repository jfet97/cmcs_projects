// file: Simulation.ts (updated version)
import { Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";
import * as THREE from "three";
// orbitcontrols must be imported from the examples directory
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class Simulation {
  private turtles: Turtles;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private points: THREE.Points;
  private positions: Float32Array;
  private dimensions: { width: number; height: number; depth: number };

  // new properties for advanced features
  private controls: OrbitControls;
  private axesScene: THREE.Scene;
  private axesCamera: THREE.PerspectiveCamera;
  private axesHelper: THREE.AxesHelper;
  private canvas: HTMLCanvasElement;

  constructor(turtles: Turtles, dimensions: { width: number; height: number; depth: number }) {
    this.canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }

    this.dimensions = dimensions;
    this.turtles = turtles;
    const numParticles = turtles.length;

    // --- Main Scene Setup ---
    this.scene = new THREE.Scene();
    const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    const pixelRatio = window.devicePixelRatio || 1;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setClearColor(0xffffff);

    // --- Particle System Setup ---
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(numParticles * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.5 });
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    // --- Movable Camera (OrbitControls) Setup ---
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // gives a nice sense of weight
    this.controls.dampingFactor = 0.05;

    // --- Orientation Axes Helper Setup (Second Scene) ---
    this.axesScene = new THREE.Scene();
    this.axesHelper = new THREE.AxesHelper(5); // the number defines the size of the axes
    this.axesScene.add(this.axesHelper);

    // a separate camera for the axes helper
    this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); // aspect ratio is 1 for a square viewport
    this.axesCamera.position.set(10, 10, 10);
    this.axesCamera.lookAt(0, 0, 0);
    this.axesCamera.up = this.camera.up; // ensure the up direction is the same
  }

  /**
   * adjusts the camera's Z position to ensure the entire specified
   * world width and height are visible for the initial view
   */
  public adjustCameraToShowWorld() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const distanceForHeight = this.dimensions.height / 2 / Math.tan(fovInRadians / 2);
    const distanceForWidth =
      this.dimensions.width / 2 / (Math.tan(fovInRadians / 2) * this.camera.aspect);

    this.camera.position.z = Math.max(distanceForHeight, distanceForWidth) * 1.05; // 5% buffer
    this.controls.update(); // important to update controls after manual camera change
  }

  /**
   * adds a visible wireframe box to the scene representing the world boundaries
   * this is very useful for debugging with a moving camera
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

  /**
   * renders the small axes helper in the bottom-left corner
   */
  private renderAxes() {
    this.axesCamera.position.copy(this.camera.position);
    this.axesCamera.quaternion.copy(this.camera.quaternion);
    this.axesCamera.position.setLength(10);
    this.axesCamera.lookAt(0, 0, 0);

    const viewportSize = this.canvas.clientHeight / 4;
    const margin = 5;

    this.renderer.setViewport(margin, margin, viewportSize, viewportSize);
    this.renderer.setScissor(margin, margin, viewportSize, viewportSize);
    this.renderer.setScissorTest(true);

    this.renderer.render(this.axesScene, this.axesCamera);

    // reset viewport and scissor
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  public drawParticles() {
    // update orbit controls (handles damping)
    this.controls.update();

    // update the positions buffer from the turtles' current state
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

    // first render the main scene
    this.renderer.render(this.scene, this.camera);

    // stop the renderer from clearing the screen before the next render
    this.renderer.autoClear = false;
    this.renderer.clearDepth(); // clear only the depth buffer

    // render the axes helper on top in the corner
    this.renderAxes();

    // re-enable auto-clearing for the next frame
    this.renderer.autoClear = true;
  }
}
