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

function ToggleRow({ label, sub, value, onChange, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
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

// Vehicle classes the prices are set for (backend services/pricing.js).
const CLASSES = [
  { key: 'light', label: 'Car' },
  { key: 'light_truck', label: 'Pickup' },
  { key: 'heavy', label: 'Truck' },
];

const toInput = (value) => (Number.isFinite(Number(value)) && value !== null && value !== '' ? String(value) : '');
const toNumberOrNull = (value) => {
  const n = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};

// The provider's saved prices, or the average where a price was never set.
function initialServicePrices(rows, saved = {}) {
  const fill = (savedPart, averagePart) => Object.fromEntries(CLASSES.map(({ key }) => [
    key, toInput(savedPart?.[key] ?? averagePart?.[key]),
  ]));
  return Object.fromEntries(rows.map(row => [row.issue, {
    prices: fill(saved[row.issue]?.prices, row.prices),
    ...(row.kind === 'tow' ? { perMile: fill(saved[row.issue]?.perMile, row.perMile) } : {}),
  }]));
}

// One price per vehicle class, with the average under it (orange when above).
function ClassPrices({ title, values, averages, onChange, unit }) {
  return (
    <View style={styles.classBlock}>
      {!!title && <Text style={styles.classTitle}>{title}</Text>}
      <View style={styles.classRow}>
        {CLASSES.map(({ key, label }) => {
          const price = toNumberOrNull(values?.[key]);
          const average = Number(averages?.[key]);
          const above = price != null && Number.isFinite(average) && price > average;
          return (
            <View key={key} style={styles.classCell}>
              <Text style={styles.classLabel}>{label}</Text>
              <View style={[styles.inputWrap, styles.classInputWrap, above && styles.inputWrapAbove]}>
                <Text style={styles.inputPrefix}>$</Text>
                <TextInput
                  style={[styles.input, styles.classInput]}
                  value={values?.[key] ?? ''}
                  onChangeText={(text) => onChange(key, text)}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  placeholder="—"
                  placeholderTextColor="#9AA0A6"
                />
                {unit ? <Text style={styles.inputUnit}>{unit}</Text> : null}
              </View>
              {Number.isFinite(average) && (
                <Text style={[styles.classAvg, above && styles.classAvgAbove]}>
                  {above ? 'Above avg' : 'Avg'} ${average % 1 ? average.toFixed(2) : average}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function PricingScreen({ visible, onClose, isDemoAccount }) {
  const { provider } = useProvider();
  const [v, setV] = useState(DEFAULT_PRICING);
  const set = (key) => (val) => setV(prev => ({ ...prev, [key]: val }));
  // Simple services: the averages (admin table) and this provider's prices.
  const [averageRows, setAverageRows] = useState([]);
  const [servicePrices, setServicePrices] = useState({});
  const setServicePrice = (issue, part) => (cls, text) => setServicePrices(prev => ({
    ...prev,
    [issue]: { ...prev[issue], [part]: { ...prev[issue]?.[part], [cls]: text } },
  }));
  const isMobile = v.providerType !== 'shop';
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    (async () => {
      const local = await loadPricing();
      const [averages, profile] = await Promise.all([
        fetchJson(`${API_URL}/pricing/averages`).catch(() => null),
        isDemoAccount || !provider?.id ? null : fetchJson(`${API_URL}/profiles/${provider.id}`).catch(() => null),
      ]);
      if (!active) return;
      // What's on the server wins over this phone's copy.
      setV({
        ...local,
        ...(profile?.dispatch != null ? { serviceCallFee: Number(profile.dispatch).toFixed(2) } : {}),
        ...(profile?.laborRate != null ? { laborRate: Number(profile.laborRate).toFixed(2) } : {}),
      });
      const rows = Array.isArray(averages?.rows) ? averages.rows : [];
      setAverageRows(rows);
      setServicePrices(initialServicePrices(rows, profile?.servicePrices || local.servicePrices || {}));
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
    // Numbers only; an emptied price is "not set".
    const cleanPrices = Object.fromEntries(averageRows.map(row => {
      const pick = (part) => Object.fromEntries(CLASSES
        .map(({ key }) => [key, toNumberOrNull(servicePrices[row.issue]?.[part]?.[key])])
        .filter(([, value]) => value != null));
      return [row.issue, { prices: pick('prices'), ...(row.kind === 'tow' ? { perMile: pick('perMile') } : {}) }];
    }));
    // Estimates still read the car tow price from this phone (utils/estimateUtils.js).
    const tow = cleanPrices['Need a Tow'];
    const towRow = averageRows.find(row => row.issue === 'Need a Tow');
    const localPricing = {
      ...v,
      servicePrices: cleanPrices,
      ...(tow?.prices?.light != null ? { hookUpFee: tow.prices.light.toFixed(2) } : {}),
      ...(tow?.perMile?.light != null ? { towMileage: tow.perMile.light.toFixed(2) } : {}),
      ...(towRow?.includedMiles != null ? { freeTowMiles: String(towRow.includedMiles) } : {}),
    };
    await savePricing(localPricing);
    const rate = parseFloat(v.laborRate);
    const serviceCallFee = parseFloat(v.serviceCallFee);
    if (!isDemoAccount) {
      // dispatch is the service-call fee, held when the customer accepts you.
      const body = {};
      if (!isNaN(rate)) body.laborRate = rate;
      if (!isNaN(serviceCallFee) && serviceCallFee >= 0) body.dispatch = Math.round(serviceCallFee * 100) / 100;
      if (averageRows.length) body.servicePrices = cleanPrices;
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
            <ToggleRow
              border
              label="Apply to Final Invoice"
              sub="If enabled, this fee will be credited toward the final invoice when the job is completed."
              value={v.applyToInvoice}
              onChange={set('applyToInvoice')}
            />
          </Section>}

          {/* Simple services — mobile only */}
          {isMobile && averageRows.length > 0 && <Section icon="pricetags-outline" iconColor="#F04416" title="SERVICE PRICES">
            <Text style={styles.sectionNote}>Your price for each job. Customers see the average before they order, and your price when you accept.</Text>
            {averageRows.map((row, index) => (
              <View key={row.issue} style={[styles.serviceBlock, index > 0 && styles.rowBorder]}>
                <Text style={styles.rowLabel}>{row.issue}</Text>
                {row.kind === 'tow' ? (
                  <>
                    <ClassPrices
                      title={`Hook-up, first ${row.includedMiles || 0} mi included`}
                      values={servicePrices[row.issue]?.prices}
                      averages={row.prices}
                      onChange={setServicePrice(row.issue, 'prices')}
                    />
                    <ClassPrices
                      title="Each mile after"
                      values={servicePrices[row.issue]?.perMile}
                      averages={row.perMile}
                      onChange={setServicePrice(row.issue, 'perMile')}
                      unit="/mi"
                    />
                  </>
                ) : (
                  <ClassPrices
                    values={servicePrices[row.issue]?.prices}
                    averages={row.prices}
                    onChange={setServicePrice(row.issue, 'prices')}
                  />
                )}
                {!!row.plusFuel && <Text style={styles.rowSub}>The fuel itself goes in the estimate.</Text>}
              </View>
            ))}
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

          {/* Travel — mobile only */}
          {isMobile && <Section icon="navigate-outline" iconColor="#16A34A" title="TRAVEL">
            <PriceRow
              label="Travel Fee"
              sub="Flat travel fee within your service area"
              value={v.travelFee}
              onChange={set('travelFee')}
            />
            <MileRow
              border
              label="Free Travel Radius"
              sub="No travel fee within this range"
              value={v.freeTravelRadius}
              onChange={set('freeTravelRadius')}
            />
            <PriceRow
              border
              label="Additional Mile Rate"
              sub="Charge per mile outside free radius"
              value={v.extraMileRate}
              onChange={set('extraMileRate')}
              unit="/mi"
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
              sub="Apply for larger vehicles"
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

  sectionNote: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '500', paddingTop: 12 },
  serviceBlock: { paddingVertical: 14, gap: 8 },
  classBlock: { gap: 6 },
  classTitle: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  classRow: { flexDirection: 'row', gap: 8 },
  classCell: { flex: 1, minWidth: 0, gap: 4 },
  classLabel: { color: '#5E646D', fontSize: 11, fontWeight: '700' },
  classInputWrap: { alignSelf: 'stretch' },
  classInput: { flex: 1, minWidth: 0, maxWidth: undefined },
  inputWrapAbove: { borderColor: '#F97316' },
  classAvg: { color: '#5E646D', fontSize: 11, fontWeight: '600' },
  classAvgAbove: { color: '#EA580C' },

  footerNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, paddingVertical: 12 },
  footerNoteText: { flex: 1, color: '#5E646D', fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
