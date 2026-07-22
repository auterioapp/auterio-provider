import { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const COUNTER_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'];
const COUNTER_DAYS_AHEAD = 14;

function CounterOfferModal({ order, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  if (!order) return null;

  const today = new Date(); today.setHours(0,0,0,0);
  const days = Array.from({ length: COUNTER_DAYS_AHEAD }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i + 1); return d;
  });
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const canSend = selectedDate && selectedSlot;

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ color: '#17191D', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>Suggest Another Time</Text>
            <Text style={{ color: '#5E646D', fontSize: 14, marginBottom: 20 }}>Pick a date and time that works for you.</Text>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => {
                const sel = selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <TouchableOpacity key={i} onPress={() => setSelectedDate(d)} activeOpacity={0.8}
                    style={{ width: 56, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: sel ? '#7C3AED' : '#ECEEF0', backgroundColor: sel ? '#F5F0FF' : '#F9FAFB', gap: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: sel ? '#7C3AED' : '#5E646D' }}>{DAY_NAMES[d.getDay()]}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: sel ? '#7C3AED' : '#17191D' }}>{d.getDate()}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: sel ? '#7C3AED' : '#9CA3AF' }}>{MONTH_NAMES[d.getMonth()]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Select Time</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {COUNTER_SLOTS.map(slot => {
                const sel = selectedSlot === slot;
                return (
                  <TouchableOpacity key={slot} onPress={() => setSelectedSlot(slot)} activeOpacity={0.8}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: sel ? '#7C3AED' : '#ECEEF0', backgroundColor: sel ? '#F5F0FF' : '#F9FAFB' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#7C3AED' : '#5E646D' }}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Message to Client (optional)</Text>
            <TextInput
              style={{ backgroundColor: '#F5F6F8', borderRadius: 12, padding: 14, fontSize: 14, color: '#17191D', minHeight: 72, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 20 }}
              placeholder="e.g. We're fully booked on your selected date, but can fit you in on this day!"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={{ backgroundColor: canSend ? '#7C3AED' : '#D1D5DB', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
              activeOpacity={0.84}
              disabled={!canSend}
              onPress={() => {
                if (!canSend) return;
                onConfirm(order, selectedDate.toISOString(), selectedSlot, note.trim());
                setNote(''); setSelectedDate(null); setSelectedSlot(null);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Send Suggestion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => { setNote(''); setSelectedDate(null); setSelectedSlot(null); onClose(); }}>
              <Text style={{ color: '#5E646D', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default CounterOfferModal;
