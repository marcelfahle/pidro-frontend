import { useRef, useState } from 'react';
import { Modal, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import type { Invite } from '@pidro/shared';
import { invitesApi } from '@/api/invites';
import { BevelButton } from '@/components/ui/BevelButton';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { invitePlatform } from '@/features/invites/platform';
import { inviteShareMessage } from '@/features/invites/hostControls';
import { useTranslation, type TranslationKey } from '@/i18n';
import { localizedError } from '@/utils/apiErrors';

interface Props {
  roomCode: string;
  onClose: () => void;
  fixture?: Invite;
}

/** One link to the table, without reserving a seat. */
export function InviteLinkModal({ roomCode, onClose, fixture }: Props) {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const [invite, setInvite] = useState<Invite | null>(fixture ?? null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<{ cause: unknown; fallback: TranslationKey } | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const started = useRef(false);

  const run = async (action: () => Promise<void>, fallback: TranslationKey) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      setError({ cause, fallback });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const mint = () =>
    run(async () => {
      setInvite(await invitesApi.mint(roomCode, { platform: invitePlatform() }));
    }, 'invite.host.createError');

  return (
    <Modal
      visible
      transparent
      navigationBarTranslucent
      statusBarTranslucent
      onShow={() => {
        if (!fixture && !started.current) {
          started.current = true;
          void mint();
        }
      }}
      supportedOrientations={['portrait', 'landscape']}
      onRequestClose={() => {
        if (!busy) onClose();
      }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.backdrop}>
          <DecisionWindow
            testID="invite-window"
            title={t('new_table.share')}
            scrollable
            style={styles.window}>
            <View style={styles.section}>
              {invite ? (
                <>
                  <Surface variant="subtle" padded style={styles.linkCard}>
                    <View accessible accessibilityLabel={t('invite.host.qrLabel')}>
                      <QRCode
                        value={invite.url}
                        size={height < 500 ? 116 : 164}
                        color={PidroColors.ink}
                        backgroundColor={PidroColors.text}
                      />
                    </View>
                    <PidroText role="metadata" tone="soft" align="center" selectable>
                      {invite.url}
                    </PidroText>
                  </Surface>
                  <View style={styles.row}>
                    <BevelButton
                      label={t('invite.host.share')}
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          await Share.share({ message: inviteShareMessage(invite) });
                        }, 'invite.host.shareError')
                      }
                      style={styles.rowButton}
                    />
                    <BevelButton
                      label={t('invite.host.copy')}
                      material="glass"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          await Clipboard.setStringAsync(invite.url);
                          setNotice('invite.host.copied');
                        }, 'invite.host.copyError')
                      }
                      style={styles.rowButton}
                    />
                  </View>
                  <View style={styles.row}>
                    <BevelButton
                      label={t('invite.host.regenerate')}
                      material="glass"
                      size="sm"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          setInvite(await invitesApi.regenerate(invite.code));
                        }, 'invite.host.regenerateError')
                      }
                      style={styles.rowButton}
                    />
                    <BevelButton
                      label={t('invite.host.revoke')}
                      material="glass"
                      tone="danger"
                      size="sm"
                      disabled={busy}
                      onPress={() =>
                        void run(async () => {
                          await invitesApi.revoke(invite.code);
                          setInvite(null);
                          setNotice('invite.host.revoked');
                        }, 'invite.host.revokeError')
                      }
                      style={styles.rowButton}
                    />
                  </View>
                </>
              ) : (
                <BevelButton
                  label={t('invite.host.create')}
                  loading={busy}
                  onPress={() => void mint()}
                />
              )}
              {notice ? (
                <PidroText role="metadata" tone="cyan" accessibilityLiveRegion="polite">
                  {t(notice)}
                </PidroText>
              ) : null}
              {error ? (
                <PidroText role="metadata" tone="danger" accessibilityRole="alert">
                  {localizedError(error.cause, error.fallback)}
                </PidroText>
              ) : null}
              <BevelButton
                label={t('invite.host.done')}
                material="glass"
                disabled={busy}
                onPress={onClose}
              />
            </View>
          </DecisionWindow>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.backdrop,
    padding: PidroSpacing.md,
  },
  window: { maxWidth: 520 },
  section: { gap: PidroSpacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: PidroSpacing.sm },
  rowButton: { minWidth: 128, flex: 1 },
  linkCard: { alignItems: 'center', gap: PidroSpacing.sm },
});
