import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, withAlpha } from '../../theme';
import Card from './Card';
import StatusBadge from './StatusBadge';

// A generic order-summary card built on Card + StatusBadge — this is the
// design-system target, NOT a replacement for the existing, data-bound
// components/orders/OrderCard.js (which reads real order objects via
// ordersHelpers.js and stays as-is until OrdersScreen.js itself is migrated).
// Props here are already-resolved display values, not an `order` object.
export default function OrderCard({ icon = 'construct-outline', title, subtitle, statusKey = 'neutral', statusLabel, price, date, onPress }) {
  return (
    <Card raised onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color={colors.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          {!!date && (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={12} color={colors.info} />
              <Text style={styles.date}>{date}</Text>
            </View>
          )}
        </View>
        <View style={styles.trailing}>
          {!!statusLabel && <StatusBadge statusKey={statusKey} label={statusLabel} />}
          {!!price && <Text style={styles.price}>{price}</Text>}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: withAlpha(colors.primary, '14'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  date: { ...typography.caption, fontSize: 11 },
  trailing: { alignItems: 'flex-end', gap: 6 },
  price: { ...typography.body, fontWeight: '700' },
});
