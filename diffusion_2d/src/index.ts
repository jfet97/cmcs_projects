import { BrownianModel } from "./brownianModel";

document.addEventListener("DOMContentLoaded", () => {
  const worldElement = document.getElementById("world") as HTMLCanvasElement;
  if (!worldElement) {
    throw new Error("Canvas element with id 'world' not found");
  }

  // set the bounds (centered coordinate system)
  const halfWidth = worldElement.width / 2;
  const halfHeight = worldElement.height / 2;
  const model = new BrownianModel(
    {
      minX: -halfWidth,
      maxX: halfWidth,
      minY: -halfHeight,
      maxY: halfHeight
    },
    worldElement.width,
    worldElement.height
  );

  // initialize model with center-based particle distribution (MSD plateau: L²/6)
  model.startup("center");

  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS;

  let lastTime = 0;
  const animate = (currentTime: number) => {
    requestAnimationFrame(animate);
    const elapsed = currentTime - lastTime;
    if (elapsed > frameInterval) {
      lastTime = currentTime - (elapsed % frameInterval);
      model.step();
    }
  };

  // start the animation loop
  requestAnimationFrame(animate);
});
