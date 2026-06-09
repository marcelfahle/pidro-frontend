import { type CSSProperties, type ReactNode, useState } from 'react';

/**
 * Pidro Design System — surfaces & small primitives. Faithful TSX ports of the
 * Claude-design components: the SVG wooden HeaderBanner, frosted GlassCard,
 * Badge, StatusDot, Divider, PidroInput, ProgressBar, and SettingsTile.
 */

const TEXTURE_SVG =
  "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10h20M10 0v20' stroke='%23ffffff' stroke-width='0.3' opacity='0.04'/%3E%3C/svg%3E\")";

type BannerSize = 'sm' | 'md' | 'lg';

export function HeaderBanner({
  children,
  size = 'md',
  style,
}: {
  children: ReactNode;
  size?: BannerSize;
  style?: CSSProperties;
}) {
  const sizes = {
    sm: { w: 250, h: 46, fontSize: 17, taper: 10 },
    md: { w: 380, h: 54, fontSize: 22, taper: 14 },
    lg: { w: 520, h: 62, fontSize: 28, taper: 18 },
  } as const;
  const s = sizes[size];
  const { w, h, taper: t } = s;
  const r = 10;
  const uid = `hb${size}`;
  const rb = 6;
  const path = `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w - t},${h - rb} Q ${w - t},${h} ${w - t - rb},${h} L ${t + rb},${h} Q ${t},${h} ${t},${h - rb} L 0,${r} Q 0,0 ${r},0 Z`;
  const gMid = h * 0.42;
  const tMid = t * (gMid / h);
  const glossPath = `M ${r},0 L ${w - r},0 Q ${w},0 ${w},${r} L ${w - tMid},${gMid} L ${tMid},${gMid} L 0,${r} Q 0,0 ${r},0 Z`;
  const pad = 3;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        filter: 'drop-shadow(0 5px 14px rgba(0,0,0,0.5))',
        zIndex: 'var(--pidro-z-banner)' as unknown as number,
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: w + pad * 2, height: h + pad * 2 }}>
        <svg
          width={w + pad * 2}
          height={h + pad * 2}
          viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`}
          style={{ display: 'block' }}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`${uid}w`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8A6030" />
              <stop offset="35%" stopColor="#5A3515" />
              <stop offset="70%" stopColor="#321A08" />
              <stop offset="100%" stopColor="#1E0E04" />
            </linearGradient>
            <linearGradient id={`${uid}g`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="60%" stopColor="white" stopOpacity="0.18" />
              <stop offset="100%" stopColor="white" stopOpacity="0.12" />
            </linearGradient>
            <radialGradient id={`${uid}s`} cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="white" stopOpacity="0.30" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`${uid}b`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ECC040" />
              <stop offset="50%" stopColor="#C89830" />
              <stop offset="100%" stopColor="#A07020" />
            </linearGradient>
          </defs>
          <g transform={`translate(${pad},${pad})`}>
            <path d={path} fill={`url(#${uid}w)`} />
            <path d={glossPath} fill={`url(#${uid}g)`} />
            <line
              x1={tMid + 2}
              y1={gMid}
              x2={w - tMid - 2}
              y2={gMid}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth={0.5}
            />
            <ellipse
              cx={w / 2}
              cy={h * 0.12}
              rx={(w * 0.5) / 2}
              ry={h * 0.25}
              fill={`url(#${uid}s)`}
            />
            <path
              d={path}
              fill="none"
              stroke={`url(#${uid}b)`}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            paddingBottom: 2,
            color: 'var(--pidro-text-gold)',
            fontFamily: 'var(--pidro-font-display)',
            fontWeight: 'var(--pidro-weight-bold)' as unknown as number,
            fontSize: s.fontSize,
            lineHeight: 1,
            textShadow: '0 2px 5px rgba(0,0,0,0.6), 0 1px 0 rgba(0,0,0,0.3)',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      </div>
      <div
        style={{
          width: '65%',
          height: 4,
          background: 'linear-gradient(180deg, rgba(20,10,3,0.35), transparent)',
          borderRadius: '0 0 50% 50%',
          marginTop: -1,
        }}
      />
    </div>
  );
}

export function GlassCard({
  children,
  glow = true,
  noPadding,
  style,
}: {
  children: ReactNode;
  glow?: boolean;
  noPadding?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--pidro-glass-bg)',
        backgroundImage: TEXTURE_SVG,
        border: '2px solid var(--pidro-glass-border)',
        borderRadius: 'var(--pidro-radius-lg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: noPadding ? 0 : 'var(--pidro-space-xl)',
        boxShadow: glow
          ? '0 4px 24px rgba(0,0,0,0.35), 0 0 1px rgba(0,200,255,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 4px 16px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type BadgeVariant = 'cyan' | 'gold' | 'green';

export function Badge({
  children,
  variant = 'cyan',
  style,
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  style?: CSSProperties;
}) {
  const colors: Record<BadgeVariant, { bg: string; border: string; color: string }> = {
    cyan: {
      bg: 'rgba(0,207,255,0.15)',
      border: 'var(--pidro-cyan)',
      color: 'var(--pidro-text-cyan)',
    },
    gold: {
      bg: 'rgba(255,212,38,0.15)',
      border: 'var(--pidro-gold)',
      color: 'var(--pidro-text-gold)',
    },
    green: {
      bg: 'rgba(74,224,106,0.15)',
      border: 'var(--pidro-online)',
      color: 'var(--pidro-text-green)',
    },
  };
  const c = colors[variant];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        fontSize: 'var(--pidro-text-xs)',
        fontWeight: 700,
        fontFamily: 'var(--pidro-font-body)',
        background: c.bg,
        border: `1.5px solid ${c.border}`,
        borderRadius: 'var(--pidro-radius-full)',
        color: c.color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function StatusDot({ online = true, size = 10 }: { online?: boolean; size?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: online ? 'var(--pidro-online)' : '#888',
        boxShadow: online ? '0 0 6px rgba(74,224,106,0.5)' : 'none',
        flexShrink: 0,
      }}
    />
  );
}

export function Divider({ label, style }: { label?: string; style?: CSSProperties }) {
  const line: CSSProperties = {
    flex: 1,
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--pidro-glass-border), transparent)',
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--pidro-space-lg)',
        padding: '8px 0',
        ...style,
      }}
    >
      <div style={line} />
      {label && (
        <span
          style={{
            fontFamily: 'var(--pidro-font-display)',
            fontSize: 'var(--pidro-text-xl)',
            color: 'var(--pidro-text-primary)',
            fontWeight: 700,
            textShadow: 'var(--pidro-shadow-text)',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </span>
      )}
      <div style={line} />
    </div>
  );
}

export function PidroInput({
  placeholder,
  value,
  onChange,
  icon,
  style,
  type = 'text',
  name,
  id,
  ariaLabel,
  autoComplete,
  required,
}: {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: ReactNode;
  style?: CSSProperties;
  type?: React.HTMLInputTypeAttribute;
  name?: string;
  id?: string;
  ariaLabel?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--pidro-space-sm)',
        padding: '10px 16px',
        background: 'rgba(10, 40, 80, 0.5)',
        border: `2px solid ${focused ? 'var(--pidro-cyan)' : 'var(--pidro-glass-border)'}`,
        borderRadius: 'var(--pidro-radius-md)',
        boxShadow: focused ? '0 0 12px var(--pidro-cyan-glow)' : 'none',
        transition: 'all var(--pidro-duration) var(--pidro-ease)',
        ...style,
      }}
    >
      {icon && (
        <span style={{ color: 'var(--pidro-cyan-dim)', display: 'inline-flex', flexShrink: 0 }}>
          {icon}
        </span>
      )}
      <input
        type={type}
        name={name}
        id={id}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          outline: 'none',
          color: 'var(--pidro-text-primary)',
          fontFamily: 'var(--pidro-font-body)',
          fontSize: 'var(--pidro-text-base)',
          padding: 0,
        }}
      />
    </div>
  );
}

export function ProgressBar({
  value = 0,
  color,
  height = 10,
  label,
  style,
}: {
  value?: number;
  color?: string;
  height?: number;
  label?: string;
  style?: CSSProperties;
}) {
  const fillColor = color || 'var(--pidro-cyan)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div
        style={{
          flex: 1,
          height,
          background: 'rgba(0,0,0,0.35)',
          borderRadius: height,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(1, value)) * 100}%`,
            height: '100%',
            background: fillColor,
            borderRadius: height,
            transition: 'width 400ms ease',
            boxShadow: `0 0 6px ${fillColor}44`,
          }}
        />
      </div>
      {label && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--pidro-text-secondary)',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

export function SettingsTile({
  icon,
  label,
  status,
  onClick,
  style,
}: {
  icon: ReactNode;
  label: string;
  status?: string;
  onClick?: () => void;
  style?: CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        aspectRatio: '1',
        background: hovered ? 'var(--pidro-glass-bg-hover)' : 'var(--pidro-glass-bg)',
        border: '2px solid var(--pidro-glass-border)',
        borderRadius: 'var(--pidro-radius-lg)',
        backdropFilter: 'blur(8px)',
        cursor: 'pointer',
        transition: 'all var(--pidro-duration) var(--pidro-ease)',
        boxShadow: hovered ? '0 0 12px var(--pidro-cyan-glow)' : '0 2px 8px rgba(0,0,0,0.25)',
        padding: 12,
        ...style,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="pidro-metal-icon"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {icon}
        </span>
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--pidro-text-cyan)',
          minHeight: 16,
          lineHeight: '16px',
        }}
      >
        {status || ''}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--pidro-text-primary)',
          textAlign: 'center',
          lineHeight: 1.1,
        }}
      >
        {label}
      </div>
    </button>
  );
}
