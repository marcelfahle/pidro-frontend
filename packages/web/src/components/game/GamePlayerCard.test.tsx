import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GamePlayerCard } from './GamePlayerCard';

describe('GamePlayerCard', () => {
  it('renders name and status in the pill', () => {
    render(
      <GamePlayerCard displayName="ThunderThor88" statusText="Bet 9" initial="T" team="them" />,
    );
    expect(screen.getByText('ThunderThor88')).toBeTruthy();
    expect(screen.getByText('Bet 9')).toBeTruthy();
  });

  it('labels bot seats as Bot', () => {
    render(
      <GamePlayerCard
        displayName="whatever"
        statusText="Waiting"
        initial="W"
        seatStatus="bot_substitute"
      />,
    );
    expect(screen.getByText('Bot')).toBeTruthy();
  });

  it('wears the level chip when rank is provided', () => {
    render(
      <GamePlayerCard
        displayName="Astrid"
        statusText="Ready"
        initial="A"
        rank={{ level: 24, tier: 'silver', prestige: 1 }}
      />,
    );
    expect(screen.getByText('24')).toBeTruthy();
    expect(screen.getByText('★1')).toBeTruthy();
  });

  it('pins the dealer coin when isDealer', () => {
    render(<GamePlayerCard displayName="Bo" statusText="Ready" initial="B" isDealer />);
    expect(screen.getByRole('img', { name: 'Dealer' })).toBeTruthy();
  });

  it('renders bare mode without the pill box but with name, status and dealer coin', () => {
    const { container } = render(
      <GamePlayerCard
        displayName="Elsa"
        statusText="Turn"
        initial="E"
        bare
        isDealer
        isCurrentTurn
      />,
    );
    expect(screen.getByText('Elsa')).toBeTruthy();
    expect(screen.getByText('Turn')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Dealer' })).toBeTruthy();
    // No pill: nothing with the pill's solid background should render.
    const pill = [...container.querySelectorAll('div')].find(
      (el) => el.style.background === 'rgba(10, 32, 60, 0.92)',
    );
    expect(pill).toBeUndefined();
  });
});
