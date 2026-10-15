import { useEffect, useRef, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BevelButton } from '@/components/ui/BevelButton';
import { Icon } from '@/components/ui/Icon';
import { PidroText } from '@/components/ui/PidroText';
import { Surface } from '@/components/ui/Surface';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { useTranslation } from '@/i18n';

/** Table utilities share one bounded, dismissible window in either orientation. */
export function TableUtilityWindow({
  title,
  open,
  onClose,
  followEnd = false,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  /** Open at the newest content and stay there as it grows, unless scrolled back. */
  followEnd?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const pinned = useRef(true);
  const viewportHeight = useRef(0);
  useEffect(() => {
    if (open) pinned.current = true;
  }, [open]);
  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    pinned.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 24;
  };
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
              accessibilityLabel={t('game.close', { title })}
              onPress={onClose}>
              <Icon name="close" size={20} />
            </BevelButton>
          </View>
          <ScrollView
            ref={scroll}
            style={styles.scroll}
            contentContainerStyle={styles.content}
            onScroll={followEnd ? onScroll : undefined}
            scrollEventThrottle={100}
            onLayout={(event) => {
              viewportHeight.current = event.nativeEvent.layout.height;
            }}
            onContentSizeChange={(_width, contentHeight) => {
              // Content that fits needs no scrolling, so it follows again from here.
              if (contentHeight <= viewportHeight.current) pinned.current = true;
              if (followEnd && pinned.current) scroll.current?.scrollToEnd({ animated: false });
            }}>
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
