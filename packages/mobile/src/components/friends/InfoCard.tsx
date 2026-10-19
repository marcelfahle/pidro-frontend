/**
 * A quiet card among the friend rows: a title, a line or two, and one light
 * action ("38 of your Classic friends aren't here yet" · Tell them about the
 * new app). The action is an `ActionPill`, left-aligned under the copy.
 */
import { StyleSheet, View } from 'react-native';
import { ActionPill, type ActionPillProps } from '@/components/ui/ActionPill';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors } from '@/design/tokens';

export interface InfoCardProps {
  title: string;
  body: string;
  action: ActionPillProps;
  testID?: string;
}

export function InfoCard({ title, body, action, testID }: InfoCardProps) {
  return (
    <Surface variant="window" testID={testID} style={styles.card}>
      <View style={styles.copy}>
        <PidroText role="label" accessibilityRole="header" style={styles.title}>
          {title}
        </PidroText>
        <PidroText role="body" style={styles.body}>
          {body}
        </PidroText>
      </View>
      <ActionPill {...action} style={[styles.action, action.style]} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  copy: { gap: 4 },
  title: { fontSize: 16, lineHeight: 21 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: PidroColors.textSoft },
  action: { alignSelf: 'flex-start', maxWidth: '100%' },
});
