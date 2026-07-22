import { useEffect, useState } from 'react';
import { Dimensions, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CalendarPickerModal from './CalendarPickerModal';

const QUICK_OPTIONS = [
  { icon: 'partly-sunny-outline', color: '#F97316', label: 'Tomorrow\nMorning', sub: '8:00 AM – 12:00 PM', day: 1, time: '8:00 AM' },
  { icon: 'sunny-outline',        color: '#F97316', label: 'Tomorrow\nAfternoon', sub: '12:00 PM – 5:00 PM', day: 1, time: '12:00 PM' },
  { icon: 'calendar-outline',     color: '#7C3AED', label: 'Pick Custom\nDate & Time', sub: 'Choose manually', day: null, time: null },
];

function AppointmentModal({ order, onClose, onConfirm }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    timeSlots.push(`${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`);
    if (h < 17) timeSlots.push(`${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`);
  }

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [customDate, setCustomDate] = useState(null);

  useEffect(() => {
    if (!order) {
      setSelectedDay(1);
      setSelectedTime(null);
      setMessage('');
      setCalOpen(false);
      setCustomDate(null);
    }
  }, [order]);

  const timeRows = [];
  for (let i = 0; i < timeSlots.length; i += 4) timeRows.push(timeSlots.slice(i, 4 + i));
  const CHIP_W = Math.floor((Dimensions.get('window').width - 32 - 24) / 4);

  const customerRequestedTime = order?.scheduledSlotLabel || order?.scheduledSlot || 'Today • 2:00 PM';

  const getConfirmDate = () => customDate || days[selectedDay];

  const getSelectedLabel = () => {
    if (!selectedTime) return null;
    const d = getConfirmDate();
    const isToday2 = d.toDateString() === today.toDateString();
    const isTomorrow2 = d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toDateString();
    const dayStr = isToday2 ? 'Today' : isTomorrow2 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dayStr} at ${selectedTime}`;
  };

  return (
    <Modal visible={!!order} animationType="slide" transparent onRequestClose={onClose}>
      <View style={apptStyles.overlay}>
        <TouchableOpacity style={apptStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={apptStyles.sheet}>
          <View style={apptStyles.handle} />

          {/* Header */}
          <View style={apptStyles.header}>
            <View style={apptStyles.headerIcon}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={apptStyles.title}>Suggest New Time</Text>
              <Text style={apptStyles.sub}>Propose an alternative time for this job</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={apptStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#5E646D" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={apptStyles.content}>

            {/* Customer requested banner */}
            <View style={apptStyles.requestedBanner}>
              <View style={apptStyles.requestedIconCircle}>
                <Ionicons name="time-outline" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={apptStyles.requestedLabel}>Customer requested</Text>
                <Text style={apptStyles.requestedTime}>{customerRequestedTime}</Text>
              </View>
            </View>
            <Text style={apptStyles.instructionText}>Choose a different time to propose to the customer.</Text>

            {/* Select day */}
            <Text style={apptStyles.sectionLabel}>SELECT DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={apptStyles.daysRow}>
              {days.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[apptStyles.dayChip, !customDate && selectedDay === i && apptStyles.dayChipActive]}
                  onPress={() => { setSelectedDay(i); setCustomDate(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[apptStyles.dayChipLabel, !customDate && selectedDay === i && apptStyles.dayChipTextActive]}>
                    {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[apptStyles.dayChipDate, !customDate && selectedDay === i && apptStyles.dayChipTextActive]}>
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
              {customDate ? (
                <TouchableOpacity style={[apptStyles.dayChip, apptStyles.dayChipActive]} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
                  <Text style={[apptStyles.dayChipLabel, apptStyles.dayChipTextActive]}>
                    {customDate.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[apptStyles.dayChipDate, apptStyles.dayChipTextActive]}>
                    {customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={apptStyles.dayChipMore} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  <Text style={apptStyles.dayChipMoreText}>More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Select time */}
            <Text style={[apptStyles.sectionLabel, { marginTop: 22 }]}>SELECT TIME</Text>
            <View style={apptStyles.timesGrid}>
              {timeRows.map((row, ri) => (
                <View key={ri} style={apptStyles.timeRow}>
                  {row.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[apptStyles.timeChip, { width: CHIP_W }, selectedTime === slot && apptStyles.timeChipActive]}
                      onPress={() => setSelectedTime(slot)}
                      activeOpacity={0.8}
                    >
                      <Text style={[apptStyles.timeChipText, selectedTime === slot && apptStyles.timeChipTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Message to customer */}
            <Text style={[apptStyles.sectionLabel, { marginTop: 22 }]}>MESSAGE TO CUSTOMER (OPTIONAL)</Text>
            <View style={apptStyles.messageBox}>
              <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
              <TextInput
                style={apptStyles.messageInput}
                placeholder="Add a note for the customer..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={200}
                value={message}
                onChangeText={setMessage}
              />
              <Text style={apptStyles.messageCount}>{message.length}/200</Text>
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={apptStyles.footer}>
            <TouchableOpacity
              style={[apptStyles.confirmBtn, !selectedTime && apptStyles.confirmBtnDisabled]}
              activeOpacity={selectedTime ? 0.84 : 1}
              onPress={() => {
                if (!selectedTime) return;
                const d = getConfirmDate();
                const appointmentTime = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${selectedTime}`;
                onConfirm(order, appointmentTime);
              }}
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <View style={{ alignItems: 'center' }}>
                <Text style={apptStyles.confirmBtnText}>Send Proposal</Text>
                {!!selectedTime && <Text style={apptStyles.confirmBtnSub}>{getSelectedLabel()}</Text>}
              </View>
            </TouchableOpacity>
            <View style={apptStyles.footerNote}>
              <Ionicons name="lock-closed-outline" size={12} color="#9CA3AF" />
              <Text style={apptStyles.footerNoteText}>The customer will be notified and can accept or decline.</Text>
            </View>
          </View>
        </View>
      </View>

      <CalendarPickerModal
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        onSelect={(date, time) => {
          setCustomDate(date);
          setSelectedTime(time);
          setCalOpen(false);
        }}
      />
    </Modal>
  );
}

const apptStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.55)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1E4E8', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  headerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  sub: { color: '#5E646D', fontSize: 12, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  requestedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 12, marginBottom: 12 },
  requestedIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  requestedLabel: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  requestedTime: { color: '#F97316', fontSize: 15, fontWeight: '800' },
  instructionText: { color: '#5E646D', fontSize: 13, lineHeight: 19, marginBottom: 18 },
  sectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickCard: { flex: 1, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#ECEEF0', padding: 10, gap: 4 },
  quickLabel: { color: '#17191D', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  quickSub: { color: '#5E646D', fontSize: 10, fontWeight: '500' },
  daysRow: { gap: 8, paddingRight: 4 },
  dayChip: { minWidth: 68, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dayChipLabel: { color: '#17191D', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  dayChipDate: { color: '#5E646D', fontSize: 10, fontWeight: '500' },
  dayChipTextActive: { color: '#FFFFFF' },
  dayChipMore: { minWidth: 56, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayChipMoreText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F9FAFB' },
  customDateIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  customDateLabel: { flex: 1, color: '#2563EB', fontSize: 13, fontWeight: '600' },
  timesGrid: { gap: 8 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeChip: { height: 42, borderRadius: 10, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  timeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timeChipText: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  timeChipTextActive: { color: '#FFFFFF' },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F9FAFB', padding: 12 },
  messageInput: { flex: 1, color: '#17191D', fontSize: 13, minHeight: 36, maxHeight: 72 },
  messageCount: { color: '#9CA3AF', fontSize: 10, alignSelf: 'flex-end' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F0F1F3', gap: 10 },
  confirmBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  confirmBtnDisabled: { backgroundColor: '#C4C9D1' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  confirmBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  footerNoteText: { color: '#9CA3AF', fontSize: 11 },
});

export default AppointmentModal;
