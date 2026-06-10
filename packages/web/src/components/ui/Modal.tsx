import { useCallback, useEffect } from 'react';
import { GlassCard, HeaderBanner } from '../ds';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * PidroModal — the DS modal pattern: dark blurred overlay, wooden
 * HeaderBanner overlapping the glass card's top edge by ~16px. Tall content
 * scrolls inside the card so the banner and footer always stay put.
 */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[rgba(4,10,20,0.72)] backdrop-blur-[4px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-1/2 flex w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <HeaderBanner size="sm">{title}</HeaderBanner>
        <GlassCard
          noPadding
          style={{
            width: '100%',
            marginTop: -16,
            maxHeight: 'calc(100dvh - 96px)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-8 max-sm:px-4">
            {children}
          </div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-cyan-200/15 px-5 py-4 max-sm:px-4">
              {footer}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
