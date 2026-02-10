interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-12 w-12 border-4',
} as const;

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <output
      className={`block animate-spin rounded-full border-emerald-500 border-t-transparent ${sizeClasses[size]} ${className}`}
      aria-label="Loading"
    />
  );
}
