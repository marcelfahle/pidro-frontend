import { useRef, useState, type KeyboardEvent } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { PidroBevel, PidroColors, PidroRadii } from '@/design/tokens';
import { playSelectionHaptic } from '@/utils/haptics';

export interface ChoiceItem {
  id: string;
  title: string;
  subtitle: string;
  shortSubtitle?: string;
  icon?: IconName;
  badge?: string;
  kind?: 'choice' | 'deeper';
}

export interface ChoiceSection {
  title: string;
  items: readonly ChoiceItem[];
}

export interface ChoiceListProps {
  label: string;
  sections: readonly ChoiceSection[];
  selectedId: string;
  onSelect: (id: string) => void;
  onNavigate: (id: string) => void;
  compact?: boolean;
}

export function ChoiceList({
  label,
  sections,
  selectedId,
  onSelect,
  onNavigate,
  compact = false,
}: ChoiceListProps) {
  const [focused, setFocused] = useState<string>();
  const refs = useRef<Record<string, View | null>>({});
  const choices = sections
    .flatMap((section) => section.items)
    .filter((item) => item.kind !== 'deeper');
  const radioTabStop =
    choices.find((item) => item.id === focused)?.id ??
    choices.find((item) => item.id === selectedId)?.id ??
    choices[0]?.id;
  const displayed = compact ? [{ title: '', items: choices }] : sections;
  const activate = (item: ChoiceItem) => {
    const handler = item.kind === 'deeper' ? onNavigate : onSelect;
    playSelectionHaptic();
    handler(item.id);
  };
  return (
    <View
      testID="choice-list"
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={styles.list}>
      {displayed.map((section, index) => (
        <View key={index} style={styles.section}>
          {!compact && (
            <PidroText role="eyebrow" tone="cyan" style={styles.heading}>
              {section.title}
            </PidroText>
          )}
          <View style={styles.group}>
            {section.items.map((item) => {
              const deeper = item.kind === 'deeper';
              const checked = item.id === selectedId;
              return (
                <PressableFX
                  key={item.id}
                  ref={(ref) => {
                    refs.current[item.id] = ref;
                  }}
                  accessibilityRole={deeper ? 'button' : 'radio'}
                  accessibilityLabel={`${item.title}, ${compact ? (item.shortSubtitle ?? item.subtitle) : item.subtitle}`}
                  accessibilityState={deeper ? { selected: checked } : { checked }}
                  tabIndex={deeper || item.id === radioTabStop ? 0 : -1}
                  {...(!deeper ? { 'aria-checked': checked } : {})}
                  {...(Platform.OS === 'web' && !deeper
                    ? {
                        onKeyDown: (event: KeyboardEvent) => {
                          const step =
                            event.key === 'ArrowDown' || event.key === 'ArrowRight'
                              ? 1
                              : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
                                ? -1
                                : 0;
                          if (!step && event.key !== ' ' && event.key !== 'Enter') return;
                          event.preventDefault();
                          const next =
                            choices[
                              (choices.findIndex((choice) => choice.id === item.id) +
                                step +
                                choices.length) %
                                choices.length
                            ];
                          refs.current[next.id]?.focus();
                          if (!step && !event.repeat) activate(next);
                        },
                      }
                    : {})}
                  onFocus={() => setFocused(item.id)}
                  onBlur={() => setFocused(undefined)}
                  onPress={() => activate(item)}
                  style={[
                    styles.row,
                    compact && styles.compactRow,
                    checked && styles.selected,
                    focused === item.id && styles.focused,
                  ]}
                  pressedStyle={styles.pressed}>
                  {!compact && (
                    <View style={styles.icon}>
                      {item.badge ? (
                        <PidroText role="metadata" tone="cyan">
                          {item.badge}
                        </PidroText>
                      ) : item.icon ? (
                        <Icon name={item.icon} size={18} color={PidroColors.iconOnGlass} />
                      ) : null}
                    </View>
                  )}
                  <View style={styles.copy}>
                    <PidroText role="label">{item.title}</PidroText>
                    <PidroText role="metadata" tone="soft">
                      {compact ? (item.shortSubtitle ?? item.subtitle) : item.subtitle}
                    </PidroText>
                  </View>
                  {deeper ? (
                    <Icon name="chevron-right" size={20} color={PidroColors.textSoft} />
                  ) : (
                    <View style={[styles.radio, checked && styles.checked]}>
                      {checked && <View style={styles.dot} />}
                    </View>
                  )}
                </PressableFX>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  section: { gap: 6 },
  heading: { paddingHorizontal: 8 },
  group: {
    backgroundColor: PidroColors.panelSoft,
    borderWidth: 1,
    borderColor: PidroColors.border,
    borderRadius: PidroRadii.lg,
    padding: 4,
  },
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: PidroRadii.panel,
  },
  compactRow: { minHeight: 46, paddingVertical: 4, gap: 8 },
  selected: { backgroundColor: PidroColors.goldSoft },
  pressed: { backgroundColor: PidroColors.actionPill },
  focused: { boxShadow: PidroColors.focusRing },
  icon: {
    width: 36,
    height: 36,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.actionPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: PidroRadii.full,
    borderWidth: 2,
    borderColor: PidroColors.radioOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { borderColor: PidroBevel.rim },
  dot: {
    width: 12,
    height: 12,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroBevel.textGold,
  },
});
