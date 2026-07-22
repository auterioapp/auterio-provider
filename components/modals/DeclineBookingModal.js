import { useState } from 'react';
import { Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';

function DeclineBookingModal({ order, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  if (!order) return null;
  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ color: '#17191D', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>Decline Booking</Text>
          <Text style={{ color: '#5E646D', fontSize: 14, marginBottom: 20 }}>Let the client know why you can't accept this booking request.</Text>
          <TextInput
            style={{ backgroundColor: '#F5F6F8', borderRadius: 12, padding: 14, fontSize: 14, color: '#17191D', minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 20 }}
            placeholder="Reason for declining (optional)"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
            activeOpacity={0.84}
            onPress={() => { onConfirm(order, note.trim()); setNote(''); }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Decline Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => { setNote(''); onClose(); }}>
            <Text style={{ color: '#5E646D', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default DeclineBookingModal;
