import { useEffect } from 'react';
import { Slot } from 'expo-router';

export default function GameLayout() {
  console.log('[GameLayout] RENDER');

  useEffect(() => {
    console.log('[GameLayout] MOUNT');
    return () => {
      console.log('[GameLayout] UNMOUNT');
    };
  }, []);

  // Use Slot instead of nested Stack to avoid double-navigation issues
  // The parent layout already handles the modal presentation
  return <Slot />;
}
