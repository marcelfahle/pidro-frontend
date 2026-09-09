/**
 * The persistent app shell: five top-level tabs behind one floating glass
 * pill (Liquid-Glass style — detached, inset, content behind it). Tab
 * switches replace in place; the game, lobby and join flows push OVER the
 * shell full-screen, so the pill never competes with the table.
 */
import { Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { TabPill, type ShellTab } from '@/components/shell/TabPill';
import { useLobbyStore } from '@/stores/lobby';
import { gameRoute } from '@/navigation/gameRoute';

const TAB_ROUTES: Record<ShellTab, string> = {
  league: '/league',
  stats: '/profile',
  table: '/home',
  friends: '/friends',
  settings: '/settings',
};

function activeTabForPath(pathname: string): ShellTab {
  if (pathname.startsWith('/league')) return 'league';
  if (pathname.startsWith('/profile')) return 'stats';
  if (pathname.startsWith('/friends')) return 'friends';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'table';
}

export default function ShellLayout() {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const router = useRouter();
  const pathname = usePathname();
  const active = activeTabForPath(pathname);
  const rejoinable = useLobbyStore((state) => state.lobby.my_rejoinable);
  const waitingGame = rejoinable.length > 0 ? rejoinable[0] : null;

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
      <Slot />
      <TabPill
        orientation={landscape ? 'rail' : 'bottom'}
        active={active}
        tableBadge={Boolean(waitingGame)}
        onSelect={handleSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
