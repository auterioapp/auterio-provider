import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SetupSuccessScreen({ onContinue }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconRing}>
        <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
      </View>
      <Text style={styles.eyebrow}>PROFILE SUBMITTED</Text>
      <Text style={styles.title}>You're all set</Text>
      <Text style={styles.description}>
        Your provider profile is pending review. You can explore the app now, and we'll notify you when verification is complete.
      </Text>

      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Ionicons name="document-text-outline" size={20} color="#2563EB" />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>Application status</Text>
            <Text style={styles.statusValue}>Pending review</Text>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>IN REVIEW</Text></View>
        </View>
        <View style={styles.divider} />
        <View style={styles.helpRow}>
          <Ionicons name="notifications-outline" size={18} color="#6B7280" />
          <Text style={styles.helpText}>Keep notifications enabled so you don't miss the decision.</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onContinue} activeOpacity={0.88}>
        <Text style={styles.buttonText}>Go to Dashboard</Text>
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 28, paddingTop: 96, paddingBottom: 40, alignItems: 'center' },
  iconRing: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginBottom: 26 },
  eyebrow: { color: '#16A34A', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#111827', fontSize: 30, lineHeight: 36, fontWeight: '800', marginBottom: 12 },
  description: { color: '#6B7280', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 30 },
  statusCard: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', padding: 16, marginBottom: 24 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  statusInfo: { flex: 1 },
  statusTitle: { color: '#6B7280', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  statusValue: { color: '#111827', fontSize: 15, fontWeight: '800' },
  badge: { backgroundColor: '#DBEAFE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { color: '#2563EB', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  helpRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  helpText: { flex: 1, color: '#6B7280', fontSize: 12, lineHeight: 17 },
  button: { marginTop: 'auto', width: '100%', backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
