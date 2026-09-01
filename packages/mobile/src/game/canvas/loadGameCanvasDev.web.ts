import type { ComponentType } from 'react';

export async function loadGameCanvasDev(): Promise<ComponentType> {
  const skiaWeb = await import('@shopify/react-native-skia/lib/module/web');
  await skiaWeb.LoadSkiaWeb({ locateFile: (file) => `/${file}` });
  const module = await import('./GameCanvasDev');
  return module.default;
}
