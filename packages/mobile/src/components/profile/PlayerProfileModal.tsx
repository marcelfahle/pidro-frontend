import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { localizedError, publicPlayerName, type ProfileIdentity } from '@pidro/shared';
import { profileApi } from '@/api/profile';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSpacing } from '@/design/tokens';
import { useTranslation } from '@/i18n';

interface PlayerProfileProps {
  playerId: string | null;
  onClose: () => void;
  onRemove?: () => Promise<void>;
  fixture?: ProfileIdentity;
}

export function PlayerProfileModal({ playerId, onClose, onRemove, fixture }: PlayerProfileProps) {
  return playerId ? (
    <PlayerProfileContent
      key={playerId}
      playerId={playerId}
      onClose={onClose}
      onRemove={onRemove}
      fixture={__DEV__ ? fixture : undefined}
    />
  ) : null;
}

function PlayerProfileContent({ playerId, onClose, onRemove, fixture }: PlayerProfileProps) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileIdentity | null>(fixture ?? null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<unknown>(null);
  const confirming = confirm && !!onRemove;
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
      dismissible={!removing}
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
                setError(false);
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
            {onRemove ? (
              confirming ? (
                <>
                  <PidroText role="body">
                    {t('friends.remove_confirm', {
                      name: publicPlayerName(
                        profile.username,
                        t('social.player'),
                        profile.display_name
                      ),
                    })}
                  </PidroText>
                  {removeError ? (
                    <PidroText role="body" tone="danger" accessibilityRole="alert">
                      {localizedError(removeError, 'friends.remove_failed')}
                    </PidroText>
                  ) : null}
                  <BevelButton
                    label={t('friends.remove')}
                    loading={removing}
                    onPress={async () => {
                      setRemoving(true);
                      setRemoveError(false);
                      try {
                        await onRemove();
                      } catch (error) {
                        setRemoveError(error ?? true);
                      } finally {
                        setRemoving(false);
                      }
                    }}
                  />
                  <BevelButton
                    label={t('common.cancel')}
                    material="glass"
                    disabled={removing}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <BevelButton
                  label={t('friends.remove')}
                  material="glass"
                  onPress={() => setConfirm(true)}
                />
              )
            ) : null}
          </View>
        )}
      </View>
      {!confirming ? (
        <BevelButton
          label={t('profile.close')}
          material="glass"
          disabled={removing}
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
