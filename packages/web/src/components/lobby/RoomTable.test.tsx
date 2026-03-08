import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RoomTable } from './RoomTable';

describe('RoomTable', () => {
  it('shows skeleton rows when loading', () => {
    const { container } = render(
      <RoomTable
        rooms={[]}
        onAction={vi.fn()}
        actionLoadingCode={null}
        actionError={null}
        loading={true}
      />,
    );

    const skeletonRows = container.querySelectorAll('.animate-pulse');
    expect(skeletonRows.length).toBe(3);
  });

  it('shows empty state after loading completes with no rooms', () => {
    render(
      <RoomTable
        rooms={[]}
        onAction={vi.fn()}
        actionLoadingCode={null}
        actionError={null}
        loading={false}
      />,
    );

    expect(screen.getByText('No games available. Create one!')).toBeTruthy();
  });

  it('shows rooms after loading completes', () => {
    render(
      <RoomTable
        rooms={[
          {
            code: 'TEST1',
            name: 'Test Game',
            status: 'waiting',
            player_count: 2,
            max_players: 4,
            available_positions: ['east', 'west'],
          } as never,
        ]}
        onAction={vi.fn()}
        actionLoadingCode={null}
        actionError={null}
        loading={false}
      />,
    );

    expect(screen.getByText('Test Game')).toBeTruthy();
  });
});
