// The server refused the reset link itself, so retyping the password cannot help.
export function resetLinkRefused(code: string | undefined): boolean {
  return code === 'INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN';
}
