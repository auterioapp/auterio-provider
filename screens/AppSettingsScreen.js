import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadPricing, savePricing } from '../utils/pricingStore';
import { API_URL, GOOGLE_API_KEY, PROVIDER } from '../constants';

export default function AppSettingsScreen({ visible, onClose, onLogout }) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [providerType, setProviderTypeState] = useState('mobile');
  const [allowScheduling, setAllowSchedulingState] = useState(false);
  const [address, setAddress] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const addressRef = useRef('');
  const debounceRef = useRef(null);

  useEffect(() => {
    loadPricing().then(p => {
      setProviderTypeState(p.providerType || 'mobile');
      setAllowSchedulingState(p.allowScheduling ?? false);
    });
    fetch(`${API_URL}/profiles/${PROVIDER.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.address) { setAddress(data.address); addressRef.current = data.address; } })
      .catch(() => {});
  }, []);

  const onAddressChange = (text) => {
    setAddress(text);
    setAddressSaved(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.predictions) setSuggestions(json.predictions);
      } catch {}
    }, 350);
  };

  const selectSuggestion = (prediction) => {
    setAddress(prediction.description);
    setSuggestions([]);
  };

  const saveAddress = async () => {
    const val = address.trim();
    if (!val) return;
    try {
      await fetch(`${API_URL}/profiles/${PROVIDER.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: val }),
      });
      addressRef.current = val;
      setAddressSaved(true);
      setTimeout(() => setAddressSaved(false), 2000);
    } catch (e) {
      Alert.alert('Error', 'Could not save address');
    }
  };

  const changeAllowScheduling = async (val) => {
    setAllowSchedulingState(val);
    const current = await loadPricing();
    await savePricing({ ...current, allowScheduling: val });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => { onClose(); onLogout?.(); } },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Account Deletion Requested', 'Our team will process your request within 7 business days.'),
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Location */}
          <Text style={styles.sectionLabel}>Location</Text>
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color="#6B7280" style={{ marginTop: 1 }} />
              <TextInput
                style={styles.addressInput}
                placeholder="Enter your shop address"
                placeholderTextColor="#9CA3AF"
                value={address}
                onChangeText={onAddressChange}
                returnKeyType="done"
                onSubmitEditing={saveAddress}
              />
              <TouchableOpacity onPress={saveAddress} style={styles.addressSaveBtn} activeOpacity={0.8}>
                <Text style={styles.addressSaveBtnText}>{addressSaved ? 'Saved!' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {suggestions.map((p, i) => (
                  <TouchableOpacity
                    key={p.place_id}
                    style={[styles.suggestionRow, i > 0 && styles.suggestionBorder]}
                    onPress={() => selectSuggestion(p)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {p.structured_formatting?.main_text || p.description}
                      </Text>
                      <Text style={styles.suggestionSub} numberOfLines={1}>
                        {p.structured_formatting?.secondary_text || ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Request Handling — only for hybrid */}
          {providerType === 'both' && (
            <>
              <Text style={styles.sectionLabel}>Request Handling</Text>
              <View style={styles.card}>
                <ToggleRow
                  label="Allow Scheduling"
                  sublabel="Offer customers a scheduled appointment option"
                  value={allowScheduling}
                  onChange={changeAllowScheduling}
                />
              </View>
            </>
          )}

          {/* Notifications */}
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <ToggleRow label="Push Notifications" value={pushEnabled} onChange={setPushEnabled} />
            <ToggleRow label="Sound Alerts" value={soundEnabled} onChange={setSoundEnabled} border />
            <ToggleRow label="Vibration" value={vibrationEnabled} onChange={setVibrationEnabled} border />
          </View>

          {/* Navigation */}
          <Text style={styles.sectionLabel}>Navigation</Text>
          <View style={styles.card}>
            <SelectRow
              label="Navigation App"
              value="Google Maps"
              onPress={() => Alert.alert('Navigation App', 'This feature is coming soon.')}
            />
          </View>

          {/* Appearance */}
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.card}>
            <SelectRow
              label="Dark Mode"
              value="Follow System"
              onPress={() => Alert.alert('Dark Mode', 'This feature is coming soon.')}
            />
          </View>

          {/* Language */}
          <Text style={styles.sectionLabel}>Language</Text>
          <View style={styles.card}>
            <SelectRow
              label="Language"
              value="English"
              onPress={() => Alert.alert('Language', 'This feature is coming soon.')}
            />
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutCard} activeOpacity={0.84} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#F04416" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>

          {/* Delete Account */}
          <TouchableOpacity style={styles.deleteCard} activeOpacity={0.84} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>
    </Modal>
  );
}

function ToggleRow({ label, sublabel, value, onChange, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function SelectRow({ label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.84} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.selectRight}>
        <Text style={styles.selectValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color="#C8CDD4" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { color: '#17191D', fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  rowLabel: { color: '#17191D', fontSize: 15, fontWeight: '600' },
  rowSublabel: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  selectRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectValue: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  addressInput: { flex: 1, color: '#17191D', fontSize: 15 },
  addressSaveBtn: { backgroundColor: '#17191D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addressSaveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  suggestionsBox: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 4 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  suggestionMain: { color: '#17191D', fontSize: 14, fontWeight: '500' },
  suggestionSub: { color: '#9CA3AF', fontSize: 12, marginTop: 1 },
  logoutCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 },
  logoutText: { color: '#F04416', fontSize: 15, fontWeight: '700' },
  deleteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 16, paddingVertical: 16, marginTop: 10 },
  deleteText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
