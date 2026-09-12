import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

/** Simple modal-backed bottom sheet: dim overlay + rounded sheet anchored to
 * the bottom. Used for lightweight pickers/confirmations, not full screens. */
export function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.colors.backgroundElevated,
            borderTopLeftRadius: theme.radii.xl,
            borderTopRightRadius: theme.radii.xl,
            paddingBottom: insets.bottom + theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
          },
        ]}
      >
        <View
          style={[styles.grabber, { backgroundColor: theme.colors.border, borderRadius: theme.radii.pill }]}
        />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  grabber: {
    width: 36,
    height: 4,
    alignSelf: 'center',
    marginBottom: 12,
  },
});
