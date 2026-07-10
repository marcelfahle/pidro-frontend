import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Switch, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BotDifficulty, CreateRoomRequest, SeatType } from '@/types/lobby';
import { Button } from '@/components/ui/Button';
import { DecisionWindow } from '@/components/ui/DecisionWindow';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';

type SeatToggle = 'open' | 'ai';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomRequest) => void;
  isLoading?: boolean;
  username?: string;
  error?: string | null;
}

const DIFFICULTIES: { value: BotDifficulty; label: string }[] = [
  { value: 'random', label: 'Casual' },
  { value: 'basic', label: 'Regular' },
  { value: 'smart', label: 'Strong' },
];

export function CreateRoomModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  username,
  error,
}: CreateRoomModalProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [seat2, setSeat2] = useState<SeatToggle>('open');
  const [seat3, setSeat3] = useState<SeatToggle>('open');
  const [seat4, setSeat4] = useState<SeatToggle>('open');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('basic');

  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset hidden form after dismissal
      setName('');
      setIsPrivate(false);
      setPassword('');
      setSeat2('open');
      setSeat3('open');
      setSeat4('open');
      setBotDifficulty('basic');
    }
  }, [isOpen]);

  const seats = [seat2, seat3, seat4];
  const hasBot = seats.some((seat) => seat === 'ai');

  const handleSubmit = () => {
    if (isLoading) return;
    onSubmit({
      name: name.trim() || `${username ?? 'Player'}'s table`,
      settings: {
        min_games: 1,
        time_limit: 0,
        private: isPrivate,
        password: isPrivate ? password : undefined,
      },
      seats: {
        seat_2: seat2 as SeatType,
        seat_3: seat3 as SeatType,
        seat_4: seat4 as SeatType,
      },
      ...(hasBot ? { bot_difficulty: botDifficulty } : {}),
    });
  };

  const footer = (
    <>
      <Button
        label="Cancel"
        variant="outline"
        onPress={onClose}
        disabled={isLoading}
        style={styles.footerButton}
      />
      <Button
        label="Create table"
        onPress={handleSubmit}
        loading={isLoading}
        style={styles.footerButton}
      />
    </>
  );

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!isLoading) onClose();
      }}>
      <SafeAreaView style={styles.backdrop} edges={['top', 'right', 'bottom', 'left']}>
        <DecisionWindow
          testID="create-room-window"
          title="Create a table"
          description={
            landscape ? undefined : 'Choose who takes each seat. You can change open seats to bots.'
          }
          footer={footer}
          scrollable
          compact={landscape}
          style={[styles.window, { maxHeight: Math.max(280, height - PidroSpacing.md * 2) }]}>
          <View style={[styles.columns, landscape && styles.columnsLandscape]}>
            <View style={[styles.column, landscape && styles.columnLandscape]}>
              <Input
                label="Table name"
                value={name}
                onChangeText={setName}
                placeholder={`${username ?? 'Player'}'s table`}
                editable={!isLoading}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              <View style={styles.section}>
                <PidroText role="label">Seats</PidroText>
                <View style={[styles.seatGrid, landscape && styles.seatGridLandscape]}>
                  <SeatRow
                    seatNumber={1}
                    label={username ?? 'You'}
                    value="host"
                    compact={landscape}
                  />
                  <SeatRow
                    seatNumber={2}
                    label="Seat 2"
                    value={seat2}
                    onChange={setSeat2}
                    disabled={isLoading}
                    compact={landscape}
                  />
                  <SeatRow
                    seatNumber={3}
                    label="Seat 3"
                    value={seat3}
                    onChange={setSeat3}
                    disabled={isLoading}
                    compact={landscape}
                  />
                  <SeatRow
                    seatNumber={4}
                    label="Seat 4"
                    value={seat4}
                    onChange={setSeat4}
                    disabled={isLoading}
                    compact={landscape}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.column, landscape && styles.columnLandscape]}>
              {hasBot ? (
                <View style={styles.section}>
                  <PidroText role="label">Bot strength</PidroText>
                  <View style={styles.segmented}>
                    {DIFFICULTIES.map(({ value, label }) => (
                      <Segment
                        key={value}
                        label={label}
                        selected={botDifficulty === value}
                        onPress={() => setBotDifficulty(value)}
                        disabled={isLoading}
                      />
                    ))}
                  </View>
                </View>
              ) : (
                <Surface variant="subtle" style={styles.hint}>
                  <PidroText role="metadata" tone="muted">
                    Choose Bot for any open seat to set the bot strength.
                  </PidroText>
                </Surface>
              )}

              <Surface variant="subtle" style={styles.privateRow}>
                <View style={styles.privateCopy}>
                  <PidroText role="label">Private table</PidroText>
                  <PidroText role="metadata" tone="muted">
                    Require a password to join.
                  </PidroText>
                </View>
                <Switch
                  accessibilityLabel="Private table"
                  value={isPrivate}
                  onValueChange={setIsPrivate}
                  disabled={isLoading}
                  trackColor={{ false: PidroColors.switchTrackOff, true: PidroColors.cyan }}
                  thumbColor={isPrivate ? PidroColors.ink : PidroColors.text}
                  style={styles.switch}
                />
              </Surface>

              {isPrivate ? (
                <Input
                  label="Password"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter a table password"
                  secureTextEntry
                  editable={!isLoading}
                />
              ) : null}

              {error ? (
                <Surface variant="subtle" style={styles.error} accessibilityRole="alert">
                  <PidroText role="metadata" tone="danger">
                    {error}
                  </PidroText>
                </Surface>
              ) : null}
            </View>
          </View>
        </DecisionWindow>
      </SafeAreaView>
    </Modal>
  );
}

function SeatRow({
  seatNumber,
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  seatNumber: number;
  label: string;
  value: SeatToggle | 'host';
  onChange?: (value: SeatToggle) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Surface variant="subtle" style={[styles.seatRow, compact && styles.seatRowCompact]}>
      <View style={styles.seatNumber}>
        <PidroText role="metadata" tone="cyan">
          {seatNumber}
        </PidroText>
      </View>
      {compact && value !== 'host' ? null : (
        <View style={styles.seatCopy}>
          <PidroText role="label" numberOfLines={1}>
            {label}
          </PidroText>
          {value === 'host' ? (
            <PidroText role="metadata" tone="gold">
              Host
            </PidroText>
          ) : null}
        </View>
      )}
      {value !== 'host' && onChange ? (
        <View style={styles.seatOptions}>
          <Segment
            label="Open"
            accessibilityLabel={`Seat ${seatNumber} open`}
            compact={compact}
            selected={value === 'open'}
            onPress={() => onChange('open')}
            disabled={disabled}
          />
          <Segment
            label="Bot"
            accessibilityLabel={`Seat ${seatNumber} bot`}
            compact={compact}
            selected={value === 'ai'}
            onPress={() => onChange('ai')}
            disabled={disabled}
          />
        </View>
      ) : null}
    </Surface>
  );
}

function Segment({
  label,
  accessibilityLabel,
  selected,
  onPress,
  disabled,
  compact = false,
}: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <PressableFX
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.segment,
        compact && styles.segmentCompact,
        selected && styles.segmentSelected,
        disabled && styles.disabled,
      ]}
      pressedStyle={styles.segmentPressed}>
      <PidroText role="metadata" tone={selected ? 'gold' : 'soft'}>
        {label}
      </PidroText>
    </PressableFX>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.backdrop,
    padding: PidroSpacing.xs,
  },
  window: {
    maxWidth: 820,
  },
  columns: {
    gap: PidroSpacing.md,
  },
  columnsLandscape: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  column: {
    minWidth: 0,
    gap: PidroSpacing.md,
  },
  columnLandscape: {
    flex: 1,
  },
  section: {
    gap: PidroSpacing.xs,
  },
  seatGrid: {
    gap: PidroSpacing.xs,
  },
  seatGridLandscape: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  seatRow: {
    minHeight: PidroLayout.touchTarget + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.xs,
  },
  seatRowCompact: {
    width: '48.8%',
  },
  seatNumber: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.tight,
    backgroundColor: PidroColors.panel,
  },
  seatCopy: {
    minWidth: 0,
    flex: 1,
  },
  seatOptions: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.border,
  },
  segmented: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: PidroRadii.surface,
    borderWidth: 1,
    borderColor: PidroColors.border,
  },
  segment: {
    minWidth: 66,
    minHeight: PidroLayout.touchTarget,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.panel,
    paddingHorizontal: PidroSpacing.xs,
  },
  segmentCompact: {
    minWidth: 44,
    paddingHorizontal: PidroSpacing.xxs,
  },
  segmentSelected: {
    backgroundColor: PidroColors.goldSoft,
  },
  segmentPressed: {
    opacity: 0.76,
  },
  hint: {
    padding: PidroSpacing.sm,
  },
  privateRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.sm,
  },
  privateCopy: {
    minWidth: 0,
    flex: 1,
  },
  switch: {
    minWidth: PidroLayout.touchTarget,
    minHeight: PidroLayout.touchTarget,
  },
  error: {
    borderColor: PidroColors.dangerBorder,
    padding: PidroSpacing.sm,
  },
  footerButton: {
    minWidth: 128,
    flex: 1,
  },
  disabled: {
    opacity: 0.48,
  },
});
