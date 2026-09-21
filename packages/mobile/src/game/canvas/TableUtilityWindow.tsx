import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroSpacing } from '@/design/tokens';

/** Table utilities share one bounded, dismissible window in either orientation. */
export function TableUtilityWindow({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      supportedOrientations={[
        'portrait',
        'portrait-upside-down',
        'landscape-left',
        'landscape-right',
      ]}
      onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          {
            paddingTop: insets.top + PidroSpacing.sm,
            paddingBottom: insets.bottom + PidroSpacing.sm,
            paddingLeft: insets.left + PidroSpacing.sm,
            paddingRight: insets.right + PidroSpacing.sm,
          },
        ]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessible={false}
          focusable={false}
        />
        <Surface
          testID="table-utility-window"
          variant="card"
          style={styles.window}
          accessibilityViewIsModal>
          <View style={styles.header}>
            <PidroText role="title" style={styles.title}>
              {title}
            </PidroText>
            <BevelButton
              material="glass"
              size="icon"
              accessibilityLabel={`Close ${title.toLowerCase()}`}
              onPress={onClose}>
              <Icon name="close" size={20} />
            </BevelButton>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PidroColors.backdrop,
  },
  window: { width: '100%', maxWidth: 360, maxHeight: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: PidroSpacing.xs,
    padding: PidroSpacing.sm,
  },
  title: { flex: 1 },
  scroll: { flexShrink: 1 },
  content: { padding: PidroSpacing.sm, paddingTop: 0, gap: PidroSpacing.sm },
});
