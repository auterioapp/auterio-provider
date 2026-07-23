import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, withAlpha } from '../../theme';

// Thin wrapper around RN's Modal(transparent, slide) with the handle/backdrop
// chrome every *ModalOverlay/*ModalContent pair in TrackingScreen.js already
// hand-rolls. `onClose` fires on backdrop tap and on the hardware back button
// (Android) via onRequestClose — both are required by RN's Modal API, not optional.
export default function BottomSheet({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: withAlpha(colors.text, '99') },
  sheet: {
    backgroundColor: colors.surfaceRaised,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginBottom: spacing.lg },
});
