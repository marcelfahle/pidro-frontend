import { Slot } from 'expo-router';

export default function GameLayout() {
  // Use Slot instead of nested Stack to avoid double-navigation issues
  // The parent layout already handles the modal presentation
  return <Slot />;
}
