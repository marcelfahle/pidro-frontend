export function DealerChip({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#e8b830] bg-[radial-gradient(circle_at_40%_35%,#f5d45a_0%,#d4960a_100%)] text-[13px] font-black text-[#6b3a00] shadow-[inset_0_2px_3px_rgba(255,240,160,0.5),inset_0_-2px_4px_rgba(140,80,0,0.3),0_2px_6px_rgba(0,0,0,0.4)] ${className}`}
    >
      <span className="mt-px">D</span>
    </div>
  );
}
