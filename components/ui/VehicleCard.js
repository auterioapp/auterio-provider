import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, withAlpha } from '../../theme';
import Card from './Card';
import StatusBadge from './StatusBadge';

// vehicle: { year, make, model, vin? }. isDefault shows a StatusBadge — reuses
// the 'info' status color for "default", since that's not really a workflow
// state but does want the same "quiet badge" treatment.
export default function VehicleCard({ vehicle, isDefault = false, onPress }) {
  const title = [vehicle?.year, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle';

  return (
    <Card raised onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View importantForAccessibility="no-hide-descendants" style={styles.iconWrap}>
          <Ionicons name="car-sport-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {!!vehicle?.vin && <Text style={styles.subtitle} numberOfLines={1}>VIN {vehicle.vin}</Text>}
        </View>
        {isDefault && <StatusBadge statusKey="info" label="Default" />}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: withAlpha(colors.primary, '14'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { ...typography.body, fontWeight: '700' },
  subtitle: { ...typography.caption, marginTop: 2 },
});
