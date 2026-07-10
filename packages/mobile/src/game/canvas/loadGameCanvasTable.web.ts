import type { ComponentProps, ComponentType } from 'react';
import type { GameCanvasTable } from './GameCanvasTable';

type GameCanvasTableComponent = typeof GameCanvasTable;

export async function loadGameCanvasTable(): Promise<
  ComponentType<ComponentProps<GameCanvasTableComponent>>
> {
  const skiaWeb = await import('@shopify/react-native-skia/lib/module/web');
  await skiaWeb.LoadSkiaWeb({ locateFile: (file) => `/${file}` });
  const module = await import('./GameCanvasTable');
  return module.GameCanvasTable;
}
