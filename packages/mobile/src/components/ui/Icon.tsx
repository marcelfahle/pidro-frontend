import Svg, { Path } from 'react-native-svg';
import { PidroColors } from '@/design/tokens';

/**
 * The DS v2 icon set. Screens never inline `<Svg><Path>` — an icon is a
 * system object like any other, so its geometry lives here once and every
 * call site gets the same optical weight.
 *
 * All glyphs are drawn on a 24×24 grid. `stroke` glyphs keep a 2px stroke so
 * they stay legible at chip sizes; `fill` glyphs are solid shapes.
 */
export type IconName =
  | 'home'
  | 'rematch'
  | 'star'
  | 'play'
  | 'friends'
  | 'plus'
  | 'arrow-left'
  | 'settings'
  | 'close'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'lock'
  | 'check'
  | 'bot'
  | 'cards'
  | 'mail'
  | 'alert';

const ICONS: Record<IconName, { path: string; mode: 'fill' | 'stroke' }> = {
  home: { path: 'M3 11l9-8 9 8M5 9v12h5v-7h4v7h5V9', mode: 'stroke' },
  rematch: { path: 'M20 7v5h-5M20 12a8 8 0 1 0-2.3 5.7M20 7l-2.3-2', mode: 'stroke' },
  close: { path: 'M6 6l12 12M6 18L18 6', mode: 'stroke' },
  'chevron-down': { path: 'M6 9l6 6 6-6', mode: 'stroke' },
  settings: {
    path: 'M10 2h4l.6 3.1 2.1 1.2 3-.9 2 3.4-2.4 2.2v2l2.4 2.2-2 3.4-3-.9-2.1 1.2L14 22h-4l-.6-3.1-2.1-1.2-3 .9-2-3.4L4.7 13v-2L2.3 8.8l2-3.4 3 .9 2.1-1.2L10 2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    mode: 'stroke',
  },
  'chevron-left': { path: 'M15 5l-7 7 7 7', mode: 'stroke' },
  'chevron-right': { path: 'm9 5 7 7-7 7', mode: 'stroke' },
  lock: { path: 'M6 10h12v11H6zM8.5 10V7.5a3.5 3.5 0 0 1 7 0V10', mode: 'stroke' },
  check: { path: 'M5 12.5l4.5 4.5L19 7.5', mode: 'stroke' },
  bot: {
    path: 'M5 8h14v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8M12 8V5.5M12 3a1.2 1.2 0 1 0 0 2.4A1.2 1.2 0 0 0 12 3M9.5 12.5v2m5-2v2M2.8 12.5v3m18.4-3v3',
    mode: 'stroke',
  },
  cards: {
    path: 'M5.5 6.2 3.9 6.6a2 2 0 0 0-1.4 2.5l3.1 10.1a2 2 0 0 0 2.5 1.3l2.4-.7M12.5 4h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M15.5 8.2c-1.2 1.4-2.4 2.3-2.4 3.4 0 .8.6 1.3 1.3 1.3.5 0 .9-.2 1.1-.6.2.4.6.6 1.1.6.7 0 1.3-.5 1.3-1.3 0-1.1-1.2-2-2.4-3.4M15.5 13v1.6',
    mode: 'stroke',
  },
  mail: {
    path: 'M5.5 5h13A2.5 2.5 0 0 1 21 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 16.5v-9A2.5 2.5 0 0 1 5.5 5zM3.5 7.5l8.5 6 8.5-6',
    mode: 'stroke',
  },
  alert: { path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V13M12 16.5h.01', mode: 'stroke' },
  plus: { path: 'M12 5v14M5 12h14', mode: 'stroke' },
  'arrow-left': { path: 'M19 12H5m7-7-7 7 7 7', mode: 'stroke' },
  star: {
    path: 'M12 2l2.4 5.7 6.1.5-4.6 4 1.4 6L12 15l-5.3 3.2 1.4-6-4.6-4 6.1-.5z',
    mode: 'fill',
  },
  play: { path: 'M6 4.5l13 7.5-13 7.5z', mode: 'stroke' },
  friends: {
    path: 'M9 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM3 20a6 6 0 0 1 12 0M16.5 5.5a3.2 3.2 0 0 1 0 5.6M21 20a6 6 0 0 0-4-5.6',
    mode: 'stroke',
  },
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  /** Stroke glyphs only. Large display glyphs read better a little lighter. */
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 15,
  color = PidroColors.iconOnGlass,
  strokeWidth = 2,
}: IconProps) {
  const { path, mode } = ICONS[name];
  const paint =
    mode === 'fill'
      ? { fill: color }
      : {
          fill: 'none' as const,
          stroke: color,
          strokeWidth,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
        };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...paint}>
      <Path d={path} />
    </Svg>
  );
}
