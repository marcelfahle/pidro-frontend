import { Redirect, useLocalSearchParams } from 'expo-router';
import { isInviteArrivalSource, normalizeInviteCode, type InvitePreview } from '@pidro/shared';
import { JoinInviteScreen } from '@/components/invites/JoinInviteScreen';

const OPEN_FIXTURE: InvitePreview = {
  code: '7KQ4M2XB',
  state: 'open',
  host: 'Marcel',
  seats_taken: 2,
  seats_total: 4,
  seat_hint: 'partner',
  label: 'Friday game',
  expires_at: '2099-09-03T15:30:00Z',
};

export default function JoinInviteRoute() {
  const params = useLocalSearchParams<{ code?: string; source?: string; fixture?: string }>();
  const code = normalizeInviteCode(typeof params.code === 'string' ? params.code : '');
  const source = isInviteArrivalSource(params.source) ? params.source : undefined;
  const fixture =
    __DEV__ && params.fixture === 'open' ? { ...OPEN_FIXTURE, code: code ?? '' } : null;

  if (!code) return <Redirect href="/+not-found" />;
  return <JoinInviteScreen key={code} code={code} source={source} fixture={fixture} />;
}
