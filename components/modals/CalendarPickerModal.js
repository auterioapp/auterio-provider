import { useState } from 'react';
import { Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function CalendarPickerModal({ visible, onClose, onSelect }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pickedDate, setPickedDate] = useState(null);
  const [pickedTime, setPickedTime] = useState(null);

  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    timeSlots.push(`${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`);
    if (h < 17) timeSlots.push(`${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`);
  }
  const timeRows = [];
  for (let i = 0; i < timeSlots.length; i += 4) timeRows.push(timeSlots.slice(i, 4 + i));
  const CHIP_W = Math.floor((Dimensions.get('window').width - 32 - 24) / 4);

  const firstDOW = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calCells = [];
  for (let i = 0; i < firstDOW; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);
  const weeks = [];
  for (let i = 0; i < calCells.length; i += 7) weeks.push(calCells.slice(i, i + 7));

  const isPast = (d) => d && new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isSelected = (d) => pickedDate && d === pickedDate.getDate() && viewYear === pickedDate.getFullYear() && viewMonth === pickedDate.getMonth();
  const isToday = (d) => d && viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <TouchableOpacity style={calStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={calStyles.sheet}>
          <View style={calStyles.handle} />
          <View style={calStyles.header}>
            <Text style={calStyles.title}>Pick Date & Time</Text>
            <TouchableOpacity style={calStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color="#5E646D" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={calStyles.content}>
            {/* Month nav */}
            <View style={calStyles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color="#17191D" />
              </TouchableOpacity>
              <Text style={calStyles.monthLabel}>{monthName}</Text>
              <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color="#17191D" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={calStyles.weekRow}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <Text key={d} style={calStyles.weekDay}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            {weeks.map((week, wi) => (
              <View key={wi} style={calStyles.weekRow}>
                {week.map((d, di) => {
                  const past = isPast(d);
                  const sel = isSelected(d);
                  const tod = isToday(d);
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[calStyles.dayCell, sel && calStyles.dayCellSelected, tod && !sel && calStyles.dayCellToday]}
                      onPress={() => { if (d && !past) setPickedDate(new Date(viewYear, viewMonth, d)); }}
                      activeOpacity={d && !past ? 0.8 : 1}
                      disabled={!d || past}
                    >
                      <Text style={[calStyles.dayCellText, past && calStyles.dayCellPast, sel && calStyles.dayCellTextSelected, tod && !sel && calStyles.dayCellTextToday]}>
                        {d || ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Time picker — shows after date selected */}
            {!!pickedDate && (
              <>
                <Text style={calStyles.timeSectionLabel}>SELECT TIME</Text>
                <View style={calStyles.timesGrid}>
                  {timeRows.map((row, ri) => (
                    <View key={ri} style={calStyles.timeRow}>
                      {row.map(slot => (
                        <TouchableOpacity
                          key={slot}
                          style={[calStyles.timeChip, { width: CHIP_W }, pickedTime === slot && calStyles.timeChipActive]}
                          onPress={() => setPickedTime(slot)}
                          activeOpacity={0.8}
                        >
                          <Text style={[calStyles.timeChipText, pickedTime === slot && calStyles.timeChipTextActive]}>{slot}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[calStyles.confirmBtn, (!pickedDate || !pickedTime) && calStyles.confirmBtnDisabled, { marginTop: 20 }]}
              activeOpacity={(pickedDate && pickedTime) ? 0.84 : 1}
              onPress={() => { if (pickedDate && pickedTime) { onSelect(pickedDate, pickedTime); onClose(); } }}
            >
              <Text style={calStyles.confirmBtnText}>
                {pickedDate && pickedTime
                  ? `Confirm · ${pickedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${pickedTime}`
                  : 'Select date & time'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.55)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1E4E8', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  title: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: '700', paddingBottom: 8 },
  dayCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  dayCellSelected: { backgroundColor: '#2563EB' },
  dayCellToday: { borderWidth: 1, borderColor: '#2563EB' },
  dayCellText: { color: '#17191D', fontSize: 14, fontWeight: '600' },
  dayCellTextSelected: { color: '#FFF' },
  dayCellTextToday: { color: '#2563EB' },
  dayCellPast: { color: '#D1D5DB' },
  timeSectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },
  timesGrid: { gap: 8 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeChip: { height: 40, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  timeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timeChipText: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  timeChipTextActive: { color: '#FFF' },
  confirmBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { backgroundColor: '#C4C9D1' },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

export default CalendarPickerModal;
