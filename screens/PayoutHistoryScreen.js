import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TABS = ['All', 'Completed', 'Processing', 'Failed'];

const PAYOUTS = [
  { id: 1,  date: 'Jun 11, 2025', month: 'June 2025',    amount: '$2,180.00', status: 'Completed'  },
  { id: 2,  date: 'Jun 4, 2025',  month: 'June 2025',    amount: '$2,050.00', status: 'Completed'  },
  { id: 3,  date: 'May 28, 2025', month: 'May 2025',     amount: '$1,950.00', status: 'Completed'  },
  { id: 4,  date: 'May 21, 2025', month: 'May 2025',     amount: '$1,820.00', status: 'Completed'  },
  { id: 5,  date: 'May 14, 2025', month: 'May 2025',     amount: '$1,760.00', status: 'Completed'  },
  { id: 6,  date: 'May 7, 2025',  month: 'May 2025',     amount: '$1,680.00', status: 'Completed'  },
  { id: 7,  date: 'Apr 30, 2025', month: 'April 2025',   amount: '$1,920.00', status: 'Completed'  },
  { id: 8,  date: 'Apr 23, 2025', month: 'April 2025',   amount: '$1,750.00', status: 'Completed'  },
  { id: 9,  date: 'Apr 16, 2025', month: 'April 2025',   amount: '$980.00',   status: 'Processing' },
  { id: 10, date: 'Apr 9, 2025',  month: 'April 2025',   amount: '$320.00',   status: 'Failed'     },
];

const STATUS_STYLE = {
  Completed:  { color: '#16A34A' },
  Processing: { color: '#D97706' },
  Failed:     { color: '#DC2626' },
};

function groupByMonth(list) {
  const map = {};
  list.forEach(p => {
    if (!map[p.month]) map[p.month] = [];
    map[p.month].push(p);
  });
  return Object.entries(map);
}

export default function PayoutHistoryScreen({ visible, onClose, isDemo }) {
  const [tab, setTab] = useState('All');

  const source = isDemo ? PAYOUTS : [];
  const filtered = tab === 'All' ? source : source.filter(p => p.status === tab);
  const groups = groupByMonth(filtered);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payout History</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, t === tab && styles.tabItemActive]}
              activeOpacity={0.8}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, t === tab && styles.tabTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {groups.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={40} color="#C8CDD4" />
              <Text style={styles.emptyTitle}>No payout history</Text>
              <Text style={styles.emptyText}>Your payouts will appear here after your first completed job.</Text>
            </View>
          )}

          {groups.map(([month, items]) => (
            <View key={month}>
              <Text style={styles.monthHeader}>{month}</Text>
              <View style={styles.groupCard}>
                {items.map((payout, index) => (
                  <TouchableOpacity
                    key={payout.id}
                    style={[styles.payoutRow, index > 0 && styles.payoutRowBorder]}
                    activeOpacity={0.84}
                    onPress={() => Alert.alert(payout.date, `Amount: ${payout.amount}\nStatus: ${payout.status}`)}
                  >
                    <View style={styles.payoutLeft}>
                      <Text style={styles.payoutDate}>{payout.date}</Text>
                      <Text style={styles.payoutAmount}>{payout.amount}</Text>
                    </View>
                    <View style={styles.payoutRight}>
                      <Text style={[styles.payoutStatus, { color: STATUS_STYLE[payout.status].color }]}>
                        {payout.status}
                      </Text>
                      <Ionicons name="chevron-forward" size={16} color="#C8CDD4" style={styles.payoutChevron} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>Payouts usually arrive in 1-3 business days.</Text>
          </View>

        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: '#17191D', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 10, backgroundColor: '#FFFFFF' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0F1F3', marginBottom: 16 },
  tabItem: { marginRight: 24, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  tabItemActive: { borderBottomColor: '#F97316' },
  tabText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#F97316', fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  emptyText: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginTop: 40 },
  monthHeader: { color: '#17191D', fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  groupCard: { backgroundColor: '#FFFFFF', borderRadius: 0, marginBottom: 20 },
  payoutRow: { flexDirection: 'row', alignItems: 'stretch', paddingVertical: 14 },
  payoutRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  payoutLeft: { flex: 1, justifyContent: 'space-between' },
  payoutDate: { color: '#6B7280', fontSize: 13, fontWeight: '400', marginBottom: 5 },
  payoutAmount: { color: '#17191D', fontSize: 16, fontWeight: '800' },
  payoutRight: { alignItems: 'flex-end', justifyContent: 'space-between', paddingLeft: 12 },
  payoutStatus: { fontSize: 13, fontWeight: '700' },
  payoutChevron: { marginTop: 2 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F6F8', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
});
