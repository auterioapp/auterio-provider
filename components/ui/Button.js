import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, touchTarget, typography, withAlpha } from '../../theme';

const VARIANTS = {
  primary: { bg: colors.primary, text: colors.surfaceRaised, border: null },
  danger: { bg: colors.danger, text: colors.surfaceRaised, border: null },
  secondary: { bg: colors.surface, text: colors.text, border: colors.border },
  outline: { bg: 'transparent', text: colors.text, border: colors.borderStrong },
  ghost: { bg: 'transparent', text: colors.mutedText, border: null },
};

// variant: 'primary' | 'danger' | 'secondary' | 'outline' | 'ghost'
// size: 'md' | 'lg' — both meet touchTarget.min, 'lg' is the full-width CTA height
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.84}
      style={[
        styles.base,
        size === 'md' ? styles.md : styles.lg,
        { backgroundColor: v.bg, borderColor: v.border || 'transparent', borderWidth: v.border ? 1 : 0 },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <View style={styles.content}>
          {!!icon && <Ionicons name={icon} size={18} color={v.text} style={styles.icon} />}
          <Text style={[styles.label, { color: v.text }]} numberOfLines={1}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: touchTarget.min,
    paddingHorizontal: spacing.lg,
  },
  md: { minHeight: touchTarget.min, paddingVertical: spacing.sm },
  lg: { minHeight: 50, paddingVertical: spacing.md },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  icon: { marginRight: -2 },
  label: { ...typography.body, fontWeight: '700' },
});
