import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, withAlpha } from '../../theme';
import Button from './Button';

// Distinct from EmptyState: danger-tinted icon, defaults geared at "something
// broke, retry" rather than "nothing here yet". title/description are
// overridable; ctaLabel defaults to 'Try Again' since that's the near-universal
// case (see UX_REDESIGN_BRIEF-era error copy already used in NearbyServicesScreen etc).
export default function ErrorState({
  icon = 'alert-circle-outline',
  title = 'Something went wrong',
  description,
  ctaLabel = 'Try Again',
  onPressCta,
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={32} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
      {!!onPressCta && (
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
    backgroundColor: withAlpha(colors.danger, '14'),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.heading, textAlign: 'center', marginBottom: spacing.xs },
  description: { ...typography.body, color: colors.mutedText, textAlign: 'center' },
  cta: { marginTop: spacing.lg },
});
