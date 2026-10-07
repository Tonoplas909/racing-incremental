// bounds = { x, y, width, height }: the world rectangle to frame, fitted and centered.
export function fitView(cssWidth, cssHeight, bounds) {
  const scale = Math.min(cssWidth / bounds.width, cssHeight / bounds.height);
  return {
    scale,
    offsetX: (cssWidth - bounds.width * scale) / 2 - bounds.x * scale,
    offsetY: (cssHeight - bounds.height * scale) / 2 - bounds.y * scale,
  };
}

export function worldToScreen(view, x, y) {
  return { x: x * view.scale + view.offsetX, y: y * view.scale + view.offsetY };
}

export function screenToWorld(view, x, y) {
  return { x: (x - view.offsetX) / view.scale, y: (y - view.offsetY) / view.scale };
}
