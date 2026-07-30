import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, touchTarget, typography, withAlpha } from '../../theme';

// Generic row for settings/profile/list screens: leading icon or custom
// element, title + optional subtitle, trailing custom element or a chevron.
// `onPress` is optional — omit it for a non-interactive row (renders as View).
export default function ListRow({ icon, iconColor, leftElement, title, subtitle, trailing, chevron = false, onPress, style }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.7, accessibilityRole: 'button' } : {};

  return (
    <Wrapper style={[styles.row, style]} {...wrapperProps}>
      {leftElement ? leftElement : icon ? (
        <View importantForAccessibility="no-hide-descendants" style={[styles.iconWrap, { backgroundColor: withAlpha(iconColor || colors.mutedText, '14') }]}>
          <Ionicons name={icon} size={18} color={iconColor || colors.mutedText} />
        </View>
      ) : null}
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {trailing}
      {chevron && <Ionicons name="chevron-forward" size={18} color={colors.neutral} />}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchTarget.min,
    paddingVertical: spacing.sm,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...typography.body, fontWeight: '600' },
  subtitle: { ...typography.caption, marginTop: 1 },
});
