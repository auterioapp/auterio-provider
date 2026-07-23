import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, status, typography, withAlpha } from '../../theme';

// status: 'pending' | 'info' | 'success' | 'warning' | 'error' | 'neutral'
// label is required, not optional — status must never be color-only (a colorblind
// or low-vision reader can't tell pending from error by hue alone). Pass `icon`
// (an Ionicons name) for a stronger non-color signal; a plain dot is the default.
export default function StatusBadge({ statusKey = 'neutral', label, icon }) {
  const color = status[statusKey] || status.neutral;

  return (
    <View style={[styles.base, { backgroundColor: withAlpha(color, '1a'), borderColor: withAlpha(color, '33') }]}>
      {icon ? (
        <Ionicons name={icon} size={12} color={color} />
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.label, { color }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...typography.caption, fontWeight: '700', fontSize: 11 },
});
