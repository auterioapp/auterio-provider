import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import EarningsPayoutScreen from './EarningsPayoutScreen';
import RevenueBreakdownScreen, { DATA_BY_PERIOD } from './RevenueBreakdownScreen';
import { formatCurrency } from '../utils/estimateUtils';

const EARN_PERIODS = ['Today', 'This Week', 'This Month'];

const CHART_DATA = {
  Today: {
    values: [0, 85, 0, 140, 0, 220, 0],
    labels: ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'],
    chartMax: 250,
    axisLabels: ['$250', '$125', '$60', '$0'],
    activeLabel: '2PM',
    total: '$445.00',
    trend: '+3 jobs vs yesterday',
    trendUp: true,
    kpis: [
      { label: 'Completed Jobs', value: '3',    icon: 'briefcase-outline', color: '#F04416', bg: 'rgba(240,68,22,0.10)' },
      { label: 'Avg Ticket',     value: '$148', icon: 'ticket-outline',    color: '#2F80FF', bg: 'rgba(47,128,255,0.10)' },
      { label: 'Online Hours',   value: '6h',   icon: 'time-outline',      color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
    ],
  },
  'This Week': {
    values: [620, 1180, 760, 1120, 960, 1320, 1500],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    chartMax: 1500,
    axisLabels: ['$1.5K', '$1K', '$500', '$0'],
    activeLabel: 'Sun',
    total: '$4,285.00',
    trend: '18% vs last week',
    trendUp: true,
    kpis: [
      { label: 'Completed Jobs', value: '42',   icon: 'briefcase-outline', color: '#F04416', bg: 'rgba(240,68,22,0.10)' },
      { label: 'Avg Ticket',     value: '$102', icon: 'ticket-outline',    color: '#2F80FF', bg: 'rgba(47,128,255,0.10)' },
      { label: 'Online Hours',   value: '34h',  icon: 'time-outline',      color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
    ],
  },
  'This Month': {
    values: [2100, 1800, 2400, 1950, 2800, 3100, 3020],
    labels: ['Jun 1', '5', '9', '13', '17', '21', '25'],
    chartMax: 3200,
    axisLabels: ['$3.2K', '$2.1K', '$1.1K', '$0'],
    activeLabel: '21',
    total: '$17,170.00',
    trend: '12% vs last month',
    trendUp: true,
    kpis: [
      { label: 'Completed Jobs', value: '168',  icon: 'briefcase-outline', color: '#F04416', bg: 'rgba(240,68,22,0.10)' },
      { label: 'Avg Ticket',     value: '$102', icon: 'ticket-outline',    color: '#2F80FF', bg: 'rgba(47,128,255,0.10)' },
      { label: 'Online Hours',   value: '136h', icon: 'time-outline',      color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
    ],
  },
};

function buildRealData(completedOrders) {
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay()); startOfWeek.setHours(0, 0, 0, 0);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const filterByPeriod = (orders, start) =>
    orders.filter(o => new Date(o.completedAt || o.updatedAt || o.createdAt) >= start);

  const sumTotal = (orders) =>
    orders.reduce((acc, o) => acc + Number(o.payment?.total || o.payment?.totalHeld || o.payment?.priceMax || 0), 0);

  const todayOrders = filterByPeriod(completedOrders, startOfToday);
  const weekOrders = filterByPeriod(completedOrders, startOfWeek);
  const monthOrders = filterByPeriod(completedOrders, startOfMonth);

  const fmt = (n) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  const makeKpis = (orders, total) => [
    { label: 'Completed Jobs', value: String(orders.length), icon: 'briefcase-outline', color: '#F04416', bg: 'rgba(240,68,22,0.10)' },
    { label: 'Avg Ticket', value: orders.length ? formatCurrency(total / orders.length) : '$0.00', icon: 'ticket-outline', color: '#2F80FF', bg: 'rgba(47,128,255,0.10)' },
    { label: 'Total Earned', value: fmt(total), icon: 'cash-outline', color: '#16A34A', bg: 'rgba(22,163,74,0.10)' },
  ];

  return {
    Today:       { total: formatCurrency(sumTotal(todayOrders)),  trend: `${todayOrders.length} jobs today`,      trendUp: todayOrders.length > 0,  kpis: makeKpis(todayOrders,  sumTotal(todayOrders)),  values: [0,0,0,0,0,0,0], labels: ['9AM','10AM','11AM','12PM','1PM','2PM','3PM'], chartMax: 1, axisLabels: ['—','—','—','$0'], activeLabel: '' },
    'This Week': { total: formatCurrency(sumTotal(weekOrders)),   trend: `${weekOrders.length} jobs this week`,   trendUp: weekOrders.length > 0,   kpis: makeKpis(weekOrders,   sumTotal(weekOrders)),   values: [0,0,0,0,0,0,0], labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],  chartMax: 1, axisLabels: ['—','—','—','$0'], activeLabel: '' },
    'This Month': { total: formatCurrency(sumTotal(monthOrders)), trend: `${monthOrders.length} jobs this month`, trendUp: monthOrders.length > 0,  kpis: makeKpis(monthOrders,  sumTotal(monthOrders)),  values: [0,0,0,0,0,0,0], labels: ['Jun 1','5','9','13','17','21','25'],         chartMax: 1, axisLabels: ['—','—','—','$0'], activeLabel: '' },
  };
}

export default function EarningsScreen({ refreshControl, scrollSignal, isDemo = true, completedOrders = [] }) {
  const scrollRef = useScrollToTop(scrollSignal);
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [revenueOpen, setRevenueOpen] = useState(false);
  const [period, setPeriod] = useState('This Week');
  const [showPeriodDrop, setShowPeriodDrop] = useState(false);

  const activeData = isDemo ? CHART_DATA : buildRealData(completedOrders);
  const chartData = activeData[period] || activeData['This Week'];

  const periodRevData = DATA_BY_PERIOD[period] || DATA_BY_PERIOD['This Week'];
  const METRIC_ICONS = ['construct-outline', 'settings-outline', 'car-outline', 'gift-outline'];
  const METRIC_COLORS = [['#16A34A', 'rgba(22,163,74,0.10)'], ['#2563EB', 'rgba(37,99,235,0.10)'], ['#7C3AED', 'rgba(124,58,237,0.10)'], ['#F97316', 'rgba(249,115,22,0.10)']];
  const revenueCards = isDemo
    ? periodRevData.slice(0, 4).map((seg, i) => ({
        title: seg.label,
        value: formatCurrency(seg.amount),
        meta: `${seg.pct}% of revenue`,
        icon: METRIC_ICONS[i],
        color: METRIC_COLORS[i][0],
        bg: METRIC_COLORS[i][1],
      }))
    : [];

  const transactions = isDemo ? [
    { icon: 'car-outline', title: 'Toyota Camry - Jump Start', meta: 'Today, 10:30 AM', amount: '+$85.00' },
    { icon: 'disc-outline', title: 'Honda Accord - Tire Change', meta: 'Today, 12:15 PM', amount: '+$140.00' },
    { icon: 'settings-outline', title: 'BMW X5 - Diagnostics', meta: 'Today, 2:00 PM', amount: '+$220.00' },
    { icon: 'car-sport-outline', title: 'Ford F-150 - Towing', meta: 'Yesterday, 4:45 PM', amount: '+$310.00' },
  ] : completedOrders.slice(0, 10).map(o => ({
    icon: 'briefcase-outline',
    title: `${o.vehicle?.make || ''} ${o.vehicle?.model || ''} - ${o.service?.type || 'Service'}`.trim(),
    meta: new Date(o.completedAt || o.updatedAt || o.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
    amount: `+${formatCurrency(o.payment?.total || o.payment?.totalHeld || o.payment?.priceMax || 0)}`,
  }));

  const payouts = [
    { date: 'Jun 18, 2024', meta: 'Bank Deposit', amount: '$1,750.00' },
    { date: 'Jun 11, 2024', meta: 'Bank Deposit', amount: '$2,040.00' },
    { date: 'Jun 4, 2024', meta: 'Bank Deposit', amount: '$1,890.00' },
  ];

  return (
    <View style={styles.container}>
    <ScrollView ref={scrollRef} style={styles.flex1} contentContainerStyle={styles.earningsContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
      <View style={styles.earningsHeader}>
        <Text style={styles.earningsTitle}>Earnings</Text>
      </View>

      <View style={styles.earningsChartWrapper}>
        <TouchableOpacity style={styles.earningsChartCard} activeOpacity={0.92} onPress={() => setRevenueOpen(true)}>
          <View style={styles.earningsChartTop}>
            <View>
              <Text style={styles.earningsChartLabel}>{period}</Text>
              <Text style={styles.earningsChartValue}>{chartData.total}</Text>
              <View style={styles.earningsTrendRow}>
                <Ionicons name={chartData.trendUp ? 'caret-up' : 'caret-down'} size={10} color="#16A34A" />
                <Text style={styles.earningsTrendText}>{chartData.trend}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.earningsPeriodBtn}
              activeOpacity={0.84}
              onPress={() => setShowPeriodDrop(v => !v)}
            >
              <Text style={styles.earningsPeriodText}>{period}</Text>
              <Ionicons name={showPeriodDrop ? 'chevron-up' : 'chevron-down'} size={13} color="#17191D" />
            </TouchableOpacity>
          </View>
          <View style={styles.earningsChartArea}>
            {chartData.axisLabels.map((label, i) => (
              <View key={`axis-${i}`} style={styles.earningsChartGridRow}>
                <Text style={styles.earningsChartAxis}>{label}</Text>
                <View style={styles.earningsChartGridLine} />
              </View>
            ))}
            <View style={styles.earningsBarsLayer}>
              {chartData.values.map((value, index) => {
                const height = value > 0 ? Math.max(4, Math.round((value / chartData.chartMax) * 61)) : 0;
                return (
                  <View key={`${chartData.labels[index]}-${index}`} style={styles.earningsBarColumn}>
                    {height > 0 && <View style={[styles.earningsBarFill, { height }]} />}
                  </View>
                );
              })}
            </View>
          </View>
          <View style={styles.earningsDaysRow}>
            {chartData.labels.map((label, i) => (
              <Text key={`day-${i}`} style={[styles.earningsDayText, label === chartData.activeLabel && styles.earningsDayActive]}>{label}</Text>
            ))}
          </View>
        </TouchableOpacity>

        {showPeriodDrop && (
          <View style={styles.chartPeriodDropdown}>
            {EARN_PERIODS.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chartPeriodOption, p === period && styles.chartPeriodOptionActive]}
                activeOpacity={0.8}
                onPress={() => { setPeriod(p); setShowPeriodDrop(false); }}
              >
                <Text style={[styles.chartPeriodOptionText, p === period && styles.chartPeriodOptionTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.earningsMetricGrid}>
        <View style={styles.earningsMetricRow}>
          {revenueCards.slice(0, 2).map(card => <EarningsMetric key={card.title} {...card} />)}
        </View>
        <View style={styles.earningsMetricRow}>
          {revenueCards.slice(2, 4).map(card => <EarningsMetric key={card.title} {...card} />)}
        </View>
      </View>

      <View style={styles.earningsKpiCard}>
        {chartData.kpis.map((item, index) => (
          <View key={item.label} style={[styles.earningsKpiItem, index > 0 && styles.earningsKpiDivider]}>
            <View style={[styles.earningsKpiIcon, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon} size={15} color={item.color} />
            </View>
            <View style={styles.earningsKpiText}>
              <Text style={styles.earningsKpiValue}>{item.value}</Text>
              <Text style={styles.earningsKpiLabel}>{item.label}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.balanceCard}>
        <View style={styles.balanceTextBlock}>
          <View style={styles.balanceTitleRow}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <Ionicons name="information-circle-outline" size={14} color="#8B9098" />
          </View>
          <Text style={styles.balanceAmount}>{isDemo ? '$2,180.00' : '$0.00'}</Text>
          <Text style={styles.balanceMeta}>{isDemo ? 'Will be paid out on Jun 25' : 'No payouts scheduled'}</Text>
        </View>
        <View style={styles.balanceActionBlock}>
          <TouchableOpacity style={styles.withdrawBtn} activeOpacity={0.86} onPress={() => setPayoutsOpen(true)}>
            <Text style={styles.withdrawText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>


<EarningsListSection title="Recent Transactions">
        {transactions.length > 0
          ? transactions.map(item => <EarningsTransaction key={item.title + item.meta} {...item} />)
          : <View style={styles.emptyTransactions}><Ionicons name="receipt-outline" size={22} color="#C4C9D1" /><Text style={styles.emptyTransactionsText}>No completed jobs yet</Text></View>
        }
      </EarningsListSection>

      <EarningsListSection title="Payout History">
        {isDemo
          ? payouts.map(item => <PayoutRow key={item.date} {...item} />)
          : <View style={styles.emptyTransactions}><Ionicons name="wallet-outline" size={22} color="#C4C9D1" /><Text style={styles.emptyTransactionsText}>No payouts yet</Text></View>
        }
      </EarningsListSection>

    </ScrollView>
      <EarningsPayoutScreen visible={payoutsOpen} onClose={() => setPayoutsOpen(false)} isDemo={isDemo} />
      <RevenueBreakdownScreen visible={revenueOpen} onClose={() => setRevenueOpen(false)} isDemo={isDemo} />
    </View>
  );
}

function EarningsMetric({ title, value, meta, icon, color, bg }) {
  return (
    <View style={styles.earningsMetricCard}>
      <View style={[styles.earningsMetricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={styles.earningsMetricText}>
        <Text style={styles.earningsMetricTitle}>{title}</Text>
        <Text style={styles.earningsMetricValue}>{value}</Text>
        <Text style={styles.earningsMetricMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function EarningsListSection({ title, children }) {
  return (
    <View style={styles.earningsListCard}>
      <View style={styles.earningsListHeader}>
        <Text style={styles.earningsListTitle}>{title}</Text>
        <TouchableOpacity activeOpacity={0.8}>
          <Text style={styles.earningsViewAll}>View all</Text>
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );
}

function EarningsTransaction({ icon, title, meta, amount }) {
  return (
    <TouchableOpacity style={styles.earningsTransactionRow} activeOpacity={0.84}>
      <View style={styles.earningsTransactionIcon}>
        <Ionicons name={icon} size={17} color="#17191D" />
      </View>
      <View style={styles.earningsTransactionInfo}>
        <Text style={styles.earningsTransactionTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.earningsTransactionMeta}>{meta}</Text>
      </View>
      <Text style={styles.earningsTransactionAmount}>{amount}</Text>
      <Ionicons name="chevron-forward" size={16} color="#8B9098" />
    </TouchableOpacity>
  );
}

function PayoutRow({ date, meta, amount }) {
  return (
    <TouchableOpacity style={styles.earningsTransactionRow} activeOpacity={0.84}>
      <View style={styles.earningsTransactionIcon}>
        <Ionicons name="business-outline" size={17} color="#17191D" />
      </View>
      <View style={styles.earningsTransactionInfo}>
        <Text style={styles.earningsTransactionTitle}>{date}</Text>
        <Text style={styles.earningsTransactionMeta}>{meta}</Text>
      </View>
      <Text style={styles.earningsTransactionAmount}>{amount}</Text>
      <Ionicons name="chevron-forward" size={16} color="#8B9098" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex1: { flex: 1 },
  earningsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  emptyTransactions: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 4 },
  emptyTransactionsText: { color: '#8B9098', fontSize: 13, fontWeight: '500' },
  earningsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  earningsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  earningsChartWrapper: { position: 'relative', zIndex: 20, marginBottom: 8 },
  earningsChartCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10 },
  chartPeriodDropdown: { position: 'absolute', top: 48, right: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8, minWidth: 130, zIndex: 30 },
  chartPeriodOption: { paddingHorizontal: 16, paddingVertical: 12 },
  chartPeriodOptionActive: { backgroundColor: '#FFF3E8' },
  chartPeriodOptionText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  chartPeriodOptionTextActive: { color: '#F97316', fontWeight: '700' },
  earningsChartTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  earningsChartLabel: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  earningsChartValue: { color: '#17191D', fontSize: 21, lineHeight: 25, fontWeight: '800', marginTop: 0 },
  earningsTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  earningsTrendText: { color: '#16A34A', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  earningsPeriodBtn: { height: 29, borderRadius: 15, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
  earningsPeriodText: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  earningsChartArea: { height: 82, justifyContent: 'space-between', marginTop: 1, paddingLeft: 1 },
  earningsChartGridRow: { height: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  earningsChartAxis: { width: 31, color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  earningsChartGridLine: { flex: 1, height: 1, backgroundColor: '#ECEEF0' },
  earningsBarsLayer: { position: 'absolute', left: 42, right: 0, bottom: 7, height: 61, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 7 },
  earningsBarColumn: { width: 20, alignItems: 'center', justifyContent: 'flex-end' },
  earningsBarFill: { width: 5, borderRadius: 4, backgroundColor: '#F04416' },
  earningsDaysRow: { marginLeft: 42, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1, marginTop: 3 },
  earningsDayText: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '700' },
  earningsDayActive: { color: '#F04416' },
  earningsMetricGrid: { gap: 8, marginBottom: 7 },
  earningsMetricRow: { flexDirection: 'row', gap: 8 },
  earningsMetricCard: { flex: 1, minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 },
  earningsMetricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsMetricText: { flex: 1, minWidth: 0 },
  earningsMetricTitle: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  earningsMetricValue: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800', marginTop: 0 },
  earningsMetricMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 0 },
  earningsKpiCard: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
  earningsKpiItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  earningsKpiDivider: { borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 9 },
  earningsKpiIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsKpiText: { flex: 1, minWidth: 0 },
  earningsKpiValue: { color: '#17191D', fontSize: 13, lineHeight: 16, fontWeight: '800' },
  earningsKpiLabel: { color: '#5E646D', fontSize: 8, lineHeight: 11, fontWeight: '600', marginTop: 1 },
  balanceCard: { minHeight: 68, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, marginBottom: 8 },
  balanceTextBlock: { flex: 1, minWidth: 0 },
  balanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceLabel: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  balanceAmount: { color: '#F04416', fontSize: 16, lineHeight: 20, fontWeight: '800', marginTop: 1 },
  balanceMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 1 },
  balanceActionBlock: { width: 106, alignItems: 'stretch', gap: 4, flexShrink: 0 },
  withdrawBtn: { height: 40, borderRadius: 10, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingHorizontal: 10 },
  withdrawText: { color: '#FFFFFF', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  breakdownBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  breakdownBtnText: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  nextPayoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  nextPayoutText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  earningsListCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingTop: 12, marginBottom: 10 },
  earningsListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 },
  earningsListTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  earningsViewAll: { color: '#F04416', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  earningsTransactionRow: { minHeight: 58, borderTopWidth: 1, borderTopColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  earningsTransactionIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsTransactionInfo: { flex: 1, minWidth: 0 },
  earningsTransactionTitle: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  earningsTransactionMeta: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2 },
  earningsTransactionAmount: { color: '#16A34A', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 0 },
});
