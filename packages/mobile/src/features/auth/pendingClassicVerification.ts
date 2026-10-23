import type { ClassicVerification } from '@pidro/shared';

let pending: ClassicVerification | null = null;

export function stash(verification: ClassicVerification): void {
  pending = verification;
}

export function take(): ClassicVerification | null {
  const verification = pending;
  pending = null;
  return verification;
}
