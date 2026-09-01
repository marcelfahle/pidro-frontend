export type GameOrigin = 'single-player';

export function parseGameOrigin(value: unknown): GameOrigin | undefined {
  return value === 'single-player' ? value : undefined;
}

export function gameExitPath(origin: GameOrigin | undefined): '/home' | '/lobby' {
  return origin === 'single-player' ? '/home' : '/lobby';
}

export function gameRoute(code: string, origin?: GameOrigin) {
  return {
    pathname: '/game/[code]' as const,
    params: origin ? { code, origin } : { code },
  };
}
