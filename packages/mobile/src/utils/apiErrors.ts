import { errorPayload, type SeatRequiresGamesError } from '@pidro/shared';

export { localizedError, localizedFieldErrors } from '@pidro/shared';

type ApiErrorBody = {
  code?: string;
  params?: Record<string, unknown>;
  error_code?: string;
  error_params?: Record<string, unknown>;
  errors?: {
    code?: string;
    detail?: string;
    action?: { type: string; method?: string; endpoint?: string };
  }[];
  message?: string;
} & Partial<SeatRequiresGamesError>;

export function apiErrorInfo(error: unknown): {
  code?: string;
  detail?: string;
  action?: { type: string; method?: string; endpoint?: string };
  requirement?: SeatRequiresGamesError;
} {
  const data = errorPayload(error) as ApiErrorBody;
  const firstError = Array.isArray(data.errors) ? data.errors[0] : undefined;
  const code = firstError?.code ?? data.error ?? data.code ?? data.error_code;
  return {
    // Preserve legacy code casing for existing control-flow consumers.
    code,
    detail: firstError?.detail ?? data?.message,
    action: firstError?.action,
    requirement:
      data?.error === 'SEAT_REQUIRES_GAMES' &&
      typeof data.min_games === 'number' &&
      typeof data.games_played === 'number'
        ? (data as SeatRequiresGamesError)
        : undefined,
  };
}
