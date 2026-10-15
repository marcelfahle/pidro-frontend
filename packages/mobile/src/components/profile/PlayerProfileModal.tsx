import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { publicPlayerName, type ProfileIdentity } from '@pidro/shared';
import { profileApi } from '@/api/profile';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSpacing } from '@/design/tokens';

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
  const [profile, setProfile] = useState<ProfileIdentity | null>(fixture ?? null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState(false);
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
        .catch(() => {
          if (active) setError(true);
        });
    }
    return () => {
      active = false;
    };
  }, [playerId, attempt, fixture]);

  return (
    <Modal
      isOpen={!!playerId}
      title="Player profile"
      onClose={onClose}
      dismissible={!removing}
      scrollable
      testID="player-profile-modal">
      <View style={styles.content}>
        {error ? (
          <View style={styles.content}>
            <PidroText role="body" tone="danger">
              Could not load this player. Check your connection and try again.
            </PidroText>
            <BevelButton
              label="Retry"
              onPress={() => {
                setError(false);
                setAttempt(attempt + 1);
              }}
            />
          </View>
        ) : !profile || profile.user_id !== playerId ? (
          <PidroText role="body" tone="soft" align="center">
            Loading…
          </PidroText>
        ) : (
          <View style={styles.content}>
            {!confirming ? (
              <>
                <PlayerAvatar uri={profile.avatar_url} size={80} style={styles.avatar} />
                <PidroText role="label" align="center">
                  {publicPlayerName(profile.username, 'Player', profile.display_name)}
                </PidroText>
                <PidroText role="label">About me</PidroText>
                <PidroText role="body" tone={profile.bio ? 'default' : 'muted'}>
                  {profile.bio || 'No bio yet.'}
                </PidroText>
              </>
            ) : null}
            {onRemove ? (
              confirming ? (
                <>
                  <PidroText role="body">
                    Remove {publicPlayerName(profile.username, 'Player', profile.display_name)} as a
                    friend?
                  </PidroText>
                  {removeError ? (
                    <PidroText role="body" tone="danger" accessibilityRole="alert">
                      Could not remove this friend. Please try again.
                    </PidroText>
                  ) : null}
                  <BevelButton
                    label="Remove friend"
                    loading={removing}
                    onPress={async () => {
                      setRemoving(true);
                      setRemoveError(false);
                      try {
                        await onRemove();
                      } catch {
                        setRemoveError(true);
                      } finally {
                        setRemoving(false);
                      }
                    }}
                  />
                  <BevelButton
                    label="Cancel"
                    material="glass"
                    disabled={removing}
                    onPress={() => setConfirm(false)}
                  />
                </>
              ) : (
                <BevelButton
                  label="Remove friend"
                  material="glass"
                  onPress={() => setConfirm(true)}
                />
              )
            ) : null}
          </View>
        )}
      </View>
      {!confirming ? (
        <BevelButton label="Close" material="glass" disabled={removing} onPress={onClose} />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { gap: PidroSpacing.sm },
  avatar: { alignSelf: 'center' },
});
