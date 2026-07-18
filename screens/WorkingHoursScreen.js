import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authorizedFetch } from '../apiClient';
import { API_URL } from '../constants';
import { useProvider } from '../ProviderContext';
import { loadPricing } from '../utils/pricingStore';

const INITIAL_DAYS = [
  { id: 'mon', label: 'Monday',    enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'tue', label: 'Tuesday',   enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'wed', label: 'Wednesday', enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'thu', label: 'Thursday',  enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'fri', label: 'Friday',    enabled: true,  startH: 8,  startM: 0,  startP: 'AM', endH: 6,  endM: 0,  endP: 'PM' },
  { id: 'sat', label: 'Saturday',  enabled: false, startH: 9,  startM: 0,  startP: 'AM', endH: 3,  endM: 0,  endP: 'PM' },
  { id: 'sun', label: 'Sunday',    enabled: false, startH: 9,  startM: 0,  startP: 'AM', endH: 3,  endM: 0,  endP: 'PM' },
];

const SLOT_OPTIONS = [
  { value: 30,  label: '30 min' },
  { value: 60,  label: '1 hr' },
  { value: 90,  label: '1.5 hr' },
  { value: 120, label: '2 hr' },
];

function fmt(h, m, p) {
  return `${h}:${m.toString().padStart(2, '0')} ${p}`;
}

function apiTimeToUI(t) {
  const [hh, mm] = t.split(':').map(Number);
  const p = hh >= 12 ? 'PM' : 'AM';
  const h = hh % 12 || 12;
  return { h, m: mm, p };
}

function uiTimeToApi(h, m, p) {
  let hh = h % 12;
  if (p === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

        <View style={styles.spinnerGroup}>
          <TouchableOpacity onPress={() => onChange({ h, m: stepMinute(m, 1), p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-up" size={20} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.timeNum}>{m.toString().padStart(2, '0')}</Text>
          <TouchableOpacity onPress={() => onChange({ h, m: stepMinute(m, -1), p })} style={styles.arrowBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-down" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

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
  const { provider } = useProvider();
  const [hasAppointments, setHasAppointments] = useState(false);
  const [days, setDays] = useState(INITIAL_DAYS);
  const [slotDuration, setSlotDuration] = useState(60);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: Dimensions.get('window').width, duration: 250, useNativeDriver: true }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      loadPricing().then(p => {
        const pt = p.providerType || 'mobile';
        setHasAppointments(pt === 'shop' || pt === 'both');
      });
      loadSchedule();
    }
  }, [visible]);

  async function loadSchedule() {
    setLoading(true);
    try {
      const res = await authorizedFetch(`${API_URL}/schedules/${provider.id}`);
      const data = await res.json();
      const newDays = INITIAL_DAYS.map(day => {
        const d = data.days?.[day.id];
        if (!d) return day;
        const start = apiTimeToUI(d.open);
        const end = apiTimeToUI(d.close);
        return { ...day, enabled: d.enabled, startH: start.h, startM: start.m, startP: start.p, endH: end.h, endM: end.m, endP: end.p };
      });
      setDays(newDays);
      setSlotDuration(data.slotDuration || 60);
    } catch {
      // use defaults silently
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const apiDays = {};
      days.forEach(day => {
        apiDays[day.id] = {
          enabled: day.enabled,
          open: uiTimeToApi(day.startH, day.startM, day.startP),
          close: uiTimeToApi(day.endH, day.endM, day.endP),
        };
      });
      const body = { days: apiDays };
      if (hasAppointments) body.slotDuration = slotDuration;
      await authorizedFetch(`${API_URL}/schedules/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onSave?.(days);
      Alert.alert('Saved', 'Schedule updated.');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save schedule. Check your connection.');
    } finally {
      setSaving(false);
    }
  }

  const toggle = (id) => {
    setDays(prev => prev.map(d => d.id === id ? { ...d, enabled: !d.enabled } : d));
  };

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Schedule Settings</Text>
          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.7}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#7C3AED" />
              : <Text style={styles.saveBtnText}>Save</Text>
            }
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionNote}>Set your working days, hours, and appointment slot duration.</Text>

            <Text style={styles.sectionTitle}>Working Hours</Text>
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

            {hasAppointments && (
              <>
                <Text style={styles.sectionTitle}>Appointment Slot Duration</Text>
                <Text style={styles.sectionSubNote}>How long each booked appointment takes.</Text>
                <View style={styles.slotRow}>
                  {SLOT_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.slotChip, slotDuration === opt.value && styles.slotChipActive]}
                      activeOpacity={0.8}
                      onPress={() => setSlotDuration(opt.value)}
                    >
                      <Text style={[styles.slotChipText, slotDuration === opt.value && styles.slotChipTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.infoText}>
                {hasAppointments
                  ? 'Customers will only be able to book during your working hours. Slot duration determines how many appointments can be booked per day.'
                  : 'Your working hours are shown to customers when they search for on-demand services.'}
              </Text>
            </View>
          </ScrollView>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  saveBtn: { paddingHorizontal: 4, minWidth: 40, alignItems: 'center' },
  saveBtnText: { color: '#7C3AED', fontSize: 15, fontWeight: '700' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionNote: { color: '#6B7280', fontSize: 13, lineHeight: 20, marginBottom: 14 },
  sectionTitle: { color: '#17191D', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  sectionSubNote: { color: '#6B7280', fontSize: 13, marginBottom: 10, marginTop: -4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, marginBottom: 20 },
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

  slotRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  slotChip: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#ECEEF0', alignItems: 'center' },
  slotChipActive: { borderColor: '#7C3AED', backgroundColor: '#F5F0FF' },
  slotChipText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  slotChipTextActive: { color: '#7C3AED', fontWeight: '700' },

  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
});
