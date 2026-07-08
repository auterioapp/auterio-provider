import { useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorizedFetch } from '../apiClient';
import { API_URL, PROVIDER } from '../constants';
import { savePricing, DEFAULT_PRICING } from '../utils/pricingStore';

// ── Services data (labels must match ServicesScreen exactly) ──────────────────

const MOBILE_SERVICES = [
  { id: 'battery',     title: 'Battery Service', icon: 'flash-outline' },
  { id: 'tire',        title: 'Tire Service',     icon: 'disc-outline' },
  { id: 'towing',      title: 'Towing',           icon: 'car-outline' },
  { id: 'diagnostics', title: 'Diagnostics',      icon: 'speedometer-outline' },
  { id: 'lockout',     title: 'Lockout Service',  icon: 'lock-closed-outline' },
  { id: 'fuel',        title: 'Fuel Delivery',    icon: 'flame-outline' },
];

const SHOP_CATEGORIES = [
  { id: 'oil',              label: 'Oil & Fluids',          icon: 'water-outline' },
  { id: 'brakes',           label: 'Brakes',                icon: 'radio-button-on-outline' },
  { id: 'tires',            label: 'Tires',                 icon: 'disc-outline' },
  { id: 'engine',           label: 'Engine',                icon: 'construct-outline' },
  { id: 'electrical',       label: 'Electrical',            icon: 'flash-outline' },
  { id: 'ac',               label: 'AC & Heating',          icon: 'thermometer-outline' },
  { id: 'suspension',       label: 'Suspension & Steering', icon: 'git-branch-outline' },
  { id: 'exhaust',          label: 'Exhaust',               icon: 'cloud-outline' },
  { id: 'diagnostics_shop', label: 'Diagnostics',           icon: 'speedometer-outline' },
];

// ── Working hours — all days off by default ───────────────────────────────────

const WIZARD_DAYS = [
  { id: 'mon', label: 'Monday',    enabled: false, startH: 8, startM: 0, startP: 'AM', endH: 6, endM: 0, endP: 'PM' },
  { id: 'tue', label: 'Tuesday',   enabled: false, startH: 8, startM: 0, startP: 'AM', endH: 6, endM: 0, endP: 'PM' },
  { id: 'wed', label: 'Wednesday', enabled: false, startH: 8, startM: 0, startP: 'AM', endH: 6, endM: 0, endP: 'PM' },
  { id: 'thu', label: 'Thursday',  enabled: false, startH: 8, startM: 0, startP: 'AM', endH: 6, endM: 0, endP: 'PM' },
  { id: 'fri', label: 'Friday',    enabled: false, startH: 8, startM: 0, startP: 'AM', endH: 6, endM: 0, endP: 'PM' },
  { id: 'sat', label: 'Saturday',  enabled: false, startH: 9, startM: 0, startP: 'AM', endH: 3, endM: 0, endP: 'PM' },
  { id: 'sun', label: 'Sunday',    enabled: false, startH: 9, startM: 0, startP: 'AM', endH: 3, endM: 0, endP: 'PM' },
];

function uiTimeToApi(h, m, p) {
  let hh = h % 12;
  if (p === 'PM') hh += 12;
  return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtTime(h, m, p) {
  return `${h}:${String(m).padStart(2, '0')} ${p}`;
}

// ── Step 1: Business Type ─────────────────────────────────────────────────────

function Step1_BusinessType({ value, onChange }) {
  const options = [
    { id: 'mobile', icon: 'car-outline',            title: 'Mobile', desc: 'You travel to the customer' },
    { id: 'shop',   icon: 'business-outline',        title: 'Shop',   desc: 'Customer comes to you' },
    { id: 'both',   icon: 'swap-horizontal-outline', title: 'Both',   desc: 'Mobile and shop' },
  ];
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>How do you operate?</Text>
      <Text style={s.stepDesc}>
        This determines what services you can offer and how customers find you.
      </Text>
      <View style={s.typeOptions}>
        {options.map(opt => {
          const sel = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[s.typeCard, sel && s.typeCardSel]}
              activeOpacity={0.8}
              onPress={() => onChange(opt.id)}
            >
              <View style={[s.typeIconWrap, sel && s.typeIconWrapSel]}>
                <Ionicons name={opt.icon} size={26} color={sel ? '#FF6B00' : '#6B7280'} />
              </View>
              <Text style={[s.typeTitle, sel && s.typeTitleSel]}>{opt.title}</Text>
              <Text style={s.typeCardDesc}>{opt.desc}</Text>
              {sel && (
                <View style={s.typeCheck}>
                  <Ionicons name="checkmark-circle" size={18} color="#FF6B00" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Step 2: Services ──────────────────────────────────────────────────────────

function Step2_Services({ providerType, mobileEnabled, shopEnabled, onMobileToggle, onShopToggle }) {
  const showMobile = providerType === 'mobile' || providerType === 'both';
  const showShop   = providerType === 'shop'   || providerType === 'both';
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>What services do you offer?</Text>
      <Text style={s.stepDesc}>Select at least one to continue.</Text>

      {showMobile && (
        <>
          {providerType === 'both' && <Text style={s.sectionLabel}>Mobile Services</Text>}
          {MOBILE_SERVICES.map(svc => {
            const on = mobileEnabled.has(svc.id);
            return (
              <TouchableOpacity
                key={svc.id}
                style={[s.svcRow, on && s.svcRowOn]}
                activeOpacity={0.8}
                onPress={() => onMobileToggle(svc.id)}
              >
                <View style={[s.svcIcon, on && s.svcIconOn]}>
                  <Ionicons name={svc.icon} size={20} color={on ? '#FF6B00' : '#6B7280'} />
                </View>
                <Text style={[s.svcTitle, on && s.svcTitleOn]}>{svc.title}</Text>
                <View style={[s.checkbox, on && s.checkboxOn]}>
                  {on && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {showShop && (
        <>
          {providerType === 'both' && (
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>Shop Categories</Text>
          )}
          {SHOP_CATEGORIES.map(cat => {
            const on = shopEnabled.has(cat.id);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.svcRow, on && s.svcRowOn]}
                activeOpacity={0.8}
                onPress={() => onShopToggle(cat.id)}
              >
                <View style={[s.svcIcon, on && s.svcIconOn]}>
                  <Ionicons name={cat.icon} size={20} color={on ? '#FF6B00' : '#6B7280'} />
                </View>
                <Text style={[s.svcTitle, on && s.svcTitleOn]}>{cat.label}</Text>
                <View style={[s.checkbox, on && s.checkboxOn]}>
                  {on && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}
    </View>
  );
}

// ── Step 3: Working Hours ─────────────────────────────────────────────────────

function Step3_Hours({ days, onToggle }) {
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>When are you available?</Text>
      <Text style={s.stepDesc}>Enable at least one day. You can adjust exact times later in your profile.</Text>
      {days.map((day, i) => (
        <View key={day.id} style={s.dayRow}>
          <Switch
            value={day.enabled}
            onValueChange={() => onToggle(i)}
            trackColor={{ false: '#E5E7EB', true: '#FF6B00' }}
            thumbColor="#fff"
          />
          <View style={s.dayInfo}>
            <Text style={[s.dayLabel, !day.enabled && s.dayLabelOff]}>{day.label}</Text>
            {day.enabled && (
              <Text style={s.dayTime}>
                {fmtTime(day.startH, day.startM, day.startP)} – {fmtTime(day.endH, day.endM, day.endP)}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Step 4: Service Zone ──────────────────────────────────────────────────────

function Step4_Zone({ providerType, radius, onRadiusChange, address, onAddressChange }) {
  const showRadius  = providerType === 'mobile' || providerType === 'both';
  const showAddress = providerType === 'shop'   || providerType === 'both';
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Where do you serve?</Text>
      <Text style={s.stepDesc}>
        {showRadius && showAddress
          ? 'Set your travel radius and enter your shop address.'
          : showRadius
          ? 'Set the radius you are willing to travel to customers.'
          : 'Enter your shop address so customers can find you.'}
      </Text>

      {showRadius && (
        <View style={s.zoneCard}>
          <Text style={s.zoneCardLabel}>Service radius</Text>
          <View style={s.radiusRow}>
            <TouchableOpacity style={s.radiusBtn} onPress={() => onRadiusChange(Math.max(5, radius - 5))}>
              <Ionicons name="remove" size={20} color="#111827" />
            </TouchableOpacity>
            <Text style={s.radiusValue}>{radius} mi</Text>
            <TouchableOpacity style={s.radiusBtn} onPress={() => onRadiusChange(Math.min(100, radius + 5))}>
              <Ionicons name="add" size={20} color="#111827" />
            </TouchableOpacity>
          </View>
          <Text style={s.radiusHint}>Orders beyond this radius won't be shown to you</Text>
        </View>
      )}

      {showAddress && (
        <View style={[s.zoneCard, showRadius && { marginTop: 14 }]}>
          <Text style={s.zoneCardLabel}>
            Shop address{providerType === 'shop' ? ' (required)' : ' (optional)'}
          </Text>
          <TextInput
            style={s.addressInput}
            value={address}
            onChangeText={onAddressChange}
            placeholder="123 Main St, City, State"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>
      )}
    </View>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

function ReviewRow({ icon, title, value, onEdit }) {
  return (
    <View style={s.reviewRow}>
      <View style={s.reviewIcon}><Ionicons name={icon} size={19} color="#FF6B00" /></View>
      <View style={s.reviewInfo}>
        <Text style={s.reviewTitle}>{title}</Text>
        <Text style={s.reviewValue}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onEdit} style={s.reviewEdit}><Text style={s.reviewEditText}>Edit</Text></TouchableOpacity>
    </View>
  );
}

function Step5_Review({ providerType, services, days, radius, address, onEdit }) {
  const typeLabel = providerType === 'mobile' ? 'Mobile Provider' : providerType === 'shop' ? 'Shop / Service Center' : 'Mobile + Shop';
  const activeDays = days.filter(day => day.enabled).map(day => day.label.slice(0, 3)).join(', ');
  const area = providerType === 'mobile' ? `${radius} mile service radius` : providerType === 'shop' ? address : `${radius} mile radius · ${address || 'No shop address'}`;
  return (
    <View style={s.stepContent}>
      <Text style={s.stepTitle}>Review your profile</Text>
      <Text style={s.stepDesc}>Confirm these details before submitting your provider profile for review.</Text>
      <View style={s.reviewCard}>
        <ReviewRow icon="business-outline" title="Business type" value={typeLabel} onEdit={() => onEdit(1)} />
        <ReviewRow icon="construct-outline" title="Services" value={services.join(', ')} onEdit={() => onEdit(2)} />
        <ReviewRow icon="time-outline" title="Availability" value={activeDays} onEdit={() => onEdit(3)} />
        <ReviewRow icon="location-outline" title="Service area" value={area} onEdit={() => onEdit(4)} />
      </View>
      <View style={s.reviewNotice}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#2563EB" />
        <Text style={s.reviewNoticeText}>You can update these details later from your profile.</Text>
      </View>
    </View>
  );
}

const TOTAL_STEPS = 5;

export default function ProviderSetupScreen({ onComplete, onSkip }) {
  const [step, setStep]                   = useState(1);
  const [saving, setSaving]               = useState(false);

  const [providerType, setProviderType]   = useState('mobile');
  const [mobileEnabled, setMobileEnabled] = useState(new Set());
  const [shopEnabled, setShopEnabled]     = useState(new Set());
  const [days, setDays]                   = useState(WIZARD_DAYS.map(d => ({ ...d })));
  const [radius, setRadius]               = useState(18);
  const [address, setAddress]             = useState('');

  const toggleDay = (i) =>
    setDays(prev => prev.map((d, idx) => idx === i ? { ...d, enabled: !d.enabled } : d));

  const toggleMobile = (id) =>
    setMobileEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleShop = (id) =>
    setShopEnabled(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const canProceed = () => {
    if (step === 1) return true;
    if (step === 2) return (mobileEnabled.size + shopEnabled.size) > 0;
    if (step === 3) return days.some(d => d.enabled);
    if (step === 4) return providerType !== 'shop' || address.trim().length > 0;
    if (step === 5) return true;
    return false;
  };

  const buildServices = () => {
    const isMobile = providerType === 'mobile' || providerType === 'both';
    const isShop   = providerType === 'shop'   || providerType === 'both';
    const mobile   = isMobile ? MOBILE_SERVICES.filter(sv => mobileEnabled.has(sv.id)).map(sv => sv.title) : [];
    const shop     = isShop   ? SHOP_CATEGORIES.filter(c  => shopEnabled.has(c.id)).map(c => c.label)      : [];
    return [...mobile, ...shop];
  };

  const buildSchedule = () => {
    const apiDays = {};
    days.forEach(day => {
      apiDays[day.id] = {
        enabled: day.enabled,
        open:  uiTimeToApi(day.startH, day.startM, day.startP),
        close: uiTimeToApi(day.endH,   day.endM,   day.endP),
      };
    });
    return { days: apiDays };
  };

  const handleNext = async () => {
    if (saving) return;
    setSaving(true);
    try {
      if (step === 1) {
        await savePricing({ ...DEFAULT_PRICING, providerType });
        const res = await authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: providerType }),
        });
        if (!res.ok) throw new Error('Could not save business type');
        setStep(2);

      } else if (step === 2) {
        const res = await authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ services: buildServices() }),
        });
        if (!res.ok) throw new Error('Could not save services');
        setStep(3);

      } else if (step === 3) {
        const res = await authorizedFetch(`${API_URL}/schedules/${PROVIDER.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildSchedule()),
        });
        if (!res.ok) throw new Error('Could not save schedule');
        setStep(4);

      } else if (step === 4) {
        await AsyncStorage.setItem('@service_radius', String(radius));
        {
          const res = await authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serviceRadius: radius,
              ...(address.trim() ? { address: address.trim() } : {}),
            }),
          });
          if (!res.ok) throw new Error('Could not save service area');
        }
        setStep(5);
      } else if (step === 5) {
        await onComplete();
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save. Check your connection.');
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = mobileEnabled.size + shopEnabled.size;
  const enabledDays   = days.filter(d => d.enabled).length;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerSide}>
          {step > 1 && (
            <TouchableOpacity style={s.backBtn} onPress={() => setStep(p => p - 1)} disabled={saving}>
              <Ionicons name="arrow-back" size={22} color="#17191D" />
            </TouchableOpacity>
          )}
        </View>

        <View style={s.headerCenter}>
          <Text style={s.headerStepText}>Step {step + 2} of 7</Text>
          <View style={s.dots}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[s.dot, i + 1 === step && s.dotActive, i + 1 < step && s.dotDone]} />
            ))}
          </View>
        </View>

        <View style={s.headerSide}>
          {step === 1 && onSkip && (
            <TouchableOpacity onPress={onSkip}>
              <Text style={s.skipText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 && <Step1_BusinessType value={providerType} onChange={setProviderType} />}
          {step === 2 && (
            <Step2_Services
              providerType={providerType}
              mobileEnabled={mobileEnabled}
              shopEnabled={shopEnabled}
              onMobileToggle={toggleMobile}
              onShopToggle={toggleShop}
            />
          )}
          {step === 3 && <Step3_Hours days={days} onToggle={toggleDay} />}
          {step === 4 && (
            <Step4_Zone
              providerType={providerType}
              radius={radius}
              onRadiusChange={setRadius}
              address={address}
              onAddressChange={setAddress}
            />
          )}
          {step === 5 && (
            <Step5_Review
              providerType={providerType}
              services={buildServices()}
              days={days}
              radius={radius}
              address={address}
              onEdit={setStep}
            />
          )}
        </ScrollView>

        {/* Footer */}
        <View style={s.footer}>
          {step === 2 && (
            <Text style={s.hint}>
              {totalSelected === 0
                ? 'Select at least one service'
                : `${totalSelected} service${totalSelected !== 1 ? 's' : ''} selected`}
            </Text>
          )}
          {step === 3 && (
            <Text style={s.hint}>
              {enabledDays === 0
                ? 'Enable at least one day'
                : `${enabledDays} day${enabledDays !== 1 ? 's' : ''} selected`}
            </Text>
          )}

          <TouchableOpacity
            style={[s.nextBtn, (!canProceed() || saving) && s.nextBtnOff]}
            onPress={handleNext}
            disabled={!canProceed() || saving}
            activeOpacity={0.88}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.nextBtnText}>{step === TOTAL_STEPS ? 'Submit for Review' : 'Continue'}</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 80, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  headerSide: { width: 44 },
  headerCenter: { flex: 1, alignItems: 'center' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerStepText: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E5E7EB' },
  dotActive: { width: 24, backgroundColor: '#FF6B00' },
  dotDone: { backgroundColor: '#FF6B00', opacity: 0.35 },
  skipText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },

  scroll: { padding: 24, paddingBottom: 32 },

  stepContent: {},
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 24 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: '#374151',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10,
  },

  // Business type
  typeOptions: { flexDirection: 'row', gap: 10 },
  typeCard: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 14, alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  typeCardSel: { backgroundColor: 'rgba(255,107,0,0.05)', borderColor: '#FF6B00' },
  typeIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  typeIconWrapSel: { backgroundColor: 'rgba(255,107,0,0.12)' },
  typeTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  typeTitleSel: { color: '#FF6B00' },
  typeCardDesc: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', lineHeight: 14 },
  typeCheck: { position: 'absolute', top: 8, right: 8 },

  // Services
  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F9FAFB', borderRadius: 12,
    padding: 14, marginBottom: 8,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  svcRowOn: { backgroundColor: 'rgba(255,107,0,0.04)', borderColor: 'rgba(255,107,0,0.3)' },
  svcIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: '#EBEBEB', alignItems: 'center', justifyContent: 'center',
  },
  svcIconOn: { backgroundColor: 'rgba(255,107,0,0.12)' },
  svcTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: '#6B7280' },
  svcTitleOn: { color: '#111827' },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: '#D1D5DB',
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: '#FF6B00', borderColor: '#FF6B00' },

  // Working hours
  dayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  dayInfo: { flex: 1 },
  dayLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  dayLabelOff: { color: '#9CA3AF' },
  dayTime: { fontSize: 12, color: '#FF6B00', marginTop: 2 },

  // Zone
  zoneCard: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#E5E7EB',
  },
  zoneCardLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 14 },
  radiusRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 24, marginBottom: 10,
  },
  radiusBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  radiusValue: { fontSize: 30, fontWeight: '800', color: '#FF6B00', minWidth: 80, textAlign: 'center' },
  radiusHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  addressInput: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    fontSize: 14, color: '#111827', borderWidth: 1.5, borderColor: '#E5E7EB',
  },

  reviewCard: { backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#ECEEF0' },
  reviewIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,107,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  reviewInfo: { flex: 1 },
  reviewTitle: { color: '#8B9098', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  reviewValue: { color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '600' },
  reviewEdit: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: '#FFF3E8' },
  reviewEditText: { color: '#FF6B00', fontSize: 12, fontWeight: '800' },
  reviewNotice: { flexDirection: 'row', gap: 9, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 13, marginTop: 16 },
  reviewNoticeText: { flex: 1, color: '#2563EB', fontSize: 12, lineHeight: 17, fontWeight: '600' },

  // Footer
  footer: {
    padding: 20, paddingBottom: 32, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 10,
  },
  hint: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', fontWeight: '500' },
  nextBtn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  nextBtnOff: { backgroundColor: '#D1D5DB' },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
