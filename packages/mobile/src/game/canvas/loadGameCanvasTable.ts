import type { ComponentProps, ComponentType } from 'react';
import type { GameCanvasTable } from './GameCanvasTable';

type GameCanvasTableComponent = typeof GameCanvasTable;

export async function loadGameCanvasTable(): Promise<
  ComponentType<ComponentProps<GameCanvasTableComponent>>
> {
  // Keep the native table in Metro's initial module graph so a development
  // server restart cannot leave an older Expo Go runtime requesting a lazy
  // chunk with incompatible module IDs. `require` still defers evaluation until
  // the game opens; web keeps its CanvasKit-first dynamic loader.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const module = require('./GameCanvasTable') as typeof import('./GameCanvasTable');
  return module.GameCanvasTable;
}
