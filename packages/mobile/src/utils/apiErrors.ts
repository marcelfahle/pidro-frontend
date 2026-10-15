import type { SeatRequiresGamesError } from '@pidro/shared';

type ApiErrorBody = {
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
  const data =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { data?: ApiErrorBody } }).response?.data
      : undefined;
  const firstError = data?.errors?.[0];
  return {
    code: firstError?.code ?? data?.error,
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
