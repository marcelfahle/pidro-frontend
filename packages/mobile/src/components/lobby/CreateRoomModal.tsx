import { useState } from 'react';
import { Keyboard, Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { clampRoomName } from '@pidro/shared';
import type { CreateRoomRequest } from '@/types/lobby';
import { LevelRing } from '@/components/home/LevelRing';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroLayout, PidroRadii, PidroSpacing } from '@/design/tokens';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateRoomRequest) => void;
  isLoading?: boolean;
  username?: string;
  avatarUrl?: string | null;
  error?: string | null;
}

type SeatKey = 'seat_2' | 'seat_3' | 'seat_4';
type SeatType = 'open' | 'ai';

export function CreateRoomModal(props: CreateRoomModalProps) {
  // Unmount the draft on dismissal: no stale seat choices or preview passwords on reopen.
  if (!props.isOpen) return null;
  return (
    <Modal
      visible
      supportedOrientations={['portrait', 'landscape']}
      animationType="none"
      onRequestClose={() => {
        if (!props.isLoading) props.onClose();
      }}>
      {/* A native modal is a separate native root; the app provider is not its ancestor. */}
      <SafeAreaProvider>
        <CreateRoomForm {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

export function CreateRoomForm({
  onClose,
  onSubmit,
  isLoading = false,
  username,
  avatarUrl,
  error,
}: CreateRoomModalProps) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [seats, setSeats] = useState<Record<SeatKey, SeatType>>({
    seat_2: 'open',
    seat_3: 'open',
    seat_4: 'open',
  });
  const [expanded, setExpanded] = useState<SeatKey | null>(null);
  const [rules, setRules] = useState(false);
  const [inviteNotice, setInviteNotice] = useState(false);

  const submit = () => {
    if (isLoading || rules) return;
    Keyboard.dismiss();
    onSubmit({
      name: clampRoomName(`${username ?? 'Player'}'s table`),
      seats,
    });
  };

  const seat = (key: SeatKey, label: string) => (
    <Surface variant="subtle" key={key}>
      <PressableFX
        accessibilityRole="button"
        accessibilityLabel={`Edit ${label}: ${seats[key] === 'ai' ? 'Bot' : 'Open to public'}`}
        accessibilityState={{ expanded: expanded === key, disabled: isLoading }}
        aria-expanded={expanded === key}
        disabled={isLoading}
        onPress={() => {
          Keyboard.dismiss();
          setExpanded(expanded === key ? null : key);
          setRules(false);
          setInviteNotice(false);
        }}
        style={styles.seatRow}>
        <View style={styles.placeholder}>
          <Icon name={seats[key] === 'ai' ? 'bot' : 'friends'} size={24} />
        </View>
        <View style={styles.copy}>
          <PidroText role="label" numberOfLines={1}>
            {label}
          </PidroText>
          <PidroText role="metadata" tone="soft" accessibilityLiveRegion="polite">
            {seats[key] === 'ai' ? 'Bot' : 'Open to public'}
          </PidroText>
        </View>
        <View style={expanded === key && styles.expandedChevron}>
          <Icon name="chevron-right" size={20} />
        </View>
      </PressableFX>
      {expanded === key ? (
        <View style={styles.editor}>
          <View style={styles.choices}>
            {(['open', 'ai'] as const).map((value) => (
              <BevelButton
                key={value}
                material="glass"
                size="sm"
                label={`${seats[key] === value ? '✓ ' : ''}${value === 'open' ? 'Public' : 'Bot'}`}
                accessibilityLabel={`${label} ${value === 'open' ? 'public' : 'bot'}`}
                accessibilityState={{ selected: seats[key] === value, disabled: isLoading }}
                aria-selected={seats[key] === value}
                disabled={isLoading}
                onPress={() => {
                  setSeats({ ...seats, [key]: value });
                  setExpanded(null);
                  setRules(false);
                }}
              />
            ))}
            <BevelButton
              label="Invite…"
              material="glass"
              size="sm"
              disabled={isLoading}
              onPress={() => setInviteNotice(!inviteNotice)}
            />
          </View>
          {inviteNotice ? (
            <PidroText role="metadata" tone="soft" accessibilityLiveRegion="polite">
              Create the table first, then use Invite at the waiting table to share its link.
              Invitations do not reserve seats.
            </PidroText>
          ) : null}
          {seats[key] === 'open' ? (
            <>
              <BevelButton
                label={rules ? 'Close rules preview' : 'Seat rules · Preview only'}
                material="glass"
                size="sm"
                disabled={isLoading}
                accessibilityState={{ expanded: rules, disabled: isLoading }}
                aria-expanded={rules}
                onPress={() => {
                  Keyboard.dismiss();
                  setRules(!rules);
                }}
              />
              {rules ? <SeatRulesPreview /> : null}
            </>
          ) : null}
        </View>
      ) : null}
    </Surface>
  );

  return (
    <ScreenShell testID="create-room-window" contentStyle={styles.shell}>
      <View style={styles.header}>
        <BevelButton
          material="glass"
          size="icon"
          accessibilityLabel="Cancel creation"
          disabled={isLoading}
          onPress={onClose}>
          <Icon name="arrow-left" size={22} />
        </BevelButton>
        <PidroText role="label">Create table</PidroText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        <View style={[styles.teams, landscape && styles.landscape]}>
          <View style={[styles.team, landscape && styles.teamLandscape]}>
            <PidroText role="label">Your team</PidroText>
            <Surface variant="subtle" style={styles.seatRow}>
              <LevelRing uri={avatarUrl} size={40} />
              <View style={styles.copy}>
                <PidroText role="label" numberOfLines={1}>
                  {username ?? 'You'}
                </PidroText>
                <PidroText role="metadata" tone="gold">
                  You · Host
                </PidroText>
              </View>
            </Surface>
            {seat('seat_3', 'Your partner')}
          </View>
          <View style={styles.versus}>
            <PidroText role="metadata" tone="muted">
              vs
            </PidroText>
          </View>
          <View style={[styles.team, landscape && styles.teamLandscape]}>
            <PidroText role="label">Opponents</PidroText>
            {seat('seat_2', 'Opponent 1')}
            {seat('seat_4', 'Opponent 2')}
          </View>
        </View>
        {error ? (
          <PidroText role="body" tone="danger" accessibilityRole="alert">
            {error}
          </PidroText>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        {rules ? (
          <PidroText role="metadata" tone="soft">
            Preview only · nothing is applied
          </PidroText>
        ) : null}
        <BevelButton
          label={rules ? 'Close preview' : 'Create table'}
          material={rules ? 'glass' : 'wood'}
          size="sm"
          loading={isLoading}
          onPress={
            rules
              ? () => {
                  Keyboard.dismiss();
                  setRules(false);
                }
              : submit
          }
          style={styles.createAction}
        />
      </View>
    </ScreenShell>
  );
}

function SeatRulesPreview() {
  const [minimum, setMinimum] = useState(0);
  const [password, setPassword] = useState('');
  // Deliberately isolated from the creation draft and discarded on close.
  return (
    <View style={styles.section}>
      <Surface variant="subtle" style={styles.notice} accessibilityRole="alert">
        <PidroText role="metadata" tone="gold">
          Preview only. Passwords and minimum games are not available yet. Nothing here is saved or
          enforced; this seat stays public. Use an example password only.
        </PidroText>
      </Surface>
      <PidroText role="metadata">Minimum completed games · preview</PidroText>
      <View style={styles.choices}>
        {[0, 100, 1000].map((value) => (
          <BevelButton
            key={value}
            material="glass"
            size="sm"
            label={`${minimum === value ? '✓ ' : ''}${value || 'No limit'}`}
            accessibilityLabel={`${value || 'No limit'} games preview`}
            accessibilityState={{ selected: minimum === value }}
            aria-selected={minimum === value}
            onPress={() => setMinimum(value)}
          />
        ))}
      </View>
      <Input
        label="Password · preview only"
        placeholder="Example password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        revealPassword
        autoComplete="off"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, gap: PidroSpacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.sm },
  scroll: { flex: 1, minHeight: 0 },
  form: { gap: PidroSpacing.md, paddingBottom: PidroSpacing.sm },
  teams: { gap: PidroSpacing.md },
  landscape: { flexDirection: 'row', alignItems: 'flex-start' },
  team: { minWidth: 0, gap: PidroSpacing.xs },
  teamLandscape: { flex: 1 },
  versus: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center' },
  section: { gap: PidroSpacing.xs },
  seatRow: {
    minHeight: PidroLayout.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.sm,
    padding: PidroSpacing.xs,
  },
  copy: { flex: 1, minWidth: 0 },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: PidroRadii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.panel,
  },
  expandedChevron: { transform: [{ rotate: '90deg' }] },
  editor: { padding: PidroSpacing.xs, paddingTop: 0, gap: PidroSpacing.xs },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: PidroSpacing.xs },
  notice: { padding: PidroSpacing.sm, borderColor: PidroColors.goldDark },
  footer: { alignItems: 'center', gap: PidroSpacing.xs },
  createAction: { alignSelf: 'center' },
});
