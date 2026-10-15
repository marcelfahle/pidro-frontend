import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { isAxiosError } from 'axios';
import type { FriendResult } from '@pidro/shared';
import { friendsApi } from '@/api/friends';
import { usePillClearance } from '@/components/shell/TabPill';
import { BevelButton } from '@/components/ui/BevelButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { PidroSpacing } from '@/design/tokens';
import { canSearch, relationLabel } from '@/features/friends';
import { FriendRow } from '@/features/friends/FriendRow';
import { discoveryFixture } from '@/features/friends/fixtures';
import { useAuthStore } from '@/stores/auth';
import { addFriend } from '@/stores/friends';

export default function AddFriendScreen() {
  const router = useRouter();
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  const preview = discoveryFixture(fixture);
  const guest = useAuthStore((state) => Boolean(state.user?.guest));
  const userId = useAuthStore((state) => state.user?.id);
  const clearance = usePillClearance();
  const [query, setQuery] = useState(preview && fixture === 'results' ? 'Nor' : '');
  const [users, setUsers] = useState<FriendResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef<Promise<unknown>>(Promise.resolve());
  const search = query.trim();
  const eligible = !search || canSearch(search);

  useEffect(() => {
    if (guest || preview) return;
    let active = true;
    const timer = setTimeout(
      () => {
        setUsers([]);
        setError(null);
        setLoading(eligible);
        if (!eligible) return;
        // Wait for the previous request rather than sending overlapping searches.
        inFlight.current = inFlight.current.then(async () => {
          if (!active) return;
          try {
            const result = search ? await friendsApi.search(search) : await friendsApi.recent();
            if (active) setUsers(result);
          } catch (error) {
            if (active)
              setError(
                isAxiosError(error) && error.response?.data?.error === 'QUERY_TOO_SHORT'
                  ? 'Type at least three letters.'
                  : 'Could not find players. Please try again.'
              );
          } finally {
            if (active) setLoading(false);
          }
        });
      },
      search ? 300 : 0
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
    // The fixture is fixed for this route; it must never call the backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, eligible, guest, userId, fixture, attempt]);

  if (guest) return <Redirect href="/friends" />;
  const results = preview ?? users;
  return (
    <ScreenShell
      scroll
      compact
      testID="friends-add-screen"
      contentStyle={[
        styles.content,
        {
          paddingBottom: PidroSpacing.md + clearance.bottom,
          paddingRight: PidroSpacing.md + clearance.right,
        },
      ]}>
      <ScreenHeader title="Add a friend" onBack={() => router.back()} />
      <Input
        label="Find a player"
        placeholder="Type at least three letters"
        value={query}
        onChangeText={(value) => {
          setQuery(value);
          if (value.trim() !== search) {
            setUsers([]);
            setError(null);
            setLoading(!value.trim() || canSearch(value));
          }
        }}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <PidroText role="label" tone="soft">
        {search ? 'Search results' : 'Recently played with'}
      </PidroText>
      {!eligible ? (
        <PidroText role="body" tone="soft">
          Type at least three letters.
        </PidroText>
      ) : null}
      {!preview && loading ? (
        <PidroText role="body" tone="soft">
          Loading…
        </PidroText>
      ) : null}
      {error ? (
        <>
          <PidroText role="body" tone="danger" accessibilityRole="alert">
            {error}
          </PidroText>
          <BevelButton label="Retry" material="glass" onPress={() => setAttempt(attempt + 1)} />
        </>
      ) : null}
      {results.map((player) => (
        <FriendRow
          key={player.user_id}
          player={player}
          action={
            player.relation === 'none' ? (
              <BevelButton
                label="Add"
                accessibilityLabel={`Add ${player.display_name}`}
                size="sm"
                disabled={pending !== null}
                loading={pending === player.user_id}
                onPress={async () => {
                  if (preview) return;
                  setPending(player.user_id);
                  setError(null);
                  try {
                    await addFriend(player.user_id);
                    setAttempt((value) => value + 1);
                  } catch {
                    setError('Could not add this player. Please try again.');
                  } finally {
                    setPending(null);
                  }
                }}
              />
            ) : (
              <PidroText role="metadata" tone="soft">
                {relationLabel(player.relation)}
              </PidroText>
            )
          }
        />
      ))}
      {!preview && !loading && !error && eligible && results.length === 0 ? (
        <PidroText role="body" tone="soft">
          {search ? 'No players found.' : 'People you play with will appear here.'}
        </PidroText>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({ content: { gap: PidroSpacing.md } });
