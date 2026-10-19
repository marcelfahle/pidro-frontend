import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { localizedError, publicPlayerName, type ProfileIdentity } from '@pidro/shared';
import { profileApi } from '@/api/profile';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { blockPlayer } from '@/stores/friends';
import { useTranslation } from '@/i18n';

interface PlayerProfileProps {
  playerId: string | null;
  onClose: () => void;
  hideActions?: boolean;
  fixture?: ProfileIdentity;
}

export function PlayerProfileModal({
  playerId,
  onClose,
  hideActions,
  fixture,
}: PlayerProfileProps) {
  return playerId ? (
    <PlayerProfileContent
      key={playerId}
      playerId={playerId}
      onClose={onClose}
      hideActions={hideActions}
      fixture={__DEV__ ? fixture : undefined}
    />
  ) : null;
}

function PlayerProfileContent({ playerId, onClose, hideActions, fixture }: PlayerProfileProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<ProfileIdentity | null>(fixture ?? null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const canBlock = !hideActions && !!user && !user.guest && user.id !== playerId;
  const confirming = confirm && canBlock;
  useEffect(() => {
    if (fixture) return;
    let active = true;
    if (playerId) {
      profileApi
        .getPlayer(playerId)
        .then((identity) => {
          if (active) setProfile(identity);
        })
        .catch((error) => {
          if (active) setError(error ?? true);
        });
    }
    return () => {
      active = false;
    };
  }, [playerId, attempt, fixture]);

  return (
    <Modal
      isOpen={!!playerId}
      title={t('profile.player_title')}
      onClose={onClose}
      dismissible={!busy}
      scrollable
      testID="player-profile-modal">
      <View style={styles.content}>
        {error ? (
          <View style={styles.content}>
            <PidroText role="body" tone="danger">
              {localizedError(error, 'profile.player_error')}
            </PidroText>
            <BevelButton
              label={t('profile.retry')}
              onPress={() => {
                setError(null);
                setAttempt(attempt + 1);
              }}
            />
          </View>
        ) : !profile || profile.user_id !== playerId ? (
          <PidroText role="body" tone="soft" align="center">
            {t('profile.loading')}
          </PidroText>
        ) : (
          <View style={styles.content}>
            {!confirming ? (
              <>
                <PlayerAvatar uri={profile.avatar_url} size={80} style={styles.avatar} />
                <PidroText role="label" align="center">
                  {publicPlayerName(profile.username, t('social.player'), profile.display_name)}
                </PidroText>
                <PidroText role="label">{t('profile.about')}</PidroText>
                <PidroText role="body" tone={profile.bio ? 'default' : 'muted'}>
                  {profile.bio || t('profile.no_bio')}
                </PidroText>
              </>
            ) : null}
            {confirming ? (
              <>
                <PidroText role="body">
                  {t('blocks.confirm', {
                    name: publicPlayerName(
                      profile.username,
                      t('social.player'),
                      profile.display_name
                    ),
                  })}
                </PidroText>
                {actionError ? (
                  <PidroText role="body" tone="danger" accessibilityRole="alert">
                    {localizedError(actionError, 'blocks.block_failed')}
                  </PidroText>
                ) : null}
                <BevelButton
                  label={t('blocks.block')}
                  loading={busy}
                  onPress={async () => {
                    setBusy(true);
                    setActionError(null);
                    try {
                      if (!fixture) await blockPlayer(profile.user_id);
                      onClose();
                    } catch (error) {
                      setActionError(error ?? true);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <BevelButton
                  label={t('common.cancel')}
                  material="glass"
                  disabled={busy}
                  onPress={() => {
                    setConfirm(false);
                    setActionError(null);
                  }}
                />
              </>
            ) : (
              <>
                {canBlock ? (
                  <BevelButton
                    label={t('blocks.block')}
                    material="glass"
                    onPress={() => setConfirm(true)}
                  />
                ) : null}
              </>
            )}
          </View>
        )}
      </View>
      {!confirming ? (
        <BevelButton
          label={t('profile.close')}
          material="glass"
          disabled={busy}
          onPress={onClose}
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: PidroSpacing.sm },
  avatar: { alignSelf: 'center' },
});
