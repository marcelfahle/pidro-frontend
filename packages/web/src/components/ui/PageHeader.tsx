import { useId } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'pidro-plaque--sm',
  md: 'pidro-plaque--md',
  lg: 'pidro-plaque--lg',
} as const;

const titleClasses = {
  sm: 'text-[0.92rem] sm:text-[1.08rem]',
  md: 'text-[clamp(1.28rem,2.35vw,2.18rem)]',
  lg: 'text-[clamp(1.72rem,4.45vw,3.35rem)]',
} as const;

export function PageHeader({
  title,
  subtitle,
  size = 'md',
  className = '',
}: PageHeaderProps) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="pidro-header-track">
        <div className={`pidro-plaque ${sizeClasses[size]}`}>
          <svg
            className="pidro-plaque__svg"
            viewBox="0 0 100 32"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`plaque-border-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffd35e" />
                <stop offset="48%" stopColor="#d98c05" />
                <stop offset="100%" stopColor="#955000" />
              </linearGradient>
              <linearGradient id={`plaque-face-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8c3d0b" />
                <stop offset="52%" stopColor="#612004" />
                <stop offset="100%" stopColor="#2a0800" />
              </linearGradient>
              <linearGradient id={`plaque-shine-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fff3d7" stopOpacity="0.46" />
                <stop offset="100%" stopColor="#fff3d7" stopOpacity="0" />
              </linearGradient>
            </defs>

            <path
              d="M4.4 1.2 Q5.6 0 7.8 0 H92.2 Q94.4 0 95.6 1.2 L91 28.4 Q90.3 32 88.5 32 H11.5 Q9.7 32 9 28.4 Z"
              fill={`url(#plaque-border-${gradientId})`}
            />
            <path
              d="M6.3 2.2 Q7.3 1.2 8.8 1.2 H91.2 Q92.7 1.2 93.7 2.2 L89.7 27.5 Q89.3 29.7 87.8 29.7 H12.2 Q10.7 29.7 10.3 27.5 Z"
              fill={`url(#plaque-face-${gradientId})`}
            />
            <path
              d="M8.9 2.6 H91.1 Q92.1 2.6 92.8 3.7 L94.5 9.7 H5.5 L7.2 3.7 Q7.9 2.6 8.9 2.6 Z"
              fill={`url(#plaque-shine-${gradientId})`}
              opacity="0.75"
            />
          </svg>
          <span
            className={`relative z-10 block max-w-full text-center font-black uppercase tracking-[0.015em] text-[#ffd92f] [text-shadow:0_3px_0_rgba(86,33,0,0.92),0_0_10px_rgba(255,220,110,0.12)] ${titleClasses[size]}`}
          >
            {title}
          </span>
        </div>
      </div>
      {subtitle && (
        <p className="mx-auto max-w-[720px] text-center text-sm leading-6 text-cyan-50/78">
          {subtitle}
        </p>
      )}
    </div>
  );
}
