import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadPricing, savePricing } from '../utils/pricingStore';

export default function AppSettingsScreen({ visible, onClose }) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [providerType, setProviderTypeState] = useState('mobile');
  const [allowScheduling, setAllowSchedulingState] = useState(false);

  useEffect(() => {
    loadPricing().then(p => {
      setProviderTypeState(p.providerType || 'mobile');
      setAllowSchedulingState(p.allowScheduling ?? false);
    });
  }, []);

  const changeAllowScheduling = async (val) => {
    setAllowSchedulingState(val);
    const current = await loadPricing();
    await savePricing({ ...current, allowScheduling: val });
  };

  const changeProviderType = async (type) => {
    setProviderTypeState(type);
    const current = await loadPricing();
    await savePricing({ ...current, providerType: type });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => onClose() },
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

          {/* Business Type */}
          <Text style={styles.sectionLabel}>Business Type</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.typeRow, providerType === 'mobile' && styles.typeRowActive]}
              activeOpacity={0.84}
              onPress={() => changeProviderType('mobile')}
            >
              <View style={[styles.typeIcon, providerType === 'mobile' && styles.typeIconActive]}>
                <Ionicons name="car-outline" size={20} color={providerType === 'mobile' ? '#FFFFFF' : '#6B7280'} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, providerType === 'mobile' && styles.typeTitleActive]}>Mobile Provider</Text>
                <Text style={styles.typeSub}>You drive to the customer's location</Text>
              </View>
              {providerType === 'mobile' && <Ionicons name="checkmark-circle" size={22} color="#16A34A" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeRow, styles.rowBorder, providerType === 'shop' && styles.typeRowActive]}
              activeOpacity={0.84}
              onPress={() => changeProviderType('shop')}
            >
              <View style={[styles.typeIcon, providerType === 'shop' && styles.typeIconActive]}>
                <Ionicons name="business-outline" size={20} color={providerType === 'shop' ? '#FFFFFF' : '#6B7280'} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, providerType === 'shop' && styles.typeTitleActive]}>Shop / Service Center</Text>
                <Text style={styles.typeSub}>Customers bring their vehicle to you</Text>
              </View>
              {providerType === 'shop' && <Ionicons name="checkmark-circle" size={22} color="#16A34A" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeRow, styles.rowBorder, providerType === 'both' && styles.typeRowActive]}
              activeOpacity={0.84}
              onPress={() => changeProviderType('both')}
            >
              <View style={[styles.typeIcon, providerType === 'both' && styles.typeIconActive]}>
                <Ionicons name="git-merge-outline" size={20} color={providerType === 'both' ? '#FFFFFF' : '#6B7280'} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={[styles.typeTitle, providerType === 'both' && styles.typeTitleActive]}>Mobile + Shop</Text>
                <Text style={styles.typeSub}>You offer both on-site and in-shop service</Text>
              </View>
              {providerType === 'both' && <Ionicons name="checkmark-circle" size={22} color="#16A34A" />}
            </TouchableOpacity>
          </View>

          {/* Request Handling */}
          <Text style={styles.sectionLabel}>Request Handling</Text>
          <View style={styles.card}>
            <ToggleRow
              label="Allow Scheduling"
              sublabel="Offer customers a scheduled appointment option"
              value={allowScheduling}
              onChange={changeAllowScheduling}
            />
          </View>

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
  typeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  typeRowActive: { },
  typeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeIconActive: { backgroundColor: '#17191D' },
  typeInfo: { flex: 1 },
  typeTitle: { color: '#17191D', fontSize: 15, fontWeight: '600' },
  typeTitleActive: { fontWeight: '700' },
  typeSub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  logoutCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, paddingVertical: 16, marginTop: 20 },
  logoutText: { color: '#F04416', fontSize: 15, fontWeight: '700' },
  deleteCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 14, borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 16, paddingVertical: 16, marginTop: 10 },
  deleteText: { color: '#DC2626', fontSize: 15, fontWeight: '700' },
});
