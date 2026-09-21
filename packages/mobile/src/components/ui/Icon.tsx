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
export type IconName = 'star' | 'play' | 'friends' | 'plus' | 'arrow-left';

const ICONS: Record<IconName, { path: string; mode: 'fill' | 'stroke' }> = {
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
