import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PayoutsScreen from './PayoutsScreen';
import PayoutHistoryScreen from './PayoutHistoryScreen';
import { formatCurrency, getProviderEarnings } from '../utils/estimateUtils';
import { useProvider } from '../ProviderContext';

const DEMO_HISTORY = [
  { date: 'Jun 18, 2025', label: 'Weekly Payout', amount: '$1,750.00', status: 'Completed' },
  { date: 'Jun 11, 2025', label: 'Weekly Payout', amount: '$2,040.00', status: 'Completed' },
];

const STATUS_COLOR = { Completed: '#16A34A', Processing: '#D97706', Failed: '#DC2626' };

export default function EarningsPayoutScreen({ visible, onClose, isDemo, completedOrders = [] }) {
  const { provider } = useProvider();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = isDemo ? DEMO_HISTORY : [];
  const lifetimeEarned = completedOrders.reduce((acc, o) => acc + getProviderEarnings(o, null, o.additionalApprovals, null, provider?.commissionRate).netEarnings, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payouts</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Balance */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceTop}>
              <View>
                <Text style={styles.balanceLabel}>Total Earned</Text>
                <Text style={styles.balanceAmount}>{isDemo ? '$2,180.00' : formatCurrency(lifetimeEarned)}</Text>
                <Text style={styles.balanceSub}>{isDemo ? 'Next payout: Jun 25' : (lifetimeEarned > 0 ? 'From all completed jobs' : 'No completed jobs yet')}</Text>
              </View>
              <View style={styles.walletIcon}>
                <Ionicons name="wallet-outline" size={22} color="#16A34A" />
              </View>
            </View>
            <View style={[styles.transferBtn, styles.transferBtnDisabled]}>
              <Ionicons name="arrow-up-outline" size={16} color="#9CA3AF" />
              <Text style={[styles.transferBtnText, styles.transferBtnTextDisabled]}>Transfer Funds — Coming Soon</Text>
            </View>
          </View>

          {/* Payout history - last 2 weeks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payout History</Text>
            <View style={styles.card}>
              {history.length > 0 ? history.map((item, index) => (
                <View key={item.date} style={[styles.historyRow, index > 0 && styles.historyRowBorder]}>
                  <View style={styles.historyIcon}>
                    <Ionicons name="cash-outline" size={18} color="#16A34A" />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyLabel}>{item.label}</Text>
                    <Text style={styles.historyDate}>{item.date}</Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>{item.amount}</Text>
                    <Text style={[styles.historyStatus, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                  </View>
                </View>
              )) : (
                <View style={styles.emptyHistory}>
                  <Text style={styles.emptyHistoryText}>No payouts in the last 2 weeks</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.viewAllBtn}
                activeOpacity={0.7}
                onPress={() => setHistoryOpen(true)}
              >
                <Text style={styles.viewAllText}>View all history</Text>
                <Ionicons name="chevron-forward" size={15} color="#F04416" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity style={styles.card} activeOpacity={0.84} onPress={() => setSettingsOpen(true)}>
              <View style={styles.methodRow}>
                <View style={styles.methodIcon}>
                  <Ionicons name="calendar-outline" size={18} color="#2563EB" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Weekly</Text>
                  <Text style={styles.methodSub}>Chase Checking (•••• 4821)</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C8CDD4" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Help */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Help</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.helpRow}
                activeOpacity={0.84}
                onPress={() => Alert.alert('Support', 'Contact us at support@auterio.com')}
              >
                <View style={styles.helpIcon}>
                  <Ionicons name="help-circle-outline" size={18} color="#5E646D" />
                </View>
                <Text style={styles.helpText}>How do payouts work?</Text>
                <Ionicons name="chevron-forward" size={16} color="#C8CDD4" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.helpRow, styles.helpRowBorder]}
                activeOpacity={0.84}
                onPress={() => Alert.alert('Support', 'Contact us at support@auterio.com')}
              >
                <View style={styles.helpIcon}>
                  <Ionicons name="time-outline" size={18} color="#5E646D" />
                </View>
                <Text style={styles.helpText}>When will I receive my money?</Text>
                <Ionicons name="chevron-forward" size={16} color="#C8CDD4" />
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>

        <PayoutsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} isDemo={isDemo} />
        <PayoutHistoryScreen visible={historyOpen} onClose={() => setHistoryOpen(false)} isDemo={isDemo} />
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
  content: { paddingHorizontal: 16, paddingBottom: 40, gap: 20 },

  balanceCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', padding: 16 },
  balanceTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  balanceLabel: { color: '#5E646D', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  balanceAmount: { color: '#17191D', fontSize: 34, fontWeight: '800', lineHeight: 40 },
  balanceSub: { color: '#5E646D', fontSize: 13, fontWeight: '500', marginTop: 4 },
  walletIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  transferBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: '#17191D', borderRadius: 10, paddingVertical: 13 },
  transferBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  transferBtnDisabled: { backgroundColor: '#F3F4F5' },
  transferBtnTextDisabled: { color: '#9CA3AF' },

  section: { gap: 8 },
  sectionTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden' },

  historyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  historyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1 },
  historyLabel: { color: '#17191D', fontSize: 14, fontWeight: '600' },
  historyDate: { color: '#5E646D', fontSize: 12, marginTop: 2 },
  historyRight: { alignItems: 'flex-end' },
  historyAmount: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  historyStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  emptyHistory: { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' },
  emptyHistoryText: { color: '#9CA3AF', fontSize: 13 },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  viewAllText: { color: '#F04416', fontSize: 14, fontWeight: '600' },

  methodRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  methodIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  methodInfo: { flex: 1 },
  methodTitle: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  methodSub: { color: '#5E646D', fontSize: 13, marginTop: 2 },

  helpRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  helpRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  helpIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  helpText: { flex: 1, color: '#374151', fontSize: 14, fontWeight: '500' },
});
