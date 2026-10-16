import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';
import type { FriendPlayer } from '@pidro/shared';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { PressableFX } from '@/components/ui/PressableFX';
import { TextLink } from '@/components/ui/TextLink';
import { PidroBevel, PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import { presenceLabel } from '@/features/friends';
import { findFriends } from '@/features/lobby/newTable';
import { refreshFriends, useFriendsStore } from '@/stores/friends';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from '@/i18n';
import { localizedError } from '@/utils/apiErrors';

interface Props {
  title: string;
  selectedId?: string;
  unavailableIds?: string[];
  fixtureFriends?: FriendPlayer[];
  onInvite: (friend: FriendPlayer) => void | Promise<void>;
  onShare: () => void | Promise<void>;
  onClose: () => void;
  onAddFriends: () => void;
}

export function FriendSeatSheet({
  title,
  selectedId,
  unavailableIds = [],
  fixtureFriends,
  onInvite,
  onShare,
  onClose,
  onAddFriends,
}: Props) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const user = useAuthStore((state) => state.user);
  const store = useFriendsStore();
  const friends = fixtureFriends ?? (user?.guest ? [] : store.friends);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState(selectedId);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<unknown>(null);
  const [handoff, setHandoff] = useState<'share' | 'friends' | null>(null);
  const pendingHandoff = useRef<'share' | 'friends' | null>(null);
  const finishHandoff = () => {
    const action = pendingHandoff.current;
    pendingHandoff.current = null;
    if (action === 'share') void onShare();
    if (action === 'friends') onAddFriends();
  };
  useEffect(() => {
    if (handoff && Platform.OS !== 'ios') finishHandoff();
  });
  const selected = friends.find(
    (friend) => friend.user_id === picked && !unavailableIds.includes(friend.user_id)
  );
  const loading = fixtureFriends === undefined && !user?.guest && store.isLoading;
  const loadError = fixtureFriends === undefined && !user?.guest ? store.error : null;

  useEffect(() => {
    if (fixtureFriends === undefined && user && !user.guest)
      void refreshFriends().catch(() => undefined);
  }, [fixtureFriends, user]);

  const run = async (action: () => void | Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <Modal
      transparent
      visible={!handoff}
      onDismiss={finishHandoff}
      supportedOrientations={['portrait', 'landscape']}
      animationType={reduceMotion ? 'none' : 'slide'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.safe} edges={['top', 'right', 'bottom', 'left']}>
          <Pressable
            accessibilityLabel={t('common.cancel')}
            style={StyleSheet.absoluteFill}
            disabled={busy}
            onPress={onClose}
          />
          <KeyboardAvoidingView
            style={styles.keyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View testID="friend-seat-sheet" style={styles.sheet}>
              <View style={styles.grabber} />
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled">
                <PidroText role="title" tone="gold">
                  {title}
                </PidroText>
                <PidroText role="metadata" tone="soft">
                  {t('seat_friend.help')}
                </PidroText>
                {friends.length > 0 ? (
                  <Input
                    accessibilityLabel={t('seat_friend.find')}
                    placeholder={t('seat_friend.find')}
                    value={query}
                    onChangeText={setQuery}
                    editable={!busy}
                  />
                ) : null}
                {loading ? (
                  <ActivityIndicator
                    color={PidroColors.cyanText}
                    accessibilityLabel={t('common.loading')}
                  />
                ) : null}
                {loadError ? (
                  <>
                    <PidroText role="body" tone="danger" accessibilityRole="alert">
                      {localizedError(loadError, 'friends.update_failed')}
                    </PidroText>
                    <TextLink
                      label={t('common.tryAgain')}
                      onPress={() => {
                        void refreshFriends().catch(() => undefined);
                      }}
                    />
                  </>
                ) : !loading && friends.length === 0 ? (
                  <PidroText role="body">{t('seat_friend.empty')}</PidroText>
                ) : null}
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={t('social.friends')}
                  style={styles.list}>
                  {findFriends(friends, query).map((friend) => {
                    const unavailable = unavailableIds.includes(friend.user_id);
                    const status = unavailable
                      ? t('seat_friend.assigned')
                      : presenceLabel(friend.presence);
                    return (
                      <PressableFX
                        key={friend.user_id}
                        accessibilityRole="radio"
                        accessibilityLabel={`${friend.display_name}, ${status}`}
                        accessibilityState={{
                          checked: picked === friend.user_id,
                          disabled: busy || unavailable,
                        }}
                        aria-checked={picked === friend.user_id}
                        disabled={busy || unavailable}
                        onPress={() => setPicked(friend.user_id)}
                        style={[
                          styles.friend,
                          picked === friend.user_id && styles.selected,
                          unavailable && styles.dimmed,
                        ]}>
                        <View style={friend.presence === 'offline' && styles.dimmed}>
                          <PlayerAvatar size={40} uri={friend.avatar_url} />
                          {friend.presence !== 'offline' ? <View style={styles.dot} /> : null}
                        </View>
                        <View style={styles.name}>
                          <PidroText role="label" numberOfLines={2}>
                            {friend.display_name}
                          </PidroText>
                          <PidroText role="metadata" tone="soft">
                            {status}
                          </PidroText>
                        </View>
                        <View
                          style={[styles.radio, picked === friend.user_id && styles.selectedRadio]}
                        />
                      </PressableFX>
                    );
                  })}
                </View>
                {friends.length > 0 && findFriends(friends, query).length === 0 ? (
                  <PidroText role="body">{t('friends.no_results')}</PidroText>
                ) : null}
                {error ? (
                  <PidroText role="body" tone="danger" accessibilityRole="alert">
                    {localizedError(error, 'seat_friend.failed')}
                  </PidroText>
                ) : null}
                {friends.length > 0 ? (
                  <BevelButton
                    label={
                      selected
                        ? t('seat_friend.invite', { name: selected.display_name })
                        : t('seat_friend.choose')
                    }
                    fullWidth
                    disabled={!selected || busy}
                    loading={busy}
                    onPress={() => {
                      if (selected) void run(() => onInvite(selected));
                    }}
                  />
                ) : null}
                <BevelButton
                  label={t('seat_friend.share')}
                  material={friends.length > 0 ? 'glass' : 'wood'}
                  fullWidth
                  disabled={busy}
                  onPress={() => {
                    pendingHandoff.current = 'share';
                    setHandoff('share');
                  }}
                />
                {friends.length === 0 && !loading && !loadError ? (
                  <TextLink
                    label={t('seat_friend.add')}
                    onPress={() => {
                      pendingHandoff.current = 'friends';
                      setHandoff('friends');
                    }}
                    disabled={busy}
                  />
                ) : null}
                <TextLink label={t('common.cancel')} onPress={onClose} disabled={busy} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, justifyContent: 'flex-end', backgroundColor: PidroColors.backdrop },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '100%',
    flexShrink: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: PidroRadii.lg,
    borderTopRightRadius: PidroRadii.lg,
    borderWidth: 1,
    borderColor: PidroColors.cyanBorderStrong,
    backgroundColor: PidroBevel.panelMid,
    padding: PidroSpacing.md,
    gap: PidroSpacing.sm,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    backgroundColor: PidroColors.borderStrong,
  },
  scroll: { flexShrink: 1 },
  content: { gap: PidroSpacing.sm },
  list: { gap: PidroSpacing.xs },
  friend: {
    minHeight: 56,
    padding: PidroSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    borderWidth: 1,
    borderColor: PidroColors.border,
    borderRadius: PidroRadii.panel,
    backgroundColor: PidroColors.panel,
  },
  selected: { borderColor: PidroBevel.rim, backgroundColor: PidroColors.choiceOn },
  name: { flex: 1, minWidth: 0 },
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PidroColors.success,
  },
  dimmed: { opacity: 0.55 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: PidroColors.borderStrong,
  },
  selectedRadio: { borderColor: PidroBevel.rim, backgroundColor: PidroBevel.textGold },
});
