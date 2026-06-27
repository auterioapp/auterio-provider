import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PricingScreen from './PricingScreen';
import { loadPricing } from '../utils/pricingStore';

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

  useEffect(() => {
    if (visible) loadPricing().then(p => setProviderType(p.providerType || 'mobile'));
  }, [visible]);

  const visibleServices = providerType === 'shop'
    ? services.filter(s => !MOBILE_ONLY_IDS.includes(s.id))
    : services;

  const toggle = (id) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
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

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
      </View>

      <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} />
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
  pricingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 18, marginBottom: 14 },
  pricingBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 19 },
});
