import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, withAlpha } from '../../theme';
import Card from './Card';
import IconButton from './IconButton';

// provider: { name, type, initials, color, rating, reviewCount }. Generalizes
// TrackingScreen.js's provider card (same logo-tint/initials/rating/call-message
// shape) into a reusable primitive. onCall/onMessage are optional — omit both
// to render a read-only provider summary (e.g. in a request-detail screen).
export default function ProviderCard({ provider, onCall, onMessage, onPress }) {
  const accent = provider?.color || colors.primary;
  const rating = provider?.rating ?? 4.8;
  const reviewCount = provider?.reviewCount ?? 0;

  return (
    <Card raised onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.logo, { backgroundColor: withAlpha(accent, '20') }]}>
          <Text style={[styles.initials, { color: accent }]}>{provider?.initials || '??'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{provider?.name}</Text>
          <Text style={styles.type} numberOfLines={1}>{provider?.type}</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Ionicons key={i} name="star" size={12} color={i <= Math.round(rating) ? colors.primary : colors.border} />
            ))}
            <Text style={styles.ratingText}>{rating.toFixed(1)}{reviewCount ? ` (${reviewCount})` : ''}</Text>
          </View>
        </View>
        {(!!onCall || !!onMessage) && (
          <View style={styles.actions}>
            {!!onCall && <IconButton icon="call-outline" iconColor={colors.info} onPress={onCall} style={styles.actionBtn} accessibilityLabel="Call provider" />}
            {!!onMessage && <IconButton icon="chatbubble-outline" iconColor={colors.info} onPress={onMessage} style={styles.actionBtn} accessibilityLabel="Message provider" />}
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '800' },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: '800', marginBottom: 2 },
  type: { ...typography.caption, marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { ...typography.caption, fontSize: 11, marginLeft: 4 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { backgroundColor: withAlpha(colors.info, '10') },
});
