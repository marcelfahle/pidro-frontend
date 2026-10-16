/**
 * The persistent app shell: five top-level tabs behind one floating glass
 * pill (Liquid-Glass style — detached, inset, content behind it). Tab
 * switches replace in place; the game, lobby and join flows push OVER the
 * shell full-screen, so the pill never competes with the table.
 */
import { Slot, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FixtureInsets } from '@/components/dev/FixtureInsets';
import { TabPill, usePillClearance, type ShellTab } from '@/components/shell/TabPill';
import { UpdateNotice } from '@/components/shell/UpdateNotice';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { PidroColors } from '@/design/tokens';
import { useAuthStore } from '@/stores/auth';
import { useLobbyStore } from '@/stores/lobby';
import { gameRoute } from '@/navigation/gameRoute';
import { seatInvitationsFixture } from '@/features/lobby/fixtures';
import { useLobbyChannel } from '@/channels/hooks/useLobbyChannel';

const TAB_ROUTES: Record<ShellTab, string> = {
  league: '/league',
  stats: '/profile',
  table: '/home',
  friends: '/friends',
  settings: '/settings',
};

function activeTabForPath(pathname: string): ShellTab {
  if (pathname.startsWith('/league')) return 'league';
  if (pathname.startsWith('/profile') || pathname.startsWith('/blocked-players')) return 'stats';
  if (pathname.startsWith('/friends')) return 'friends';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'table';
}

export default function ShellLayout() {
  // Dev fixtures: `?fixture=update-notice` forces the notice, `?safeArea=` fakes insets.
  const params = useGlobalSearchParams<{ fixture?: string; safeArea?: string }>();
  return (
    <FixtureInsets preset={__DEV__ ? params.safeArea : undefined}>
      <Shell
        forceUpdateNotice={__DEV__ && params.fixture === 'update-notice'}
        fixtureInvitationCount={seatInvitationsFixture(params.fixture)?.length}
      />
    </FixtureInsets>
  );
}

function Shell({
  forceUpdateNotice,
  fixtureInvitationCount,
}: {
  forceUpdateNotice: boolean;
  fixtureInvitationCount?: number;
}) {
  useLobbyChannel();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const router = useRouter();
  const pathname = usePathname();
  const active = activeTabForPath(pathname);
  const reduceMotion = useReducedMotion();
  const guest = useAuthStore((state) => Boolean(state.user?.guest));
  const invitationCount = useAuthStore((state) => state.seatInvitations.length);
  const rejoinable = useLobbyStore((state) => state.lobby.my_rejoinable);
  const waitingGame = rejoinable.length > 0 ? rejoinable[0] : null;
  const insets = useSafeAreaInsets();
  const pillClearance = usePillClearance();
  const update = useAppUpdate({
    // The game pushes over the shell; never offer a restart from under the table.
    inGame: pathname.startsWith('/game'),
    forced: forceUpdateNotice,
  });

  const handleSelect = (tab: ShellTab) => {
    if (tab === 'table') {
      // The Table anchor is the way back — to your live game when one is
      // waiting, to home otherwise.
      if (waitingGame?.code) {
        router.push(gameRoute(waitingGame.code));
        return;
      }
      if (active !== 'table') router.replace('/home');
      return;
    }
    if (tab !== active) router.replace(TAB_ROUTES[tab] as never);
  };

  return (
    <View style={styles.root}>
      {update.visible ? (
        <UpdateNotice
          restarting={update.restarting}
          onRestart={update.restart}
          onDismiss={update.dismiss}
          rightClearance={guest ? 0 : pillClearance.right}
        />
      ) : null}
      {/* The notice takes the top inset, so the screen below it must not add it again. */}
      <SafeAreaInsetsContext.Provider value={update.visible ? { ...insets, top: 0 } : insets}>
        {/* 160ms opacity-only cross-fade on tab switch: cheap on old GPUs,
            skipped under Reduce Motion. The pill stays outside the fade. */}
        <Animated.View
          key={active}
          style={styles.root}
          entering={reduceMotion ? undefined : FadeIn.duration(140)}>
          <Slot />
        </Animated.View>
      </SafeAreaInsetsContext.Provider>
      {!guest ? (
        <TabPill
          orientation={landscape ? 'rail' : 'bottom'}
          active={active}
          tableBadge={Boolean(waitingGame)}
          invitationCount={fixtureInvitationCount ?? invitationCount}
          onSelect={handleSelect}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PidroColors.feltBottom,
  },
});
