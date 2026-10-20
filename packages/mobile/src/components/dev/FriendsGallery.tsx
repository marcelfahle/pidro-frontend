import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/friends/InfoCard';
import { FriendRow } from '@/components/friends/FriendRow';
import { NoticeCard } from '@/components/friends/NoticeCard';
import { ActionPill } from '@/components/ui/ActionPill';
import { DismissButton } from '@/components/ui/DismissButton';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';
import { friendRowState, type FriendEntry, type FriendRelation } from '@/features/friends';
import { relativeDay } from '@/features/relativeDay';
import { useTranslation } from '@/i18n';

const noop = () => {};

// A fixed clock, so the day words and the pixel baselines stay put.
const NOW = new Date(2026, 9, 19, 12);
const daysAgo = (days: number) => new Date(2026, 9, 19 - days, 10).toISOString();

const person = (display_name: string, entry: Partial<FriendEntry> = {}): FriendEntry => ({
  user_id: display_name.toLowerCase(),
  display_name,
  avatar_url: null,
  ...entry,
});

const row = (entry: FriendEntry, relation?: FriendRelation) => friendRowState(entry, relation, NOW);

/** Every friend row state, both info cards and every notice (PID-242). */
export function FriendsGallery() {
  const { t } = useTranslation();
  const [noticeShown, setNoticeShown] = useState(true);
  const long = person('Alexandria the Long-Named Player of Helsinki', { presence: 'online' });

  return (
    <>
      <Surface variant="panel" style={styles.section} padded testID="ui-friend-rows-panel">
        <PidroText role="title">Friend rows</PidroText>
        <View style={styles.list}>
          <FriendRow
            name="Pekka"
            ring="gold"
            row={row(person('Pekka', { requested_at: daysAgo(0) }), 'added_you')}
            onPress={noop}
            trailing={
              <>
                <ActionPill
                  label={t('friend_notice.accept')}
                  icon="check"
                  variant="gold"
                  accessibilityLabel="Accept Pekka"
                  onPress={noop}
                />
                <DismissButton accessibilityLabel="Ignore Pekka's request" onPress={noop} />
              </>
            }
          />
          <FriendRow
            name="Liisa"
            row={row(person('Liisa'), 'added_you')}
            onPress={noop}
            trailing={
              <ActionPill
                label={t('friend_notice.accept')}
                icon="check"
                variant="gold"
                accessibilityLabel="Accept Liisa"
                onPress={noop}
              />
            }
          />
          <FriendRow
            name="Nora"
            ring="gold"
            row={row(
              person('Nora', {
                presence: 'at_table',
                table_company: 'people',
                join_as: 'partner',
                table_open_seats: 1,
              })
            )}
            onPress={noop}
            trailing={
              <ActionPill
                label="Join"
                icon="enter"
                accessibilityLabel="Join Nora's table"
                onPress={noop}
              />
            }
          />
          <FriendRow
            name="Kalle"
            row={row(
              person('Kalle', { presence: 'at_table', table_company: 'people', table_hand: 4 })
            )}
            onPress={noop}
          />
          <FriendRow
            name="Maija"
            ring="gold"
            row={row(person('Maija', { presence: 'online' }))}
            onPress={noop}
            trailing={<ActionPill label="Play" icon="cards" onPress={noop} />}
          />
          <FriendRow
            name="Pekka"
            ring="gold"
            row={row(person('Pekka', { presence: 'at_table', table_company: 'bots' }))}
            onPress={noop}
          />
          <FriendRow
            name="Nora"
            ring="gold"
            row={row(person('Nora', { presence: 'at_table', table_company: 'people' }))}
            onPress={noop}
            dimmed
          />
          <FriendRow
            name="Hanna"
            ring="gold"
            row={row(person('Hanna', { presence: 'offline', played_together_at: daysAgo(1) }))}
            onPress={noop}
            trailing="chevron"
          />
          <FriendRow
            name="Sanna"
            row={row(person('Sanna', { presence: 'offline', played_together_at: daysAgo(40) }))}
            onPress={noop}
            trailing="chevron"
          />
          <FriendRow
            name="Eero"
            row={row(person('Eero', { requested_at: daysAgo(2) }), 'added')}
            trailing={
              <DismissButton
                accessibilityLabel="Cancel your friend request to Eero"
                onPress={noop}
              />
            }
          />
          <FriendRow
            name="Nora"
            ring="gold"
            row={row(person('Nora', { presence: 'online' }), 'new_friend')}
            onPress={noop}
            trailing="friends"
          />
          <FriendRow
            name="Eero"
            row={row(person('Eero', { presence: 'offline' }))}
            onPress={noop}
            trailing="sent"
          />
          <PidroText role="metadata" tone="muted">
            Without a seat count, hand or date:
          </PidroText>
          <FriendRow
            name="Kalle"
            row={row(person('Kalle', { presence: 'at_table' }))}
            onPress={noop}
          />
          <FriendRow
            name="Mikko"
            row={row(person('Mikko', { presence: 'offline' }))}
            onPress={noop}
            trailing="chevron"
          />
          <FriendRow
            name="Eero"
            row={row(person('Eero'), 'added')}
            trailing={
              <DismissButton accessibilityLabel="Cancel your request to Eero" onPress={noop} />
            }
          />
          <FriendRow
            name={long.display_name}
            row={row(long)}
            onPress={noop}
            trailing={<ActionPill label="Play" icon="cards" onPress={noop} />}
          />
        </View>
        <InfoCard
          title={t('friends.classic_not_here', { count: 38, number: '38' })}
          body={t('friends.classic_body')}
          action={{ label: t('friends.tell_classic'), icon: 'share', onPress: noop }}
        />
        <InfoCard
          title={t('friends.not_on_pidro')}
          body={t('friends.not_on_pidro_body')}
          action={{ label: t('friends.send_link'), icon: 'link', onPress: noop }}
        />
      </Surface>

      <Surface variant="panel" style={styles.section} padded testID="ui-friend-notices-panel">
        <PidroText role="title">Friend notices</PidroText>
        <View style={styles.list}>
          <NoticeCard
            variant="request"
            ring="gold"
            title={t('friend_notice.request', { name: 'Pekka' })}
            body={t('friend_notice.played_together', { when: relativeDay(daysAgo(1), NOW)! })}
            primary={{ label: t('friend_notice.accept'), onPress: noop }}
            secondary={{ label: t('friend_notice.not_now'), onPress: noop }}
          />
          <NoticeCard variant="accepted" title={t('friend_notice.accepted', { name: 'Nora' })} />
          <NoticeCard
            variant="seat"
            title={t('seat_invitation.waiting', { name: 'Kalle' })}
            body={t('friend_notice.as_partner', { rules: t('social.finnish'), name: 'Kalle' })}
            primary={{ label: t('seat_invitation.sit'), onPress: noop }}
            secondary={{ label: t('friend_notice.not_now'), onPress: noop }}
          />
          <NoticeCard
            variant="cant_come"
            ring="gold"
            title={t('friend_notice.cant_come', { name: 'Nora' })}
            body={t('friend_notice.seat_open_again')}
            secondary={{ label: t('friend_notice.invite_someone_else'), onPress: noop }}
          />
          <NoticeCard variant="too_late" title={t('friend_notice.too_late', { name: 'Kalle' })} />
          <PidroText role="metadata" tone="muted">
            At the top of a game with bots. Not now hides it; it comes back from the pill.
          </PidroText>
          {noticeShown ? (
            <NoticeCard
              testID="ui-friend-notice-solo"
              variant="seat"
              ring="gold"
              title={t('seat_invitation.waiting', { name: 'Bertil' })}
              body={t('friend_notice.as_partner', { rules: t('social.finnish'), name: 'Bertil' })}
              primary={{ label: t('friend_notice.join', { name: 'Bertil' }), onPress: noop }}
              secondary={{
                label: t('friend_notice.not_now'),
                onPress: () => setNoticeShown(false),
              }}
              footnote={t('friend_notice.ends_bot_game')}
            />
          ) : (
            <ActionPill label="Show the notice" onPress={() => setNoticeShown(true)} />
          )}
        </View>
      </Surface>
    </>
  );
}

const styles = StyleSheet.create({
  section: { gap: PidroSpacing.sm },
  list: { gap: PidroSpacing.xs },
});
