import { useRef, useState } from 'react';
import { Modal, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import type { Invite, InviteSeatHint } from '@pidro/shared';
import { invitesApi } from '@/api/invites';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { invitePlatform } from '@/features/invites/platform';
import { t } from '@/i18n';

interface Props {
  isOpen: boolean;
  roomCode: string;
  onClose: () => void;
  fixture?: Invite;
}

export function InviteModal({ isOpen, roomCode, onClose, fixture }: Props) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const compact = height < 500;
  const qrSize = compact ? 116 : 164;
  const [invite, setInvite] = useState<Invite | null>(fixture ?? null);
  const [configuring, setConfiguring] = useState(!fixture);
  const [seatHint, setSeatHint] = useState<InviteSeatHint | null>('partner');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: () => Promise<void>, fallback: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (caught) {
      const detail = (caught as { response?: { data?: { errors?: { detail?: string }[] } } })
        ?.response?.data?.errors?.[0]?.detail;
      setError(detail ?? fallback);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const mint = () =>
    run(async () => {
      const created = await invitesApi.mint(roomCode, {
        seat_hint: seatHint,
        label: label.trim() || null,
        platform: invitePlatform(),
      });
      setInvite(created);
      setConfiguring(false);
    }, t('invite.host.createError'));

  const regenerate = () => {
    if (!invite) return;
    return run(async () => {
      setInvite(await invitesApi.regenerate(invite.code));
    }, t('invite.host.regenerateError'));
  };

  const revoke = () => {
    if (!invite) return;
    return run(async () => {
      await invitesApi.revoke(invite.code);
      setInvite(null);
      setConfiguring(true);
      setNotice(t('invite.host.revoked'));
    }, t('invite.host.revokeError'));
  };

  const share = () => {
    if (!invite) return;
    return run(async () => {
      await Share.share({ message: invite.share_text });
    }, t('invite.host.shareError'));
  };

  const copy = () => {
    if (!invite) return;
    return run(async () => {
      await Clipboard.setStringAsync(invite.url);
      setNotice(t('invite.host.copied'));
    }, t('invite.host.copyError'));
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busyRef.current) onClose();
      }}>
      <SafeAreaView style={styles.backdrop} edges={['top', 'right', 'bottom', 'left']}>
        <DecisionWindow
          testID="invite-window"
          title={t('invite.host.title')}
          description={compact ? undefined : t('invite.host.description')}
          scrollable
          compact={compact}
          style={[styles.window, { maxHeight: Math.max(300, height - PidroSpacing.md * 2) }]}
          footer={
            <Button
              label={t('invite.host.done')}
              variant="outline"
              onPress={onClose}
              disabled={busy}
              style={styles.footerButton}
            />
          }>
          {configuring ? (
            <View style={styles.section}>
              <Input
                label={t('invite.host.label')}
                placeholder={t('invite.host.labelPlaceholder')}
                value={label}
                onChangeText={setLabel}
                editable={!busy}
                maxLength={40}
              />
              <PidroText role="label">{t('invite.host.seat')}</PidroText>
              <View style={styles.row}>
                <Button
                  label={t('invite.host.partner')}
                  variant={seatHint === 'partner' ? 'secondary' : 'outline'}
                  onPress={() => setSeatHint('partner')}
                  disabled={busy}
                  style={styles.rowButton}
                />
                <Button
                  label={t('invite.host.anySeat')}
                  variant={seatHint === null ? 'secondary' : 'outline'}
                  onPress={() => setSeatHint(null)}
                  disabled={busy}
                  style={styles.rowButton}
                />
              </View>
              <Button
                label={invite ? t('invite.host.update') : t('invite.host.create')}
                onPress={mint}
                loading={busy}
              />
            </View>
          ) : null}

          {invite && !configuring ? (
            <View style={styles.section}>
              <Surface variant="subtle" padded style={styles.linkCard}>
                <View accessible accessibilityLabel={t('invite.host.qrLabel')}>
                  <QRCode
                    value={invite.url}
                    size={qrSize}
                    color={PidroColors.ink}
                    backgroundColor="#ffffff"
                  />
                </View>
                <PidroText role="metadata" tone="soft" align="center" selectable>
                  {invite.url}
                </PidroText>
              </Surface>
              <View style={styles.row}>
                <Button
                  label={t('invite.host.share')}
                  onPress={share}
                  disabled={busy}
                  style={styles.rowButton}
                />
                <Button
                  label={t('invite.host.copy')}
                  variant="secondary"
                  onPress={copy}
                  disabled={busy}
                  style={styles.rowButton}
                />
              </View>
              <Button
                label={t('invite.host.change')}
                variant="outline"
                onPress={() => {
                  setSeatHint(invite.seat_hint);
                  setLabel(invite.label ?? '');
                  setConfiguring(true);
                }}
                disabled={busy}
              />
              <View style={styles.row}>
                <Button
                  label={t('invite.host.regenerate')}
                  variant="outline"
                  onPress={regenerate}
                  loading={busy}
                  style={styles.rowButton}
                />
                <Button
                  label={t('invite.host.revoke')}
                  variant="destructive"
                  onPress={revoke}
                  disabled={busy}
                  style={styles.rowButton}
                />
              </View>
            </View>
          ) : null}

          {notice ? (
            <PidroText role="metadata" tone="cyan" accessibilityLiveRegion="polite">
              {notice}
            </PidroText>
          ) : null}
          {error ? (
            <PidroText role="metadata" tone="danger" accessibilityRole="alert">
              {error}
            </PidroText>
          ) : null}
        </DecisionWindow>
      </SafeAreaView>
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
  window: {
    maxWidth: 520,
  },
  section: {
    gap: PidroSpacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  rowButton: {
    minWidth: 128,
    flex: 1,
  },
  linkCard: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  footerButton: {
    minWidth: 120,
  },
});
