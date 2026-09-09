import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { AuthProviderButtons } from '@/components/auth/AuthProviderButtons';
import { BevelButton } from '@/components/ui/BevelButton';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroBevel, PidroFonts, PidroSpacing } from '@/design/tokens';

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

function UiDevHarness() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state = typeof params.state === 'string' ? params.state : 'components';

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
            <Button label="Link" variant="link" onPress={noop} />
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
