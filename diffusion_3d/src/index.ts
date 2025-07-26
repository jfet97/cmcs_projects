import { BrownianModel } from "./brownianModel";

document.addEventListener("DOMContentLoaded", () => {
  const worldElement = document.getElementById("world") as HTMLCanvasElement;
  if (!worldElement) {
    throw new Error("Canvas element with id 'world' not found");
  }

  // TOTAL WORLD SIZE HERE
  const WORLD_WIDTH = 100;
  const WORLD_HEIGHT = 100;
  const WORLD_DEPTH = 50;
  const NUM_PARTICLES = 5000;

  // world bounds object
  const bounds = {
    minX: Math.floor(-WORLD_WIDTH / 2),
    maxX: Math.floor(WORLD_WIDTH / 2),
    minY: Math.floor(-WORLD_HEIGHT / 2),
    maxY: Math.floor(WORLD_HEIGHT / 2),
    minZ: Math.floor(-WORLD_DEPTH / 2),
    maxZ: Math.floor(WORLD_DEPTH / 2)
  };

  const model = new BrownianModel(bounds, WORLD_WIDTH, WORLD_HEIGHT, WORLD_DEPTH);

  model.startup("center", NUM_PARTICLES);

  // --- animation Loop ---
  const targetFPS = 60;
  const frameInterval = 1000 / targetFPS;
  let lastTime = performance.now(); // Use performance.now for higher precision

  const animate = (currentTime: number) => {
    requestAnimationFrame(animate);
    const elapsed = currentTime - lastTime;

    if (elapsed > frameInterval) {
      lastTime = currentTime - (elapsed % frameInterval);

      model.step();
    }
  };

  requestAnimationFrame(animate);
});
