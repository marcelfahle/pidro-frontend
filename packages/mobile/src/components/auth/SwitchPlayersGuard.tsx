import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';

/**
 * A guest who signs into another account leaves their guest behind, so every
 * way of doing that asks first. `guard(action)` runs the action straight away
 * for anyone else; for a guest it holds the action until they confirm.
 */
export function useSwitchPlayersGuard(
  description = 'Guest results do not merge into a different account. Cancel to keep playing with this guest.'
) {
  const guest = useAuthStore((state) => state.user?.guest === true);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const guard = useCallback(
    (action: () => void) => {
      if (guest) setPending(() => action);
      else action();
    },
    [guest]
  );

  const cancel = () => setPending(null);
  const modal = (
    <Modal
      isOpen={pending !== null}
      title="Switch players?"
      description={description}
      onClose={cancel}>
      <View style={styles.actions}>
        <BevelButton label="Cancel" material="glass" size="sm" fullWidth onPress={cancel} />
        <BevelButton
          label="Switch account"
          material="wood"
          size="sm"
          fullWidth
          onPress={() => {
            const action = pending;
            setPending(null);
            action?.();
          }}
        />
      </View>
    </Modal>
  );

  return { guard, modal };
}

const styles = StyleSheet.create({
  actions: {
    gap: PidroSpacing.xs,
  },
});
