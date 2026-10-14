import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';
import { CreateRoomForm, CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { RoomCard } from '@/components/lobby/RoomCard';
import { ruleSetFixture } from '@/features/rules/fixtures';
import { SettingsScreen } from '@/components/settings/SettingsScreen';
import { CtaBadge } from '@/components/home/CtaBadge';
import { LeagueProgress } from '@/components/home/LeagueProgress';
import { RatingPlaque } from '@/components/home/RatingPlaque';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { HomeTileButton } from '@/components/ui/HomeTileButton';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PidroSwitch } from '@/components/ui/PidroSwitch';
import { PlayerAvatar, type PlayerAvatarProps } from '@/components/ui/PlayerAvatar';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroColors, PidroFonts, PidroSpacing } from '@/design/tokens';

/**
 * The DS v2 living gallery. CI screenshots this route and pixel-diffs it
 * against test/ui-baselines — a change to any token or primitive shows up
 * here as drift and is adopted deliberately. The constitution lives in
 * src/design/README.md.
 */
export default function UiDevRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <UiDevHarness />;
}

const noop = () => {};

function SwitchGallery() {
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  return (
    <Surface variant="panel" style={styles.section} padded testID="ui-switch-panel">
      <PidroText role="title">Switches — inset glass</PidroText>
      <PidroText role="metadata" tone="muted">
        Tap to toggle. Tab to a switch to see its focus ring; Space changes its state.
      </PidroText>
      <View style={styles.row}>
        <PidroSwitch accessibilityLabel="Enabled example" value={on} onValueChange={setOn} />
        <PidroSwitch accessibilityLabel="Off example" value={off} onValueChange={setOff} />
        <PidroSwitch accessibilityLabel="Disabled on" value onValueChange={noop} disabled />
        <PidroSwitch
          accessibilityLabel="Disabled off"
          value={false}
          onValueChange={noop}
          disabled
        />
      </View>
    </Surface>
  );
}

const SWATCHES: { name: string; value: string }[] = [
  { name: 'rim-hi', value: PidroBevel.rimHi },
  { name: 'rim', value: PidroBevel.rim },
  { name: 'rim-lo', value: PidroBevel.rimLo },
  { name: 'rim-deep', value: PidroBevel.rimDeep },
  { name: 'text-gold', value: PidroBevel.textGold },
  { name: 'wood-hi', value: PidroBevel.woodHi },
  { name: 'wood', value: PidroBevel.wood },
  { name: 'wood-lo', value: PidroBevel.woodLo },
  { name: 'wood-deep', value: PidroBevel.woodDeep },
  { name: 'keyline', value: PidroBevel.keyline },
  { name: 'panel-hi', value: PidroBevel.panelHi },
  { name: 'panel-deep', value: PidroBevel.panelDeep },
];

const ICON_NAMES: IconName[] = [
  'star',
  'play',
  'friends',
  'chevron-right',
  'bot',
  'spade',
  'offline',
];

// A PNG data URI, not SVG: react-native Image loads PNG on both platforms,
// while an SVG data URI silently falls back to the placeholder on native.
const GALLERY_AVATAR =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mNwrp1HEmIY1TCqYfhqAAC3aV4Q0c128AAAAABJRU5ErkJggg==';

/**
 * Progression HUD sheet. These primitives carry mocked numbers until leagues
 * and levels land server-side — the point of the sheet is that their *shape*
 * is settled, so real data drops in without moving anything.
 */
function ProgressionGallery() {
  return (
    <ScreenShell scroll testID="ui-dev-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title="Progression & HUD"
        subtitle="Identity, earned numbers, and the one badged CTA. Mock values, real layout."
      />

      <Surface testID="ui-progression-panel" variant="window" style={styles.section} padded>
        <PidroText role="title">Identity — player avatar</PidroText>
        <View style={styles.row}>
          <PlayerAvatar uri={GALLERY_AVATAR} size={36} accessibilityLabel="Small avatar" />
          <PlayerAvatar uri={GALLERY_AVATAR} size={46} accessibilityLabel="Default avatar" />
          <PlayerAvatar uri={GALLERY_AVATAR} size={64} accessibilityLabel="Large avatar" />
          <PlayerAvatar uri={null} size={46} accessibilityLabel="Avatar with no photo" />
        </View>
        <PidroText role="metadata" tone="muted">
          The ring keeps its proportion at every size; the last one has no photo. Every part:
          /ui-dev?state=avatars.
        </PidroText>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">Earned numbers — rating plaque</PidroText>
        <View style={styles.row}>
          <RatingPlaque rating={1487} />
          <RatingPlaque rating={12} />
          <RatingPlaque rating={20481} />
        </View>
        <PidroText role="metadata" tone="muted">
          Read-only furniture — never give a plaque press physics.
        </PidroText>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">League progress</PidroText>
        <LeagueProgress progress={0.64} label="LEAGUE III · 9 WINS TO LEAGUE IV" />
        <LeagueProgress progress={0} label="LEAGUE I · 12 WINS TO LEAGUE II" />
        <LeagueProgress progress={1} label="LEAGUE V · TOP OF THE TABLE" />
        <PidroText role="metadata" tone="muted">
          A carved-in well, because progress is recorded, not operated. Clamped to 0–1.
        </PidroText>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">Badged CTA</PidroText>
        <CtaBadge label="FIND A TABLE">
          <BevelButton
            label="PLAY"
            material="wood"
            size="hero"
            weight="hero"
            fullWidth
            onPress={noop}
          />
        </CtaBadge>
        <PidroText role="metadata" tone="muted">
          The badge wraps the control so it anchors to the capped button, not the column.
        </PidroText>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">Icons</PidroText>
        <View style={styles.row}>
          {ICON_NAMES.map((name) => (
            <View key={name} style={styles.swatch}>
              <Icon name={name} size={22} color={PidroColors.iconOnGlass} />
              <PidroText role="metadata" tone="muted">
                {name}
              </PidroText>
            </View>
          ))}
        </View>
        <PidroText role="metadata" tone="muted">
          Screens never inline an SVG path — add the glyph to `Icon` instead.
        </PidroText>
      </Surface>
    </ScreenShell>
  );
}

// Every state one seat can be in, from the Seat-States board.
const SEAT_STATES: (Omit<PlayerAvatarProps, 'size'> & { caption: string })[] = [
  {
    caption: 'The dealer',
    name: 'Kalle',
    level: 18,
    dealer: true,
    status: 'Dealing',
    statusTone: 'now',
  },
  {
    caption: 'Their turn',
    name: 'Mikko',
    level: 12,
    turn: { progress: 0.75 },
    status: 'Bidding…',
    statusTone: 'now',
  },
  {
    caption: 'Bid made',
    name: 'Nora',
    level: 31,
    ring: 'lifetime',
    nameTone: 'partner',
    status: 'Bid 9',
  },
  { caption: 'Passed', name: 'Kalle', level: 18, status: 'Passed', statusTone: 'quiet' },
  {
    caption: 'Won the bid',
    name: 'Nora',
    level: 31,
    ring: 'lifetime',
    nameTone: 'partner',
    turn: { progress: 0.56 },
    status: 'Choosing trump…',
    statusTone: 'now',
  },
  {
    caption: 'Dealer’s second deal',
    name: 'Kalle',
    level: 18,
    dealer: true,
    turn: { progress: 0.89 },
    status: 'Picking cards…',
    statusTone: 'now',
  },
  { caption: 'Waiting: says nothing', name: 'Mikko', level: 12 },
  {
    caption: 'Last 5 seconds',
    name: 'Mikko',
    level: 12,
    turn: { progress: 0.17, urgent: true },
    status: 'Playing…',
    statusTone: 'warning',
  },
  {
    caption: 'Card on the table',
    name: 'Kalle',
    level: 18,
    status: 'Plays A♥',
    accessibilityLabel: 'Kalle, level 18, plays ace of hearts',
  },
  {
    caption: 'Won the last trick',
    name: 'Nora',
    level: 31,
    ring: 'lifetime',
    nameTone: 'partner',
    status: 'Took the trick',
  },
  {
    caption: 'Lost connection',
    name: 'Jussi',
    away: 'reconnecting',
    status: 'Reconnecting…',
    statusTone: 'danger',
  },
  { caption: 'Left mid-game', name: 'Jussi', away: 'bot', status: 'Bot is playing' },
  { caption: 'A bot seat', name: 'Bot', kind: 'bot', status: 'Bid 7', statusTone: 'quiet' },
  {
    caption: 'Before the game',
    kind: 'open',
    name: 'Open seat',
    status: 'Anyone can sit',
    statusTone: 'quiet',
  },
];

/**
 * The avatar sheet: rings, pins, sizes, every seat state and the three label
 * positions. Nobody pays yet, so gold and lifetime appear here and nowhere else.
 */
function AvatarGallery() {
  return (
    <ScreenShell scroll testID="ui-dev-screen" contentStyle={styles.shell}>
      <ScreenHeader
        title="Player avatar"
        subtitle="Ring, pin, level, turn light and dealer chip. Smaller drops parts, never the ring."
      />

      <Surface testID="ui-avatars-panel" variant="window" style={styles.section} padded>
        <PidroText role="title">Ring — supporter or not</PidroText>
        <View style={styles.avatarRow}>
          <PlayerAvatar uri={GALLERY_AVATAR} size={64} level={6} name="Free" status="Glass" />
          <PlayerAvatar
            uri={GALLERY_AVATAR}
            size={64}
            ring="gold"
            level={44}
            name="Supporter"
            status="Gold"
          />
          <PlayerAvatar
            uri={GALLERY_AVATAR}
            size={64}
            ring="lifetime"
            level={27}
            name="Lifetime"
            status="Gold and a gem"
          />
        </View>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">Pin — where you come from</PidroText>
        <View style={styles.avatarRow}>
          <PlayerAvatar uri={GALLERY_AVATAR} size={64} pin="classic" level={44} name="Classic" />
          <PlayerAvatar
            uri={GALLERY_AVATAR}
            size={64}
            pin="founding_tester"
            level={12}
            name="Tester"
          />
          <PlayerAvatar uri={GALLERY_AVATAR} size={64} level={3} name="No pin" />
        </View>
      </Surface>

      <Surface variant="panel" style={styles.section} padded>
        <PidroText role="title">Sizes</PidroText>
        <View style={[styles.avatarRow, styles.sizes]}>
          {[104, 64, 56, 44, 36, 24].map((size) => (
            <View key={size} style={styles.sizeCell}>
              <PlayerAvatar uri={GALLERY_AVATAR} size={size} pin="classic" level={44} />
              <PidroText role="metadata" tone="muted">
                {size}
              </PidroText>
            </View>
          ))}
        </View>
      </Surface>

      <PidroText role="title">At the table</PidroText>
      <View style={styles.seatStates}>
        {SEAT_STATES.map(({ caption, ...seat }) => (
          <View key={caption} style={styles.seatCell}>
            <PlayerAvatar uri={GALLERY_AVATAR} size={56} {...seat} />
            <PidroText role="metadata" tone="muted" align="center">
              {caption}
            </PidroText>
          </View>
        ))}
      </View>

      <PidroText role="title">Label</PidroText>
      <View style={styles.labels}>
        <PlayerAvatar
          uri={GALLERY_AVATAR}
          size={56}
          level={18}
          name="Below"
          status="Phone portrait"
        />
        <PlayerAvatar
          uri={GALLERY_AVATAR}
          size={56}
          level={18}
          label="right"
          name="Right"
          status="Landscape seats"
        />
        <PlayerAvatar
          uri={GALLERY_AVATAR}
          size={56}
          level={18}
          label="left"
          nameTone="you"
          name="Left"
          status="East in landscape"
        />
      </View>
    </ScreenShell>
  );
}

function LobbySeatGallery() {
  const { width, height } = useWindowDimensions();
  const [joined, setJoined] = useState('Choose a seat');
  return (
    <ScreenShell scroll contentStyle={styles.shell}>
      <PidroText role="label">Seat requirement samples — not live restrictions</PidroText>
      <PidroText testID="lobby-gallery-joined">{joined}</PidroText>
      {[undefined, 100, 1000].map((minimum, index) => (
        <RoomCard
          key={index}
          compact={width > height}
          room={{
            code: `SAMPLE${index}`,
            name:
              index === 2 ? 'A very long table name that must stay on one line' : 'Sample table',
            status: 'waiting',
            seats: [
              {
                seat_index: 0,
                status: 'occupied',
                player: { id: 'sample', username: 'AlexandriaLongName' },
              },
            ],
          }}
          minimumGames={minimum ? { west: minimum } : undefined}
          onJoin={(code, position) => setJoined(`${code}: ${position}`)}
        />
      ))}
    </ScreenShell>
  );
}

function UiDevHarness() {
  const params = useLocalSearchParams<{ state?: string; safeArea?: string; fixture?: string }>();
  const state = typeof params.state === 'string' ? params.state : 'components';

  if (state === 'settings') return <SettingsScreen key={params.fixture} onBack={noop} />;
  if (state === 'progression') return <ProgressionGallery />;
  if (state === 'avatars') return <AvatarGallery />;
  if (state === 'lobby-seats') return <LobbySeatGallery />;
  if (state === 'create-safe-area') {
    // Browser-only layout simulation, not evidence of native modal inset measurement.
    // Native checks must use the real Modal + its real provider without fake metrics.
    if (Platform.OS !== 'web') {
      return <CreateRoomModal isOpen onClose={noop} onSubmit={noop} username="Alex" />;
    }
    const presets: Record<string, EdgeInsets> = {
      island: { top: 59, bottom: 34, left: 0, right: 0 },
      'island-left': { top: 0, bottom: 21, left: 59, right: 0 },
      'island-right': { top: 0, bottom: 21, left: 0, right: 59 },
      legacy: { top: 20, bottom: 0, left: 0, right: 0 },
      'android-buttons': { top: 24, bottom: 48, left: 0, right: 0 },
      'android-right': { top: 24, bottom: 0, left: 0, right: 48 },
      'android-gesture': { top: 24, bottom: 24, left: 0, right: 0 },
    };
    const insets = presets[params.safeArea ?? 'island'] ?? presets.island;
    return (
      <SafeAreaInsetsContext.Provider value={insets}>
        <CreateRoomForm
          isOpen
          onClose={noop}
          onSubmit={noop}
          username="Alexandria the Long-Named Player"
        />
      </SafeAreaInsetsContext.Provider>
    );
  }

  return (
    <>
      <ScreenShell scroll testID="ui-dev-screen" contentStyle={styles.shell}>
        <ScreenHeader
          title="Design system gallery"
          subtitle="DS v2 primitives and tokens; static fixtures, no live data."
        />

        <Surface testID="ui-foundation-panel" variant="window" style={styles.section} padded>
          <PidroText style={styles.displaySerif}>Bree Serif display</PidroText>
          <PidroText role="title">A clear screen title</PidroText>
          <PidroText role="label">Control label</PidroText>
          <PidroText role="body" tone="soft">
            Body copy explains the next decision in complete, readable sentences.
          </PidroText>
          <PidroText role="metadata" tone="muted">
            Metadata stays quiet until it is useful.
          </PidroText>
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Bevel buttons — wood</PidroText>
          <View style={styles.row}>
            <BevelButton label="Small" material="wood" size="sm" onPress={noop} />
            <BevelButton label="Medium" material="wood" size="md" onPress={noop} />
            <BevelButton label="Large" material="wood" size="lg" onPress={noop} />
          </View>
          <PidroText role="metadata" tone="muted">
            Hero weight — exactly one per screen:
          </PidroText>
          <BevelButton label="PLAY" material="wood" size="hero" fullWidth onPress={noop} />
          <View style={styles.row}>
            <BevelButton label="Loading" material="wood" size="md" loading onPress={noop} />
            <BevelButton label="Disabled" material="wood" size="md" disabled onPress={noop} />
          </View>
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Bevel buttons — glass</PidroText>
          <View style={styles.row}>
            <BevelButton label="Small" material="glass" size="sm" onPress={noop} />
            <BevelButton label="Medium" material="glass" size="md" onPress={noop} />
            <BevelButton label="Large" material="glass" size="lg" onPress={noop} />
            <BevelButton
              label="Destructive"
              material="glass"
              tone="danger"
              size="md"
              onPress={noop}
            />
            <BevelButton
              accessibilityLabel="Icon button"
              material="glass"
              size="icon"
              onPress={noop}>
              <PidroText role="label">?</PidroText>
            </BevelButton>
          </View>
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Home tiles</PidroText>
          <View style={styles.homeTiles}>
            <HomeTileButton
              material="wood"
              icon={<Icon name="bot" size={30} color={PidroBevel.textGold} />}
              title="Quick game"
              subtitle="You and three bots"
              status="No sign-up"
              onPress={noop}
            />
            <HomeTileButton
              material="glass"
              icon={<Icon name="friends" size={30} />}
              title="Play online"
              subtitle="Real players"
              status="Needs a free account"
              onPress={noop}
            />
          </View>
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Match results</PidroText>
          <View style={styles.row}>
            <PidroText role="score" tone="gold">
              64
            </PidroText>
            <PidroText role="score">−12</PidroText>
          </View>
          <View style={styles.row}>
            <BevelButton accessibilityLabel="Home" material="glass" size="icon" onPress={noop}>
              <Icon name="home" size={24} />
            </BevelButton>
            <BevelButton
              label="Rematch"
              leadingIcon={<Icon name="rematch" color={PidroBevel.textGold} size={22} />}
              onPress={noop}
            />
          </View>
        </Surface>

        <SwitchGallery />

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Inputs — carved-in wells</PidroText>
          <Input
            label="Table name"
            placeholder="Enter a table name"
            value="A friendly Friday table"
            editable={false}
          />
          <Input
            label="Password"
            placeholder="Your password"
            value="secret"
            editable={false}
            secureTextEntry
            revealPassword
          />
          <Input
            label="With an error"
            placeholder="Something required"
            value=""
            editable={false}
            error="Enter a value."
          />
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Sign-in providers</PidroText>
          <AuthProviderButtons
            availability={{ apple: false, facebook: true }}
            onApple={noop}
            onFacebook={noop}
            onEmail={noop}
          />
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Bevel tokens</PidroText>
          <View style={styles.row}>
            {SWATCHES.map((swatch) => (
              <View key={swatch.name} style={styles.swatch}>
                <View style={[styles.swatchChip, { backgroundColor: swatch.value }]} />
                <PidroText role="metadata" tone="muted">
                  {swatch.name}
                </PidroText>
              </View>
            ))}
          </View>
        </Surface>

        <Surface variant="panel" style={styles.section} padded>
          <PidroText role="title">Legacy buttons — migrate away</PidroText>
          <View style={styles.row}>
            <Button label="Secondary" variant="secondary" onPress={noop} style={styles.action} />
            <Button label="Quiet" variant="outline" onPress={noop} style={styles.action} />
            <Button
              label="Destructive"
              variant="destructive"
              onPress={noop}
              style={styles.action}
            />
            <Button label="Link action" variant="link" onPress={noop} style={styles.action} />
          </View>
        </Surface>

        <DecisionWindow
          testID="decision-window-preview"
          title="Decision window"
          description="Context comes first, then choices, then a stable action footer."
          footer={
            <>
              <BevelButton label="Cancel" material="glass" size="md" onPress={noop} />
              <BevelButton label="Confirm" material="wood" size="md" onPress={noop} />
            </>
          }>
          <Surface variant="subtle" padded>
            <PidroText role="body" tone="soft">
              The same anatomy is used for creating tables and making game decisions.
            </PidroText>
          </Surface>
        </DecisionWindow>
      </ScreenShell>

      <CreateRoomModal
        isOpen={state === 'create' || state === 'create-seat'}
        initialSeat={state === 'create-seat' ? 'seat_3' : null}
        key={params.fixture}
        initialRuleSet={ruleSetFixture(params.fixture)}
        onClose={noop}
        onSubmit={noop}
        username="Alexandria the Long-Named Player"
      />
    </>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: PidroSpacing.md,
  },
  section: {
    gap: PidroSpacing.sm,
  },
  displaySerif: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 30,
    lineHeight: 38,
    color: PidroBevel.textGold,
    textShadowColor: 'rgba(20, 8, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  homeTiles: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row',
    gap: PidroSpacing.sm,
    alignSelf: 'center',
  },
  action: {
    minWidth: 130,
  },
  avatarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    rowGap: PidroSpacing.md,
    paddingTop: PidroSpacing.xs,
  },
  sizes: {
    alignItems: 'flex-end',
  },
  sizeCell: {
    alignItems: 'center',
    gap: PidroSpacing.sm,
  },
  seatStates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    rowGap: PidroSpacing.lg,
    paddingTop: PidroSpacing.xs,
  },
  seatCell: {
    width: 116,
    alignItems: 'center',
    gap: PidroSpacing.xs,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: PidroSpacing.md,
    paddingTop: PidroSpacing.xs,
  },
  swatch: {
    alignItems: 'center',
    gap: 2,
    width: 72,
  },
  swatchChip: {
    width: 64,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});
