import type { ComponentType } from 'react';
import type { GameCanvasDevProps } from './GameCanvasDev';

export async function loadGameCanvasDev(): Promise<ComponentType<GameCanvasDevProps>> {
  const module = await import('./GameCanvasDev');
  return module.default;
}
