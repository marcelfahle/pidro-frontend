import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Card, getPidroPoints } from './Card';

// Mock @pidro/shared — provide the display helpers that Card.tsx imports
vi.mock('@pidro/shared', () => ({
  getRankLabel: (rank: number) => {
    const labels: Record<number, string> = {
      1: 'A',
      2: '2',
      3: '3',
      5: '5',
      10: '10',
      11: 'J',
      12: 'Q',
      13: 'K',
      14: 'A',
    };
    return labels[rank] ?? String(rank);
  },
  SUIT_SYMBOLS: {
    hearts: '\u2665',
    diamonds: '\u2666',
    clubs: '\u2663',
    spades: '\u2660',
  },
  SUIT_COLORS_RAW: {
    hearts: '#ef4444',
    diamonds: '#f59e0b',
    clubs: '#1e293b',
    spades: '#0f172a',
  },
}));

describe('getPidroPoints', () => {
  it('returns null when no trump suit is provided', () => {
    expect(getPidroPoints(5, 'hearts', null)).toBeNull();
    expect(getPidroPoints(5, 'hearts', undefined)).toBeNull();
  });

  it('returns 5 for the five of trump (pidro)', () => {
    expect(getPidroPoints(5, 'hearts', 'hearts')).toBe(5);
  });

  it('returns 5 for the off-five (same color, different suit)', () => {
    // Hearts and diamonds are both red
    expect(getPidroPoints(5, 'diamonds', 'hearts')).toBe(5);
    // Clubs and spades are both black
    expect(getPidroPoints(5, 'spades', 'clubs')).toBe(5);
  });

  it('returns null for the five of a different color', () => {
    // Hearts is red, clubs is black — not an off-five
    expect(getPidroPoints(5, 'clubs', 'hearts')).toBeNull();
  });

  it('returns 1 for ace of trump (rank 1 or 14)', () => {
    expect(getPidroPoints(1, 'hearts', 'hearts')).toBe(1);
    expect(getPidroPoints(14, 'hearts', 'hearts')).toBe(1);
  });

  it('returns 1 for the two of trump (low)', () => {
    expect(getPidroPoints(2, 'spades', 'spades')).toBe(1);
  });

  it('returns 1 for the jack of trump', () => {
    expect(getPidroPoints(11, 'clubs', 'clubs')).toBe(1);
  });

  it('returns 10 for the ten of trump (game)', () => {
    expect(getPidroPoints(10, 'diamonds', 'diamonds')).toBe(10);
  });

  it('returns null for non-scoring trump cards (e.g. 3, 4, 6-9, Q, K)', () => {
    expect(getPidroPoints(3, 'hearts', 'hearts')).toBeNull();
    expect(getPidroPoints(4, 'hearts', 'hearts')).toBeNull();
    expect(getPidroPoints(6, 'hearts', 'hearts')).toBeNull();
    expect(getPidroPoints(9, 'hearts', 'hearts')).toBeNull();
    expect(getPidroPoints(12, 'hearts', 'hearts')).toBeNull();
    expect(getPidroPoints(13, 'hearts', 'hearts')).toBeNull();
  });

  it('returns null for non-trump cards that are not the off-five', () => {
    expect(getPidroPoints(1, 'diamonds', 'hearts')).toBeNull();
    expect(getPidroPoints(10, 'spades', 'hearts')).toBeNull();
    expect(getPidroPoints(11, 'clubs', 'hearts')).toBeNull();
  });
});

describe('Card component', () => {
  it('renders face-down card when faceDown is true', () => {
    render(<Card faceDown />);
    expect(screen.getByTitle('Face-down card')).toBeTruthy();
  });

  it('renders face-down card when no card data is provided', () => {
    render(<Card />);
    expect(screen.getByTitle('Face-down card')).toBeTruthy();
  });

  it('renders face-up card with rank and suit', () => {
    render(<Card card={{ rank: 14, suit: 'spades' }} />);
    // Should show rank label "A" and suit symbol "♠"
    expect(screen.getByTitle('A of spades')).toBeTruthy();
  });

  it('renders as a button when playable', () => {
    const onClick = vi.fn();
    render(<Card card={{ rank: 5, suit: 'hearts' }} playable onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Play 5 of hearts' });
    expect(button).toBeTruthy();
  });

  it('calls onClick when playable card is clicked', async () => {
    const onClick = vi.fn();
    render(<Card card={{ rank: 10, suit: 'diamonds' }} playable onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'Play 10 of diamonds' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders as a div (not button) when not playable', () => {
    render(<Card card={{ rank: 3, suit: 'clubs' }} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByTitle('3 of clubs')).toBeTruthy();
  });

  it('shows point value badge when pointValue is provided', () => {
    const { container } = render(<Card card={{ rank: 5, suit: 'hearts' }} pointValue={5} />);
    // Point badge has bg-yellow-400 class and displays the value
    const badge = container.querySelector('.bg-yellow-400');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe('5');
  });

  it('does not show point badge when pointValue is 0 or null', () => {
    const { container } = render(<Card card={{ rank: 3, suit: 'hearts' }} pointValue={0} />);
    // Point badges have bg-yellow-400 class — none should be present
    expect(container.querySelector('.bg-yellow-400')).toBeNull();
  });
});
