import { type CSSProperties, type ReactNode, useState } from 'react';

/**
 * Pidro Design System — buttons. Faithful TSX ports of the Claude-design
 * primitives (`pidro-ds/components.jsx`): the wood/gold primary CTA with its
 * signature glass/lacquer highlight band, the frosted glass secondary, the
 * square glass icon button, and the destructive red button.
 */

type Size = 'sm' | 'md' | 'lg';

interface PidroButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  size?: Size;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: CSSProperties;
}

const pidroSizes: Record<Size, CSSProperties> = {
  sm: { padding: '8px 20px', fontSize: 'var(--pidro-text-base)' },
  md: { padding: '12px 32px', fontSize: 'var(--pidro-text-xl)' },
  lg: { padding: '16px 48px', fontSize: 'var(--pidro-text-2xl)' },
};

export function PidroButton({
  children,
  onClick,
  disabled,
  size = 'md',
  fullWidth,
  type = 'button',
  style,
}: PidroButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: '3px solid var(--pidro-btn-primary-border)',
        borderRadius: 'var(--pidro-radius-md)',
        background: 'linear-gradient(180deg, #8A6030 0%, #5A3515 35%, #321A08 70%, #1E0E04 100%)',
        color: 'var(--pidro-btn-primary-text)',
        fontFamily: 'var(--pidro-font-display)',
        fontWeight: 'var(--pidro-weight-bold)' as unknown as number,
        textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--pidro-duration) var(--pidro-ease)',
        boxShadow:
          hovered && !disabled
            ? '0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 12px rgba(212,160,32,0.3)'
            : '0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
        textAlign: 'center',
        userSelect: 'none',
        letterSpacing: '0.02em',
        overflow: 'hidden',
        ...pidroSizes[size],
        ...(fullWidth ? { width: '100%' } : {}),
        ...(hovered && !disabled ? { filter: 'brightness(1.15)' } : {}),
        ...(pressed && !disabled ? { transform: 'scale(0.97)', filter: 'brightness(0.95)' } : {}),
        ...(disabled ? { opacity: 0.45, filter: 'saturate(0.4)' } : {}),
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 100%)',
          borderRadius: 'inherit',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          pointerEvents: 'none',
        }}
      />
      <span
        style={{ position: 'relative', zIndex: 1, lineHeight: 1, transform: 'translateY(-0.06em)' }}
      >
        {children}
      </span>
    </button>
  );
}

interface GlassButtonProps extends PidroButtonProps {
  premium?: boolean;
}

const glassSizes: Record<Size, CSSProperties> = {
  sm: { padding: '6px 14px', fontSize: 'var(--pidro-text-sm)' },
  md: { padding: '10px 24px', fontSize: 'var(--pidro-text-base)' },
  lg: { padding: '14px 36px', fontSize: 'var(--pidro-text-xl)' },
};

export function GlassButton({
  children,
  onClick,
  disabled,
  size = 'md',
  fullWidth,
  premium,
  type = 'button',
  style,
}: GlassButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        border: `2px solid ${premium ? 'var(--pidro-gold)' : 'var(--pidro-btn-secondary-border)'}`,
        borderRadius: 'var(--pidro-radius-md)',
        background: 'var(--pidro-btn-secondary-bg)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        color: 'var(--pidro-btn-secondary-text)',
        fontFamily: 'var(--pidro-font-body)',
        fontWeight: 'var(--pidro-weight-bold)' as unknown as number,
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--pidro-duration) var(--pidro-ease)',
        boxShadow: premium
          ? '0 2px 10px rgba(0,0,0,0.25), 0 0 8px rgba(255,212,38,0.2)'
          : '0 2px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
        overflow: 'hidden',
        userSelect: 'none',
        ...glassSizes[size],
        ...(fullWidth ? { width: '100%' } : {}),
        ...(hovered && !disabled
          ? {
              background: 'var(--pidro-btn-secondary-bg-hover)',
              boxShadow:
                '0 2px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 10px var(--pidro-cyan-glow)',
            }
          : {}),
        ...(pressed && !disabled ? { transform: 'scale(0.97)' } : {}),
        ...(disabled ? { opacity: 0.4 } : {}),
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '45%',
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: 'inherit',
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
    </button>
  );
}

export function DangerButton({ children, onClick, size = 'md', style }: PidroButtonProps) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const sizes: Record<Size, CSSProperties> = {
    sm: { padding: '6px 14px', fontSize: 13 },
    md: { padding: '8px 20px', fontSize: 15 },
    lg: { padding: '12px 28px', fontSize: 18 },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontFamily: 'var(--pidro-font-body)',
        background: hovered ? 'rgba(220,40,40,0.8)' : 'rgba(180,30,30,0.65)',
        border: '2px solid rgba(255,80,80,0.5)',
        borderRadius: 'var(--pidro-radius-md)',
        color: '#fff',
        cursor: 'pointer',
        transition: 'all 150ms ease',
        boxShadow: hovered ? '0 0 12px rgba(255,60,60,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        transform: pressed ? 'scale(0.97)' : 'none',
        ...sizes[size],
        ...style,
      }}
    >
      {children}
    </button>
  );
}
