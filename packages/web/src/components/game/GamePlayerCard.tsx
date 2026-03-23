import type { SeatStatus } from "@pidro/shared";

interface GamePlayerCardProps {
  displayName: string;
  roleLabel?: string;
  statusText: string;
  initial: string;
  isYou?: boolean;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  isConnected?: boolean;
  seatStatus?: SeatStatus;
  compact?: boolean;
  imagePosition?: "left" | "right";
  className?: string;
}

export function GamePlayerCard({
  displayName,
  statusText,
  initial,
  isDealer = false,
  isCurrentTurn = false,
  isConnected = true,
  seatStatus = "normal",
  compact = false,
  imagePosition = "left",
  className = "",
}: GamePlayerCardProps) {
  const isBot =
    seatStatus === "bot_substitute" || seatStatus === "permanent_bot";
  const isReconnecting = seatStatus === "reconnecting";
  const isVacant = seatStatus === "vacant";
  const dimmed = !isVacant && (!isConnected || isReconnecting);

  const avatarContent = isBot ? "🤖" : initial;
  const resolvedName = isVacant ? "Waiting..." : isBot ? "Bot" : displayName;
  const resolvedStatus = isVacant
    ? "Open seat"
    : isReconnecting
      ? "Reconnecting..."
      : statusText;

  const avatar = (
    <div className="relative">
      <div
        className={`flex shrink-0 items-center justify-center rounded text-xs font-black text-white ${
          compact ? "h-7 w-7" : "h-9 w-9"
        } ${isVacant ? "border border-dashed border-amber-300/40 bg-amber-400/10" : "bg-[#1a5a80]"}`}
      >
        {isVacant ? (
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300/80" />
        ) : (
          avatarContent
        )}
      </div>
      {isDealer && (
        <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-300/80 bg-amber-500 text-[8px] font-black text-white">
          D
        </div>
      )}
    </div>
  );

  const text = (
    <div className="min-w-0">
      <div className="flex items-center gap-1">
        <span
          className={`truncate font-bold text-white ${compact ? "max-w-[64px] text-[10px]" : "text-[11px]"}`}
        >
          {resolvedName}
        </span>
      </div>
      <div
        className={`font-bold uppercase tracking-wide ${
          compact ? "text-[8px]" : "text-[9px]"
        } ${isCurrentTurn ? "text-cyan-50/90" : "text-cyan-50/55"}`}
      >
        {resolvedStatus}
      </div>
    </div>
  );

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/20 bg-black/30 backdrop-blur-sm ${
        compact ? "px-1.5 py-1" : "px-2 py-1.5"
      } ${isCurrentTurn ? "border-cyan-300/70 animate-active-turn" : ""} ${
        dimmed ? "opacity-50" : ""
      } ${className}`}
    >
      {imagePosition === "left" ? (
        <>
          {avatar}
          {text}
        </>
      ) : (
        <>
          {text}
          {avatar}
        </>
      )}
    </div>
  );
}
