import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme';

// A bottom-pinned row for 1-2 primary actions — the modalActions /
// estActionsRow pattern already used ad hoc across TrackingScreen.js's
// modals. Not position:'absolute' by itself (screens differ on whether the
// bar sits inside a modal sheet or fixed over scroll content) — wrap it in
// the caller's own positioning if it needs to float over a ScrollView.
export default function ActionBar({ children, bordered = true, style }) {
  return (
    <View style={[styles.bar, bordered && styles.bordered, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg },
  bordered: { borderTopWidth: 1, borderTopColor: colors.border },
});
