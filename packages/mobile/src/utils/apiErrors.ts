type ApiErrorBody = {
  errors?: { code?: string; detail?: string }[];
  message?: string;
};

export function apiErrorInfo(error: unknown): { code?: string; detail?: string } {
  const data =
    typeof error === 'object' && error !== null && 'response' in error
      ? (error as { response?: { data?: ApiErrorBody } }).response?.data
      : undefined;
  const firstError = data?.errors?.[0];
  return {
    code: firstError?.code,
    detail: firstError?.detail ?? data?.message,
  };
}
