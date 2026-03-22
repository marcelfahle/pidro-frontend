import { useCallback, useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-[18px] border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(15,31,55,0.96)_0px,rgba(15,31,55,0.96)_20px,transparent_20px),radial-gradient(circle_at_center,rgba(53,151,213,0.32)_0%,transparent_45%),linear-gradient(180deg,#176ea7_0%,#0d5087_52%,#07264c_100%)] shadow-[0_40px_100px_rgba(0,0,0,0.65)]"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="relative px-5 pb-5 pt-4">
          <div className="mb-5 flex justify-center">
            <div className="pidro-banner text-lg">{title}</div>
          </div>
          <div className="pidro-panel p-5">{children}</div>
          {footer && <div className="mt-5 flex flex-wrap justify-end gap-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
