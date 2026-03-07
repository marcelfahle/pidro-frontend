const LETTERS = [
  { letter: 'P', tilt: '-16deg' },
  { letter: 'I', tilt: '-8deg' },
  { letter: 'D', tilt: '0deg' },
  { letter: 'R', tilt: '8deg' },
  { letter: 'O', tilt: '16deg' },
] as const;

export function PidroWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative flex items-end justify-center gap-1 px-6 pt-10 pb-2">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-28 rounded-full bg-[radial-gradient(circle,rgba(97,235,255,0.65),transparent_68%)] blur-xl" />
        {LETTERS.map(({ letter, tilt }, index) => (
          <div
            key={letter}
            className="relative flex h-24 w-16 items-center justify-center rounded-[14px] border border-cyan-300/80 bg-[linear-gradient(180deg,#082d77_0%,#031744_52%,#031033_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_0_18px_rgba(38,233,255,0.55),0_12px_24px_rgba(0,0,0,0.45)]"
            style={{
              transform: `translateY(${Math.abs(index - 2) * 4}px) rotate(${tilt})`,
            }}
          >
            <span className="text-5xl font-black tracking-tight text-[#ffd83e] [text-shadow:0_2px_0_#8d4700,0_0_12px_rgba(255,229,124,0.5)]">
              {letter}
            </span>
          </div>
        ))}
      </div>
      <p className="text-center text-xs font-bold uppercase tracking-[0.45em] text-cyan-100/80">
        Classic Pidro
      </p>
    </div>
  );
}
