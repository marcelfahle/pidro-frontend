import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorialPage } from './TutorialPage';

const mockUseAuthStore = vi.fn();
vi.mock('../stores/auth', () => ({
  useAuthStore: (selector: (state: Record<string, unknown>) => unknown) =>
    mockUseAuthStore(selector),
}));

function renderTutorial() {
  return render(
    <MemoryRouter initialEntries={['/tutorial']}>
      <TutorialPage />
    </MemoryRouter>,
  );
}

function clickNext() {
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
}

/** Walk from the welcome step to the bidding step (step 3). */
function advanceToBidding() {
  clickNext(); // welcome -> deal
  clickNext(); // deal -> bidding
}

describe('TutorialPage', () => {
  beforeEach(() => {
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ status: 'unauthenticated' }),
    );
  });

  it('renders the welcome step with team and target-score rules', () => {
    renderTutorial();

    expect(screen.getByText('Welcome to Pidro')).toBeTruthy();
    expect(screen.getByText('four players in two teams')).toBeTruthy();
    expect(screen.getByText('62 points')).toBeTruthy();
  });

  it('walks forward and back through the informational steps', () => {
    renderTutorial();

    clickNext();
    expect(screen.getByText('The Deal')).toBeTruthy();
    expect(screen.getByText('nine cards')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Welcome to Pidro')).toBeTruthy();
  });

  it('blocks the bidding step until a bid is placed', () => {
    renderTutorial();
    advanceToBidding();

    expect(screen.getByText('Bidding')).toBeTruthy();
    // Next is replaced by a disabled action prompt.
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    // Passing nudges the player toward bidding instead of advancing.
    fireEvent.click(screen.getByRole('button', { name: 'Pass' }));
    expect(screen.getByText(/too good to waste/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '9' }));
    expect(screen.getByText(/You bid 9/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('requires picking hearts as trump and explains why other suits are weak', () => {
    renderTutorial();
    advanceToBidding();
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    clickNext(); // bidding -> trump

    expect(screen.getByText('Call Trump')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /spades/i }));
    expect(screen.getByText(/Hearts is your power suit/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /hearts/i }));
    expect(screen.getByText(/Every heart is now a trump card/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('teaches the trick step by requiring the ace', () => {
    renderTutorial();
    advanceToBidding();
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    clickNext(); // -> trump
    fireEvent.click(screen.getByRole('button', { name: /hearts/i }));
    clickNext(); // -> fives
    clickNext(); // -> discard
    fireEvent.click(screen.getByRole('button', { name: 'Toss the junk' }));
    clickNext(); // -> tricks

    expect(screen.getByText('Play Tricks')).toBeTruthy();

    // Playing a losing card shows a hint and does not advance.
    fireEvent.click(screen.getByRole('button', { name: 'Play Q of hearts' }));
    expect(screen.getByText(/only your Ace beats it/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Play A of hearts' }));
    expect(screen.getByText(/Your Ace takes the trick/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
  });

  it('ends with a signup call-to-action for logged-out players', () => {
    renderTutorial();
    advanceToBidding();
    fireEvent.click(screen.getByRole('button', { name: '9' }));
    clickNext(); // -> trump
    fireEvent.click(screen.getByRole('button', { name: /hearts/i }));
    clickNext(); // -> fives
    clickNext(); // -> discard
    clickNext(); // -> tricks
    fireEvent.click(screen.getByRole('button', { name: 'Play A of hearts' }));
    clickNext(); // -> points
    clickNext(); // -> scoring
    expect(screen.getByText(/took 4 → −9/)).toBeTruthy();
    clickNext(); // -> ready

    expect(screen.getByText("You're Ready")).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeTruthy();
  });

  it('offers Play Now when the player is signed in', () => {
    mockUseAuthStore.mockImplementation((selector: (state: Record<string, unknown>) => unknown) =>
      selector({ status: 'authenticated' }),
    );

    renderTutorial();
    // Jump through every step; gated steps get their required actions.
    advanceToBidding();
    fireEvent.click(screen.getByRole('button', { name: '14' }));
    clickNext();
    fireEvent.click(screen.getByRole('button', { name: /hearts/i }));
    clickNext();
    clickNext();
    clickNext();
    fireEvent.click(screen.getByRole('button', { name: 'Play A of hearts' }));
    clickNext();
    clickNext();
    clickNext();

    expect(screen.getByRole('button', { name: 'Play Now' })).toBeTruthy();
  });
});
