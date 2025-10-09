import { Turtles } from "agentscript";
import { type VicsekAgent3D } from "./vicsekModel3D";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export class SwarmVisualization3D {
  private turtles: Turtles;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private agentMeshes: THREE.Mesh[] = [];
  private dimensions: { width: number; height: number; depth: number };

  // advanced features
  private controls: OrbitControls;
  private axesScene: THREE.Scene;
  private axesCamera: THREE.PerspectiveCamera;
  private axesHelper: THREE.AxesHelper;
  private canvas: HTMLCanvasElement;
  private resizeHandler: () => void;

  constructor(turtles: Turtles, dimensions: { width: number; height: number; depth: number }) {
    this.canvas = document.getElementById("world") as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error("Canvas element with id 'world' not found");
    }

    this.dimensions = dimensions;
    this.turtles = turtles;

    // main scene setup
    this.scene = new THREE.Scene();
    const aspectRatio = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    const pixelRatio = window.devicePixelRatio || 1;
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setClearColor(0xffffff); // white background

    // movable camera (OrbitControls) setup
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.zoomSpeed = 1.5;

    // orientation axes helper setup (second scene)
    this.axesScene = new THREE.Scene();
    this.axesHelper = new THREE.AxesHelper(5);
    this.axesScene.add(this.axesHelper);

    // separate camera for the axes helper
    this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.axesCamera.position.set(10, 10, 10);
    this.axesCamera.lookAt(0, 0, 0);
    this.axesCamera.up = this.camera.up;

    this.setupAgentGeometries();
    this.adjustCameraToShowWorld();

    // resize handler
    this.resizeHandler = () => {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w && h) {
        this.renderer.setSize(w, h, false);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.adjustCameraToShowWorld();
      }
    };
    window.addEventListener("resize", this.resizeHandler);
  }

  /**
   * Creates 3D geometries for each agent (arrows/cones showing direction)
   */
  private setupAgentGeometries() {
    // create arrow-like cone geometry for each agent
    const arrowGeometry = new THREE.ConeGeometry(0.15, 0.5, 8); // radius, height, segments

    let i = 0;
    this.turtles.ask((agent: VicsekAgent3D) => {
      // create material with color mapped to agent direction
      const color = this.getColorFromDirection(agent.direction);
      const material = new THREE.MeshBasicMaterial({ color: color });

      // create mesh for this agent
      const mesh = new THREE.Mesh(arrowGeometry, material);
      mesh.position.set(agent.x, agent.y, agent.z);

      // orient the cone to point in the agent's direction
      this.orientMeshToDirection(mesh, agent.direction);

      this.scene.add(mesh);
      this.agentMeshes[i] = mesh;
      i++;
    });
  }

  /**
   * Orients a mesh to point in the given 3D direction using quaternion rotation
   */
  private orientMeshToDirection(mesh: THREE.Mesh, direction: { x: number; y: number; z: number }) {
    // create normalized direction vector
    const dir = new THREE.Vector3(direction.x, direction.y, direction.z);
    dir.normalize();

    // default cone points up (0, 1, 0), we want it to point in given direction
    const up = new THREE.Vector3(0, 1, 0);

    // calculate rotation quaternion to align cone with direction
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, dir);
    mesh.setRotationFromQuaternion(quaternion);
  }

  /**
   * Calculates HSL color based on 3D direction vector
   * Maps azimuthal angle φ = atan2(y, x) to hue [0°, 360°]
   */
  private getColorFromDirection(direction: { x: number; y: number; z: number }): number {
    // convert 3D direction to HSL hue using azimuthal angle: φ = atan2(y, x)
    // shift to [0°, 360°] range: hue = (φ × 180/π + 180) mod 360
    const hue = ((Math.atan2(direction.y, direction.x) * 180) / Math.PI + 180) % 360;

    // convert HSL to RGB for Three.js color
    const saturation = 0.8;
    const lightness = 0.6;

    const color = new THREE.Color();
    color.setHSL(hue / 360, saturation, lightness);
    return color.getHex();
  }

  /**
   * Adjusts the camera's position to ensure the entire world is visible
   * Calculates required distance based on FOV and world dimensions
   */
  public adjustCameraToShowWorld() {
    const fovInRadians = (this.camera.fov * Math.PI) / 180;
    // distance = (dimension/2) / tan(FOV/2)
    const distanceForHeight = this.dimensions.height / 2 / Math.tan(fovInRadians / 2);
    const distanceForWidth =
      this.dimensions.width / 2 / (Math.tan(fovInRadians / 2) * this.camera.aspect);

    this.camera.position.x = Math.max(distanceForHeight, distanceForWidth) * 1.5;
    this.camera.position.y = Math.max(distanceForHeight, distanceForWidth) * 1.5;
    this.camera.position.z = Math.max(distanceForHeight, distanceForWidth) * 1.5;
    this.controls.update();
  }

  /**
   * Adds a visible wireframe box representing the world boundaries
   */
  public addWorldBoundaryBox() {
    const geometry = new THREE.BoxGeometry(
      this.dimensions.width,
      this.dimensions.height,
      this.dimensions.depth
    );
    const material = new THREE.MeshBasicMaterial({ color: 0x444444, wireframe: true });
    const wireframeBox = new THREE.Mesh(geometry, material);
    wireframeBox.position.set(0, 0, 0);
    console.log(
      `Wireframe box position: (${wireframeBox.position.x}, ${wireframeBox.position.y}, ${wireframeBox.position.z})`
    );
    this.scene.add(wireframeBox);
  }

  /**
   * Renders the small axes helper in the bottom-left corner
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

  /**
   * Updates and renders all swarm agents
   */
  public drawAgents() {
    // update orbit controls (handles damping)
    this.controls.update();

    // update each agent mesh position and orientation
    let i = 0;
    this.turtles.ask((agent: VicsekAgent3D) => {
      if (this.agentMeshes[i]) {
        const mesh = this.agentMeshes[i];

        // update position
        mesh.position.set(agent.x, agent.y, agent.z);

        // update orientation to match agent direction
        this.orientMeshToDirection(mesh, agent.direction);

        // update color based on direction
        const color = this.getColorFromDirection(agent.direction);
        (mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
      }
      i++;
    });

    // handle case where number of agents decreased
    while (this.agentMeshes.length > this.turtles.length) {
      const mesh = this.agentMeshes.pop();
      if (mesh) {
        this.scene.remove(mesh);
      }
    }

    // add new meshes if agents were added
    while (this.agentMeshes.length < this.turtles.length) {
      const arrowGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0x0066cc });
      const mesh = new THREE.Mesh(arrowGeometry, material);
      this.scene.add(mesh);
      this.agentMeshes.push(mesh);
    }

    // render main scene
    this.renderer.render(this.scene, this.camera);

    // render axes helper overlay
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderAxes();
    this.renderer.autoClear = true;
  }
}
