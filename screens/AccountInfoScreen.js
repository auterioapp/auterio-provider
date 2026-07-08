import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorizedFetch } from '../apiClient';
import { API_URL, PROVIDER } from '../constants';

export default function AccountInfoScreen({ visible, onClose, isDemoAccount, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    AsyncStorage.getItem('providerUser').then(raw => {
      if (!raw) return;
      const user = JSON.parse(raw);
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    });
    AsyncStorage.getItem('@pricing_store').then(raw => {
      if (!raw) return;
      try { setCompanyName(JSON.parse(raw).businessName || ''); } catch {}
    });
  }, [visible]);

  const handleSave = async () => {
    if (isDemoAccount) return;
    if (!name.trim() || !companyName.trim()) {
      Alert.alert('Required fields', 'Contact name and company name are required.');
      return;
    }
    setSaving(true);
    try {
      const trimmed = companyName.trim();
      const contactName = name.trim();
      if (trimmed && contactName) {
        await authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: trimmed,
            businessName: trimmed,
            contactName,
            initials: trimmed.slice(0, 2).toUpperCase(),
          }),
        });
        PROVIDER.company = trimmed;
        PROVIDER.name = contactName;
        PROVIDER.initials = trimmed.slice(0, 2).toUpperCase();
        const raw = await AsyncStorage.getItem('@pricing_store');
        const current = raw ? JSON.parse(raw) : {};
        await AsyncStorage.setItem('@pricing_store', JSON.stringify({ ...current, businessName: trimmed }));
        const storedUserRaw = await AsyncStorage.getItem('providerUser');
        const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};
        await AsyncStorage.setItem('providerUser', JSON.stringify({
          ...storedUser,
          name: contactName,
          companyName: trimmed,
        }));
      }
      onSaved?.(companyName.trim());
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save. Please try again.');
    }
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Info</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.7} disabled={saving || isDemoAccount}>
            <Text style={[styles.saveBtnText, (saving || isDemoAccount) && { color: '#C4C9D1' }]}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <Text style={styles.sectionLabel}>Personal</Text>
          <View style={styles.fieldGroup}>
            <FieldRow icon="person-outline" label="Full Name" value={name || PROVIDER.name} editable={false} />
            <View style={styles.sep} />
            <FieldRow icon="mail-outline" label="Email" value={email} editable={false} />
            <View style={styles.sep} />
            <FieldRow icon="call-outline" label="Phone" value={phone || PROVIDER.phone} editable={false} />
          </View>
          <Text style={styles.fieldHint}>Contact details are set during registration. Contact support to update them.</Text>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Business</Text>
          <View style={styles.fieldGroup}>
            <View style={styles.editableRow}>
              <View style={styles.editableIcon}>
                <Ionicons name="briefcase-outline" size={18} color="#2563EB" />
              </View>
              <View style={styles.editableContent}>
                <Text style={styles.editableLabel}>Company / Business Name</Text>
                <TextInput
                  style={styles.editableInput}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="e.g. Auterio Auto Services"
                  placeholderTextColor="#C4C9D1"
                  editable={!isDemoAccount}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>
          <Text style={styles.fieldHint}>This name is shown to customers when they search for providers.</Text>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Provider ID</Text>
          <View style={styles.fieldGroup}>
            <FieldRow icon="key-outline" label="ID" value={PROVIDER.id} editable={false} mono />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldRow({ icon, label, value, editable, mono }) {
  return (
    <View style={styles.fieldRow}>
      <View style={styles.fieldIcon}>
        <Ionicons name={icon} size={18} color="#8B9098" />
      </View>
      <View style={styles.fieldContent}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, mono && styles.fieldValueMono]} numberOfLines={1}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#17191D' },
  saveBtn: { paddingHorizontal: 4 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#2563EB' },

  content: { padding: 20, paddingBottom: 40 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#8B9098', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, lineHeight: 16 },

  fieldGroup: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden' },
  sep: { height: 1, backgroundColor: '#F0F1F3', marginLeft: 52 },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 0, paddingHorizontal: 16, paddingVertical: 13 },
  fieldIcon: { width: 36, alignItems: 'center' },
  fieldContent: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 2 },
  fieldValue: { fontSize: 14, fontWeight: '600', color: '#17191D' },
  fieldValueMono: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#5E646D' },

  editableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  editableIcon: { width: 36, alignItems: 'center' },
  editableContent: { flex: 1, minWidth: 0 },
  editableLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  editableInput: { fontSize: 14, fontWeight: '600', color: '#17191D', padding: 0 },
});
