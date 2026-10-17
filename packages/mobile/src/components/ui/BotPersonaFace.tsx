import type { ReactNode } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import type { BotPersona } from '@pidro/shared';
import { PidroBevel, PidroColors, PidroPersonaColors as C } from '@/design/tokens';

/**
 * The bot crew, drawn after the three people who run Pidro: Marcel the
 * builder (trucker cap, coffee, too many cards), Antti in his beanie and red
 * Liverpool scarf, and Jocke (long wavy hair, round glasses, moustache, a card tucked
 * in his hair). A 100-unit
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
    {/* Navy jacket over a white tee */}
    <Path d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z" fill={C.navy} {...line} />
    <Path
      d="M41 74 Q50 82 59 74 L59 77 Q50 86 41 77 Z"
      fill={C.capFront}
      {...line}
      strokeWidth={1.6}
    />
    <Path d="M50 84 L50 104" fill="none" stroke={C.capNavy} strokeWidth={1.6} />
    <Head />
    {/* Light stubble along the jaw */}
    <Path
      d="M35.5 56 C37 65 43 69 50 69 C57 69 63 65 64.5 56 C61 62 56 65 50 65 C44 65 39 62 35.5 56 Z"
      fill={C.stubble}
    />
    {/* Hair at the temples, under the cap */}
    <Path
      d="M31 47 C31 42 32.5 40 34.5 39.5 L35 48 Z"
      fill={C.hairLight}
      {...line}
      strokeWidth={1.4}
    />
    <Path
      d="M69 47 C69 42 67.5 40 65.5 39.5 L65 48 Z"
      fill={C.hairLight}
      {...line}
      strokeWidth={1.4}
    />
    {/* Trucker cap: navy back, white front, a little mountain patch, red brim */}
    <Path d="M29.5 42 C28.5 25 39 18 50 18 C61 18 71.5 25 70.5 42 Z" fill={C.capNavy} {...line} />
    <Path
      d="M35.5 41 C35 27 42 20.5 50 20.5 C58 20.5 65 27 64.5 41 Z"
      fill={C.capFront}
      {...line}
      strokeWidth={1.6}
    />
    <Rect x={42.5} y={27} width={15} height={7} rx={1.2} fill={C.capNavy} />
    <Path
      d="M44 33 L47.5 29 L50 31.5 L52.5 29.5 L56 33"
      fill="none"
      stroke={C.capFront}
      strokeWidth={1.2}
      strokeLinejoin="round"
    />
    <Circle cx={50} cy={18.5} r={1.6} fill={C.capNavy} />
    <Path
      d="M27 41 C35 46 65 46 73 41 C67 47.5 33 47.5 27 41 Z"
      fill={C.capBrim}
      {...line}
      strokeWidth={1.8}
    />
    {/* Face */}
    <Circle cx={43} cy={51} r={2.2} fill={INK} />
    <Circle cx={57} cy={51} r={2.2} fill={INK} />
    <Path d="M43 59 Q50 64.5 57 59" fill="none" {...line} />
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
    {/* Dark jacket */}
    <Path d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z" fill={C.jacketDark} {...line} />
    <Head />
    {/* Ginger stubble */}
    <Path
      d="M35 55 C36.5 65 43 69 50 69 C57 69 63.5 65 65 55 C61 61 56 63.5 50 63.5 C44 63.5 39 61 35 55 Z"
      fill={C.gingerStubble}
    />
    {/* Black beanie, a ribbed cuff */}
    <Path d="M29 44 C27.5 25 38 16 50 16 C62 16 72.5 25 71 44 Z" fill={C.beanie} {...line} />
    <Path
      d="M28 45.5 C35 40.5 65 40.5 72 45.5 L71.5 38.5 C64 34 36 34 28.5 38.5 Z"
      fill={C.beanieRib}
      {...line}
      strokeWidth={1.8}
    />
    <Path
      d="M34 37.5 L34 43 M40 36.5 L40 42 M46 36 L46 41.5 M54 36 L54 41.5 M60 36.5 L60 42 M66 37.5 L66 43"
      fill="none"
      stroke={C.beanie}
      strokeWidth={1.2}
    />
    {/* Ginger brows, clear eyes */}
    <Path
      d="M39.5 48 L45.5 47.5 M54.5 47.5 L60.5 48"
      fill="none"
      stroke={C.ginger}
      strokeWidth={2.2}
      strokeLinecap="round"
    />
    <Circle cx={43} cy={52} r={2.1} fill={INK} />
    <Circle cx={57} cy={52} r={2.1} fill={INK} />
    {/* His Liverpool scarf, red with white bands, pulled up to the chin */}
    <Path d="M29 63 C36 70.5 64 70.5 71 63 L73 78 C64 85 36 85 27 78 Z" fill={C.scarf} {...line} />
    <Path
      d="M28 69.5 C36 75.5 64 75.5 72 69.5 M28.8 75 C36 81 64 81 71.2 75"
      fill="none"
      stroke={PidroColors.leagueCardFace}
      strokeWidth={2}
    />
  </>
);

const JOCKE: ReactNode = (
  <>
    {/* Long wavy hair, down to the shoulders, behind */}
    <Path
      d="M27 48 C24 30 36 20 50 20 C64 20 76 30 73 48 C75 60 75 72 71 80 C67 76 65 69 64 61 L36 61 C35 69 33 76 29 80 C25 72 25 60 27 48 Z"
      fill={C.hairWavy}
      {...line}
    />
    {/* Navy suit, brown waistcoat, dark shirt */}
    <Path d="M12 104 C14 82 30 73 50 73 C70 73 86 82 88 104 Z" fill={C.navy} {...line} />
    <Path
      d="M40 75 L45 100 L50 90 L55 100 L60 75 Z"
      fill={C.waistcoat}
      {...line}
      strokeWidth={1.6}
    />
    <Path d="M42 74 L50 90 L58 74 Z" fill={C.shirtDark} {...line} strokeWidth={1.6} />
    {/* The card tucked in his hair */}
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
    <Head ears={false} />
    {/* Swept back on top, a wave falling at each side */}
    <Path
      d="M30.5 50 C28 31 39 22.5 51 23 C63 22.5 72 31 69.5 50 C67 40 62 34 51 34.5 C41 34 33.5 40 30.5 50 Z"
      fill={C.hairWavy}
      {...line}
    />
    <Path
      d="M40 27 C44 30 47 30 50 27 M53 26.5 C56 29.5 60 30 63 28"
      fill="none"
      stroke={PidroColors.ink}
      strokeWidth={1.2}
      strokeLinecap="round"
    />
    {/* Round glasses */}
    <Circle cx={43} cy={49} r={5.4} fill={C.glassTint} stroke={INK} strokeWidth={2} />
    <Circle cx={57} cy={49} r={5.4} fill={C.glassTint} stroke={INK} strokeWidth={2} />
    <Path
      d="M48.4 48.5 Q50 47 51.6 48.5 M37.6 47.5 L32 46.5 M62.4 47.5 L68 46.5"
      fill="none"
      {...line}
      strokeWidth={1.8}
    />
    <Circle cx={43} cy={49.5} r={1.8} fill={INK} />
    <Circle cx={57} cy={49.5} r={1.8} fill={INK} />
    {/* The moustache, and a steady look under it */}
    <Path
      d="M50 58.5 C46 56.5 41.5 57.5 39.5 60.5 C42.5 60 45.5 60.5 50 60 C54.5 60.5 57.5 60 60.5 60.5 C58.5 57.5 54 56.5 50 58.5 Z"
      fill={C.hairWavy}
      {...line}
      strokeWidth={1.4}
    />
    <Path d="M45 64 Q50 66 55 64" fill="none" {...line} />
  </>
);

const FACES: Record<BotPersona, ReactNode> = { marcel: MARCEL, antti: ANTTI, jocke: JOCKE };
