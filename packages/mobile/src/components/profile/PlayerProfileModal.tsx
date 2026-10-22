import { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  localizedError,
  publicPlayerName,
  isBuiltinBot,
  builtinBotName,
  useGameStore,
  type BotPersona,
  type ProfileIdentity,
} from '@pidro/shared';
import { profileApi } from '@/api/profile';
import { FriendState } from '@/components/friends/FriendRow';
import { ActionPill } from '@/components/ui/ActionPill';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { botPersonas } from '@/components/ui/botPersonas';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSpacing } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { addFriend, blockPlayer } from '@/stores/friends';
import { useTranslation } from '@/i18n';
import { useBotProfile } from '@/features/bots';

interface PlayerProfileProps {
  playerId: string | null;
  persona?: BotPersona | null;
  onClose: () => void;
  hideActions?: boolean;
  /** Opened from their link: Add, or Sent once asked. */
  add?: 'add' | 'sent' | null;
  fixture?: ProfileIdentity;
}

export function PlayerProfileModal({
  playerId,
  persona,
  onClose,
  hideActions,
  add,
  fixture,
}: PlayerProfileProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const snapshot = useGameStore(
    (state) =>
      Object.values(state.playerMeta).find((seat) => seat.bot_persona === persona)?.bot_profile
  );
  const profile = useBotProfile(persona, snapshot);
  if (persona) {
    const bot = isBuiltinBot(persona) ? botPersonas[persona] : null;
    return (
      <Modal isOpen title={t('bots.title')} onClose={onClose} testID="bot-profile-modal">
        <View style={[styles.bot, width > height && styles.botLandscape]}>
          <PlayerAvatar
            kind="bot"
            persona={persona}
            botProfile={profile}
            size={104}
            style={styles.avatar}
          />
          <View style={styles.botCopy} testID="bot-profile-copy">
            <PidroText role="title" align="center">
              {profile?.name || builtinBotName(persona) || t('game.bot')}
            </PidroText>
            <PidroText role="body" align="center">
              {bot ? t(bot.play) : profile?.description}
            </PidroText>
            <PidroText role="body" tone="soft" align="center">
              {bot ? t(bot.saying) : null}
            </PidroText>
          </View>
        </View>
        <BevelButton label={t('profile.close')} material="glass" onPress={onClose} />
      </Modal>
    );
  }
  return playerId ? (
    <PlayerProfileContent
      key={playerId}
      playerId={playerId}
      onClose={onClose}
      hideActions={hideActions}
      add={add}
      fixture={__DEV__ ? fixture : undefined}
    />
  ) : null;
}

function PlayerProfileContent({
  playerId,
  onClose,
  hideActions,
  add,
  fixture,
}: PlayerProfileProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<ProfileIdentity | null>(fixture ?? null);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [added, setAdded] = useState<'sent' | 'friends' | null>(null);
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<unknown>(null);
  const offer = add ? (added ?? add) : null;
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
                {offer ? (
                  <View style={styles.offer}>
                    {offer === 'add' ? (
                      <ActionPill
                        label={t('friends.add')}
                        icon="person-plus"
                        accessibilityLabel={t('friends.add_player', {
                          name: publicPlayerName(
                            profile.username,
                            t('social.player'),
                            profile.display_name
                          ),
                        })}
                        loading={adding}
                        onPress={async () => {
                          if (adding) return;
                          setAdding(true);
                          setAddError(null);
                          try {
                            const lists = fixture ? undefined : await addFriend(profile.user_id);
                            setAdded(
                              lists?.friends.some((p) => p.user_id === profile.user_id)
                                ? 'friends'
                                : 'sent'
                            );
                          } catch (error) {
                            setAddError(error ?? true);
                          } finally {
                            setAdding(false);
                          }
                        }}
                      />
                    ) : (
                      <FriendState state={offer} />
                    )}
                  </View>
                ) : null}
                {addError ? (
                  <PidroText role="body" tone="danger" align="center" accessibilityRole="alert">
                    {localizedError(addError, 'friends.add_failed')}
                  </PidroText>
                ) : null}
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
  offer: { alignSelf: 'center' },
  bot: { alignItems: 'center', gap: PidroSpacing.md },
  botLandscape: { flexDirection: 'row' },
  botCopy: { flexShrink: 1, gap: PidroSpacing.sm },
});
