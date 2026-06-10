import type { SeatType } from '@pidro/shared';
import { useState } from 'react';
import { GlassButton, PidroButton } from '../ds';
import { PlayerAvatar } from '../profile/PlayerAvatar';
import { Modal } from '../ui/Modal';

interface CreateGameModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (config: {
    name: string;
    seats: { seat_2: SeatType; seat_3: SeatType; seat_4: SeatType };
    botDifficulty: string;
  }) => void;
  username: string;
  loading?: boolean;
  error?: string | null;
}

type SeatToggle = 'open' | 'ai';

/** DS PlayerRow shell — glass row that hosts an avatar + text + actions. */
function SeatRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--pidro-radius-md)] border-[1.5px] border-cyan-300/25 bg-[rgba(15,50,90,0.5)] px-3.5 py-2.5 backdrop-blur-sm">
      {children}
    </div>
  );
}

function SeatToggleControl({
  value,
  onChange,
}: {
  value: SeatToggle;
  onChange: (next: SeatToggle) => void;
}) {
  const options: { key: SeatToggle; label: string }[] = [
    { key: 'open', label: 'Open' },
    { key: 'ai', label: 'Bot' },
  ];
  return (
    <div className="flex shrink-0 overflow-hidden rounded-full border border-cyan-200/30 bg-black/25">
      {options.map(({ key, label }) => {
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={`px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition-all ${
              selected
                ? key === 'ai'
                  ? 'bg-[#ffcc54]/20 text-[#ffe9a3] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                  : 'bg-cyan-400/22 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                : 'text-cyan-50/45 hover:text-cyan-50/75'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function CreateGameModal({
  open,
  onClose,
  onSubmit,
  username,
  loading = false,
  error = null,
}: CreateGameModalProps) {
  const [name, setName] = useState('');
  const [seat2, setSeat2] = useState<SeatToggle>('open');
  const [seat3, setSeat3] = useState<SeatToggle>('open');
  const [seat4, setSeat4] = useState<SeatToggle>('open');
  const [botDifficulty, setBotDifficulty] = useState('basic');

  const hasBot = seat2 === 'ai' || seat3 === 'ai' || seat4 === 'ai';

  const submit = () => {
    if (loading) return;
    onSubmit({
      name: name.trim() || `${username}'s game`,
      seats: { seat_2: seat2, seat_3: seat3, seat_4: seat4 },
      botDifficulty,
    });
  };

  const seats = [
    { seat: seat2, set: setSeat2, label: 'Seat 2' },
    { seat: seat3, set: setSeat3, label: 'Seat 3' },
    { seat: seat4, set: setSeat4, label: 'Seat 4' },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Game"
      footer={
        <>
          <GlassButton onClick={onClose} disabled={loading}>
            Cancel
          </GlassButton>
          <PidroButton size="sm" onClick={submit} disabled={loading}>
            {loading ? 'Creating…' : 'Create Game'}
          </PidroButton>
        </>
      }
    >
      <form
        id="create-game-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="game-name"
            className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-cyan-50/70"
          >
            Game Name
          </label>
          <input
            id="game-name"
            type="text"
            placeholder={`${username}'s game`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pidro-input"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-50/70">
            Seats
          </p>
          <div className="space-y-2">
            <SeatRow>
              <PlayerAvatar
                initial={(username[0] ?? 'Y').toUpperCase()}
                name={username}
                size={40}
                online="online"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-bold text-white">{username}</div>
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pidro-gold)]/80">
                  Host
                </div>
              </div>
            </SeatRow>

            {seats.map(({ seat, set, label }) => (
              <SeatRow key={label}>
                <PlayerAvatar size={40} isBot={seat === 'ai'} isVacant={seat === 'open'} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-white/90">
                    {seat === 'ai' ? 'Bot player' : 'Open seat'}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-50/50">
                    {label}
                  </div>
                </div>
                <SeatToggleControl value={seat} onChange={set} />
              </SeatRow>
            ))}
          </div>
        </div>

        {hasBot && (
          <div>
            <label
              htmlFor="bot-difficulty"
              className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-cyan-50/70"
            >
              Bot Difficulty
            </label>
            <select
              id="bot-difficulty"
              value={botDifficulty}
              onChange={(e) => setBotDifficulty(e.target.value)}
              className="pidro-select"
            >
              <option value="random">Random</option>
              <option value="basic">Basic</option>
              <option value="smart">Smart</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm font-bold text-red-200">{error}</p>}

        {/* Hidden submit so Enter in the name field still creates the game. */}
        <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  );
}
