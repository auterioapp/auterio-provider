import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorizedFetch } from '../apiClient';
import PricingScreen from './PricingScreen';
import { loadPricing } from '../utils/pricingStore';
import { API_URL } from '../constants';
import { useProvider } from '../ProviderContext';

// ── Roadside assistance — doesn't fit into a repair category ─────────────────

const MOBILE_SERVICES = [
  { id: 'towing',      title: 'Towing',            subtitle: 'Vehicle towing and transport',                 icon: 'car-outline' },
  { id: 'lockout',     title: 'Lockout Service',   subtitle: 'Vehicle lockout and key assistance',           icon: 'lock-closed-outline' },
  { id: 'fuel',        title: 'Fuel Delivery',     subtitle: 'Fuel delivery to your location',               icon: 'flame-outline' },
];

// ── Shop services by category ────────────────────────────────────────────────

const SHOP_CATEGORIES = [
  {
    id: 'oil',
    label: 'Oil & Fluids',
    icon: 'water-outline',
    services: [
      { id: 'oil_change',      title: 'Oil Change',           subtitle: 'Conventional, synthetic or blend' },
      { id: 'trans_fluid',     title: 'Transmission Fluid',   subtitle: 'Flush and replacement' },
      { id: 'coolant_flush',   title: 'Coolant Flush',        subtitle: 'Radiator flush and refill' },
      { id: 'brake_fluid',     title: 'Brake Fluid',          subtitle: 'Fluid exchange and top-off' },
    ],
  },
  {
    id: 'brakes',
    label: 'Brakes',
    icon: 'radio-button-on-outline',
    services: [
      { id: 'brake_pads',      title: 'Brake Pads',           subtitle: 'Front, rear or full replacement' },
      { id: 'brake_rotors',    title: 'Brake Rotors',         subtitle: 'Resurfacing or replacement' },
      { id: 'brake_inspection',title: 'Brake Inspection',     subtitle: 'Full brake system check' },
      { id: 'brake_calipers',  title: 'Brake Calipers',       subtitle: 'Caliper replacement or rebuild' },
    ],
  },
  {
    id: 'tires',
    label: 'Tires',
    icon: 'disc-outline',
    services: [
      { id: 'tire_rotation',   title: 'Tire Rotation',        subtitle: 'Front-to-rear rotation' },
      { id: 'tire_replacement',title: 'Tire Replacement',     subtitle: 'Single or full set' },
      { id: 'wheel_alignment', title: 'Wheel Alignment',      subtitle: '2-wheel or 4-wheel alignment' },
      { id: 'wheel_balance',   title: 'Wheel Balancing',      subtitle: 'Balance and weights' },
    ],
  },
  {
    id: 'engine',
    label: 'Engine',
    icon: 'construct-outline',
    services: [
      { id: 'tune_up',         title: 'Tune-Up',              subtitle: 'Plugs, filters and inspection' },
      { id: 'spark_plugs',     title: 'Spark Plugs',          subtitle: 'Replacement for all cylinders' },
      { id: 'timing_belt',     title: 'Timing Belt/Chain',    subtitle: 'Belt or chain replacement' },
      { id: 'air_filter',      title: 'Air Filter',           subtitle: 'Engine and cabin filters' },
    ],
  },
  {
    id: 'electrical',
    label: 'Electrical',
    icon: 'flash-outline',
    services: [
      { id: 'battery_shop',    title: 'Battery Replacement',  subtitle: 'Test, replace and recycle' },
      { id: 'alternator',      title: 'Alternator',           subtitle: 'Replacement and testing' },
      { id: 'starter',         title: 'Starter',              subtitle: 'Starter motor replacement' },
      { id: 'electrical_diag', title: 'Electrical Diagnosis', subtitle: 'Wiring, fuses and sensors' },
    ],
  },
  {
    id: 'ac',
    label: 'AC & Heating',
    icon: 'thermometer-outline',
    services: [
      { id: 'ac_recharge',     title: 'AC Recharge',          subtitle: 'Refrigerant recharge' },
      { id: 'ac_repair',       title: 'AC Repair',            subtitle: 'Compressor, condenser, evaporator' },
      { id: 'heater_repair',   title: 'Heater Repair',        subtitle: 'Heater core and blower motor' },
    ],
  },
  {
    id: 'suspension',
    label: 'Suspension & Steering',
    icon: 'git-branch-outline',
    services: [
      { id: 'shocks_struts',   title: 'Shocks & Struts',      subtitle: 'Replacement and inspection' },
      { id: 'wheel_bearing',   title: 'Wheel Bearing',        subtitle: 'Hub and bearing replacement' },
      { id: 'tie_rod',         title: 'Tie Rods',             subtitle: 'Inner and outer tie rod ends' },
      { id: 'power_steering',  title: 'Power Steering',       subtitle: 'Fluid, pump and rack' },
      { id: 'air_suspension',  title: 'Air Suspension',       subtitle: 'Air spring / bag replacement and diagnostics' },
    ],
  },
  {
    id: 'exhaust',
    label: 'Exhaust',
    icon: 'cloud-outline',
    services: [
      { id: 'muffler',         title: 'Muffler',              subtitle: 'Repair or replacement' },
      { id: 'catalytic',       title: 'Catalytic Converter',  subtitle: 'Replacement and testing' },
      { id: 'exhaust_pipe',    title: 'Exhaust Pipe',         subtitle: 'Pipe repair and welding' },
    ],
  },
  {
    id: 'diagnostics_shop',
    label: 'Diagnostics',
    icon: 'speedometer-outline',
    services: [
      { id: 'check_engine',    title: 'Check Engine Light',   subtitle: 'OBD scan and diagnosis' },
      { id: 'full_inspection', title: 'Full Inspection',      subtitle: 'Multi-point vehicle inspection' },
      { id: 'pre_purchase',    title: 'Pre-Purchase Inspection', subtitle: 'Buying a used car?' },
    ],
  },
];

const WARRANTY_OPTIONS = [
  { id: 'none',   label: 'No Warranty',           days: null, miles: null },
  { id: '30d',    label: '30 days / 1,000 miles', days: 30,   miles: 1000 },
  { id: '90d',    label: '90 days / 4,000 miles', days: 90,   miles: 4000 },
  { id: '1y',     label: '1 year / 12,000 miles', days: 365,  miles: 12000 },
  { id: 'custom', label: 'Custom',                days: null, miles: null },
];

function getAllShopServiceIds() {
  return SHOP_CATEGORIES.flatMap(c => c.services.map(s => s.id));
}

function getAllShopServiceTitles(enabledIds) {
  return SHOP_CATEGORIES.flatMap(c => c.services.filter(s => enabledIds.has(s.id)).map(s => s.title));
}

export default function ServicesScreen({ visible, onClose, isDemoAccount }) {
  const { provider } = useProvider();
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: Dimensions.get('window').width, duration: 250, useNativeDriver: true }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const [providerType, setProviderType] = useState('mobile');
  const [mobileEnabled, setMobileEnabled] = useState(new Set());
  const [mobileCatEnabled, setMobileCatEnabled] = useState(new Set());
  const [shopEnabled, setShopEnabled] = useState(new Set());
  const [pricingOpen, setPricingOpen] = useState(false);
  const [warrantyId, setWarrantyId] = useState('none');
  const [customDays, setCustomDays] = useState('');
  const [customMiles, setCustomMiles] = useState('');
  const [expandedMobileCats, setExpandedMobileCats] = useState(new Set());
  const [expandedShopCats, setExpandedShopCats] = useState(new Set());

  useEffect(() => {
    if (!visible) return;

    Promise.all([
      loadPricing(),
      isDemoAccount ? Promise.resolve(null) : authorizedFetch(`${API_URL}/profiles/${provider.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([pricing, data]) => {
      const type = pricing.providerType || 'mobile';
      setProviderType(type);

      // No response (offline/demo) — keep whatever's already on screen rather
      // than blanking every toggle out while we wait or after a failed fetch.
      if (!data) return;
      const saved = new Set(data.services || []);

      const newMobileIds = new Set(
        MOBILE_SERVICES.filter(s => saved.has(s.title)).map(s => s.id)
      );
      // Mobile and shop can each enable the same repair category independently —
      // "Brakes (Mobile)" and "Brakes" are saved as distinct tags so a provider who
      // only does brake work in-shop doesn't get matched for on-site brake requests.
      const newMobileCatIds = new Set();
      const newShopIds = new Set();
      SHOP_CATEGORIES.forEach(cat => {
        if (saved.has(`${cat.label} (Mobile)`)) cat.services.forEach(s => newMobileCatIds.add(s.id));
        if (saved.has(cat.label)) cat.services.forEach(s => newShopIds.add(s.id));
      });

      setMobileEnabled(newMobileIds);
      setMobileCatEnabled(newMobileCatIds);
      setShopEnabled(newShopIds);
      if (saved.size) pushToApi(newMobileIds, newMobileCatIds, newShopIds, type);
    });

    AsyncStorage.getItem('@warranty_policy').then(val => {
      if (!val) return;
      try {
        const parsed = JSON.parse(val);
        setWarrantyId(parsed.id || '90d');
        if (parsed.id === 'custom') {
          setCustomDays(parsed.days != null ? String(parsed.days) : '');
          setCustomMiles(parsed.miles != null ? String(parsed.miles) : '');
        }
      } catch {}
    });
  }, [visible]);

  const pushToApi = (mobileIds, mobileCatIds, shopIds, type = providerType) => {
    if (isDemoAccount) return;
    const isMobile = type === 'mobile' || type === 'both';
    const isShop = type === 'shop' || type === 'both';
    const mobileTitles = isMobile
      ? MOBILE_SERVICES.filter(s => mobileIds.has(s.id)).map(s => s.title)
      : [];
    const mobileCategoryLabels = isMobile
      ? SHOP_CATEGORIES.filter(cat => cat.services.some(s => mobileCatIds.has(s.id))).map(cat => `${cat.label} (Mobile)`)
      : [];
    const shopCategoryLabels = isShop
      ? SHOP_CATEGORIES.filter(cat => cat.services.some(s => shopIds.has(s.id))).map(cat => cat.label)
      : [];
    const all = [...mobileTitles, ...mobileCategoryLabels, ...shopCategoryLabels];
    authorizedFetch(`${API_URL}/profiles/${provider.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ services: all }),
    }).catch(() => {});
  };

  const toggleMobile = (id) => {
    setMobileEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      pushToApi(next, mobileCatEnabled, shopEnabled);
      return next;
    });
  };

  const toggleShop = (id) => {
    setShopEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      pushToApi(mobileEnabled, mobileCatEnabled, next);
      return next;
    });
  };

  const toggleMobileCatService = (id) => {
    setMobileCatEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      pushToApi(mobileEnabled, next, shopEnabled);
      return next;
    });
  };

  const toggleCategory = (catId) => {
    setExpandedShopCats(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const toggleMobileCategory = (catId) => {
    setExpandedMobileCats(prev => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  };

  const toggleAllInCategory = (cat) => {
    const ids = cat.services.map(s => s.id);
    const allOn = ids.every(id => shopEnabled.has(id));
    setShopEnabled(prev => {
      const next = new Set(prev);
      ids.forEach(id => allOn ? next.delete(id) : next.add(id));
      pushToApi(mobileEnabled, mobileCatEnabled, next);
      return next;
    });
  };

  const toggleAllInMobileCategory = (cat) => {
    const ids = cat.services.map(s => s.id);
    const allOn = ids.every(id => mobileCatEnabled.has(id));
    setMobileCatEnabled(prev => {
      const next = new Set(prev);
      ids.forEach(id => allOn ? next.delete(id) : next.add(id));
      pushToApi(mobileEnabled, next, shopEnabled);
      return next;
    });
  };

  const saveWarranty = (id, days, miles) => {
    AsyncStorage.setItem('@warranty_policy', JSON.stringify({ id, days: days ?? null, miles: miles ?? null }));
  };

  const selectWarranty = (opt) => {
    setWarrantyId(opt.id);
    if (opt.id === 'custom') {
      saveWarranty('custom', customDays ? parseInt(customDays, 10) : null, customMiles ? parseInt(customMiles, 10) : null);
    } else {
      saveWarranty(opt.id, opt.days, opt.miles);
    }
  };

  const saveCustomWarranty = (days, miles) => {
    saveWarranty('custom', days ? parseInt(days, 10) : null, miles ? parseInt(miles, 10) : null);
  };

  const showMobile = providerType === 'mobile' || providerType === 'both';
  const showShop = providerType === 'shop' || providerType === 'both';

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Services</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── Mobile Mechanic ── */}
          {showMobile && (
            <>
              {showShop && <Text style={styles.sectionLabel}>Roadside & Mobile</Text>}
              <Text style={styles.pageNote}>Turn on only what you can actually do — this is how new requests get matched to you.</Text>
              <View style={styles.card}>
                {MOBILE_SERVICES.map((svc, index) => (
                  <View key={svc.id} style={[styles.row, index > 0 && styles.rowBorder]}>
                    <View style={styles.iconBox}>
                      <Ionicons name={svc.icon} size={22} color="#17191D" />
                    </View>
                    <View style={styles.info}>
                      <Text style={styles.svcTitle}>{svc.title}</Text>
                      <Text style={styles.svcSub}>{svc.subtitle}</Text>
                    </View>
                    <Switch
                      value={mobileEnabled.has(svc.id)}
                      onValueChange={() => toggleMobile(svc.id)}
                      trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                      thumbColor="#FFFFFF"
                      style={styles.switch}
                    />
                  </View>
                ))}
              </View>
              <CategoryList
                enabledIds={mobileCatEnabled}
                expandedIds={expandedMobileCats}
                onToggleExpand={toggleMobileCategory}
                onToggleService={toggleMobileCatService}
                onToggleAll={toggleAllInMobileCategory}
              />
            </>
          )}

          {/* ── Shop Services ── */}
          {showShop && (
            <>
              {showMobile && <Text style={styles.sectionLabel}>Shop Services</Text>}
              <Text style={styles.pageNote}>Turn on only what you're equipped for — mismatches mean jobs you'll have to decline.</Text>
              <CategoryList
                enabledIds={shopEnabled}
                expandedIds={expandedShopCats}
                onToggleExpand={toggleCategory}
                onToggleService={toggleShop}
                onToggleAll={toggleAllInCategory}
              />
            </>
          )}

          {/* ── Warranty ── */}
          <Text style={styles.sectionLabel}>Warranty Policy</Text>
          <Text style={styles.pageNote}>A clear warranty builds trust and can help you win more jobs.</Text>
          <View style={styles.card}>
            {WARRANTY_OPTIONS.map((opt, index) => {
              const selected = warrantyId === opt.id;
              return (
                <View key={opt.id}>
                  <TouchableOpacity
                    style={[styles.row, index > 0 && styles.rowBorder]}
                    activeOpacity={0.84}
                    onPress={() => selectWarranty(opt)}
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
                    <View style={styles.customWarrantyRow}>
                      <View style={styles.customWarrantyField}>
                        <Text style={styles.customWarrantyLabel}>Days</Text>
                        <TextInput
                          style={styles.customWarrantyInput}
                          value={customDays}
                          onChangeText={setCustomDays}
                          onEndEditing={() => saveCustomWarranty(customDays, customMiles)}
                          keyboardType="number-pad"
                          placeholder="e.g. 60"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={styles.customWarrantyField}>
                        <Text style={styles.customWarrantyLabel}>Miles</Text>
                        <TextInput
                          style={styles.customWarrantyInput}
                          value={customMiles}
                          onChangeText={setCustomMiles}
                          onEndEditing={() => saveCustomWarranty(customDays, customMiles)}
                          keyboardType="number-pad"
                          placeholder="e.g. 2000"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity style={styles.pricingBtn} activeOpacity={0.88} onPress={() => setPricingOpen(true)}>
            <Ionicons name="settings-outline" size={20} color="#FFFFFF" />
            <Text style={styles.pricingBtnText}>Pricing & Rates</Text>
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>Pricing & Rates are used to calculate estimates for all selected services.</Text>
          </View>

        </ScrollView>

        <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} isDemoAccount={isDemoAccount} />
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

// Shared by the Mobile and Shop sections — same repair categories, independent
// selection per mode (a provider may only do brake work in-shop, not on-site).
function CategoryList({ enabledIds, expandedIds, onToggleExpand, onToggleService, onToggleAll }) {
  return (
    <>
      {SHOP_CATEGORIES.map(cat => {
        const expanded = expandedIds.has(cat.id);
        const enabledCount = cat.services.filter(s => enabledIds.has(s.id)).length;
        const allOn = enabledCount === cat.services.length;
        return (
          <View key={cat.id} style={styles.catCard}>
            <TouchableOpacity
              style={styles.catHeader}
              onPress={() => onToggleExpand(cat.id)}
              activeOpacity={0.84}
            >
              <View style={styles.catIconBox}>
                <Ionicons name={cat.icon} size={18} color="#17191D" />
              </View>
              <Text style={styles.catLabel}>{cat.label}</Text>
              {enabledCount > 0 && (
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{enabledCount}</Text>
                </View>
              )}
              <TouchableOpacity onPress={() => onToggleAll(cat)} style={styles.catToggleBtn} activeOpacity={0.7}>
                <Text style={[styles.catToggleText, allOn && styles.catToggleTextOn]}>
                  {allOn ? 'Deselect all' : 'Select all'}
                </Text>
              </TouchableOpacity>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9CA3AF"
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            {expanded && cat.services.map(svc => (
              <View key={svc.id} style={[styles.shopRow, styles.rowBorder]}>
                <View style={styles.info}>
                  <Text style={styles.svcTitle}>{svc.title}</Text>
                  <Text style={styles.svcSub}>{svc.subtitle}</Text>
                </View>
                <Switch
                  value={enabledIds.has(svc.id)}
                  onValueChange={() => onToggleService(svc.id)}
                  trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                  thumbColor="#FFFFFF"
                  style={styles.switch}
                />
              </View>
            ))}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  slideContainer: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  pageNote: { color: '#6B7280', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { color: '#17191D', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4, marginTop: 20 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  shopRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  iconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', backgroundColor: '#FAFAFA', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  svcTitle: { color: '#17191D', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  svcSub: { color: '#6B7280', fontSize: 12, lineHeight: 16 },
  switch: { transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] },

  catCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 8, overflow: 'hidden' },
  catHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  catIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catLabel: { flex: 1, color: '#17191D', fontSize: 14, fontWeight: '700' },
  catBadge: { backgroundColor: '#16A34A', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  catBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  catToggleBtn: { paddingHorizontal: 6 },
  catToggleText: { color: '#9CA3AF', fontSize: 12 },
  catToggleTextOn: { color: '#FF6B00' },

  warrantyLabel: { color: '#5E646D', fontSize: 14, fontWeight: '500', flex: 1, marginLeft: 10 },
  warrantyLabelSelected: { color: '#17191D', fontWeight: '700' },

  customWarrantyRow: { flexDirection: 'row', gap: 12, paddingBottom: 14, paddingTop: 2 },
  customWarrantyField: { flex: 1 },
  customWarrantyLabel: { color: '#8B9098', fontSize: 11, fontWeight: '600', marginBottom: 4 },
  customWarrantyInput: { backgroundColor: '#F5F6F8', borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#17191D' },

  pricingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#7C3AED', borderRadius: 16, paddingVertical: 18, marginTop: 20, marginBottom: 14 },
  pricingBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 19 },
});
