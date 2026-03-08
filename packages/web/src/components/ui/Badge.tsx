interface BadgeProps {
  children: React.ReactNode;
  variant?: 'green' | 'blue' | 'gray' | 'yellow' | 'amber' | 'red';
  className?: string;
}

const variantClasses = {
  green:
    'border border-emerald-300/40 bg-emerald-500/18 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
  blue: 'border border-cyan-300/50 bg-cyan-400/18 text-cyan-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
  gray: 'border border-white/20 bg-white/10 text-white/80 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
  yellow:
    'border border-[#ffcc54]/50 bg-[#d98e13]/22 text-[#fff0b2] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
  amber:
    'border border-amber-300/50 bg-amber-500/20 text-amber-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
  red: 'border border-red-200/45 bg-red-400/18 text-red-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]',
} as const;

export function Badge({ children, variant = 'gray', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
