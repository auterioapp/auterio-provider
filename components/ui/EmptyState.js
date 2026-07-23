import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, withAlpha } from '../../theme';
import Button from './Button';

// icon: an Ionicons name. ctaLabel/onPressCta are both optional — omit both
// for a plain empty state with no action (e.g. "no active orders" on a tab
// you can't act on directly).
export default function EmptyState({ icon = 'file-tray-outline', title, description, ctaLabel, onPressCta }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.mutedText} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!ctaLabel && !!onPressCta && (
        <Button label={ctaLabel} onPress={onPressCta} size="md" fullWidth={false} style={styles.cta} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: withAlpha(colors.mutedText, '14'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, textAlign: 'center', marginBottom: spacing.xs },
  description: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
  cta: { marginTop: spacing.lg },
});
