import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Text as SvgText } from 'react-native-svg';

const PERIODS = ['Today', 'This Week', 'This Month', 'This Year'];

export const DATA_BY_PERIOD = {
  'Today': [
    { label: 'Labor',        amount: 285, pct: 64.0, color: '#16A34A' },
    { label: 'Parts',        amount: 85,  pct: 19.1, color: '#93C5FD' },
    { label: 'Service Call Fee', amount: 55,  pct: 12.4, color: '#A78BFA' },
    { label: 'Tips',         amount: 20,  pct: 4.5,  color: '#FBBF24' },
  ],
  'This Week': [
    { label: 'Labor',             amount: 1480, pct: 34.6, color: '#16A34A' },
    { label: 'Parts',             amount: 540,  pct: 12.6, color: '#93C5FD' },
    { label: 'Service Call Fee',       amount: 320,  pct: 7.5,  color: '#A78BFA' },
    { label: 'Tips',              amount: 125,  pct: 2.9,  color: '#FBBF24' },
    { label: 'Other Adjustments', amount: 1820, pct: 42.4, color: '#D1D5DB' },
  ],
  'This Month': [
    { label: 'Labor',             amount: 6200, pct: 36.1, color: '#16A34A' },
    { label: 'Parts',             amount: 2100, pct: 12.2, color: '#93C5FD' },
    { label: 'Service Call Fee',       amount: 1350, pct: 7.9,  color: '#A78BFA' },
    { label: 'Tips',              amount: 480,  pct: 2.8,  color: '#FBBF24' },
    { label: 'Other Adjustments', amount: 7040, pct: 41.0, color: '#D1D5DB' },
  ],
  'This Year': [
    { label: 'Labor',             amount: 71200, pct: 35.4, color: '#16A34A' },
    { label: 'Parts',             amount: 24800, pct: 12.3, color: '#93C5FD' },
    { label: 'Service Call Fee',       amount: 15900, pct: 7.9,  color: '#A78BFA' },
    { label: 'Tips',              amount: 5600,  pct: 2.8,  color: '#FBBF24' },
    { label: 'Other Adjustments', amount: 83700, pct: 41.6, color: '#D1D5DB' },
  ],
};

const CX = 110, CY = 110, R = 90, INNER = 62, GAP = 2;

function polarToCartesian(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function slicePath(startAngle, endAngle) {
  const sa = startAngle + GAP / 2;
  const ea = endAngle - GAP / 2;
  const s1 = polarToCartesian(R, sa);
  const e1 = polarToCartesian(R, ea);
  const s2 = polarToCartesian(INNER, ea);
  const e2 = polarToCartesian(INNER, sa);
  const large = ea - sa > 180 ? 1 : 0;
  return `M ${s1.x} ${s1.y} A ${R} ${R} 0 ${large} 1 ${e1.x} ${e1.y} L ${s2.x} ${s2.y} A ${INNER} ${INNER} 0 ${large} 0 ${e2.x} ${e2.y} Z`;
}

function formatAmount(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function DonutChart({ segments }) {
  const total = segments.reduce((s, x) => s + x.amount, 0);
  let cursor = 0;
  const slices = segments.map(seg => {
    const sweep = (seg.amount / total) * 360;
    const path = slicePath(cursor, cursor + sweep);
    cursor += sweep;
    return { ...seg, path };
  });

  return (
    <Svg width={220} height={220} viewBox="0 0 220 220">
      {slices.map(s => (
        <Path key={s.label} d={s.path} fill={s.color} />
      ))}
      <SvgText
        x={CX}
        y={CY - 10}
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill="#17191D"
      >
        {formatAmount(total)}
      </SvgText>
      <SvgText
        x={CX}
        y={CY + 14}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="#6B7280"
      >
        Total Revenue
      </SvgText>
    </Svg>
  );
}

export default function RevenueBreakdownScreen({ visible, onClose, isDemo }) {
  const [period, setPeriod] = useState('This Week');
  const [showPeriods, setShowPeriods] = useState(false);
  const segments = DATA_BY_PERIOD[period];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Revenue Breakdown</Text>
          <View style={styles.headerRight} />
        </View>

        {!isDemo ? (
          <View style={styles.emptyState}>
            <Ionicons name="pie-chart-outline" size={48} color="#C8CDD4" />
            <Text style={styles.emptyTitle}>No revenue data yet</Text>
            <Text style={styles.emptySub}>Your revenue breakdown will appear here after completing your first job.</Text>
          </View>
        ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Period picker */}
          <View style={styles.periodRow}>
            <TouchableOpacity
              style={styles.periodBtn}
              activeOpacity={0.8}
              onPress={() => setShowPeriods(v => !v)}
            >
              <Text style={styles.periodBtnText}>{period}</Text>
              <Ionicons name={showPeriods ? 'chevron-up' : 'chevron-down'} size={16} color="#17191D" />
            </TouchableOpacity>

            {showPeriods && (
              <View style={styles.periodDropdown}>
                {PERIODS.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.periodOption, p === period && styles.periodOptionActive]}
                    activeOpacity={0.8}
                    onPress={() => { setPeriod(p); setShowPeriods(false); }}
                  >
                    <Text style={[styles.periodOptionText, p === period && styles.periodOptionTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Donut chart */}
          <View style={styles.chartWrapper}>
            <DonutChart segments={segments} />
          </View>

          {/* Legend */}
          <View style={styles.legendCard}>
            {segments.map((seg, index) => (
              <View key={seg.label} style={[styles.legendRow, index > 0 && styles.legendRowBorder]}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.legendLabel}>{seg.label}</Text>
                <Text style={styles.legendAmount}>{formatAmount(seg.amount)}</Text>
                <Text style={styles.legendPct}>{seg.pct}%</Text>
              </View>
            ))}
          </View>

          {/* Disclaimer */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>Percentages may not add up to 100% due to rounding.</Text>
          </View>

        </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyTitle: { color: '#17191D', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  periodRow: { marginBottom: 8, zIndex: 10 },
  periodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 8 },
  periodBtnText: { color: '#17191D', fontSize: 14, fontWeight: '600' },
  periodDropdown: { position: 'absolute', top: 42, left: 0, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6, minWidth: 150 },
  periodOption: { paddingHorizontal: 16, paddingVertical: 12 },
  periodOptionActive: { backgroundColor: '#F3EEFF' },
  periodOptionText: { color: '#374151', fontSize: 14, fontWeight: '500' },
  periodOptionTextActive: { color: '#7C3AED', fontWeight: '700' },
  chartWrapper: { alignItems: 'center', marginVertical: 8 },
  legendCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, marginBottom: 12 },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 10 },
  legendRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  legendDot: { width: 12, height: 12, borderRadius: 6, flexShrink: 0 },
  legendLabel: { flex: 1, color: '#17191D', fontSize: 14, fontWeight: '600' },
  legendAmount: { color: '#17191D', fontSize: 14, fontWeight: '700', marginRight: 12 },
  legendPct: { color: '#6B7280', fontSize: 13, fontWeight: '500', width: 42, textAlign: 'right' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F5F6F8', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
});
