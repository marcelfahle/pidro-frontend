import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConnectionBanner } from './ConnectionBanner';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConnectionBanner', () => {
  it('renders nothing when connected and never disconnected', () => {
    const { container } = render(<ConnectionBanner isConnected={true} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing before the first successful connection', () => {
    render(<ConnectionBanner isConnected={false} />);
    expect(screen.queryByText('Reconnecting...')).toBeNull();
  });

  it('shows Reconnecting banner after a connected session disconnects', () => {
    const { rerender } = render(<ConnectionBanner isConnected={true} />);

    act(() => {
      rerender(<ConnectionBanner isConnected={false} />);
    });

    expect(screen.getByText('Reconnecting...')).toBeTruthy();
  });

  it('shows Reconnected banner after disconnection followed by reconnection', () => {
    const { rerender } = render(<ConnectionBanner isConnected={true} />);

    // Disconnect
    act(() => {
      rerender(<ConnectionBanner isConnected={false} />);
    });
    expect(screen.getByText('Reconnecting...')).toBeTruthy();

    // Reconnect
    act(() => {
      rerender(<ConnectionBanner isConnected={true} />);
    });
    expect(screen.getByText('Reconnected!')).toBeTruthy();
  });

  it('auto-hides Reconnected banner after 2 seconds', () => {
    const { rerender, container } = render(<ConnectionBanner isConnected={true} />);

    // Disconnect then reconnect
    act(() => {
      rerender(<ConnectionBanner isConnected={false} />);
    });
    act(() => {
      rerender(<ConnectionBanner isConnected={true} />);
    });
    expect(screen.getByText('Reconnected!')).toBeTruthy();

    // Fast-forward past the 2s auto-dismiss timer
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(container.textContent).not.toContain('Reconnected!');
  });
});
