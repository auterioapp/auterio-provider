import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PricingScreen from './PricingScreen';
import { loadPricing } from '../utils/pricingStore';

const WARRANTY_OPTIONS = [
  { id: 'none', label: 'No Warranty',           days: null, miles: null },
  { id: '30d',  label: '30 days / 1,000 miles', days: 30,   miles: 1000 },
  { id: '90d',  label: '90 days / 4,000 miles', days: 90,   miles: 4000 },
  { id: '1y',   label: '1 year / 12,000 miles', days: 365,  miles: 12000 },
  { id: 'custom', label: 'Custom',              days: null, miles: null },
];

const INITIAL_SERVICES = [
  { id: 'battery',     title: 'Battery Service',  subtitle: 'Jump starts, battery replacement and testing', icon: 'flash-outline',         enabled: true },
  { id: 'tire',        title: 'Tire Service',      subtitle: 'Tire change, repair and replacement',          icon: 'disc-outline',           enabled: true },
  { id: 'towing',      title: 'Towing',            subtitle: 'Vehicle towing and transport',                 icon: 'car-outline',            enabled: true },
  { id: 'diagnostics', title: 'Diagnostics',       subtitle: 'On-site diagnostics and system scanning',      icon: 'speedometer-outline',    enabled: true },
  { id: 'lockout',     title: 'Lockout Service',   subtitle: 'Vehicle lockout and key assistance',           icon: 'lock-closed-outline',    enabled: true },
  { id: 'fuel',        title: 'Fuel Delivery',     subtitle: 'Fuel delivery to your location',               icon: 'flame-outline',          enabled: true },
];

const MOBILE_ONLY_IDS = ['towing', 'fuel'];

export default function ServicesScreen({ visible, onClose }) {
  const [services, setServices] = useState(INITIAL_SERVICES);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [providerType, setProviderType] = useState('mobile');
  const [warrantyId, setWarrantyId] = useState('90d');
  const [customDays, setCustomDays] = useState('');
  const [customMiles, setCustomMiles] = useState('');

  useEffect(() => {
    if (!visible) return;
    loadPricing().then(p => setProviderType(p.providerType || 'mobile'));
    AsyncStorage.getItem('@warranty_policy').then(val => {
      if (!val) return;
      try {
        const saved = JSON.parse(val);
        setWarrantyId(saved.id || '90d');
        if (saved.id === 'custom') {
          setCustomDays(saved.days ? String(saved.days) : '');
          setCustomMiles(saved.miles ? String(saved.miles) : '');
        }
      } catch { }
    });
  }, [visible]);

  const saveWarranty = (id, days, miles) => {
    AsyncStorage.setItem('@warranty_policy', JSON.stringify({ id, days, miles }));
  };

  const selectWarranty = (id) => {
    setWarrantyId(id);
    if (id !== 'custom') {
      const opt = WARRANTY_OPTIONS.find(o => o.id === id);
      saveWarranty(id, opt.days, opt.miles);
    }
  };

  const onCustomDaysChange = (val) => {
    const n = val.replace(/[^0-9]/g, '');
    setCustomDays(n);
    saveWarranty('custom', n ? parseInt(n) : null, customMiles ? parseInt(customMiles) : null);
  };

  const onCustomMilesChange = (val) => {
    const n = val.replace(/[^0-9]/g, '');
    setCustomMiles(n);
    saveWarranty('custom', customDays ? parseInt(customDays) : null, n ? parseInt(n) : null);
  };

  const visibleServices = providerType === 'shop'
    ? services.filter(s => !MOBILE_ONLY_IDS.includes(s.id))
    : services;

  const toggle = (id) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Add Service', 'This feature is coming soon.')}
          >
            <Ionicons name="add" size={26} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        <Text style={styles.pageNote}>
          Choose the services you offer to customers.{'\n'}Turn on or off any service anytime.
        </Text>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            {visibleServices.map((svc, index) => (
              <TouchableOpacity
                key={svc.id}
                style={[styles.row, index > 0 && styles.rowBorder]}
                activeOpacity={0.84}
                onPress={() => Alert.alert(svc.title, svc.subtitle)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={svc.icon} size={24} color="#17191D" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.svcTitle}>{svc.title}</Text>
                  <Text style={styles.svcSub}>{svc.subtitle}</Text>
                </View>
                <View style={styles.rowRight}>
                  {svc.enabled && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                  <Switch
                    value={svc.enabled}
                    onValueChange={() => toggle(svc.id)}
                    trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                    thumbColor="#FFFFFF"
                    style={styles.switch}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Warranty Policy</Text>
          <View style={styles.card}>
            {WARRANTY_OPTIONS.map((opt, index) => {
              const selected = warrantyId === opt.id;
              return (
                <View key={opt.id}>
                  <TouchableOpacity
                    style={[styles.row, index > 0 && styles.rowBorder]}
                    activeOpacity={0.84}
                    onPress={() => selectWarranty(opt.id)}
                  >
                    <Ionicons
                      name={opt.id === 'none' ? 'shield-outline' : opt.id === 'custom' ? 'create-outline' : 'shield-checkmark-outline'}
                      size={20}
                      color={selected ? '#16A34A' : '#8B9098'}
                    />
                    <Text style={[styles.warrantyLabel, selected && styles.warrantyLabelSelected]}>{opt.label}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>

                  {opt.id === 'custom' && selected && (
                    <View style={styles.customInputRow}>
                      <View style={styles.customInputWrap}>
                        <TextInput
                          style={styles.customInput}
                          value={customDays}
                          onChangeText={onCustomDaysChange}
                          keyboardType="number-pad"
                          placeholder="Days"
                          placeholderTextColor="#B0B7C0"
                        />
                        <Text style={styles.customInputUnit}>days</Text>
                      </View>
                      <Text style={styles.customInputOr}>or</Text>
                      <View style={styles.customInputWrap}>
                        <TextInput
                          style={styles.customInput}
                          value={customMiles}
                          onChangeText={onCustomMilesChange}
                          keyboardType="number-pad"
                          placeholder="Miles"
                          placeholderTextColor="#B0B7C0"
                        />
                        <Text style={styles.customInputUnit}>miles</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.pricingBtn}
            activeOpacity={0.88}
            onPress={() => setPricingOpen(true)}
          >
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            <Text style={styles.pricingBtnText}>Pricing & Rates</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              Pricing & Rates are used to calculate estimates for all selected services.
            </Text>
          </View>
        </ScrollView>

        <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  addBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  pageNote: { color: '#6B7280', fontSize: 13, lineHeight: 20, paddingHorizontal: 16, marginBottom: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  iconBox: { width: 48, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  svcTitle: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  svcSub: { color: '#6B7280', fontSize: 12, lineHeight: 17, fontWeight: '500' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  activeBadge: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  activeBadgeText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },
  sectionLabel: { color: '#6B7280', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  warrantyLabel: { color: '#5E646D', fontSize: 14, fontWeight: '500', flex: 1 },
  warrantyLabelSelected: { color: '#17191D', fontWeight: '700' },
  customInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, paddingTop: 4 },
  customInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F5', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  customInput: { flex: 1, color: '#17191D', fontSize: 15, fontWeight: '700', padding: 0 },
  customInputUnit: { color: '#8B9098', fontSize: 13, fontWeight: '500' },
  customInputOr: { color: '#8B9098', fontSize: 13, fontWeight: '500' },
  pricingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 18, marginBottom: 14 },
  pricingBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 19 },
});
