import dealerChipUrl from '../../assets/dealer-chip.png';

/** The gold "D" dealer coin — the pre-rendered DS asset. */
export function DealerChip({ className = '', size = 30 }: { className?: string; size?: number }) {
  return (
    <img
      src={dealerChipUrl}
      alt="Dealer"
      width={size}
      height={size}
      className={`pointer-events-none select-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.45)] ${className}`}
    />
  );
}
