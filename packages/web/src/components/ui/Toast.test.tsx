import { act, render, renderHook, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastContainer, useToast } from './Toast';

beforeEach(() => {
  vi.useFakeTimers();
});

describe('useToast', () => {
  it('adds a toast message and returns it in messages array', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Something went wrong', 'error');
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('Something went wrong');
    expect(result.current.messages[0].variant).toBe('error');
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast('Error 1', 'error');
      result.current.addToast('Error 2', 'error');
    });

    const firstId = result.current.messages[0].id;

    act(() => {
      result.current.dismissToast(firstId);
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].text).toBe('Error 2');
  });
});

describe('ToastContainer', () => {
  it('renders nothing when messages array is empty', () => {
    const { container } = render(<ToastContainer messages={[]} onDismiss={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders toast messages with correct text and role', () => {
    const messages = [{ id: '1', text: 'Card not in hand', variant: 'error' as const }];
    render(<ToastContainer messages={messages} onDismiss={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Card not in hand')).toBeTruthy();
  });

  it('auto-dismisses toast after duration', () => {
    const onDismiss = vi.fn();
    const messages = [{ id: 'toast-1', text: 'Test error', variant: 'error' as const }];
    render(<ToastContainer messages={messages} onDismiss={onDismiss} />);

    // Fast-forward past the default 3s duration + 200ms exit animation
    act(() => {
      vi.advanceTimersByTime(3200);
    });

    expect(onDismiss).toHaveBeenCalledWith('toast-1');
  });
});
