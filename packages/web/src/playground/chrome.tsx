import type { RelativePlayerView, RelativePosition } from '@pidro/shared';
import type { ReactNode } from 'react';

/* ──────────────────────────────────────────────────────────
   Shared lab chrome — small styled primitives for the
   inspector + transport, matching the wood-and-glass kit.
   ────────────────────────────────────────────────────────── */

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-50/55">
      {children}
    </div>
  );
}

export function InspectorSection({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pidro-glass-box p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Eyebrow>{title}</Eyebrow>
        {right}
      </div>
      {children}
    </section>
  );
}

interface SegmentedOption<T> {
  label: ReactNode;
  value: T;
  title?: string;
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  columns,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: number;
}) {
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border px-2 py-2 text-[12px] font-black uppercase tracking-[0.08em] transition-colors ${
              active
                ? 'border-cyan-300/60 bg-cyan-400/15 text-white shadow-[inset_0_0_0_1px_rgba(94,237,255,0.25)]'
                : 'border-white/10 bg-black/20 text-cyan-50/60 hover:border-cyan-300/30 hover:text-cyan-50/90'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = 'ms',
  isDefault = true,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  isDefault?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block select-none">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-bold text-cyan-50/80">{label}</span>
        <span className="font-mono text-[12px] tabular-nums text-white">
          {value}
          <span className="ml-0.5 text-cyan-50/45">{unit}</span>
          {!isDefault && <span className="ml-1.5 text-[10px] text-amber-300/80">•</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400"
      />
    </label>
  );
}

const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

export function SpeedDial({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Segmented
      options={SPEEDS.map((s) => ({ label: `${s}×`, value: s }))}
      value={value}
      onChange={onChange}
    />
  );
}

export function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-gradient-to-b from-cyan-400/20 to-cyan-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] transition-all hover:from-cyan-400/30 hover:to-cyan-500/15 active:scale-[0.98]"
    >
      <span className="text-base transition-transform duration-300 group-active:-rotate-180">
        ⟲
      </span>
      Replay
    </button>
  );
}

export interface TimelineRow {
  key: string;
  label: string;
  sub?: string;
  startMs: number;
  durMs: number;
  accent?: boolean;
}

export function Timeline({
  rows,
  totalMs,
  litKeys,
}: {
  rows: TimelineRow[];
  totalMs: number;
  litKeys: Set<string>;
}) {
  const safeTotal = Math.max(totalMs, 1);
  return (
    <div className="space-y-1.5">
      {rows.map((row) => {
        const lit = litKeys.has(row.key);
        const leftPct = (row.startMs / safeTotal) * 100;
        const widthPct = Math.max((row.durMs / safeTotal) * 100, 1.5);
        return (
          <div key={row.key} className="grid grid-cols-[88px_1fr] items-center gap-2">
            <div className="min-w-0">
              <div
                className={`truncate text-[11px] font-bold transition-colors ${
                  lit ? 'text-white' : 'text-cyan-50/55'
                }`}
              >
                {row.label}
              </div>
              {row.sub && <div className="truncate text-[10px] text-cyan-50/35">{row.sub}</div>}
            </div>
            <div className="relative h-4 overflow-hidden rounded bg-black/30">
              <div
                className={`absolute top-0 h-full rounded transition-all duration-200 ${
                  row.accent
                    ? lit
                      ? 'bg-amber-400/80'
                      : 'bg-amber-400/25'
                    : lit
                      ? 'bg-cyan-400/80'
                      : 'bg-cyan-400/25'
                }`}
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex justify-between pt-1 font-mono text-[10px] tabular-nums text-cyan-50/40">
        <span>0ms</span>
        <span>{Math.round(safeTotal)}ms total</span>
      </div>
    </div>
  );
}

/** Centre-stage frame: the felt surface scenes animate on. */
export function StageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="pidro-window relative aspect-[4/3] w-full max-w-[760px]">
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

export function SoonStage({ label }: { label: string }) {
  return (
    <StageFrame>
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
        <span className="text-3xl opacity-40">🎬</span>
        <div className="text-lg font-black uppercase tracking-[0.14em] text-cyan-50/70">
          {label}
        </div>
        <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-50/45">
          Scene not wired yet
        </div>
      </div>
    </StageFrame>
  );
}

/* ── Table-based scenes ────────────────────────────────────── */

export type SeatTone = 'default' | 'gold' | 'cyan';

const SEAT_ANCHOR: Record<RelativePosition, string> = {
  north: 'left-1/2 top-3 -translate-x-1/2',
  west: 'left-3 top-1/2 -translate-y-1/2',
  east: 'right-3 top-1/2 -translate-y-1/2',
  south: 'bottom-3 left-1/2 -translate-x-1/2',
};

const SEAT_TONE: Record<SeatTone, string> = {
  default: 'border-white/10 bg-black/40 text-cyan-50/65',
  gold: 'border-amber-300/60 bg-amber-400/15 text-amber-200',
  cyan: 'border-cyan-300/55 bg-cyan-400/15 text-cyan-50',
};

export function SeatBadge({
  name,
  sub,
  tone = 'default',
  isYou = false,
}: {
  name: string;
  sub?: string;
  tone?: SeatTone;
  isYou?: boolean;
}) {
  return (
    <div
      className={`flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl border px-3 py-1.5 ${SEAT_TONE[tone]}`}
    >
      <span className="text-[10px] font-black uppercase tracking-[0.14em]">
        {name}
        {isYou && name.toLowerCase() !== 'you' && <span className="opacity-45"> · you</span>}
      </span>
      {sub && <span className="text-[10px] font-bold leading-none opacity-80">{sub}</span>}
    </div>
  );
}

/**
 * The shared "table" stage: felt frame, four seat badges placed by relative
 * position, and a centre slot for the scene's content.
 */
export function TableStage({
  players,
  statusFor,
  toneFor,
  children,
}: {
  players: RelativePlayerView[];
  statusFor?: (p: RelativePlayerView) => string | undefined;
  toneFor?: (p: RelativePlayerView) => SeatTone;
  children: ReactNode;
}) {
  return (
    <StageFrame>
      {players.map((p) => (
        <div
          key={p.relativePosition}
          className={`absolute z-10 ${SEAT_ANCHOR[p.relativePosition]}`}
        >
          <SeatBadge
            name={p.username ?? cap(p.relativePosition)}
            sub={statusFor?.(p)}
            tone={toneFor?.(p) ?? (p.isCurrentTurn ? 'cyan' : 'default')}
            isYou={p.isYou}
          />
        </div>
      ))}
      <div className="absolute inset-[16%] flex items-center justify-center">{children}</div>
    </StageFrame>
  );
}
