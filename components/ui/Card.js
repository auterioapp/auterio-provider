import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../../theme';

// raised: surfaceRaised + border (default, matches the *Card style already
// used in TrackingScreen.js etc.) vs surface fill without a hairline border.
// Pass onPress to make the card tappable (renders as TouchableOpacity).
export default function Card({ children, raised = false, onPress, style, ...rest }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.84, ...rest } : rest;

  return (
    <Wrapper
      style={[styles.base, raised ? styles.raised : styles.flat, style]}
      {...wrapperProps}
    >
      {children}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  flat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  raised: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
});
