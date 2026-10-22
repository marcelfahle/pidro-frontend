import { isAxiosError } from 'axios';
import { api } from '@/api/client';
import { authStore } from '@/stores/auth';
import { gameDiagnostics, type DiagnosticSnapshot } from './buffer';
import { diagnosticMetadata } from './metadata';

export type CapturedGameReport = DiagnosticSnapshot & typeof diagnosticMetadata;
type Failure =
  | 'unsupported'
  | 'offline'
  | 'forbidden'
  | 'rate_limited'
  | 'unavailable'
  | 'failed'
  | 'identity_changed';
export class ReportSendError extends Error {
  constructor(
    public kind: Failure,
    public retryAfterSeconds: number | null = null
  ) {
    super(kind);
  }
}

export function captureGameReport(): CapturedGameReport | null {
  const snapshot = gameDiagnostics.snapshot();
  if (!snapshot || snapshot.owner !== authStore.getState().user?.id) return null;
  return { ...snapshot, ...diagnosticMetadata };
}

let retryAt = 0;
let retryOwner: string | null = null;
let sending = false;
export async function sendGameReport(capture: CapturedGameReport): Promise<string> {
  if (capture.owner !== authStore.getState().user?.id)
    throw new ReportSendError('identity_changed');
  if (capture.owner === retryOwner && Date.now() < retryAt)
    throw new ReportSendError('rate_limited', Math.ceil((retryAt - Date.now()) / 1000));
  if (sending) throw new ReportSendError('unavailable');
  // Explicit keys only: the local owner is never part of the report body.
  const body = {
    room_code: capture.room_code,
    game_instance_id: capture.game_instance_id,
    app_version: capture.app_version,
    build: capture.build,
    platform: capture.platform,
    events: capture.events,
  };
  // All permitted strings are ASCII, so character count equals UTF-8 byte count.
  if (JSON.stringify(body).length > 32768) throw new ReportSendError('failed');
  sending = true;
  try {
    const response = await api.post<{ data: { id: string } }>('/api/v1/game-reports', body, {
      // Axios runs this after its bearer-token interceptor, just before dispatch.
      transformRequest: [
        () => {
          if (capture.owner !== authStore.getState().user?.id)
            throw new ReportSendError('identity_changed');
          return JSON.stringify(body);
        },
      ],
    });
    const id = response.data?.data?.id;
    if (
      response.status !== 201 ||
      typeof id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    )
      throw new ReportSendError('failed');
    return id;
  } catch (error) {
    if (error instanceof ReportSendError) throw error;
    if (!isAxiosError(error)) throw new ReportSendError('failed');
    const status = error.response?.status;
    if (!status) throw new ReportSendError('offline');
    if (status === 404 || status === 405 || status === 501)
      throw new ReportSendError('unsupported');
    if (status === 401 || status === 403) throw new ReportSendError('forbidden');
    if (status === 429) {
      const seconds = Number(error.response?.headers['retry-after']);
      const delay = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
      if (capture.owner === authStore.getState().user?.id) {
        retryOwner = capture.owner;
        retryAt = Date.now() + delay * 1000;
      }
      throw new ReportSendError('rate_limited', delay);
    }
    throw new ReportSendError(status === 503 ? 'unavailable' : 'failed');
  } finally {
    sending = false;
  }
}
