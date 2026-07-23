import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, touchTarget } from '../../theme';

const VARIANTS = {
  surface: { bg: colors.surface, border: colors.border, iconColor: colors.text },
  ghost: { bg: 'transparent', border: null, iconColor: colors.mutedText },
  raised: { bg: colors.surfaceRaised, border: colors.border, iconColor: colors.text },
};

// A circular icon-only touch target — back buttons, help buttons, call/message
// actions on ProviderCard, map controls. Always meets touchTarget.min, even
// when `size` is set smaller than that (matches TrackingScreen.js's existing
// 40x40 circles without shrinking the hit area below 44).
export default function IconButton({ icon, onPress, variant = 'surface', size = 40, iconColor, disabled = false, style }) {
  const v = VARIANTS[variant] || VARIANTS.surface;
  const hitSlop = Math.max(0, Math.ceil((touchTarget.min - size) / 2));

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: v.bg,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1 : 0,
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={iconColor || v.iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
});
