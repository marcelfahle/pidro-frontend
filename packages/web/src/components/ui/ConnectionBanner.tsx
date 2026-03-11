import { useEffect, useRef, useState } from 'react';
import { Spinner } from './Spinner';

interface ConnectionBannerProps {
  /** Whether the channel is currently connected */
  isConnected: boolean;
}

/**
 * Shows a yellow "Reconnecting..." banner when disconnected and a brief
 * green "Reconnected!" banner when connection is restored. Auto-dismisses
 * the reconnected banner after 2 seconds.
 */
export function ConnectionBanner({ isConnected }: ConnectionBannerProps) {
  const [showReconnected, setShowReconnected] = useState(false);
  const hasConnectedRef = useRef(isConnected);
  const wasDisconnected = useRef(false);

  useEffect(() => {
    if (isConnected) {
      hasConnectedRef.current = true;
    }

    if (!isConnected) {
      if (!hasConnectedRef.current) {
        return;
      }

      wasDisconnected.current = true;
      setShowReconnected(false);
      return;
    }

    // Connection restored after being disconnected
    if (wasDisconnected.current) {
      wasDisconnected.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  if (!isConnected) {
    if (!hasConnectedRef.current) {
      return null;
    }

    return (
      <output className="flex items-center justify-center gap-2 bg-yellow-500 px-4 py-1.5 text-sm font-medium text-yellow-900 max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-50">
        <Spinner size="sm" />
        Reconnecting...
      </output>
    );
  }

  if (showReconnected) {
    return (
      <output className="flex items-center justify-center gap-2 bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white max-sm:fixed max-sm:inset-x-0 max-sm:top-0 max-sm:z-50">
        Reconnected!
      </output>
    );
  }

  return null;
}
