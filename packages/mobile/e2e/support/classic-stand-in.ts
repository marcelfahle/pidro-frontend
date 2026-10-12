// Stands in for Classic on 127.0.0.1:4001, where the dev backend already looks
// for it (empty secret). Stateless: the login says what Classic would answer.
//   classic-…  an account that exists      off-…   one that is switched off
//   rude-…     a name that cannot be shown  other   unknown
// The Classic id is a hash of the login, so parallel tests share nothing.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';

export const CLASSIC_PASSWORD = 'classic-pass';

const classicId = (login: string) => createHash('sha1').update(login).digest().readUIntBE(0, 5);

// Mirrors the production payload pinned in the backend's classic_client_test.exs.
function profile(login: string) {
  return {
    id: classicId(login),
    username: login.startsWith('rude-') ? 'fuckface' : login,
    has_username: true,
    first_name: null,
    email: `${login}@classic.example`,
    fbid: null,
    member_since: '2012-04-03T10:00:00',
    avatar: { picture_index: 0, url: null },
    xp: 48_200,
    level: 42,
    games: {
      legacy_played_games: 300,
      legacy_victories: 160,
      legacy_losses: 140,
      total_game: 1284,
      win_game: 700,
      lost_game: 584,
      win_percent: 54,
      games_logged: 900,
      games_started: 950,
      games_ended: 930,
    },
    premium: { active: false, until: null, product: null },
    badges: [],
    account: { visible: true, deleted: false },
  };
}

function answer(method: string, url: URL, body: string): [number, object] {
  if (method === 'POST' && url.pathname === '/internal/claims/verify_password') {
    const { login = '', password } = JSON.parse(body || '{}');
    const name = String(login).toLowerCase();
    if (name.startsWith('off-')) return [403, { error: 'inactive' }];
    const known = /^(classic|rude)-/.test(name);
    if (!known || password !== CLASSIC_PASSWORD) return [401, { error: 'invalid' }];
    return [200, { classic: profile(name) }];
  }
  if (method === 'GET' && url.pathname === '/internal/claims/lookup') {
    const name = (url.searchParams.get('email') ?? '').split('@')[0].toLowerCase();
    return /^(classic|rude)-/.test(name)
      ? [200, { classic: profile(name) }]
      : [404, { error: 'not found' }];
  }
  return [404, { error: 'not found' }];
}

export default async function startClassicStandIn() {
  const server = createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => (body += chunk));
    request.on('end', () => {
      const [status, payload] = answer(
        request.method ?? 'GET',
        new URL(request.url ?? '/', 'http://x'),
        body
      );
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(payload));
    });
  });
  await new Promise<void>((done) => server.listen(4001, '127.0.0.1', done));
  return () => new Promise<void>((done) => server.close(() => done()));
}
