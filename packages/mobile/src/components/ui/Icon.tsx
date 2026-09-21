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
  | 'star'
  | 'play'
  | 'friends'
  | 'plus'
  | 'arrow-left'
  | 'settings'
  | 'close'
  | 'chevron-down'
  | 'chevron-right'
  | 'bot';

const ICONS: Record<IconName, { path: string; mode: 'fill' | 'stroke' }> = {
  close: { path: 'M6 6l12 12M6 18L18 6', mode: 'stroke' },
  'chevron-down': { path: 'M6 9l6 6 6-6', mode: 'stroke' },
  settings: {
    path: 'M10 2h4l.6 3.1 2.1 1.2 3-.9 2 3.4-2.4 2.2v2l2.4 2.2-2 3.4-3-.9-2.1 1.2L14 22h-4l-.6-3.1-2.1-1.2-3 .9-2-3.4L4.7 13v-2L2.3 8.8l2-3.4 3 .9 2.1-1.2L10 2z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    mode: 'stroke',
  },
  'chevron-right': { path: 'm9 5 7 7-7 7', mode: 'stroke' },
  bot: { path: 'M12 3v3M5 6h14v14H5zM9 11v2m6-2v2m-6 4h6M2 10v6m20-6v6', mode: 'stroke' },
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
}

export function Icon({ name, size = 15, color = PidroColors.iconOnGlass }: IconProps) {
  const { path, mode } = ICONS[name];
  const paint =
    mode === 'fill'
      ? { fill: color }
      : {
          fill: 'none' as const,
          stroke: color,
          strokeWidth: 2,
          strokeLinecap: 'round' as const,
          strokeLinejoin: 'round' as const,
        };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...paint}>
      <Path d={path} />
    </Svg>
  );
}
