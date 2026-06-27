import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const INITIAL_DAYS = [
  { id: 'mon', label: 'Monday',    enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'tue', label: 'Tuesday',   enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'wed', label: 'Wednesday', enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'thu', label: 'Thursday',  enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'fri', label: 'Friday',    enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'sat', label: 'Saturday',  enabled: false, startH: 9,  startM: 0,  startP: 'AM', endH: 3,  endM: 0,  endP: 'PM' },
  { id: 'sun', label: 'Sunday',    enabled: false, startH: 9,  startM: 0,  startP: 'AM', endH: 3,  endM: 0,  endP: 'PM' },
];

function fmt(h, m, p) {
  return `${h}:${m.toString().padStart(2, '0')} ${p}`;
}

export function getHoursSummary(days) {
  const enabled = days.filter(d => d.enabled);
  if (!enabled.length) return 'No active days';
  const first = enabled[0];
  const timeStr = `${fmt(first.startH, first.startM, first.startP)} – ${fmt(first.endH, first.endM, first.endP)}`;
  const monToFri = ['mon','tue','wed','thu','fri'];
  const allWeekdays = monToFri.every(id => {
    const d = days.find(x => x.id === id);
    return d && d.enabled && d.startH === first.startH && d.startM === first.startM && d.startP === first.startP && d.endH === first.endH && d.endM === first.endM && d.endP === first.endP;
  });
  const noWeekend = !days.find(d => d.id === 'sat')?.enabled && !days.find(d => d.id === 'sun')?.enabled;
  if (allWeekdays && noWeekend && enabled.length === 5) return `Mon–Fri ${timeStr}`;
  return `${enabled.length} day${enabled.length !== 1 ? 's' : ''} · ${timeStr}`;
}

function stepHour(h, dir) {
  let n = h + dir;
  if (n < 1) n = 12;
  if (n > 12) n = 1;
  return n;
}

function stepMinute(m, dir) {
  let n = m + dir * 30;
  if (n < 0) n = 30;
  if (n > 30) n = 0;
  return n;
}

function TimeColumn({ label, h, m, p, onChange }) {
  return (
    <View style={styles.col}>
      <Text style={styles.colLabel}>{label}</Text>
      <View style={styles.timeBox}>
        {/* Hour */}
        <View style={styles.spinnerGroup}>
          <TouchableOpacity onPress={() => onChange({ h: stepHour(h, 1), m, p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-up" size={20} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.timeNum}>{h}</Text>
          <TouchableOpacity onPress={() => onChange({ h: stepHour(h, -1), m, p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        <Text style={styles.timeSep}>:</Text>

        {/* Minute */}
        <View style={styles.spinnerGroup}>
          <TouchableOpacity onPress={() => onChange({ h, m: stepMinute(m, 1), p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-up" size={20} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.timeNum}>{m.toString().padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => onChange({ h, m: stepMinute(m, -1), p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        {/* AM/PM */}
        <View style={styles.ampmGroup}>
          <TouchableOpacity
            style={[styles.ampmBtn, p === 'AM' && styles.ampmBtnActive]}
            activeOpacity={0.8}
            onPress={() => onChange({ h, m, p: 'AM' })}
          >
            <Text style={[styles.ampmText, p === 'AM' && styles.ampmTextActive]}>AM</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ampmBtn, p === 'PM' && styles.ampmBtnActive]}
            activeOpacity={0.8}
            onPress={() => onChange({ h, m, p: 'PM' })}
          >
            <Text style={[styles.ampmText, p === 'PM' && styles.ampmTextActive]}>PM</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function WorkingHoursScreen({ visible, onClose, onSave }) {
  const [days, setDays] = useState(INITIAL_DAYS);
  const [editingId, setEditingId] = useState(null);

  const editingDay = days.find(d => d.id === editingId);

  const toggle = (id) => {
    setDays(prev => prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d));
  };

  const updateTime = (id, field, val) => {
    setDays(prev => prev.map(d => d.id === id ? { ...d, ...field(val) } : d));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Working Hours</Text>
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.7}
            onPress={() => { onSave?.(days); Alert.alert('Saved', 'Working hours updated.'); onClose(); }}
          >
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionNote}>Set the days and hours you are available for service requests.</Text>

          <View style={styles.card}>
            {days.map((day, index) => (
              <View key={day.id} style={[styles.dayRow, index > 0 && styles.rowBorder]}>
                <View style={styles.dayTop}>
                  <Switch
                    value={day.enabled}
                    onValueChange={() => toggle(day.id)}
                    trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                    thumbColor="#FFFFFF"
                  />
                  <Text style={[styles.dayLabel, !day.enabled && styles.dayLabelOff]}>{day.label}</Text>
                  {day.enabled ? (
                    <TouchableOpacity
                      style={styles.timeRange}
                      activeOpacity={0.84}
                      onPress={() => setEditingId(editingId === day.id ? null : day.id)}
                    >
                      <Text style={styles.timeText}>{fmt(day.startH, day.startM, day.startP)} – {fmt(day.endH, day.endM, day.endP)}</Text>
                      <Ionicons name={editingId === day.id ? 'chevron-up' : 'chevron-down'} size={14} color="#7C3AED" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.closedText}>Closed</Text>
                  )}
                </View>

                {editingId === day.id && day.enabled && (
                  <View style={styles.pickerRow}>
                    <TimeColumn
                      label="Start"
                      h={day.startH} m={day.startM} p={day.startP}
                      onChange={({ h, m, p }) => setDays(prev =>
                        prev.map(d => d.id === day.id ? { ...d, startH: h, startM: m, startP: p } : d)
                      )}
                    />
                    <View style={styles.pickerDivider} />
                    <TimeColumn
                      label="End"
                      h={day.endH} m={day.endM} p={day.endP}
                      onChange={({ h, m, p }) => setDays(prev =>
                        prev.map(d => d.id === day.id ? { ...d, endH: h, endM: m, endP: p } : d)
                      )}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={styles.infoText}>Customers will only be able to book services during your working hours.</Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 4 },
  saveBtnText: { color: '#7C3AED', fontSize: 15, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionNote: { color: '#6B7280', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16 },
  dayRow: { paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  dayTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dayLabel: { color: '#17191D', fontSize: 15, fontWeight: '600', flex: 1 },
  dayLabelOff: { color: '#9CA3AF' },
  timeRange: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },
  closedText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },

  pickerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: '#F5F6F8', borderRadius: 12, padding: 12 },
  pickerDivider: { width: 1, backgroundColor: '#E5E7EB', alignSelf: 'stretch', marginHorizontal: 12 },
  col: { flex: 1, alignItems: 'center' },
  colLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spinnerGroup: { alignItems: 'center', gap: 4 },
  arrowBtn: { padding: 4 },
  timeNum: { color: '#17191D', fontSize: 22, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  timeSep: { color: '#17191D', fontSize: 22, fontWeight: '800', marginBottom: 2 },
  ampmGroup: { gap: 6, marginLeft: 4 },
  ampmBtn: { paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E7EB' },
  ampmBtnActive: { backgroundColor: '#7C3AED' },
  ampmText: { color: '#6B7280', fontSize: 12, fontWeight: '700' },
  ampmTextActive: { color: '#FFFFFF' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
});
