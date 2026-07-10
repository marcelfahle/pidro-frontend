import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CreateRoomModal } from '@/components/lobby/CreateRoomModal';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroSpacing } from '@/design/tokens';

export default function UiDevRoute() {
  if (!__DEV__) return <Redirect href="/home" />;
  return <UiDevHarness />;
}

function UiDevHarness() {
  const params = useLocalSearchParams<{ state?: string }>();
  const state = typeof params.state === 'string' ? params.state : 'components';

  return (
    <>
      <ScreenShell scroll testID="ui-dev-screen" contentStyle={styles.shell}>
        <ScreenHeader
          title="Interface preview"
          subtitle="Static development fixtures; no live account or game data."
        />

        <Surface testID="ui-foundation-panel" variant="window" style={styles.section} padded>
          <PidroText role="display">Display</PidroText>
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
          <PidroText role="title">Actions</PidroText>
          <View style={styles.actions}>
            <Button label="Primary action" onPress={() => {}} style={styles.action} />
            <Button
              label="Secondary action"
              variant="secondary"
              onPress={() => {}}
              style={styles.action}
            />
            <Button
              label="Quiet action"
              variant="outline"
              onPress={() => {}}
              style={styles.action}
            />
            <Button
              label="Destructive action"
              variant="destructive"
              onPress={() => {}}
              style={styles.action}
            />
            <Button label="Loading" loading onPress={() => {}} style={styles.action} />
            <Button label="Disabled" disabled onPress={() => {}} style={styles.action} />
          </View>
        </Surface>

        <View style={styles.cards}>
          <Card>
            <CardHeader>
              <CardTitle>Table card</CardTitle>
            </CardHeader>
            <CardContent>
              <PidroText role="body" tone="soft">
                Cards group related information without becoming a second window.
              </PidroText>
            </CardContent>
          </Card>
          <Surface variant="plaque" style={styles.longText}>
            <PidroText role="label" numberOfLines={2}>
              A deliberately long player name that must remain balanced and readable
            </PidroText>
            <PidroText role="metadata" tone="cyan">
              Connected · Waiting for the next hand
            </PidroText>
          </Surface>
        </View>

        <Input
          label="Table name"
          placeholder="Enter a table name"
          value="A friendly Friday table"
          editable={false}
        />

        <DecisionWindow
          testID="decision-window-preview"
          title="Decision window"
          description="Context comes first, then choices, then a stable action footer."
          footer={
            <>
              <Button label="Cancel" variant="outline" onPress={() => {}} />
              <Button label="Confirm" onPress={() => {}} />
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
        onClose={() => {}}
        onSubmit={() => {}}
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
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  action: {
    minWidth: 150,
    flexGrow: 1,
  },
  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PidroSpacing.sm,
  },
  longText: {
    minWidth: 260,
    flex: 1,
    gap: PidroSpacing.xs,
    padding: PidroSpacing.md,
  },
});
