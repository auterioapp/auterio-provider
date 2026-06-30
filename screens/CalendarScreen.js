import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL, PROVIDER } from '../constants';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmtTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const h = d.getHours();
  const m = d.getMinutes();
  const p = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${p}`;
}

function fmtWeekRange(monday) {
  const sunday = addDays(monday, 6);
  if (monday.getMonth() === sunday.getMonth()) {
    return `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`;
  }
  return `${MONTH_SHORT[monday.getMonth()]} ${monday.getDate()} – ${MONTH_SHORT[sunday.getMonth()]} ${sunday.getDate()}, ${monday.getFullYear()}`;
}

function getApptMeta(job) {
  if (job.status === 'cancelled' || job.status === 'declined') return { label: 'Cancelled', color: '#DC2626', bg: '#FEF2F2' };
  if (job.confirmedByProvider) return { label: 'Confirmed', color: '#16A34A', bg: '#F0FDF4' };
  return { label: 'Pending', color: '#F59E0B', bg: '#FFFBEB' };
}

export default function CalendarScreen({ visible, onClose, onOpenJob }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) loadAppointments();
  }, [visible]);

  async function loadAppointments(silent = false) {
    if (!silent) setLoading(true);
    try {
      const scheduledRes = await fetch(`${API_URL}/orders?status=scheduled&providerId=${PROVIDER.id}`);
      const scheduled = scheduledRes.ok ? await scheduledRes.json() : [];
      const all = [...scheduled].sort((a, b) => {
        const ta = new Date(a.scheduledAt || 0).getTime();
        const tb = new Date(b.scheduledAt || 0).getTime();
        return ta - tb;
      });
      setAppointments(all);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function changeWeek(offset) {
    setWeekStart(prev => addDays(prev, offset * 7));
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  // Group appointments by weekday index for current week
  const grouped = weekDays.map(day => ({
    day,
    items: appointments.filter(a => a.scheduledAt && sameDay(new Date(a.scheduledAt), day)),
  }));

  const weekTotal = grouped.reduce((s, g) => s + g.items.length, 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calendar</Text>
          <TouchableOpacity onPress={() => loadAppointments(true)} style={styles.refreshBtn} activeOpacity={0.7}>
            <Ionicons name="refresh-outline" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        {/* Week navigator */}
        <View style={styles.weekNav}>
          <TouchableOpacity style={styles.weekArrow} onPress={() => changeWeek(-1)} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.weekLabelWrap}>
            <Text style={styles.weekLabel}>{fmtWeekRange(weekStart)}</Text>
            <Text style={styles.weekCount}>{weekTotal} appointment{weekTotal !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.weekArrow} onPress={() => changeWeek(1)} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        {/* Day strip */}
        <View style={styles.dayStrip}>
          {weekDays.map((day, i) => {
            const isToday = sameDay(day, today);
            const count = grouped[i].items.length;
            return (
              <View key={i} style={styles.dayStripCell}>
                <Text style={[styles.dayStripName, isToday && styles.dayStripNameToday]}>{DAY_SHORT[day.getDay()]}</Text>
                <View style={[styles.dayStripNum, isToday && styles.dayStripNumToday, count > 0 && styles.dayStripNumBusy]}>
                  <Text style={[styles.dayStripNumText, isToday && styles.dayStripNumTextToday]}>{day.getDate()}</Text>
                </View>
                {count > 0 && <View style={styles.dayDot} />}
              </View>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAppointments(true); }} />}
          >
            {grouped.map(({ day, items }, i) => {
              const isToday = sameDay(day, today);
              const isPast = day < today && !isToday;
              return (
                <View key={i} style={styles.daySection}>
                  <View style={styles.daySectionHeader}>
                    <Text style={[styles.daySectionTitle, isToday && styles.daySectionTitleToday, isPast && styles.daySectionTitlePast]}>
                      {isToday ? 'Today' : DAY_FULL[day.getDay()]}
                    </Text>
                    <Text style={styles.daySectionDate}>{MONTH_SHORT[day.getMonth()]} {day.getDate()}</Text>
                  </View>

                  {items.length === 0 ? (
                    <View style={styles.emptyDay}>
                      <Text style={styles.emptyDayText}>No appointments</Text>
                    </View>
                  ) : (
                    <View style={styles.appointmentList}>
                      {items.map(job => {
                        const meta = getApptMeta(job);
                        const service = job.service?.type || job.service?.issueName || job.issue?.name || 'Service';
                        const vehicle = [job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || '—';
                        const customer = job.customer?.name || 'Customer';
                        return (
                          <TouchableOpacity
                            key={job.id || job._id}
                            style={[styles.apptCard, isPast && styles.apptCardPast]}
                            onPress={() => onOpenJob?.(job)}
                            activeOpacity={0.86}
                          >
                            <View style={[styles.apptTimeCol, { borderColor: meta.color + '40' }]}>
                              <Text style={[styles.apptTime, { color: meta.color }]}>{fmtTime(job.scheduledAt)}</Text>
                              <Text style={styles.apptSlot}>{job.scheduledSlotLabel || ''}</Text>
                            </View>
                            <View style={styles.apptInfo}>
                              <Text style={styles.apptService} numberOfLines={1}>{service}</Text>
                              <Text style={styles.apptCustomer} numberOfLines={1}>{customer}</Text>
                              <Text style={styles.apptVehicle} numberOfLines={1}>{vehicle}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#ECEEF0' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  refreshBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },

  weekNav: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 4, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#ECEEF0' },
  weekArrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekLabelWrap: { flex: 1, alignItems: 'center' },
  weekLabel: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  weekCount: { color: '#6B7280', fontSize: 12, marginTop: 2 },

  dayStrip: { flexDirection: 'row', backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#ECEEF0' },
  dayStripCell: { flex: 1, alignItems: 'center', gap: 4 },
  dayStripName: { color: '#9CA3AF', fontSize: 11, fontWeight: '600' },
  dayStripNameToday: { color: '#7C3AED' },
  dayStripNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dayStripNumToday: { backgroundColor: '#7C3AED' },
  dayStripNumBusy: { borderWidth: 1.5, borderColor: '#7C3AED' },
  dayStripNumText: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  dayStripNumTextToday: { color: '#FFFFFF' },
  dayDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7C3AED' },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  daySection: { marginBottom: 16 },
  daySectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  daySectionTitle: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  daySectionTitleToday: { color: '#7C3AED' },
  daySectionTitlePast: { color: '#9CA3AF' },
  daySectionDate: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },

  emptyDay: { backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', paddingVertical: 12, alignItems: 'center' },
  emptyDayText: { color: '#C8CDD4', fontSize: 13 },

  appointmentList: { gap: 8 },
  apptCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  apptCardPast: { opacity: 0.6 },
  apptTimeCol: { borderRightWidth: 1, paddingRight: 12, minWidth: 70, alignItems: 'flex-start' },
  apptTime: { fontSize: 14, fontWeight: '800' },
  apptSlot: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  apptInfo: { flex: 1 },
  apptService: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  apptCustomer: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  apptVehicle: { color: '#9CA3AF', fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
});
