import { Turtles } from "agentscript";
import { type BrownianParticleTurtle } from "./brownianModel";
import * as THREE from "three";
// OrbitControls is not part of Three.js core — it lives in the examples/addons directory
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class Simulation {
  // simulation data
  private turtles: Turtles;
  private dimensions: { width: number; height: number; depth: number };

  // Three.js core: every 3D scene needs a scene graph, a camera, and a renderer
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  // particle rendering: Points renders thousands of vertices as dots in a single draw call,
  // far more efficient than creating individual 3D objects per particle
  private points: THREE.Points;
  private positions: Float32Array; // flat array [x0,y0,z0, x1,y1,z1, ...] sent directly to the GPU

  // interactive camera controls (rotate, zoom, pan with mouse)
  private controls: OrbitControls;

  // axes indicator in the corner: uses its own scene + camera so it can be rendered
  // independently at a fixed size, regardless of main camera zoom/position
  private axesScene: THREE.Scene;
  private axesCamera: THREE.PerspectiveCamera;
  private axesHelper: THREE.AxesHelper;

  constructor(turtles: Turtles, dimensions: { width: number; height: number; depth: number }) {
    this.canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }

    this.dimensions = dimensions;
    this.turtles = turtles;
    const numParticles = turtles.length;

    // --- Scene setup ---
    // the scene is the container for all 3D objects (like a stage)
    this.scene = new THREE.Scene();

    // PerspectiveCamera simulates human vision: distant objects appear smaller
    // args: FOV (degrees), aspect ratio, near clipping plane, far clipping plane
    // only objects between near (0.1) and far (1000) are visible (the "frustum")
    const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

    // --- Renderer setup ---
    // the renderer translates the 3D scene into 2D pixels via WebGL (GPU-accelerated)
    // antialias smooths jagged edges by blending pixel colors at geometry boundaries
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });

    // on HiDPI/Retina displays, devicePixelRatio > 1 (e.g. 2 means each CSS pixel
    // maps to a 2×2 grid of physical pixels). Setting the pixel ratio ensures sharp rendering.
    const pixelRatio = window.devicePixelRatio || 1;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false); // false = don't change CSS style
    this.renderer.setPixelRatio(pixelRatio);

    // background color: every frame the renderer clears the canvas to white before drawing
    this.renderer.setClearColor(0xffffff);

    // --- Particle system ---
    // BufferGeometry holds raw vertex data in a format the GPU understands directly.
    // Instead of creating a 3D mesh per particle, we store all positions in one flat
    // Float32Array and render them as GL_POINTS — one GPU draw call for all particles.
    const geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(numParticles * 3); // 3 floats per particle (x, y, z)
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3)); // 3 = stride (read 3 floats per vertex)

    // PointsMaterial defines how each point looks: color and on-screen size (in pixels)
    const material = new THREE.PointsMaterial({ color: 0x00aaff, size: 0.5 });
    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    // --- Camera controls ---
    // OrbitControls: left-click+drag to rotate, scroll to zoom, right-click to pan
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    // damping adds inertia: the camera keeps drifting after you release the mouse,
    // then gradually decelerates. dampingFactor controls how quickly it stops.
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.5;

    // --- Axes indicator (bottom-left corner) ---
    // rendered in a separate scene so it stays at a fixed screen size and position,
    // independent of the main camera's zoom level
    this.axesScene = new THREE.Scene();
    this.axesHelper = new THREE.AxesHelper(5); // colored lines: red=X, green=Y, blue=Z
    this.axesScene.add(this.axesHelper);

    // dedicated camera for the axes overlay: square aspect ratio (1:1) since the
    // corner viewport is square; positioned at (10,10,10) looking at the origin
    this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.axesCamera.position.set(10, 10, 10);
    this.axesCamera.lookAt(0, 0, 0);

    // share the "up" direction with the main camera so axes rotate consistently
    this.axesCamera.up = this.camera.up;
  }

  /**
   * Positions the camera so the entire simulation world fits in view.
   * Uses trigonometry: distance = (halfDimension) / tan(FOV/2).
   * The camera is placed along the diagonal (x=y=z) for an isometric-like view,
   * with a 50% margin so the world doesn't touch the edges of the viewport.
   */
  public adjustCameraToShowWorld() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;

    // calculate the minimum distance needed to see the full height and width
    const distanceForHeight = this.dimensions.height / 2 / Math.tan(fovInRadians / 2);
    const distanceForWidth =
      this.dimensions.width / 2 / (Math.tan(fovInRadians / 2) * this.camera.aspect);

    // place camera on the diagonal (x=y=z) with 50% extra margin
    const cameraDistance = Math.max(distanceForHeight, distanceForWidth) * 1.5;
    this.camera.position.set(cameraDistance, cameraDistance, cameraDistance);

    // sync orbit controls with the new camera position
    this.controls.update();
  }

  /**
   * Adds a wireframe cube to the scene showing the world boundaries.
   * wireframe: true renders only the edges (no filled faces), so particles inside remain visible.
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
   * Renders the XYZ axes indicator in the bottom-left corner of the canvas.
   * Uses the "scissor test" technique: restrict rendering to a small rectangular region
   * so the axes overlay doesn't erase the main scene underneath.
   */
  private renderAxes() {
    // copy the main camera's orientation so the axes rotate in sync with the scene
    this.axesCamera.position.copy(this.camera.position);
    this.axesCamera.quaternion.copy(this.camera.quaternion);

    // keep the same direction but fix distance to 10, so the axes always appear
    // the same size regardless of how far the main camera has zoomed
    this.axesCamera.position.setLength(10);
    this.axesCamera.lookAt(0, 0, 0);

    // define a small square viewport in the bottom-left corner (1/4 of canvas height)
    const viewportSize = this.canvas.clientHeight / 4;
    const margin = 5;

    // viewport: tells the GPU to map the render output to this screen rectangle
    this.renderer.setViewport(margin, margin, viewportSize, viewportSize);

    // scissor: clips all drawing to this rectangle — pixels outside are not touched,
    // preserving the main scene that was already rendered
    this.renderer.setScissor(margin, margin, viewportSize, viewportSize);
    this.renderer.setScissorTest(true);

    this.renderer.render(this.axesScene, this.axesCamera);

    // restore full-canvas viewport and disable scissor for the next frame
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  /**
   * Main render method called every frame.
   * Copies particle positions from simulation state to the GPU buffer, then renders
   * the scene in two passes: (1) main scene with particles, (2) axes overlay.
   */
  public drawParticles() {
    // apply damping decay to camera movement (must be called every frame)
    this.controls.update();

    // copy each particle's current position into the flat Float32Array buffer
    // layout: [x0, y0, z0, x1, y1, z1, ...] — 3 consecutive floats per particle
    let i = 0;
    this.turtles.ask((turtle: BrownianParticleTurtle) => {
      const index = i * 3;
      this.positions[index] = turtle.x;
      this.positions[index + 1] = turtle.y;
      this.positions[index + 2] = turtle.z ?? 0;
      i++;
    });

    // tell Three.js the buffer has changed so it re-uploads the data to the GPU;
    // without this flag, the GPU would keep rendering the old positions
    this.points.geometry.attributes.position.needsUpdate = true;

    // --- Pass 1: render the main scene (particles + wireframe box) ---
    this.renderer.render(this.scene, this.camera);

    // --- Pass 2: render the axes overlay on top ---
    // disable autoClear so this render doesn't erase the main scene
    this.renderer.autoClear = false;

    // clear only the depth buffer (not the color buffer): this ensures the axes are
    // drawn on top of everything, regardless of their Z-depth relative to the scene
    this.renderer.clearDepth();

    this.renderAxes();

    // re-enable autoClear so the next frame starts fresh
    this.renderer.autoClear = true;
  }
}
