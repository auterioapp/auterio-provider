import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, touchTarget, typography } from '../../theme';

// error, when set, both shows the message below the field and switches the
// border to colors.danger — never color-only (the text itself is the second
// signal). `icon` is a leading Ionicons name.
export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  secureTextEntry,
  keyboardType,
  multiline = false,
  editable = true,
  style,
}) {
  return (
    <View style={style}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.field,
        multiline && styles.fieldMultiline,
        !!error && styles.fieldError,
        !editable && styles.fieldDisabled,
      ]}>
        {!!icon && <Ionicons name={icon} size={18} color={colors.mutedText} style={styles.icon} />}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          editable={editable}
          accessibilityLabel={label || placeholder}
          accessibilityHint={error || undefined}
          style={[styles.input, multiline && styles.inputMultiline]}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.label, marginBottom: 6 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touchTarget.min,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  fieldMultiline: { minHeight: 88, alignItems: 'flex-start', paddingVertical: spacing.sm },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { backgroundColor: colors.surface, opacity: 0.6 },
  icon: { marginTop: 1 },
  input: { flex: 1, ...typography.body, paddingVertical: 0 },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  errorText: { ...typography.caption, color: colors.danger, marginTop: 4 },
});
