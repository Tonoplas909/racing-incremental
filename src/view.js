export function fitView(cssWidth, cssHeight, world) {
  const scale = Math.min(cssWidth / world.width, cssHeight / world.height);
  return {
    scale,
    offsetX: (cssWidth - world.width * scale) / 2,
    offsetY: (cssHeight - world.height * scale) / 2,
  };
}

export function worldToScreen(view, x, y) {
  return { x: x * view.scale + view.offsetX, y: y * view.scale + view.offsetY };
}

export function screenToWorld(view, x, y) {
  return { x: (x - view.offsetX) / view.scale, y: (y - view.offsetY) / view.scale };
}
