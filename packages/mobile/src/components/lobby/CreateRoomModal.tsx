import { useState, type ReactNode } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { limitRoomNameInput } from '@pidro/shared';
import type { CreateRoomRequest } from '@/types/lobby';
import { AuthFlowButton } from '@/components/auth/AuthFlow';
import { OpenChair, TableTop } from '@/components/lobby/TableTop';
import { PlayerAvatar } from '@/components/ui/PlayerAvatar';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { Input } from '@/components/ui/Input';
import { PidroText } from '@/components/ui/PidroText';
import { PressableFX } from '@/components/ui/PressableFX';
import { ScreenShell } from '@/components/ui/ScreenShell';
import {
  PidroBevel,
  PidroColors,
  PidroFonts,
  PidroLayout,
  PidroRadii,
  PidroSpacing,
} from '@/design/tokens';
import {
  defaultTableName,
  newTableRequest,
  type SeatChoice,
  type SeatKey,
} from '@/features/lobby/newTable';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** `invite` is true when a seat was marked for an invite: open the table with its invite sheet. */
  onSubmit: (data: CreateRoomRequest, invite: boolean) => void;
  isLoading?: boolean;
  username?: string;
  avatarUrl?: string | null;
  error?: string | null;
  /** Fixture only: open with this seat's sheet up. */
  initialSeat?: SeatKey | null;
}

const SEATS: Record<SeatKey, { role: string; title: string; about: string; spoken: string }> = {
  seat_3: {
    role: 'Partner',
    title: 'Partner seat',
    about: 'Your partner sits across from you and plays on your team.',
    spoken: 'Partner seat',
  },
  seat_2: {
    role: 'Opponent',
    title: 'Opponent seat',
    about: 'Opponents sit beside you and play against your team.',
    spoken: 'Left opponent seat',
  },
  seat_4: {
    role: 'Opponent',
    title: 'Opponent seat',
    about: 'Opponents sit beside you and play against your team.',
    spoken: 'Right opponent seat',
  },
};

const CHOICES: { value: SeatChoice; label: string; status: string; about: string }[] = [
  {
    value: 'open',
    label: 'Open seat',
    status: 'Open seat',
    about: 'Anyone in Tables can sit here.',
  },
  { value: 'ai', label: 'Bot', status: 'Bot', about: 'A bot plays this seat for the whole game.' },
  {
    value: 'invite',
    label: 'Invite a friend',
    status: 'Invite',
    about:
      'You get a link to share once the table is open. The seat stays open until someone sits down.',
  },
];

const SPOKEN: Record<SeatChoice, string> = { open: 'open', ai: 'bot', invite: 'invite' };
const statusOf = (choice: SeatChoice) => CHOICES.find((item) => item.value === choice)!.status;

// The drawing is 340×324 on the board; it shrinks to fit narrow or short screens.
const TABLE_WIDTH = 340;
const TABLE_HEIGHT = 324;

export function CreateRoomModal(props: CreateRoomModalProps) {
  // Unmount the draft on dismissal: no stale seat choices on reopen.
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
  initialSeat = null,
}: CreateRoomModalProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const landscape = width > height;
  const [name, setName] = useState(() => defaultTableName(username));
  const [seats, setSeats] = useState<Record<SeatKey, SeatChoice>>({
    seat_2: 'open',
    seat_3: 'open',
    seat_4: 'open',
  });
  const [editing, setEditing] = useState<SeatKey | null>(initialSeat);

  const innerWidth = width - insets.left - insets.right;
  const scale = Math.min(
    1,
    landscape
      ? Math.min(
          (height - insets.top - insets.bottom - 2 * PidroSpacing.md) / TABLE_HEIGHT,
          (Math.min(innerWidth, PidroLayout.wideContentMaxWidth) - 2 * PidroSpacing.lg) /
            2 /
            TABLE_WIDTH
        )
      : (Math.min(innerWidth, PidroLayout.contentMaxWidth) - 2 * PidroSpacing.md) / TABLE_WIDTH
  );
  const at = (value: number) => value * scale;

  const submit = () => {
    if (isLoading) return;
    Keyboard.dismiss();
    const { request, invite } = newTableRequest(name, username, seats);
    onSubmit(request, invite);
  };

  const seatFace = (key: SeatKey) =>
    seats[key] === 'ai' ? (
      <PlayerAvatar kind="bot" size={at(56)} />
    ) : (
      <OpenChair size={at(56)} invite={seats[key] === 'invite'} />
    );

  const seatLabel = (title: string, status: string, gold: boolean, center = false) => (
    <View style={center && styles.seatLabelCenter}>
      <PidroText role="label" style={gold ? styles.gold : styles.cyan} numberOfLines={1}>
        {title}
      </PidroText>
      <PidroText role="metadata" tone="soft" numberOfLines={1}>
        {status}
      </PidroText>
    </View>
  );

  const seatButton = (key: SeatKey, style: object, children: ReactNode) => (
    <PressableFX
      key={key}
      accessibilityRole="button"
      accessibilityLabel={`${SEATS[key].spoken}: ${SPOKEN[seats[key]]}. Change`}
      disabled={isLoading}
      onPress={() => {
        Keyboard.dismiss();
        setEditing(key);
      }}
      style={[styles.seat, style]}>
      {children}
    </PressableFX>
  );

  // Side seats keep room for their labels even when the drawing shrinks.
  const sideWidth = Math.max(at(84), 84);
  const table = (
    <View style={{ width: at(TABLE_WIDTH), height: at(TABLE_HEIGHT) }}>
      <TableTop
        mark={at(34)}
        style={{ left: at(92), top: at(84), width: at(156), height: at(160) }}
      />
      {seatButton(
        'seat_3',
        [styles.seatRow, { left: at(112), top: 0, minHeight: Math.max(at(56), 44) }],
        <>
          {seatFace('seat_3')}
          {seatLabel(SEATS.seat_3.role, statusOf(seats.seat_3), true)}
        </>
      )}
      {(['seat_2', 'seat_4'] as const).map((key) =>
        seatButton(
          key,
          [
            styles.seatColumn,
            {
              left: at(key === 'seat_2' ? 42 : 298) - sideWidth / 2,
              top: at(112),
              width: sideWidth,
            },
          ],
          <>
            {seatFace(key)}
            {seatLabel(SEATS[key].role, statusOf(seats[key]), false, true)}
          </>
        )
      )}
      <View style={[styles.seat, styles.seatRow, { left: at(112), top: at(262) }]}>
        <PlayerAvatar uri={avatarUrl} size={at(56)} accessibilityLabel="You, the host" />
        {seatLabel('You', 'Host', true)}
      </View>
    </View>
  );

  // What the table is called, and how it plays: a Rules row sits under the name.
  const fields = (
    <View style={styles.fields}>
      <Input
        label="Table name"
        value={name}
        onChangeText={(text) => setName(limitRoomNameInput(text))}
        editable={!isLoading}
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={Keyboard.dismiss}
      />
    </View>
  );

  const key = (
    <View style={styles.key}>
      <View style={styles.keyRow}>
        <View style={styles.keyItem}>
          <View style={[styles.dot, styles.dotTeam]} />
          <PidroText role="metadata" tone="soft">
            Your team sits across
          </PidroText>
        </View>
        <View style={styles.keyItem}>
          <View style={[styles.dot, styles.dotOpponents]} />
          <PidroText role="metadata" tone="soft">
            Opponents
          </PidroText>
        </View>
      </View>
      <PidroText role="metadata" tone="soft" align="center">
        Tap a seat to change who sits there.
      </PidroText>
    </View>
  );

  const header = (
    <View style={styles.header}>
      <BevelButton
        material="glass"
        size="icon"
        accessibilityLabel="Cancel creation"
        disabled={isLoading}
        onPress={onClose}>
        <Icon name="arrow-left" size={22} />
      </BevelButton>
      <PidroText role="label" style={styles.title}>
        New table
      </PidroText>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      {error ? (
        <PidroText role="body" tone="danger" align="center" accessibilityRole="alert">
          {error}
        </PidroText>
      ) : null}
      <AuthFlowButton label="Open the table" loading={isLoading} onPress={submit} />
      <PidroText role="metadata" tone="soft" align="center">
        It shows up in Tables. Invite friends from the table.
      </PidroText>
    </View>
  );

  return (
    <View style={styles.root}>
      <ScreenShell
        testID="create-room-window"
        compact={!landscape}
        contentStyle={[styles.shell, landscape && styles.shellLandscape]}>
        {landscape ? (
          <>
            <ScrollView
              style={styles.controls}
              contentContainerStyle={styles.controlsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              {header}
              {fields}
              {key}
              <View style={styles.spacer} />
              {footer}
            </ScrollView>
            {table}
          </>
        ) : (
          <>
            {header}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              {fields}
              {table}
              {key}
            </ScrollView>
            {footer}
          </>
        )}
      </ScreenShell>
      {editing ? (
        <SeatSheet
          seat={editing}
          choice={seats[editing]}
          onChoose={(choice) => setSeats({ ...seats, [editing]: choice })}
          onDone={() => setEditing(null)}
        />
      ) : null}
    </View>
  );
}

function SeatSheet({
  seat,
  choice,
  onChoose,
  onDone,
}: {
  seat: SeatKey;
  choice: SeatChoice;
  onChoose: (choice: SeatChoice) => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // Short landscape screens set the three choices side by side so Done stays in view.
  const wide = width > height;
  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]} testID="create-seat-sheet">
      <Pressable
        accessibilityLabel="Close"
        onPress={onDone}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <View
        accessibilityViewIsModal
        style={[
          styles.sheet,
          wide && styles.sheetWide,
          {
            paddingBottom: insets.bottom + PidroSpacing.md,
            paddingLeft: insets.left + 20,
            paddingRight: insets.right + 20,
          },
        ]}>
        <View style={styles.grabber} />
        <View style={styles.sheetCopy}>
          <PidroText accessibilityRole="header" style={styles.sheetTitle}>
            {SEATS[seat].title}
          </PidroText>
          <PidroText role="metadata" tone="soft">
            {SEATS[seat].about}
          </PidroText>
        </View>
        <ScrollView
          style={styles.choicesScroll}
          contentContainerStyle={[styles.choices, wide && styles.choicesWide]}
          accessibilityRole="radiogroup"
          accessibilityLabel="Who sits here">
          {CHOICES.map((item) => {
            const checked = item.value === choice;
            return (
              <PressableFX
                key={item.value}
                accessibilityRole="radio"
                accessibilityLabel={item.label}
                accessibilityHint={item.about}
                accessibilityState={{ checked }}
                aria-checked={checked}
                onPress={() => onChoose(item.value)}
                style={[styles.choice, checked && styles.choiceOn, wide && styles.choiceWide]}>
                <View style={styles.choiceIcon}>
                  {item.value === 'ai' ? (
                    <Icon name="bot" size={22} />
                  ) : (
                    <Icon
                      name={item.value === 'invite' ? 'link' : 'plus'}
                      size={20}
                      color={item.value === 'invite' ? PidroBevel.textGold : PidroColors.cyanText}
                      strokeWidth={2.4}
                    />
                  )}
                </View>
                <View style={styles.choiceCopy}>
                  <PidroText role="label">{item.label}</PidroText>
                  <PidroText role="metadata" tone="soft">
                    {item.about}
                  </PidroText>
                </View>
                <View style={[styles.radio, checked && styles.radioOn, wide && styles.radioWide]}>
                  {checked ? <View style={styles.radioDot} /> : null}
                </View>
              </PressableFX>
            );
          })}
        </ScrollView>
        <AuthFlowButton label="Done" onPress={onDone} style={styles.done} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  shell: { flex: 1, gap: PidroSpacing.md },
  shellLandscape: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: PidroSpacing.sm },
  title: { fontSize: 17, lineHeight: 22 },
  fields: { alignSelf: 'stretch', gap: PidroSpacing.md },
  scroll: { flex: 1, minHeight: 0 },
  form: { alignItems: 'center', gap: PidroSpacing.md, paddingBottom: PidroSpacing.sm },
  controls: { flex: 1, alignSelf: 'stretch' },
  controlsContent: { flexGrow: 1, gap: PidroSpacing.md },
  spacer: { flexGrow: 1 },
  seat: { position: 'absolute' },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  seatColumn: { alignItems: 'center', gap: 6 },
  seatLabelCenter: { alignItems: 'center' },
  gold: { color: PidroBevel.textGold },
  cyan: { color: PidroColors.cyanText },
  key: { alignSelf: 'stretch', gap: PidroSpacing.xs },
  keyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: 20,
    rowGap: PidroSpacing.xxs,
  },
  keyItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: PidroRadii.full },
  dotTeam: { backgroundColor: PidroBevel.textGold },
  dotOpponents: { backgroundColor: PidroColors.cyanText },
  footer: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  scrim: { backgroundColor: PidroColors.backdrop },
  sheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '100%',
    gap: 14,
    paddingTop: 10,
    borderTopLeftRadius: PidroRadii.lg,
    borderTopRightRadius: PidroRadii.lg,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: PidroColors.cyanBorder,
    backgroundColor: PidroColors.panelStrong,
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroColors.borderStrong,
  },
  sheetCopy: { gap: 2, paddingHorizontal: PidroSpacing.xxs },
  sheetTitle: {
    fontFamily: PidroFonts.display,
    fontWeight: '400',
    fontSize: 26,
    lineHeight: 32,
    color: PidroBevel.textGold,
    ...PidroBevel.labelShadow,
  },
  sheetWide: { maxWidth: 820 },
  choicesScroll: { flexShrink: 1 },
  choices: { gap: 10 },
  choicesWide: { flexDirection: 'row' },
  choice: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: PidroSpacing.sm,
    paddingHorizontal: 14,
    borderRadius: PidroRadii.lg,
    borderWidth: 1,
    borderColor: PidroColors.border,
    backgroundColor: PidroColors.panelSoft,
  },
  choiceWide: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: PidroSpacing.xs },
  choiceOn: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderWidth: 2,
    borderColor: PidroBevel.rim,
    backgroundColor: PidroColors.choiceOn,
  },
  choiceIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 1,
    borderColor: PidroColors.borderStrong,
    backgroundColor: PidroColors.panelStrong,
  },
  choiceCopy: { flex: 1, minWidth: 0, gap: 2 },
  radio: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: PidroRadii.full,
    borderWidth: 2,
    borderColor: PidroColors.radioOff,
  },
  radioWide: { position: 'absolute', top: PidroSpacing.sm, right: PidroSpacing.sm },
  radioOn: { borderColor: PidroBevel.textGold },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: PidroRadii.full,
    backgroundColor: PidroBevel.textGold,
  },
  done: { marginTop: PidroSpacing.xxs },
});
