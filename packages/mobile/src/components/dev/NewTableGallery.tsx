import { useState } from 'react';
import type { FriendPlayer, Position, Room } from '@pidro/shared';
import { NewTableScreen } from '@/components/lobby/NewTableScreen';
import { InviteLinkModal } from '@/components/invites/InviteLinkModal';
import { defaultSeats, type TableDraft } from '@/features/lobby/newTable';

const friends: FriendPlayer[] = [
  { user_id: 'maija', display_name: 'Maija', avatar_url: null, presence: 'online' },
  {
    user_id: 'pekka',
    display_name: 'Pekka',
    avatar_url: null,
    presence: 'at_table',
    table_company: 'bots',
  },
  { user_id: 'hanna', display_name: 'Hanna', avatar_url: null, presence: 'offline' },
  {
    user_id: 'nora',
    display_name: 'Nora',
    avatar_url: null,
    presence: 'at_table',
    table_company: 'people',
  },
];

export function NewTableGallery({ fixture = 'setup' }: { fixture?: string }) {
  const [ready, setReady] = useState<Position[]>(['east', 'west', 'south']);
  const [share, setShare] = useState(false);
  const [opened, setOpened] = useState(['opened', 'ready', 'guest', 'declined'].includes(fixture));
  const [declined, setDeclined] = useState(
    fixture === 'declined' ? { position: 'south' as const, user: friends[0] } : null
  );
  const draft: TableDraft = {
    seats:
      fixture === 'bots'
        ? { seat_2: 'ai', seat_3: 'ai', seat_4: 'ai' }
        : {
            ...defaultSeats,
            ...(fixture === 'partner' && { seat_3: { type: 'held', friend: friends[0] } }),
            ...(fixture === 'requirement' && { seat_2: { type: 'open', min_games: 100 } }),
            ...(fixture === 'password' && {
              seat_4: { type: 'open', min_games: 0, password: true },
            }),
          },
  };
  const [room, setRoom] = useState<Room>({
    code: 'NEWT',
    host_id: 'host',
    status: fixture === 'ready' ? 'ready' : 'waiting',
    seat_password: '4821',
    config: {
      name: null,
      rule_set: fixture === 'louisiana' ? 'louisiana' : 'finnish',
      solo: false,
      bot_difficulty: 'basic',
    },
    positions: {
      north: 'host',
      east: 'kalle',
      south: fixture === 'ready' ? 'maija' : null,
      west: fixture === 'ready' ? 'hanna' : null,
    },
    seats: (['north', 'east', 'south', 'west'] as const).map((position, seat_index) => ({
      position,
      seat_index,
      status: fixture === 'ready' || seat_index < 2 ? 'occupied' : 'free',
      player:
        fixture === 'ready' || seat_index < 2
          ? {
              id: ['host', 'kalle', 'maija', 'hanna'][seat_index],
              username: ['Bertil', 'Kalle', 'Maija', 'Hanna'][seat_index],
            }
          : null,
      held_for:
        position === 'south' && fixture !== 'ready' && fixture !== 'declined' ? friends[0] : null,
      password: position === 'west' && fixture !== 'ready',
    })),
  });
  return (
    <>
      <NewTableScreen
        key={opened ? 'opened' : fixture}
        room={opened ? room : undefined}
        initialDraft={draft}
        initialRuleSet={fixture === 'louisiana' ? 'louisiana' : 'finnish'}
        initialPicker={
          fixture === 'picker' ? 'choices' : fixture === 'friends' ? 'friends' : undefined
        }
        fixtureFriends={friends}
        youPlayerId={fixture === 'guest' ? 'kalle' : 'host'}
        canManage={fixture !== 'guest'}
        onLeave={() => {}}
        onSubmit={() => setOpened(true)}
        onOpenInvite={() => setShare(true)}
        declined={declined}
        onDismissDeclined={() => setDeclined(null)}
        readyPlayers={ready}
        readyDisabled={false}
        onReady={async () => {
          setReady((current) => [...current, 'north']);
        }}
        onKickPlayer={(position) =>
          setRoom((current) => ({
            ...current,
            positions: { ...current.positions!, [position]: null },
            seats: current.seats?.map((seat) =>
              seat.position === position ? { ...seat, player: null, status: 'free' } : seat
            ),
          }))
        }
      />
      {share && (
        <InviteLinkModal
          roomCode={room.code}
          onClose={() => setShare(false)}
          fixture={{
            code: '7KQ4M2XB',
            state: 'open',
            url: 'https://www.pidro.online/j/7KQ4M2XB',
            share_text: '',
            seat_hint: null,
            label: null,
            expires_at: '2099-09-03T15:30:00Z',
          }}
        />
      )}
    </>
  );
}
