import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Lives in the table's existing utility space, independent of transient notices. */
export function WatchingBadge() {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="none"
      className="absolute inset-x-0 z-50 items-center"
      style={{ bottom: insets.bottom + 12 }}>
      <View
        accessible
        accessibilityLabel="Watching. You are a spectator, not seated."
        accessibilityLiveRegion="polite"
        className="flex-row items-center gap-2 rounded-full border border-cyan-300/40 bg-slate-900 px-4 py-2">
        <Feather name="eye" size={18} color="#a5f3fc" />
        <Text className="text-sm font-bold text-cyan-100">Watching</Text>
        <Text className="text-xs text-slate-300">· Not seated</Text>
      </View>
    </View>
  );
}
