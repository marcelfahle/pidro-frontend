import { Modal as RNModal, View, ModalProps as RNModalProps, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { PidroColors, PidroSpacing } from '@/design/tokens';
import { DecisionWindow } from './DecisionWindow';

export interface ModalProps extends RNModalProps {
  isOpen: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  animationType = 'fade',
  transparent = true,
  dismissible = true,
  ...props
}: ModalProps) {
  const reduceMotion = useReducedMotion();
  const handleRequestClose = () => {
    if (dismissible && onClose) {
      onClose();
    }
  };

  return (
    <RNModal
      visible={isOpen}
      transparent={transparent}
      animationType={reduceMotion ? 'none' : animationType}
      onRequestClose={handleRequestClose}
      {...props}>
      <View style={styles.backdrop}>
        <DecisionWindow title={title} description={description} style={styles.modalWindow}>
          {children}
        </DecisionWindow>
      </View>
    </RNModal>
  );
}

export interface PartialModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  bottomInset?: number;
}

export function PartialModal({
  isOpen,
  title,
  description,
  children,
  bottomInset = 200,
}: PartialModalProps) {
  if (!isOpen) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.partialModalContainer]} pointerEvents="box-none">
      <View style={[styles.partialBackdrop, { bottom: bottomInset }]} />
      <View style={[styles.partialContent, { bottom: bottomInset + 20 }]}>
        <DecisionWindow title={title} description={description} style={styles.partialCard}>
          {children}
        </DecisionWindow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PidroColors.backdrop,
    padding: PidroSpacing.md,
  },
  modalWindow: {
    maxWidth: 520,
  },
  partialModalContainer: {
    zIndex: 50,
  },
  partialBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: PidroColors.backdrop,
  },
  partialContent: {
    position: 'absolute',
    left: PidroSpacing.md,
    right: PidroSpacing.md,
    alignItems: 'center',
  },
  partialCard: {
    width: '100%',
    maxWidth: 400,
  },
});
