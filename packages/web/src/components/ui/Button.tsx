import { Spinner } from './Spinner';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
}

const variantClasses = {
  gold:
    'border-2 border-[#d99d1b] bg-[linear-gradient(180deg,rgba(255,213,88,0.22)_0%,transparent_36%),linear-gradient(180deg,#6d3000_0%,#4a1900_38%,#2f1100_100%)] text-[#ffd84a] shadow-[inset_0_1px_0_rgba(255,244,204,0.2),inset_0_-5px_10px_rgba(0,0,0,0.18),0_6px_12px_rgba(23,7,0,0.2)] hover:border-[#ffcb54] hover:text-[#ffeb8d] disabled:cursor-not-allowed disabled:opacity-50',
  glass:
    'border border-cyan-200/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_28%,transparent_30%),linear-gradient(180deg,rgba(23,119,188,0.84)_0%,rgba(6,69,114,0.82)_48%,rgba(4,46,82,0.88)_100%)] text-cyan-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),inset_0_12px_24px_rgba(255,255,255,0.04),0_7px_14px_rgba(0,0,0,0.16)] hover:border-cyan-100 hover:text-white hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),inset_0_12px_24px_rgba(255,255,255,0.05),0_8px_18px_rgba(0,0,0,0.2)] disabled:cursor-not-allowed disabled:opacity-50',
  danger:
    'border border-red-200/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.12)_0%,transparent_36%),linear-gradient(180deg,#8b3030_0%,#6c2020_100%)] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04),0_6px_12px_rgba(0,0,0,0.16)] hover:border-red-100 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.16)_0%,transparent_36%),linear-gradient(180deg,#9d3939_0%,#7c2525_100%)] disabled:cursor-not-allowed disabled:opacity-50',
} as const;

const sizeClasses = {
  xs: 'rounded-[var(--pidro-radius-tight)] px-2.5 py-1 text-[11px]',
  sm: 'rounded-[var(--pidro-radius-tight)] px-4 py-2 text-sm',
  md: 'rounded-[var(--pidro-radius-tight)] px-6 py-2.5 text-base',
  lg: 'rounded-[var(--pidro-radius-tight)] px-8 py-3 text-lg',
  xl: 'min-h-[var(--pidro-control-size)] rounded-[var(--pidro-radius-tight)] px-6 text-xl',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const resolvedVariant =
    variant === 'primary' ? 'gold' : variant === 'secondary' ? 'glass' : variant;

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-black uppercase tracking-[0.08em] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 ${variantClasses[resolvedVariant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {children}
    </button>
  );
}
