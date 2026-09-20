import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { CtaBadge } from '@/components/home/CtaBadge';
import { LeagueProgress } from '@/components/home/LeagueProgress';
import { LevelRing } from '@/components/home/LevelRing';
import { RatingPlaque } from '@/components/home/RatingPlaque';
import { Icon, type IconName } from '@/components/ui/Icon';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
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

const ICON_NAMES: IconName[] = ['star', 'play', 'friends'];

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
        <PidroText role="title">Identity — level ring</PidroText>
        <View style={styles.row}>
          <LevelRing uri={GALLERY_AVATAR} size={36} accessibilityLabel="Small level ring" />
          <LevelRing uri={GALLERY_AVATAR} accessibilityLabel="Default level ring" />
          <LevelRing uri={GALLERY_AVATAR} size={64} accessibilityLabel="Large level ring" />
          <LevelRing uri={null} accessibilityLabel="Level ring with no photo" />
        </View>
        <PidroText role="metadata" tone="muted">
          The rim keeps its proportion at every size; the last one has no photo.
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

function UiDevHarness() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state = typeof params.state === 'string' ? params.state : 'components';

  if (state === 'progression') return <ProgressionGallery />;

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
              accessibilityLabel="Icon button"
              material="glass"
              size="icon"
              onPress={noop}>
              <PidroText role="label">?</PidroText>
            </BevelButton>
          </View>
        </Surface>

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
            variant="compact"
            showEmail={false}
            forcePlatform="ios"
            onApple={noop}
            onGoogle={noop}
            onFacebook={noop}
          />
          <AuthProviderButtons
            forcePlatform="ios"
            onApple={noop}
            onGoogle={noop}
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
        isOpen={state === 'create'}
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
  action: {
    minWidth: 130,
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
