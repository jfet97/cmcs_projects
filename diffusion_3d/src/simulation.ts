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

    // main scene setup for 3D rendering
    this.scene = new THREE.Scene();
    const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    const pixelRatio = window.devicePixelRatio || 1;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setClearColor(0xffffff);

    // particle system setup using Three.js Points for efficient rendering
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(numParticles * 3);
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.5 });
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    // orbit controls for interactive camera manipulation
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // smooth camera movement
    this.controls.dampingFactor = 0.05;

    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.5;

    // orientation axes helper (rendered in corner viewport)
    this.axesScene = new THREE.Scene();
    this.axesHelper = new THREE.AxesHelper(5); // axis length
    this.axesScene.add(this.axesHelper);

    // separate camera for the axes helper overlay
    this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100); // square aspect ratio
    this.axesCamera.position.set(10, 10, 10);
    this.axesCamera.lookAt(0, 0, 0);
    this.axesCamera.up = this.camera.up; // match main camera orientation
  }

  /**
   * Adjusts camera position to frame the entire simulation world
   * Calculates required distance based on field of view and world dimensions
   * Formula: distance = (dimension/2) / tan(FOV/2)
   */
  public adjustCameraToShowWorld() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    const distanceForHeight = this.dimensions.height / 2 / Math.tan(fovInRadians / 2);
    const distanceForWidth =
      this.dimensions.width / 2 / (Math.tan(fovInRadians / 2) * this.camera.aspect);

    this.camera.position.x = Math.max(distanceForHeight, distanceForWidth) * 1.5; // 50% buffer
    this.camera.position.y = Math.max(distanceForHeight, distanceForWidth) * 1.5; // 50% buffer
    this.camera.position.z = Math.max(distanceForHeight, distanceForWidth) * 1.5; // 50% buffer
    this.controls.update(); // update controls after manual camera positioning
  }

  /**
   * Adds a visible wireframe box to the scene representing the world boundaries
   * Useful for spatial reference with interactive camera
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
   * Renders the orientation axes helper in the bottom-left corner
   * Uses separate viewport with scissor test to overlay on main scene
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

    // reset viewport and scissor for next render
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  public drawParticles() {
    // update orbit controls (applies damping to camera movement)
    this.controls.update();

    // update particle positions buffer from current turtle states
    let i = 0;
    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      const index = i * 3;
      this.positions[index] = turtle.x;
      this.positions[index + 1] = turtle.y;
      this.positions[index + 2] = turtle.z ?? 0;
      i++;
    });

    // notify GPU that position buffer has been updated
    this.points.geometry.attributes.position.needsUpdate = true;

    // render the main scene
    this.renderer.render(this.scene, this.camera);

    // disable auto-clear to render axes helper on top
    this.renderer.autoClear = false;
    this.renderer.clearDepth(); // clear depth buffer only

    // render the axes helper overlay in the corner
    this.renderAxes();

    // re-enable auto-clearing for next frame
    this.renderer.autoClear = true;
  }
}
