/**
 * The hand read back, from the plaque's ticker: bids in order, trump, each
 * trick (its plays, who took it, what it was worth) and the result. Between
 * hands the finished hand comes first. It shows the hand log's lines and adds
 * nothing of its own.
 */
import { StyleSheet, View } from 'react-native';
import { PidroText } from '@/components/ui/PidroText';
import { PidroColors, PidroRadii, PidroSpacing } from '@/design/tokens';
import type { HandLogEntry, HandLogGroup } from '@/game/handLog';
import { TableUtilityWindow } from './TableUtilityWindow';

type Section = { key: string; title: string | null; entries: HandLogEntry[] };

/** Where an entry goes: bids and trump open a hand, each trick gets its own heading. */
function sectionFor(entry: HandLogEntry): { key: string; title: string | null } {
  if (entry.kind === 'result') return { key: 'result', title: null };
  if (entry.trick != null) return { key: `trick-${entry.trick}`, title: `Trick ${entry.trick}` };
  if (entry.kind === 'trump') return { key: 'trump', title: null };
  return { key: 'bids', title: 'Bids' };
}

function sections(group: HandLogGroup): Section[] {
  const out: Section[] = [];
  for (const entry of group.entries) {
    const { key, title } = sectionFor(entry);
    const last = out[out.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else out.push({ key, title, entries: [entry] });
  }
  return out;
}

export function HandLogWindow({
  open,
  onClose,
  groups,
}: {
  open: boolean;
  onClose: () => void;
  groups: HandLogGroup[];
}) {
  return (
    <TableUtilityWindow title="This hand" open={open} onClose={onClose} followEnd>
      {groups.length === 0 ? (
        <PidroText role="metadata" tone="muted" align="center" style={styles.empty}>
          Nothing yet this hand
        </PidroText>
      ) : (
        groups.map((group) => (
          <View key={group.hand} testID={`hand-log-${group.hand}`} style={styles.group}>
            <PidroText role="label" tone="gold" accessibilityRole="header">
              {groups.length > 1 && group.finished
                ? `Last hand (${group.hand})`
                : `Hand ${group.hand}`}
            </PidroText>
            {sections(group).map((section) => (
              <View key={section.key} style={styles.section}>
                {section.title ? (
                  <PidroText role="metadata" tone="muted" accessibilityRole="header">
                    {section.title}
                  </PidroText>
                ) : null}
                {section.entries.map((entry) => (
                  <PidroText
                    key={entry.id}
                    testID={`hand-log-entry-${entry.id}`}
                    role={entry.kind === 'result' || entry.kind === 'trick' ? 'label' : 'body'}
                    tone={entry.ours ? 'gold' : 'default'}
                    style={entry.kind === 'result' ? styles.result : null}>
                    {entry.text}
                  </PidroText>
                ))}
              </View>
            ))}
          </View>
        ))
      )}
    </TableUtilityWindow>
  );
}

const styles = StyleSheet.create({
  empty: { paddingVertical: PidroSpacing.sm },
  group: { gap: PidroSpacing.xs },
  section: {
    gap: 2,
    borderRadius: PidroRadii.tight,
    backgroundColor: PidroColors.panel,
    paddingHorizontal: PidroSpacing.xs,
    paddingVertical: 6,
  },
  result: { fontWeight: '800' },
});
