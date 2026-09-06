import { expect, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../../scripts/autoplay-full-game.mjs', import.meta.url));

for (const initialError of [null, 'ALREADY_SEATED', 'ROOM_NOT_AVAILABLE', 'ALREADY_IN_ROOM']) {
  test(`autoplay fixed room preserves membership or switches from ${initialError ?? 'no room'}`, async () => {
    const requests = [];
    let joinAttempts = 0;
    const server = Bun.serve({
      port: 0,
      fetch(request, server) {
        const path = new URL(request.url).pathname;
        if (path === '/socket/websocket' && server.upgrade(request)) return;
        requests.push(`${request.method} ${path}`);
        if (path === '/api/v1/auth/login') {
          return Response.json({ data: { token: 'autoplay-test-token' } });
        }
        if (path === '/api/v1/rooms/TEST/join') {
          joinAttempts += 1;
          if (initialError && joinAttempts === 1) {
            return Response.json({ errors: [{ code: initialError }] }, { status: 422 });
          }
          return Response.json({ data: { code: 'TEST' } });
        }
        if (path === '/api/v1/rooms/current/leave') return new Response(null, { status: 204 });
        return new Response(null, { status: 404 });
      },
      websocket: {
        message(socket, message) {
          const [joinRef, ref, topic, event] = JSON.parse(String(message));
          if (event !== 'phx_join') return;
          requests.push(`CHANNEL ${topic}`);
          socket.send(
            JSON.stringify([
              joinRef,
              ref,
              topic,
              'phx_reply',
              { status: 'ok', response: { state: { phase: 'complete' }, position: 'north' } },
            ])
          );
          socket.send(JSON.stringify([joinRef, null, topic, 'progression_summary', {}]));
        },
      },
    });
    const child = Bun.spawn(['node', script, '--room', 'TEST', '--max-minutes', '0.02'], {
      env: {
        ...process.env,
        API_BASE_URL: `http://127.0.0.1:${server.port}`,
        WS_BASE_URL: `ws://127.0.0.1:${server.port}/socket`,
      },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    try {
      const [code, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ]);
      expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
      expect(stdout).toContain('GAME OVER');
      expect(requests).toEqual([
        'POST /api/v1/auth/login',
        'POST /api/v1/rooms/TEST/join',
        ...(initialError === 'ALREADY_IN_ROOM'
          ? ['DELETE /api/v1/rooms/current/leave', 'POST /api/v1/rooms/TEST/join']
          : []),
        'CHANNEL game:TEST',
      ]);
    } finally {
      child.kill();
      server.stop(true);
    }
  });
}
