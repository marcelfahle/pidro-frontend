import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CreateRoomRequest, FriendPlayer, Position, Room, RuleSet } from '@pidro/shared';
import { SeatPickerContainer } from '@/components/invites/SeatPickerContainer';
import type { ChoiceSection } from '@/components/invites/ChoiceList';
import { BackButton } from '@/components/ui/BackButton';
import { ActionPill } from '@/components/ui/ActionPill';
import { BevelButton } from '@/components/ui/BevelButton';
import { Modal } from '@/components/ui/Modal';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { TextLink } from '@/components/ui/TextLink';
import { RulesExplainer, useRulesExplainer } from '@/components/rules/RulesExplainer';
import { TableFeedback } from '@/components/game/TableFeedback';
import { WatchingBadge } from '@/components/game/WatchingBadge';
import { PidroFonts } from '@/design/tokens';
import { assignedRoomPlayerIds } from '@/features/invites/hostControls';
import {
  assignedFriendIds,
  chooseFriend,
  chooseSeat,
  defaultSeats,
  isPractice,
  newTableRequest,
  pickerFriends,
  tableFooter,
  tableHeader,
  waitingFooter,
  type DraftSeat,
  type SeatKey,
  type TableDraft,
} from '@/features/lobby/newTable';
import { seatRow, type SeatView } from '@/features/lobby/seatRow';
import type { TableNotice } from '@/game/tableNotices';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/auth';
import { refreshFriends, useFriendsStore } from '@/stores/friends';
import { useSettingsStore } from '@/stores/settings';
import { localizedError } from '@/utils/apiErrors';
import { SeatRow, TeamSection, VsDivider } from './SeatRow';

const positions: Position[] = ['north', 'east', 'south', 'west'];
const seatKeys: Partial<Record<Position, SeatKey>> = {
  east: 'seat_2',
  south: 'seat_3',
  west: 'seat_4',
};

interface Props {
  room?: Room;
  initialDraft?: TableDraft;
  initialRuleSet?: RuleSet;
  initialPicker?: 'choices' | 'friends';
  partner?: string;
  fixtureFriends?: FriendPlayer[];
  youPlayerId?: string;
  onSubmit?: (request: CreateRoomRequest) => void;
  onLeave: () => void;
  busy?: boolean;
  error?: string;
  isSpectator?: boolean;
  canManage?: boolean;
  controlsBusy?: boolean;
  joiningName?: string | null;
  readyPlayers?: Position[];
  readyDisabled?: boolean;
  onReady?: () => Promise<void>;
  onOpenInvite?: () => void;
  onSeatBot?: (position: Position) => void;
  onHoldSeat?: (position: Position, friend: FriendPlayer) => void;
  onReleaseHold?: (position: Position) => void;
  onKickPlayer?: (position: Position) => void;
  rulesFixtureSeen?: boolean;
  notice?: TableNotice | null;
  onDismissNotice?: () => void;
}

/** The draft and the server room share their furniture, never their state. */
export function NewTableScreen({
  room,
  initialDraft,
  initialRuleSet,
  initialPicker,
  partner,
  fixtureFriends,
  youPlayerId,
  onSubmit,
  onLeave,
  busy = false,
  error,
  isSpectator = false,
  canManage = false,
  controlsBusy = false,
  joiningName,
  readyPlayers = [],
  readyDisabled = true,
  onReady,
  onOpenInvite,
  onSeatBot,
  onHoldSeat,
  onReleaseHold,
  onKickPlayer,
  rulesFixtureSeen,
  notice,
  onDismissNotice,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const compact = width < height && height < 700;
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const friendStore = useFriendsStore();
  const friends = fixtureFriends ?? friendStore.friends;
  const preferred = useSettingsStore((state) => state.preferredRuleSet);
  const [draft, setDraft] = useState<TableDraft>(initialDraft ?? { seats: { ...defaultSeats } });
  const [draftRules, setDraftRules] = useState(initialRuleSet ?? preferred);
  const [selected, setSelected] = useState<Position | null>(initialPicker ? 'south' : null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!fixtureFriends && user && !user.guest) void refreshFriends().catch(() => undefined);
  }, [fixtureFriends, user]);
  const partnerFriend = friends.find((entry) => entry.user_id === partner);
  if (!room && !prefilled && partnerFriend) {
    setDraft(chooseFriend(draft, 'seat_3', partnerFriend));
    setPrefilled(true);
  }
  const ruleSet = room?.config?.rule_set ?? draftRules;
  const you = youPlayerId ?? user?.id ?? '';
  const youPosition = room
    ? positions.find((position) => room.positions?.[position] === you)
    : 'north';
  const start = positions.indexOf(youPosition ?? 'north');
  const order = [0, 2, 1, 3].map((offset) => positions[(start + offset) % 4]);
  const editable = !room || (canManage && !isSpectator);
  const rules = useRulesExplainer(ruleSet, !room || isSpectator || !youPosition, rulesFixtureSeen);
  const liveSeat = (position: Position) => room?.seats?.find((seat) => seat.position === position);
  const view = (position: Position, index: number): SeatView => {
    const team = position === youPosition ? 'you' : index < 2 ? 'partner' : 'opponent';
    if (room) {
      const seat = liveSeat(position);
      return {
        team,
        opened: true,
        type: seat?.held_for ? 'held' : 'open',
        player: seat?.player,
        held_for: seat?.held_for,
        presence: friends.find((friend) => friend.user_id === seat?.held_for?.user_id)?.presence,
        min_games: seat?.min_games,
        passwordRequired: seat?.password,
        password: canManage && seat?.password ? room.seat_password : undefined,
        host: room.host_id === you,
        ready: readyPlayers.includes(position),
        editable,
      };
    }
    if (position === 'north')
      return {
        team: 'you',
        opened: false,
        type: 'open',
        player: { username: user?.username ?? '', avatar_url: user?.avatar_url },
      };
    const seat = draft.seats[seatKeys[position]!];
    return typeof seat === 'string'
      ? { team, opened: false, type: seat }
      : seat.type === 'held'
        ? { team, opened: false, type: 'held', held_for: seat.friend }
        : {
            team,
            opened: false,
            type: 'open',
            min_games: seat.min_games,
            passwordRequired: seat.password,
          };
  };
  const selectedLive = selected ? liveSeat(selected) : undefined;
  if (room && selected && selectedPlayerId !== (selectedLive?.player?.id ?? null)) {
    setSelected(null);
  }
  const selectedDraft =
    selected && seatKeys[selected] ? draft.seats[seatKeys[selected]!] : undefined;
  const heldFriend = room
    ? selectedLive?.held_for
    : typeof selectedDraft === 'object' && selectedDraft.type === 'held'
      ? selectedDraft.friend
      : undefined;
  const occupied = !!selectedLive?.player;
  const selectedId = heldFriend
    ? 'friend'
    : selectedDraft === 'ai'
      ? 'ai'
      : typeof selectedDraft === 'object' && selectedDraft.type === 'open'
        ? selectedDraft.password
          ? 'password'
          : String(selectedDraft.min_games)
        : 'open';
  const sections: ChoiceSection[] = [
    {
      title: t('new_table.fill'),
      items: [
        {
          id: 'friend',
          kind: 'deeper',
          title: t('new_table.friend'),
          subtitle: heldFriend?.display_name ?? t('new_table.choose_friend'),
          icon: 'person-plus',
        },
        ...(!room || !selectedLive?.held_for
          ? [
              {
                id: 'ai',
                title: t('social.bot'),
                subtitle: t('seat_row.right_away'),
                icon: 'bot' as const,
              },
            ]
          : []),
      ],
    },
    ...(!room || selectedLive?.held_for
      ? [
          {
            title: t('new_table.leave_open'),
            items: [
              {
                id: 'open',
                title: t('social.anyone'),
                subtitle: t('new_table.anyone_help'),
                icon: 'plus' as const,
              },
              ...(!room
                ? [
                    {
                      id: '100',
                      title: t('seat_row.games', { number: '100' }),
                      subtitle: t('new_table.experience'),
                      badge: '100',
                    },
                    {
                      id: '1000',
                      title: t('seat_row.games', { number: '1000' }),
                      subtitle: t('new_table.experienced'),
                      badge: '1k',
                    },
                    {
                      id: 'password',
                      title: t('new_table.with_password'),
                      subtitle: t('new_table.password_help'),
                      icon: 'lock' as const,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ];
  const choose = (id: string) => {
    if (!selected || busy || controlsBusy) return;
    if (room) {
      if (!editable) return;
      if (id === 'ai') onSeatBot?.(selected);
      if (id === 'open') onReleaseHold?.(selected);
    } else {
      const choice: DraftSeat =
        id === 'ai' || id === 'open'
          ? id
          : {
              type: 'open',
              min_games: id === '100' ? 100 : id === '1000' ? 1000 : 0,
              ...(id === 'password' && { password: true }),
            };
      setDraft(chooseSeat(draft, seatKeys[selected]!, choice));
    }
  };
  const full = !!room && positions.every((position) => !!room.positions?.[position]);
  const isYouReady = !!youPosition && readyPlayers.includes(youPosition);
  const [readyBusy, setReadyBusy] = useState(false);
  const readyBusyRef = useRef(false);
  const [readyError, setReadyError] = useState<unknown>(null);
  const confirmReady = async () => {
    if (!onReady || readyDisabled || readyBusyRef.current || isYouReady || isSpectator) return;
    readyBusyRef.current = true;
    setReadyBusy(true);
    setReadyError(null);
    try {
      await onReady();
    } catch (caught) {
      setReadyError(caught);
    } finally {
      readyBusyRef.current = false;
      setReadyBusy(false);
    }
  };
  const row = (position: Position, index: number) => (
    <SeatRow
      key={position}
      testID={`new-table-seat-${position}`}
      row={seatRow(view(position, index))}
      onPress={() => {
        if (!busy && !controlsBusy) {
          setQuery('');
          setSelectedPlayerId(liveSeat(position)?.player?.id ?? null);
          setSelected(position);
        }
      }}
    />
  );
  const kickPlayer = selectedLive?.player;
  return (
    <>
      <ScreenShell
        testID={room ? 'waiting-table' : 'new-table-screen'}
        scroll={width > height && height < 600}
        contentStyle={[styles.screen, compact && styles.compact]}>
        <View testID="waiting-toolbar" style={styles.header}>
          <BackButton
            accessibilityLabel={t(
              room ? (isSpectator ? 'game.lobby' : 'game.leave') : 'social.cancel_creation'
            )}
            onPress={onLeave}
            disabled={busy}
          />
          <View style={styles.heading}>
            <PidroText role="title" tone="gold" style={styles.title}>
              {t(room ? 'social.your_table' : 'new_table.title')}
            </PidroText>
            {room && (
              <PidroText testID="waiting-rule-set" role="metadata" tone="soft">
                {tableHeader(room)}
              </PidroText>
            )}
          </View>
        </View>
        {!room && (
          <View style={styles.rules}>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel={t('social.rules')}
              style={styles.pills}>
              {(['finnish', 'louisiana'] as const).map((rule) => (
                <ActionPill
                  key={rule}
                  label={t(`social.${rule}`)}
                  selected={draftRules === rule}
                  disabled={busy}
                  onPress={() => setDraftRules(rule)}
                  style={styles.pill}
                />
              ))}
            </View>
            <PidroText role="metadata" tone="soft" align="center">
              {t(`social.${ruleSet}_detail`)}
            </PidroText>
          </View>
        )}
        <View style={[styles.teams, compact && styles.compactTeams]}>
          <TeamSection team="yours">
            {order.slice(0, 2).map((position, index) => row(position, index))}
          </TeamSection>
          <VsDivider />
          <TeamSection team="opponents">
            {order.slice(2).map((position, index) => row(position, index + 2))}
          </TeamSection>
        </View>
        <View testID="readiness-panel" style={styles.footer}>
          {room && (
            <TextLink testID="waiting-rules-menu" label={t('rules.menu')} onPress={rules.show} />
          )}
          {joiningName && (
            <PidroText role="metadata" align="center" accessibilityLiveRegion="polite">
              {t('table.joining', { name: joiningName })}
            </PidroText>
          )}
          {!room ? (
            <BevelButton
              label={t(isPractice(draft) ? 'new_table.start' : 'social.open_table')}
              size="lg"
              fullWidth
              loading={busy}
              disabled={busy}
              onPress={() => onSubmit?.(newTableRequest(draftRules, draft))}
            />
          ) : !isSpectator && full && onReady ? (
            <BevelButton
              label={t(
                isYouReady ? 'game.you_ready' : readyBusy ? 'game.confirming' : 'game.im_ready'
              )}
              size="lg"
              fullWidth
              loading={readyBusy}
              disabled={readyDisabled || isYouReady || readyBusy}
              onPress={() => void confirmReady()}
            />
          ) : !isSpectator && editable && !full ? (
            <BevelButton
              label={t('new_table.share')}
              material="glass"
              size="lg"
              fullWidth
              disabled={controlsBusy}
              onPress={onOpenInvite}
            />
          ) : null}
          <PidroText role="metadata" tone="soft" align="center" accessibilityLiveRegion="polite">
            {!room
              ? tableFooter(draft)
              : full
                ? t('game.ready_count', { count: readyPlayers.length })
                : waitingFooter(room, editable)}
          </PidroText>
          {error || readyError ? (
            <PidroText role="metadata" tone="danger" align="center" accessibilityRole="alert">
              {error || localizedError(readyError, 'game.ready_failed')}
            </PidroText>
          ) : null}
        </View>
      </ScreenShell>
      {isSpectator && <WatchingBadge />}
      <TableFeedback notice={notice ?? null} top={insets.top + 72} onDismiss={onDismissNotice} />
      {room && (
        <RulesExplainer
          ruleSet={ruleSet}
          tableCode={room.code}
          open={rules.open}
          onClose={rules.dismiss}
        />
      )}
      {selected && editable && !occupied && (
        <SeatPickerContainer
          key={selected}
          title={t(selected === order[1] ? 'social.partner_seat' : 'social.opponent')}
          subtitle={t(selected === order[1] ? 'new_table.partner_help' : 'new_table.opponent_help')}
          initialPage={initialPicker}
          choices={{ sections, selectedId, onSelect: choose }}
          friends={{
            friends: pickerFriends(
              friends,
              heldFriend?.user_id,
              room
                ? assignedRoomPlayerIds(room).filter((id) => id !== heldFriend?.user_id)
                : assignedFriendIds(draft, seatKeys[selected]!)
            ),
            searchText: query,
            onSearchChange: setQuery,
            onInvite: (entry) => {
              const friend = friends.find((candidate) => candidate.user_id === entry.id);
              if (!friend || busy || controlsBusy) return;
              if (room) onHoldSeat?.(selected, friend);
              else setDraft(chooseFriend(draft, seatKeys[selected]!, friend));
            },
            onAddFriends: () => {
              setSelected(null);
              router.push('/friends');
            },
          }}
          onClose={() => setSelected(null)}
        />
      )}
      <Modal
        isOpen={!!selected && editable && occupied}
        title={t('table.managePlayer', {
          name: kickPlayer?.display_name ?? kickPlayer?.username ?? '',
        })}
        onClose={() => setSelected(null)}>
        <View style={styles.confirm}>
          <BevelButton
            label={t('table.kick')}
            material="glass"
            tone="danger"
            fullWidth
            disabled={controlsBusy}
            onPress={() => {
              if (selected && room?.positions?.[selected] === kickPlayer?.id)
                onKickPlayer?.(selected);
              setSelected(null);
            }}
          />
          <TextLink label={t('common.cancel')} onPress={() => setSelected(null)} />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { maxWidth: 436, gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  compact: { gap: 8, paddingVertical: 8 },
  compactTeams: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heading: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: PidroFonts.display, fontSize: 24, lineHeight: 32 },
  rules: { gap: 4 },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1 },
  teams: { gap: 12 },
  footer: { marginTop: 'auto', paddingTop: 12, gap: 8, alignItems: 'center' },
  confirm: { gap: 12 },
});
