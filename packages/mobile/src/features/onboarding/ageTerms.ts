import type { AgeTermsRequest } from '@pidro/shared';
import { ageGateStore } from '@/stores/ageGate';

export function storedAgeTerms(): AgeTermsRequest {
  const { ageBand, termsVersion } = ageGateStore.getState();
  if (!ageBand || !termsVersion) return {};
  return { age_band: ageBand, terms_version: termsVersion };
}
