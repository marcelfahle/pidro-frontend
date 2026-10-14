import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { deleteAccount } from '@/api/auth';
import type { ClassicProfile } from '@/api/profile';
import { AuthSheet } from '@/components/auth/AuthSheet';
import { BevelButton } from '@/components/ui/BevelButton';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import { useProfileIdentity } from '@/hooks/useProfileIdentity';
import { useAuthStore } from '@/stores/auth';
import { apiErrorInfo } from '@/utils/apiErrors';

/** The signed-in player's email, Sign out and Delete account. */
export function AccountSection() {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();
  const refreshIdentity = useProfileIdentity();
  const [busy, setBusy] = useState(false);
  const deleteInFlight = useRef(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pendingSignOut, setPendingSignOut] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [classic, setClassic] = useState<ClassicProfile | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    description: string;
    label: string;
    cancelLabel?: string;
    secondaryLabel?: string;
    secondary?: () => void;
    proceed: () => void;
  } | null>(null);

  usePreventRemove(busy, () => {
    setConfirmation({
      title: 'Please wait',
      description: 'Your account is being deleted.',
      label: 'OK',
      proceed: () => {},
    });
  });

  useEffect(() => {
    if (!pendingSignOut || busy) return;
    clearSession();
    router.replace('/welcome');
  }, [pendingSignOut, busy, clearSession, router]);

  useFocusEffect(
    useCallback(() => {
      void refreshIdentity()
        .then((identity) => {
          if (identity) setClassic(identity.classic ?? null);
        })
        .catch(() => {});
    }, [refreshIdentity])
  );

  const handleSignOut = () => {
    if (user?.guest) {
      setConfirmation({
        title: 'Save this guest before signing out?',
        description:
          'Signing out removes access to this unsaved player on this device. Inactive guest accounts are eligible for deletion after 30 days.',
        label: 'Sign out anyway',
        cancelLabel: 'Cancel',
        secondaryLabel: 'Save account',
        secondary: () => setAccountSheetOpen(true),
        proceed: () => setPendingSignOut(true),
      });
      return;
    }
    setConfirmation({
      title: 'Sign out?',
      description: 'You can sign back in anytime.',
      label: 'Sign out',
      cancelLabel: 'Cancel',
      proceed: () => setPendingSignOut(true),
    });
  };

  const handleDeleteAccount = () => {
    setDeleteError(null);
    setConfirmation({
      title: 'Delete your account?',
      description:
        'This removes your player, your games and your progress.' +
        (classic ? ' Your Classic account stays in Classic and can be claimed again later.' : ''),
      label: 'Delete account',
      cancelLabel: 'Cancel',
      proceed: async () => {
        if (deleteInFlight.current) return;
        deleteInFlight.current = true;
        setBusy(true);
        try {
          await deleteAccount();
          setPendingSignOut(true);
        } catch (deleteFailure) {
          setDeleteError(
            apiErrorInfo(deleteFailure).detail || 'Could not delete your account. Try again.'
          );
        } finally {
          deleteInFlight.current = false;
          setBusy(false);
        }
      },
    });
  };

  return (
    <>
      <Surface variant="window" style={styles.panel} padded testID="settings-account">
        <View style={styles.heading}>
          <PidroText role="label">Account</PidroText>
          <PidroText role="metadata" tone="muted">
            {user?.email ?? (user?.guest ? 'Guest, not saved yet' : 'Signed in')}
          </PidroText>
        </View>
        <BevelButton
          label="Sign out"
          material="glass"
          size="sm"
          fullWidth
          disabled={busy}
          onPress={handleSignOut}
        />
        <BevelButton
          label="Delete account"
          material="glass"
          tone="danger"
          size="sm"
          fullWidth
          disabled={busy}
          onPress={handleDeleteAccount}
        />
        {deleteError ? (
          <PidroText role="metadata" tone="danger" align="center" accessibilityRole="alert">
            {deleteError}
          </PidroText>
        ) : null}
      </Surface>
      <Modal
        isOpen={!!confirmation}
        title={confirmation?.title}
        description={confirmation?.description}
        onClose={() => setConfirmation(null)}>
        {confirmation && (
          <View className="gap-2">
            {confirmation.cancelLabel && (
              <Button
                label={confirmation.cancelLabel}
                variant="outline"
                onPress={() => setConfirmation(null)}
              />
            )}
            {confirmation.secondaryLabel && confirmation.secondary ? (
              <BevelButton
                label={confirmation.secondaryLabel}
                material="wood"
                size="sm"
                fullWidth
                onPress={() => {
                  const secondary = confirmation.secondary;
                  setConfirmation(null);
                  secondary?.();
                }}
              />
            ) : null}
            <Button
              label={confirmation.label}
              variant={confirmation.cancelLabel ? 'destructive' : 'outline'}
              onPress={() => {
                const proceed = confirmation.proceed;
                setConfirmation(null);
                proceed();
              }}
            />
          </View>
        )}
      </Modal>
      <AuthSheet
        isOpen={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        showClaimClassic={!classic}
        onClaimClassic={() => {
          setAccountSheetOpen(false);
          router.push('/(auth)/claim-classic');
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  panel: { gap: PidroSpacing.sm },
  heading: { gap: PidroSpacing.xxs },
});
