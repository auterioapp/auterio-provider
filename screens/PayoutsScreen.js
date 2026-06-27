import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PayoutHistoryScreen from './PayoutHistoryScreen';

const TRANSFER_OPTIONS = [
  {
    id: 'instant',
    icon: 'flash-outline',
    iconBg: '#F3EEFF',
    iconColor: '#7C3AED',
    title: 'Instant Transfer',
    titleSuffix: ' (Fee: 1.5%)',
    subtitle: 'Get your money in minutes',
  },
  {
    id: 'standard',
    icon: 'calendar-outline',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    title: 'Standard Transfer',
    subtitle: 'Free  •  1-3 business days',
  },
];

export default function PayoutsScreen({ visible, onClose }) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payouts & Transfers</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Balance card */}
          <View style={styles.card}>
            <View style={styles.balanceRow}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>$2,180.00</Text>
                <Text style={styles.balanceSub}>Will be paid out on Jun 25</Text>
              </View>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet-outline" size={22} color="#16A34A" />
              </View>
            </View>
          </View>

          {/* Transfer options */}
          <View style={styles.card}>
            {TRANSFER_OPTIONS.map((opt, index) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.transferRow, index > 0 && styles.transferRowBorder]}
                activeOpacity={0.84}
                onPress={() => Alert.alert(opt.title, 'This feature is coming soon.')}
              >
                <View style={[styles.transferIcon, { backgroundColor: opt.iconBg }]}>
                  <Ionicons name={opt.icon} size={20} color={opt.iconColor} />
                </View>
                <View style={styles.transferInfo}>
                  <Text style={styles.transferTitle}>
                    {opt.title}
                    {opt.titleSuffix && <Text style={styles.transferTitleSuffix}>{opt.titleSuffix}</Text>}
                  </Text>
                  <Text style={styles.transferSubtitle}>{opt.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C8CDD4" />
              </TouchableOpacity>
            ))}
          </View>

          {/* Bank Account */}
          <View style={styles.card}>
            <View style={styles.bankHeader}>
              <Text style={styles.sectionTitle}>Bank Account</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => Alert.alert('Edit Bank Account', 'This feature is coming soon.')}
              >
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.bankRow}>
              <Text style={styles.bankName}>Chase Checking (•••• 4821)</Text>
              <Text style={styles.defaultBadge}>Default</Text>
            </View>
          </View>

          {/* Payout History */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.84}
            onPress={() => setHistoryOpen(true)}
          >
            <View style={styles.historyRow}>
              <Text style={styles.sectionTitle}>Payout History</Text>
              <Ionicons name="chevron-forward" size={18} color="#C8CDD4" />
            </View>
          </TouchableOpacity>

          {/* Security notice */}
          <View style={styles.securityCard}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" style={{ marginTop: 1 }} />
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Your earnings are secure</Text>
              <Text style={styles.securitySub}>Your payouts are encrypted and protected.</Text>
            </View>
          </View>

        </ScrollView>

        <PayoutHistoryScreen visible={historyOpen} onClose={() => setHistoryOpen(false)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, paddingVertical: 16 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceInfo: { flex: 1 },
  balanceLabel: { color: '#6B7280', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  balanceAmount: { color: '#F97316', fontSize: 32, fontWeight: '800', lineHeight: 38 },
  balanceSub: { color: '#6B7280', fontSize: 13, fontWeight: '500', marginTop: 4 },
  walletIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  transferRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  transferRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  transferIcon: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  transferInfo: { flex: 1 },
  transferTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  transferTitleSuffix: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  transferSubtitle: { color: '#6B7280', fontSize: 13, fontWeight: '500', marginTop: 2 },
  bankHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  editLink: { color: '#F97316', fontSize: 14, fontWeight: '700' },
  bankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bankName: { color: '#374151', fontSize: 14, fontWeight: '500' },
  defaultBadge: { color: '#16A34A', fontSize: 13, fontWeight: '700' },
  historyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  securityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#DBEAFE', paddingHorizontal: 16, paddingVertical: 14 },
  securityInfo: { flex: 1 },
  securityTitle: { color: '#2563EB', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  securitySub: { color: '#6B7280', fontSize: 13, fontWeight: '400' },
});
