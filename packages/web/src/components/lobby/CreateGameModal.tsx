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
    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
    : 'bg-amber-100 text-amber-800 hover:bg-amber-200';
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
        {/* Game name */}
        <div>
          <label htmlFor="game-name" className="mb-1 block text-sm font-medium text-gray-700">
            Game Name
          </label>
          <input
            id="game-name"
            type="text"
            placeholder={`${username}'s game`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        {/* Seats */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Seats</p>
          <div className="grid grid-cols-4 gap-2">
            {/* Seat 1: locked as you */}
            <div className="flex flex-col items-center rounded-md border border-emerald-200 bg-emerald-50 p-3">
              <span className="text-xs text-gray-500">Seat 1</span>
              <span className="mt-1 truncate text-sm font-medium text-emerald-800">You</span>
            </div>

            {/* Seats 2-4: toggleable */}
            {[
              { seat: seat2, set: setSeat2, label: 'Seat 2' },
              { seat: seat3, set: setSeat3, label: 'Seat 3' },
              { seat: seat4, set: setSeat4, label: 'Seat 4' },
            ].map(({ seat, set, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => set(nextSeatValue(seat))}
                className={`flex flex-col items-center rounded-md border border-gray-200 p-3 transition-colors ${seatColor(seat)}`}
              >
                <span className="text-xs text-gray-500">{label}</span>
                <span className="mt-1 text-sm font-medium">{seatLabel(seat)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bot difficulty (shown when any seat is Bot) */}
        {hasBot && (
          <div>
            <label
              htmlFor="bot-difficulty"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Bot Difficulty
            </label>
            <select
              id="bot-difficulty"
              value={botDifficulty}
              onChange={(e) => setBotDifficulty(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="random">Random</option>
              <option value="basic">Basic</option>
              <option value="smart">Smart</option>
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </Modal>
  );
}
