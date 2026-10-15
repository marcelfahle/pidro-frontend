import { emptyLobbyCategories, POSITION_TO_INDEX } from '@pidro/shared';
import type { LobbyCategories, Position, Room } from '@pidro/shared';

function room(code: string, names: (string | null)[], louisiana = false, playing = false): Room {
  const positions: Position[] = ['north', 'south', 'east', 'west'];
  return {
    code,
    name: 'Never show this table name',
    host_id: `${code}-north`,
    status: playing ? 'playing' : 'waiting',
    config: {
      rule_set: louisiana ? 'louisiana' : 'finnish',
      name: null,
      bot_difficulty: 'basic',
      solo: false,
    },
    seats: names.map((name, index) => ({
      position: positions[index],
      seat_index: POSITION_TO_INDEX[positions[index]],
      status: name ? 'occupied' : 'free',
      player: name
        ? { id: `${code}-${positions[index]}`, username: name, is_bot: name === 'Bot' }
        : null,
    })),
    available_positions: positions.filter((_, index) => !names[index]),
  };
}

export function lobbyFixture(
  value?: string
): { lobby: LobbyCategories; query: string } | undefined {
  if (
    !__DEV__ ||
    !['list', 'empty', 'rejoin', 'open', 'substitute', 'watch', 'search-empty'].includes(
      value ?? ''
    )
  )
    return;
  const lobby: LobbyCategories = {
    my_rejoinable: [room('MY', ['You', 'Nora', 'Kalle', 'Mikko'], false, true)],
    open_tables: [
      room('OPEN1', ['Claas', null, null, null]),
      room('OPEN2', ['Yaya', null, 'Bot', null], true),
      room('OPEN3', ['Shirlee', null, 'Thenutz', 'Bot']),
      room('OPEN4', ['Maija', 'Matti', null, null]),
      room('OPEN5', ['Erkki', null, 'Sanna', null]),
      room('OPEN6', ['Heikki', null, null, null]),
    ],
    substitute_needed: [room('SUB', ['Anna', 'Pekka', null, 'Liisa'], false, true)],
    spectatable: [
      room('WATCH1', ['Kalle', 'Eero', 'Hanna', 'Olli'], false, true),
      room('WATCH2', ['Ritva', 'Timo', 'Ville', 'Bot'], true, true),
      room('WATCH3', ['Juha', 'Lasse', 'Matti', 'Antti'], false, true),
    ],
  };
  const categories: Record<string, keyof LobbyCategories> = {
    rejoin: 'my_rejoinable',
    open: 'open_tables',
    substitute: 'substitute_needed',
    watch: 'spectatable',
  };
  const category = categories[value ?? ''];
  return {
    lobby:
      value === 'empty'
        ? emptyLobbyCategories()
        : category
          ? { ...emptyLobbyCategories(), [category]: lobby[category] }
          : lobby,
    query: value === 'search-empty' ? 'Nobody named this' : '',
  };
}
