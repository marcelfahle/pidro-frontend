import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { publicPlayerName, type ProfileIdentity } from '@pidro/shared';
import { profileApi } from '@/api/profile';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { useTranslation } from '@/i18n';

export function PlayerProfileModal({
  playerId,
  onClose,
}: {
  playerId: string | null;
  onClose: () => void;
}) {
  return playerId ? (
    <PlayerProfileContent key={playerId} playerId={playerId} onClose={onClose} />
  ) : null;
}

function PlayerProfileContent({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<ProfileIdentity | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
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
  }, [playerId, attempt]);

  return (
    <Modal isOpen={!!playerId} title={t('profile.player_title')} onClose={onClose}>
      <ScrollView className="max-h-80" contentContainerClassName="gap-4">
        {error ? (
          <View className="gap-3">
            <PidroText role="body" tone="danger">
              {t('profile.player_error')}
            </PidroText>
            <Button
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
          <View className="gap-3">
            <Avatar
              uri={profile.avatar_url}
              // RN Web gives bundled fallback images intrinsic inline dimensions.
              style={{ width: 80, height: 80 }}
              className="self-center rounded-full"
              resizeMode="cover"
            />
            <PidroText role="label" align="center">
              {publicPlayerName(profile.username, t('social.player'), profile.display_name)}
            </PidroText>
            <PidroText role="label">{t('profile.about')}</PidroText>
            <PidroText role="body" className="break-words" tone={profile.bio ? 'default' : 'muted'}>
              {profile.bio || t('profile.no_bio')}
            </PidroText>
          </View>
        )}
      </ScrollView>
      <Button label={t('profile.close')} variant="outline" onPress={onClose} />
    </Modal>
  );
}
