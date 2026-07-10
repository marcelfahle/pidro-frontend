import type { ComponentType } from 'react';

export async function loadGameCanvasDev(): Promise<ComponentType> {
  const module = await import('./GameCanvasDev');
  return module.default;
}
