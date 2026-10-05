import { createClassicApi, facebookCredentialRequest } from '@pidro/shared';
import { api } from './client';

export type {
  ClassicClaimAccount,
  ClassicClaimMethod,
  ClassicClaimPreview,
  ClassicClaimRequest,
  ClassicVerification,
  ClassicVerifyRequest,
} from '@pidro/shared';

export const classicApi = createClassicApi(api);
export { facebookCredentialRequest };
