import type { SeatType } from '@pidro/shared';
import { useState } from 'react';
import { Button } from '../ui/Button';
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

function nextSeatValue(current: SeatToggle): SeatToggle {
  return current === 'open' ? 'ai' : 'open';
}

function seatLabel(value: SeatToggle): string {
  return value === 'open' ? 'Open' : 'Bot';
}

function seatColor(value: SeatToggle): string {
  return value === 'open'
    ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-50 hover:border-cyan-200/60 hover:bg-cyan-400/16'
    : 'border-[#ffcc54]/40 bg-[#ffcc54]/12 text-[#fff0b2] hover:border-[#ffcc54]/70 hover:bg-[#ffcc54]/18';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: name.trim() || `${username}'s game`,
      seats: { seat_2: seat2, seat_3: seat3, seat_4: seat4 },
      botDifficulty,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Game"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="create-game-form" loading={loading}>
            Create Game
          </Button>
        </>
      }
    >
      <form id="create-game-form" onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="game-name"
            className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-cyan-50/80"
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
          <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-cyan-50/80">
            Seats
          </p>
          <div className="space-y-3">
            <div className="rounded-[16px] border border-cyan-300/20 bg-cyan-950/20 p-4">
              <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-50/60">
                Seat 1
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="pidro-avatar">{(username[0] ?? 'Y').toUpperCase()}</div>
                <div>
                  <div className="text-base font-black text-white">You</div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-cyan-50/65">
                    Host
                  </div>
                </div>
              </div>
            </div>

            {[
              { seat: seat2, set: setSeat2, label: 'Seat 2' },
              { seat: seat3, set: setSeat3, label: 'Seat 3' },
              { seat: seat4, set: setSeat4, label: 'Seat 4' },
            ].map(({ seat, set, label }) => (
              <div
                key={label}
                className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-cyan-300/20 bg-cyan-950/20 p-4"
              >
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-cyan-50/60">
                    {label}
                  </div>
                  <div className="mt-1 text-base font-black text-white">
                    {seat === 'ai' ? 'Bot Player' : 'Open Public'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => set(nextSeatValue(seat))}
                  className={`rounded-[8px] border px-4 py-2 text-sm font-black uppercase tracking-[0.12em] transition-colors ${seatColor(seat)}`}
                >
                  {seatLabel(seat)}
                </button>
              </div>
            ))}
          </div>
        </div>

        {hasBot && (
          <div>
            <label
              htmlFor="bot-difficulty"
              className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-cyan-50/80"
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
      </form>
    </Modal>
  );
}
