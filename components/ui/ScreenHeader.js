import { StyleSheet, Text, View } from 'react-native';
import { spacing, typography } from '../../theme';
import IconButton from './IconButton';

// Generalizes TrackingScreen.js's header row: back chevron (optional — omit
// onBack for a screen that can't go back), centered title, an optional right
// slot (help button, action icon, or any custom element — pass a node, not
// just an icon name, since screens want different things there).
export default function ScreenHeader({ title, onBack, right }) {
  return (
    <View style={styles.header}>
      {onBack ? <IconButton icon="chevron-back" onPress={onBack} accessibilityLabel="Go back" /> : <View style={styles.spacer} />}
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>{title}</Text>
      {right || <View style={styles.spacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 72,
    paddingBottom: spacing.md,
  },
  title: { ...typography.heading },
  spacer: { width: 40, height: 40 },
});
