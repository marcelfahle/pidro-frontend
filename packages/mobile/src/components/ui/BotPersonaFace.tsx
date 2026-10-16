import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { BotPersona } from '@pidro/shared';
import { PidroBevel, PidroColors, PidroFlagColors, PidroPersonaColors as C } from '@/design/tokens';

/**
 * The bot crew, drawn after the three people who run Pidro: Marcel the
 * builder (headphones, coffee, too many cards), Antti in his sauna hat, and
 * Jocke the showman (shades, moustache, a card behind the ear). A 100-unit
 * square that fills the avatar's round face; the face crops it.
 */
export function BotPersonaFace({ persona }: { persona: BotPersona }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100">
      <Rect width={100} height={100} fill={PidroBevel.panelMid} />
      <Circle cx={50} cy={40} r={44} fill={PidroBevel.panelHi} />
      <G transform="translate(50 58) scale(1.12) translate(-50 -58)">{FACES[persona]}</G>
    </Svg>
  );
}

const INK = PidroColors.ink;
const line = {
  stroke: INK,
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Neck, head and ears; the hair and props go on top. */
function Head({ ears = true }: { ears?: boolean }) {
  return (
    <>
      <Path d="M44 60 L44 74 L56 74 L56 60 Z" fill={C.skinShade} />
      {ears ? (
        <>
          <Ellipse cx={31.5} cy={50} rx={4} ry={5.5} fill={C.skin} {...line} />
          <Ellipse cx={68.5} cy={50} rx={4} ry={5.5} fill={C.skin} {...line} />
        </>
      ) : null}
      <Path
        d="M50 27 C62 27 69.5 36 69 49 C68.5 61 61 69 50 69 C39 69 31.5 61 31 49 C30.5 36 38 27 50 27 Z"
        fill={C.skin}
        {...line}
      />
    </>
  );
}

function Card({
  x,
  y,
  rotate,
  pip = false,
}: {
  x: number;
  y: number;
  rotate: number;
  pip?: boolean;
}) {
  return (
    <G transform={`rotate(${rotate} ${x} ${y + 16})`}>
      <Rect
        x={x - 5.5}
        y={y}
        width={11}
        height={16}
        rx={1.6}
        fill={PidroColors.leagueCardFace}
        stroke={INK}
        strokeWidth={1.4}
      />
      {pip ? <Circle cx={x} cy={y + 5} r={2} fill={PidroColors.leagueCardRed} /> : null}
    </G>
  );
}

const MARCEL: ReactNode = (
  <>
    <Path d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z" fill={C.hoodie} {...line} />
    <Path d="M42 74 L50 84 L58 74" fill="none" {...line} strokeWidth={1.8} />
    <Head />
    {/* Hair, a little on end */}
    <Path
      d="M31.5 45 C29 31 39 24 50 24.5 C61 24 71 30 68.5 45 C66 39 62 36 57 37.5 C55 34 50 33.5 46 36 C42 34.5 36 38 31.5 45 Z"
      fill={C.hairBrown}
      {...line}
    />
    {/* Over-ear headphones */}
    <Path
      d="M27 50 C24 21 76 21 73 50"
      fill="none"
      stroke={C.headphones}
      strokeWidth={5}
      strokeLinecap="round"
    />
    <Rect x={22} y={41} width={10} height={18} rx={4.5} fill={C.headphones} {...line} />
    <Rect x={68} y={41} width={10} height={18} rx={4.5} fill={C.headphones} {...line} />
    <Rect x={24.5} y={44} width={3} height={12} rx={1.5} fill={PidroColors.cyan} />
    <Rect x={72.5} y={44} width={3} height={12} rx={1.5} fill={PidroColors.cyan} />
    {/* Face */}
    <Path d="M39.5 43.5 L45 42.5 M55 42.5 L60.5 43.5" fill="none" {...line} strokeWidth={1.8} />
    <Circle cx={43} cy={48.5} r={2.3} fill={INK} />
    <Circle cx={57} cy={48.5} r={2.3} fill={INK} />
    <Path d="M42.5 57 Q50 64 57.5 57" fill="none" {...line} />
    {/* Coffee, steaming */}
    <Path
      d="M15 66 C12 62 18 60 15 55 M21 66 C18 62 24 60 21 55"
      fill="none"
      stroke={C.steam}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path d="M27 76 C33 76 33 86 27 86" fill="none" {...line} strokeWidth={2.6} />
    <Path
      d="M10.5 69 L28 69 L27 89 C27 91 25.5 92 23.5 92 L15 92 C13 92 11.5 91 11.5 89 Z"
      fill={PidroColors.textOnWood}
      {...line}
    />
    <Ellipse cx={19.3} cy={70.5} rx={7.5} ry={1.6} fill={PidroBevel.woodDeep} />
    {/* Slightly too many cards */}
    {[-36, -22, -8, 6, 20, 34].map((rotate, index) => (
      <Card key={rotate} x={81} y={52} rotate={rotate} pip={index === 5} />
    ))}
    <Ellipse cx={81} cy={72} rx={6} ry={5} fill={C.skin} {...line} />
  </>
);

const ANTTI: ReactNode = (
  <>
    {/* A sauna towel over the shoulders, with a blue stripe */}
    <Path
      d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z"
      fill={PidroColors.leagueCardFace}
      {...line}
    />
    <Path
      d="M20 90 C30 82 40 80 44 80 M80 90 C70 82 60 80 56 80"
      fill="none"
      stroke={PidroFlagColors.finnishCross}
      strokeWidth={3.5}
      strokeLinecap="round"
    />
    <Head />
    {/* Blond tufts under the hat */}
    <Path
      d="M31 46 C30 52 33 54 35 50 M69 46 C70 52 67 54 65 50"
      fill={C.hairBlond}
      {...line}
      strokeWidth={1.6}
    />
    {/* Felt sauna hat */}
    <Path d="M27.5 44 C26 27 36 15 50 15 C64 15 74 27 72.5 44 Z" fill={C.felt} {...line} />
    <Path
      d="M36 22 C40 26 39 34 38 40 M50 18 L50 40 M64 22 C60 26 61 34 62 40"
      fill="none"
      stroke={C.feltShade}
      strokeWidth={1.6}
      strokeLinecap="round"
    />
    <Path d="M23 44 C30 39 70 39 77 44 C70 49 30 49 23 44 Z" fill={C.feltShade} {...line} />
    <Path d="M47 15 C47 10 53 10 53 15" fill={C.felt} {...line} strokeWidth={1.8} />
    {/* Calm, unbothered */}
    <Path d="M39.5 52 Q43 55 46.5 52 M53.5 52 Q57 55 60.5 52" fill="none" {...line} />
    <Circle cx={38} cy={59} r={4.2} fill={C.cheek} />
    <Circle cx={62} cy={59} r={4.2} fill={C.cheek} />
    <Path d="M45 62 Q50 65.5 55 62" fill="none" {...line} />
  </>
);

const JOCKE: ReactNode = (
  <>
    {/* Red jacket, white shirt, gold bow tie */}
    <Path
      d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z"
      fill={PidroColors.leagueCardRed}
      {...line}
    />
    <Path
      d="M41 74 L50 92 L59 74 Z"
      fill={PidroColors.leagueCardFace}
      {...line}
      strokeWidth={1.8}
    />
    <Path
      d="M42 74 L50 79 L58 74 L58 84 L50 79 L42 84 Z"
      fill={PidroBevel.rim}
      {...line}
      strokeWidth={1.6}
    />
    {/* The card tucked behind his ear */}
    <G transform="rotate(18 72 40)">
      <Rect
        x={66}
        y={26}
        width={13}
        height={18}
        rx={1.8}
        fill={PidroColors.leagueCardFace}
        stroke={INK}
        strokeWidth={1.6}
      />
      <Path
        d="M72.5 37 C68 33.5 69.5 30 72.5 32 C75.5 30 77 33.5 72.5 37 Z"
        fill={PidroColors.leagueCardRed}
      />
    </G>
    <Head />
    {/* Slick hair with a quiff */}
    <Path
      d="M31.5 46 C29 30 40 22 52 23 C59 21 67 25 66 29 C70 33 70 40 68.5 46 C66 38 60 34 52 35 C44 34 36 38 31.5 46 Z"
      fill={C.hairDark}
      {...line}
    />
    {/* Shades */}
    <Path d="M35 45.5 L65 45.5" fill="none" {...line} />
    <Rect x={35} y={44} width={13} height={9} rx={3.5} fill={C.lens} {...line} strokeWidth={1.8} />
    <Rect x={52} y={44} width={13} height={9} rx={3.5} fill={C.lens} {...line} strokeWidth={1.8} />
    <Path
      d="M38 46.5 L41.5 46.5 M55 46.5 L58.5 46.5"
      fill="none"
      stroke={PidroColors.text}
      strokeWidth={1.4}
      strokeLinecap="round"
    />
    {/* The moustache, and the grin under it */}
    <Path d="M44.5 64 Q50 68 55.5 64" fill="none" {...line} />
    <Path
      d="M50 57.5 C45 54 37 55 33 61 C36 60 38.5 62 42 62.5 C45.5 62.5 48 61 50 59.5 C52 61 54.5 62.5 58 62.5 C61.5 62 64 60 67 61 C63 55 55 54 50 57.5 Z"
      fill={C.hairDark}
      {...line}
      strokeWidth={1.6}
    />
  </>
);

const FACES: Record<BotPersona, ReactNode> = { marcel: MARCEL, antti: ANTTI, jocke: JOCKE };
