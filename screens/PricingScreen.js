import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authorizedFetch, fetchJson } from '../apiClient';
import { loadPricing, savePricing, DEFAULT_PRICING } from '../utils/pricingStore';
import { API_URL } from '../constants';
import { useProvider } from '../ProviderContext';


function Section({ icon, iconColor, title, children }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={16} color={iconColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function PriceRow({ label, sub, value, onChange, unit, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.inputWrap}>
        <Text style={styles.inputPrefix}>$</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        {unit ? <Text style={styles.inputUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function MileRow({ label, sub, value, onChange, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          style={[styles.input, styles.inputNoPrefix]}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <Text style={styles.inputUnit}>mi</Text>
      </View>
    </View>
  );
}

function FeeRow({ label, sub, price, onPrice, enabled, onEnabled, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      <View style={styles.feeRight}>
        <View style={styles.inputWrap}>
          <Text style={styles.inputPrefix}>$</Text>
          <TextInput
            style={styles.input}
            value={price}
            onChangeText={onPrice}
            keyboardType="decimal-pad"
            selectTextOnFocus
          />
        </View>
        <Switch
          value={enabled}
          onValueChange={onEnabled}
          trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
          thumbColor="#FFFFFF"
        />
      </View>
    </View>
  );
}

// Saved on the server with the profile (backend cleanProviderRates); the labor
// rate and service-call fee go as laborRate and dispatch.
const RATE_AMOUNTS = ['minJobFee', 'diagFee', 'hookUpFee', 'towMileage', 'afterHoursFee', 'weekendFee', 'heavyDutyFee'];
const RATE_SWITCHES = ['afterHoursEnabled', 'weekendEnabled', 'heavyDutyEnabled'];

const toMoneyInput = (value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : undefined);

// The server's copy over this phone's (fields the server doesn't have stay).
function fromProfile(local, profile) {
  if (!profile) return local;
  const next = { ...local };
  if (profile.dispatch != null) next.serviceCallFee = toMoneyInput(profile.dispatch);
  if (profile.laborRate != null) next.laborRate = toMoneyInput(profile.laborRate);
  const rates = profile.rates || {};
  for (const key of RATE_AMOUNTS) if (rates[key] != null) next[key] = toMoneyInput(rates[key]);
  if (rates.freeTowMiles != null) next.freeTowMiles = String(rates.freeTowMiles);
  for (const key of RATE_SWITCHES) if (typeof rates[key] === 'boolean') next[key] = rates[key];
  return next;
}

function ratesBody(v) {
  const rates = {};
  for (const key of RATE_AMOUNTS) {
    const n = Number.parseFloat(String(v[key] ?? '').replace(',', '.'));
    if (Number.isFinite(n) && n >= 0) rates[key] = Math.round(n * 100) / 100;
  }
  const miles = Number.parseFloat(String(v.freeTowMiles ?? ''));
  if (Number.isFinite(miles) && miles >= 0) rates.freeTowMiles = miles;
  for (const key of RATE_SWITCHES) rates[key] = !!v[key];
  return rates;
}

export default function PricingScreen({ visible, onClose, isDemoAccount }) {
  const { provider } = useProvider();
  const [v, setV] = useState(DEFAULT_PRICING);
  const set = (key) => (val) => setV(prev => ({ ...prev, [key]: val }));
  const isMobile = v.providerType !== 'shop';
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    (async () => {
      const local = await loadPricing();
      const profile = isDemoAccount || !provider?.id
        ? null
        : await fetchJson(`${API_URL}/profiles/${provider.id}`).catch(() => null);
      if (active) setV(fromProfile(local, profile));
    })();
    return () => { active = false; };
  }, [visible]);

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

  const handleSave = async () => {
    await savePricing(v);
    const rate = parseFloat(v.laborRate);
    const serviceCallFee = parseFloat(v.serviceCallFee);
    if (!isDemoAccount) {
      // dispatch is the service-call fee, held when the customer accepts you.
      const body = { rates: ratesBody(v) };
      if (!isNaN(rate)) body.laborRate = rate;
      if (!isNaN(serviceCallFee) && serviceCallFee >= 0) body.dispatch = Math.round(serviceCallFee * 100) / 100;
      try {
        const res = await authorizedFetch(`${API_URL}/profiles/${provider.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.status === 400) {
          const data = await res.json().catch(() => ({}));
          Alert.alert('Check your prices', data.error || 'One of the prices is not a valid number.');
          return;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      } catch {
        Alert.alert('Saved on this device only', 'We couldn\'t update your prices on the server. Check your connection and save again.');
        return;
      }
    }
    Alert.alert('Saved', 'Your pricing has been updated.');
    onClose();
  };

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pricing & Rates</Text>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.7} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
          <Text style={styles.pageNote}>Set your base rates and fees. These are used to build estimates for your customers.</Text>

          {/* Service Call — mobile only */}
          {isMobile && <Section icon="call-outline" iconColor="#F97316" title="SERVICE CALL">
            <PriceRow
              label="Service Call Fee"
              sub="Held when the customer accepts you. Counted toward the job if they approve your estimate; yours if they decline."
              value={v.serviceCallFee}
              onChange={set('serviceCallFee')}
            />
          </Section>}

          {/* Labor */}
          <Section icon="construct-outline" iconColor="#2563EB" title="LABOR">
            <PriceRow
              label="Hourly Labor Rate"
              sub="Your standard rate for labor per hour"
              value={v.laborRate}
              onChange={set('laborRate')}
              unit="/hr"
            />
            <PriceRow
              border
              label="Minimum Job Fee"
              sub="Minimum charge for any job"
              value={v.minJobFee}
              onChange={set('minJobFee')}
            />
            <PriceRow
              border
              label="Diagnostic / Inspection Fee"
              sub="Fee for on-site inspection and diagnosis"
              value={v.diagFee}
              onChange={set('diagFee')}
            />
          </Section>

          {/* Towing — mobile only */}
          {isMobile && <Section icon="car-outline" iconColor="#374151" title="TOWING">
            <PriceRow
              label="Hook-Up Fee"
              sub="Flat fee to hook up the vehicle"
              value={v.hookUpFee}
              onChange={set('hookUpFee')}
            />
            <PriceRow
              border
              label="Mileage Rate"
              sub="Charge per mile for towing"
              value={v.towMileage}
              onChange={set('towMileage')}
              unit="/mi"
            />
            <MileRow
              border
              label="Free Towing Miles"
              sub="Miles included in the hook-up fee"
              value={v.freeTowMiles}
              onChange={set('freeTowMiles')}
            />
          </Section>}

          {/* Additional Fees */}
          <Section icon="add-circle-outline" iconColor="#7C3AED" title="ADDITIONAL FEES">
            <FeeRow
              label="After Hours Fee"
              sub="Apply for jobs outside regular hours"
              price={v.afterHoursFee}
              onPrice={set('afterHoursFee')}
              enabled={v.afterHoursEnabled}
              onEnabled={set('afterHoursEnabled')}
            />
            <FeeRow
              border
              label="Weekend Fee"
              sub="Apply for jobs on weekends"
              price={v.weekendFee}
              onPrice={set('weekendFee')}
              enabled={v.weekendEnabled}
              onEnabled={set('weekendEnabled')}
            />
            <FeeRow
              border
              label="Heavy Duty Surcharge"
              sub="Added to every semi, box truck or trailer job"
              price={v.heavyDutyFee}
              onPrice={set('heavyDutyFee')}
              enabled={v.heavyDutyEnabled}
              onEnabled={set('heavyDutyEnabled')}
            />
          </Section>

          <View style={styles.footerNote}>
            <Ionicons name="information-circle-outline" size={16} color="#5E646D" />
            <Text style={styles.footerNoteText}>
              These rates are used to generate estimates. Final prices may vary based on job complexity and parts required.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slideContainer: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  scroll: { flex: 1 },
  saveBtn: { paddingHorizontal: 4 },
  saveBtnText: { color: '#F04416', fontSize: 15, fontWeight: '700' },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  pageNote: { color: '#5E646D', fontSize: 13, lineHeight: 19, marginBottom: 16 },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  sectionTitle: { color: '#17191D', fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14 },

  row: { paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  rowInfo: { flex: 1 },
  rowLabel: { color: '#17191D', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rowSub: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500' },

  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 10, backgroundColor: '#F9FAFB', overflow: 'hidden' },
  inputPrefix: { paddingLeft: 9, color: '#17191D', fontSize: 14, fontWeight: '600' },
  input: { minWidth: 54, maxWidth: 72, paddingHorizontal: 6, paddingVertical: 8, color: '#17191D', fontSize: 14, fontWeight: '700', textAlign: 'right' },
  inputNoPrefix: { paddingLeft: 10, textAlign: 'center' },
  inputUnit: { paddingRight: 8, color: '#5E646D', fontSize: 12, fontWeight: '600' },

  feeRight: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },

  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12 },
  footerNoteText: { flex: 1, color: '#5E646D', fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
