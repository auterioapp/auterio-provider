import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getServiceMeta, getDropoffAddress, isTowingService, getProviderIntakeItems, getServiceMode, getVehicleDisplayLabel, hasKnownVin } from '../utils/serviceUtils';
import { formatCurrency } from '../utils/estimateUtils';
import { useProvider } from '../ProviderContext';
import OrderPhotos from '../components/OrderPhotos';

const TIMER_SECONDS = 60;

function formatTimer(s) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function haversineMiles(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const money = (n) => formatCurrency(Number(n) || 0);
const range = (min, max) => `${money(min)}–${money(max).slice(1)}`;

// What the customer will be asked to pay if this provider accepts (server
// providerQuote): their rate × the job hours, their minimum, their surcharges.
// Folded to the price; tap for how it's made up.
function PriceBreakdown({ quote, earnLabel }) {
  const [open, setOpen] = useState(false);
  const rows = [];
  if (quote.kind === 'labor') {
    const byHours = Number(quote.laborRate) * Number(quote.hours || 0);
    const usedMinimum = quote.minJobFee > 0 && byHours < quote.minJobFee;
    rows.push({ key: 'price', label: 'Your price', value: money(quote.work), strong: true,
      sub: `${quote.hours} h × ${money(quote.laborRate)}${usedMinimum ? `, your minimum ${money(quote.minJobFee)}` : ''}` });
  } else if (quote.kind === 'tow') {
    rows.push({ key: 'price', label: 'Your price', value: money(quote.work), strong: true,
      sub: `Hook-up ${money(quote.hookUp)}, ${quote.includedMiles} mi included, then ${money(quote.perMile)}/mi${quote.miles != null ? ` · about ${quote.miles} mi` : ''}` });
  } else {
    rows.push({ key: 'price', label: 'Your price', value: range(quote.workMin, quote.workMax), strong: true,
      sub: `${quote.hours?.min}–${quote.hours?.max} h × ${money(quote.laborRate)}. Final price in your estimate.` });
  }
  (quote.surcharges || []).forEach(item => rows.push({ key: item.key, label: item.label, value: `+${money(item.amount)}`, sub: 'Included in your price' }));
  rows.push({ key: 'call', label: 'Service call fee', value: money(quote.callFee), sub: 'Included. Held when the customer accepts you; yours if they decline the estimate.' });
  rows.push({ key: 'earn', label: 'You earn', value: earnLabel, strong: true });
  const usual = typeof quote.usual === 'number' ? money(quote.usual)
    : (quote.usual?.min != null ? range(quote.usual.min, quote.usual.max) : null);
  if (usual) rows.push({ key: 'usual', label: 'Usually in the area', value: usual });
  return (
    <View style={styles.priceCard}>
      <TouchableOpacity
        style={[styles.priceRow, styles.priceHeader]}
        onPress={() => setOpen(value => !value)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Your price ${rows[0].value}. ${open ? 'Hide' : 'Show'} details`}
      >
        <View style={styles.priceRowText}>
          <Text style={[styles.priceLabel, styles.priceLabelStrong]}>{rows[0].label}</Text>
          {open && !!rows[0].sub && <Text style={styles.priceSub}>{rows[0].sub}</Text>}
        </View>
        <Text style={[styles.priceValue, styles.priceValueStrong]} numberOfLines={1}>{rows[0].value}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#5E646D" />
      </TouchableOpacity>
      {open && rows.slice(1).map(row => (
        <View key={row.key} style={[styles.priceRow, styles.priceRowBorder]}>
          <View style={styles.priceRowText}>
            <Text style={[styles.priceLabel, row.strong && styles.priceLabelStrong]}>{row.label}</Text>
            {!!row.sub && <Text style={styles.priceSub}>{row.sub}</Text>}
          </View>
          <Text style={[styles.priceValue, row.strong && styles.priceValueStrong]} numberOfLines={1}>{row.value}</Text>
        </View>
      ))}
      {open && !!quote.plusFuel && <Text style={styles.priceFootnote}>The fuel itself goes in your estimate.</Text>}
    </View>
  );
}

export default function RequestDetailScreen({ order, accepting, providerType = 'mobile', providerLiveCoord, onBack, onAccept, onSchedule, onDecline, refreshControl }) {
  const { provider } = useProvider();
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const [noteOpen, setNoteOpen] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  // Demo orders can come without the auto-decline (server: order.noAutoDecline).
  const autoDecline = !order?.noAutoDecline;

  useEffect(() => {
    if (!autoDecline) return undefined;
    if (timeLeft <= 0) {
      onDecline && onDecline(order);
      return;
    }
    const id = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [timeLeft]);

  const orderMode = getServiceMode(order);
  const isShopOrder = orderMode === 'shop';
  const isMobileOrder = orderMode === 'mobile';
  const serviceMeta = getServiceMeta(order);
  const icon = serviceMeta.icon;
  const title = serviceMeta.title;
  const displayVehicle = getVehicleDisplayLabel(order);
  const address = order.pickup?.address || 'Location pending';
  const dropoffAddress = getDropoffAddress(order);
  // The server prices the job with this provider's own rates (providerQuote):
  // one price, or a range for a repair. Older orders: the amount held.
  const quote = order.providerQuote;
  const commissionRate = provider?.commissionRate ?? 0.15;
  const netOf = (amount) => Math.max(0, amount - Math.round(amount * commissionRate * 100) / 100);
  const payout = Number(quote?.work ?? quote?.workMin ?? (order.payment?.totalHeld || order.payment?.total || 0));
  const net = netOf(payout);
  const netLabel = quote?.workMin != null && quote?.workMax != null
    ? `$${Math.round(netOf(quote.workMin))}–${Math.round(netOf(quote.workMax))}`
    : (net > 0 ? formatCurrency(net) : '—');
  const driveTime = order.eta || order.tracking?.eta || '—';
  const customerCoord = (order.pickup?.latitude != null && order.pickup?.longitude != null)
    ? { latitude: Number(order.pickup.latitude), longitude: Number(order.pickup.longitude) }
    : null;
  const liveDistanceMi = (customerCoord && providerLiveCoord)
    ? haversineMiles(providerLiveCoord.latitude, providerLiveCoord.longitude, customerCoord.latitude, customerCoord.longitude)
    : null;
  const distance = liveDistanceMi != null ? `${liveDistanceMi.toFixed(1)} mi` : (order.distance || '—');
  const customerNote = order.orderContext?.customerNote || order.customerNote || null;
  const isTowing = isTowingService(order);
  const isCustomerVerified = !!order.customer?.phoneVerified;
  const hasVin = hasKnownVin(order);

  const intakeRows = getProviderIntakeItems(order)
    .filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    .map((item, index) => ({
      key: `intake-${item.key || index}`,
      icon: 'help-circle-outline',
      color: '#F04416',
      label: item.label,
      value: String(item.value),
    }));
  const locationRows = [
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    // Distance and payout are in the summary card at the top.
  ];

  return (
    <View style={styles.requestDetailShell}>
      <View style={styles.requestDetailHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
          <Ionicons name="close" size={24} color="#17191D" />
        </TouchableOpacity>
        <Text style={styles.requestHeaderTitle}>New Request</Text>
        <View style={styles.requestHeaderIconBtn} />
      </View>

      <ScrollView
        style={[styles.container, styles.requestDetailScroll, { marginBottom: bottomPanelHeight + 28 }]}
        contentContainerStyle={styles.requestDetailContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.requestSummaryCard}>
          <View style={styles.earningsMain}>
            <Text style={styles.earningsLabel}>ESTIMATED{'\n'}EARNINGS</Text>
            <Text style={styles.earningsAmount} numberOfLines={1}>{netLabel}</Text>
            <Text style={styles.earningsNet} numberOfLines={1}>Net earnings</Text>
          </View>
          <View style={styles.earningsDivider} />
          <EarningStat icon="car-sport-outline" value={driveTime} label="Drive time" />
          <View style={styles.earningsDivider} />
          <EarningStat icon="map-outline" value={distance} label="Distance" />
        </View>

        {!!quote && <PriceBreakdown quote={quote} earnLabel={netLabel} />}

        <View style={styles.verifiedCard}>
          <View style={styles.verifiedIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#F04416" />
          </View>
          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedTitle} numberOfLines={1}>{isCustomerVerified ? 'Verified Customer' : 'Customer'}</Text>
            {isCustomerVerified && (
              <View style={[styles.trustedLine, styles.verifiedTrustedLine]}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
                <Text style={styles.verifiedTrusted} numberOfLines={1}>Verified & trusted</Text>
              </View>
            )}
          </View>
          <View style={styles.lockedContact}>
            <Ionicons name="lock-closed-outline" size={18} color="#5E646D" />
            <Text style={styles.lockedContactText}>Contact available{'\n'}after acceptance</Text>
          </View>
        </View>

        <View style={styles.vehicleInfoCard}>
          <View style={styles.requestVehicleIcon}>
            <Ionicons name={icon} size={22} color="#F04416" />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceType} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75}>{displayVehicle}</Text>
            {hasVin && (
              <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
                <Ionicons name="checkmark-circle-outline" size={13} color="#F04416" />
                <Text style={styles.verifiedTrusted}>VIN on file</Text>
              </View>
            )}
          </View>
          <View style={styles.vehicleMetaBox}>
            <View style={styles.requestSpecRow}>
              <Text style={styles.requestSpecLabel}>Service Type</Text>
              <Text style={styles.requestSpecValue} numberOfLines={1}>{title}</Text>
            </View>
          </View>
        </View>

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>

          {/* The customer's note and photos, folded to one line; tap to read and see them. */}
          <View style={styles.noteBlock}>
            <TouchableOpacity
              style={styles.noteBlockHeader}
              onPress={() => setNoteOpen(value => !value)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ expanded: noteOpen }}
            >
              <View style={[styles.requestInfoIcon, { backgroundColor: '#2F80FF' + '18' }]}>
                <Ionicons name="chatbox-outline" size={16} color="#2F80FF" />
              </View>
              <View style={styles.noteFoldText}>
                <Text style={styles.jobDetailTitle}>Customer Note & Photos</Text>
                {!noteOpen && (
                  <Text style={styles.noteFoldPreview} numberOfLines={1}>
                    {[customerNote || 'No note', photoCount ? `${photoCount} photo${photoCount > 1 ? 's' : ''}` : 'no photos'].join(' · ')}
                  </Text>
                )}
              </View>
              <Ionicons name={noteOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#5E646D" />
            </TouchableOpacity>
            {noteOpen && (
              <Text style={[styles.noteBlockText, !customerNote && styles.noteBlockEmpty]}>{customerNote || 'No additional info'}</Text>
            )}
            {/* Mounted while folded too, so the count is known. */}
            <View style={!noteOpen && styles.foldHidden}>
              <OrderPhotos orderId={order.id} bare onCount={setPhotoCount} />
            </View>
          </View>

          {intakeRows.length > 0 && (
            <>
              <View style={styles.jobDetailSectionRow}>
                <View style={[styles.requestInfoIcon, { backgroundColor: '#F04416' + '18' }]}>
                  <Ionicons name="clipboard-outline" size={16} color="#F04416" />
                </View>
                <Text style={[styles.jobDetailSectionLabel, styles.jobDetailTitle]} numberOfLines={1}>Customer Diagnostic</Text>
              </View>
              <View style={styles.diagnosticIndent}>
                {intakeRows.map(row => (
                  <View key={row.key} style={styles.diagnosticRow}>
                    <View style={styles.diagnosticDot} />
                    <Text style={styles.diagnosticLabel} numberOfLines={2}>{row.label}</Text>
                    <Text style={styles.diagnosticValue} numberOfLines={2}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {locationRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} chevron={row.chevron} onPress={row.onPress} labelStyle={styles.jobDetailTitle} valueStyle={styles.jobDetailValue} singleLine />
          ))}
        </View>
      </ScrollView>

      <View
        style={styles.requestBottomPanel}
        onLayout={(event) => setBottomPanelHeight(event.nativeEvent.layout.height)}
      >
        {autoDecline && (
          <View style={styles.acceptTimerBanner}>
            <Ionicons name="time-outline" size={16} color={timeLeft <= 10 ? '#EF4444' : '#F04416'} />
            <Text style={styles.acceptTimerText}>
              Auto-decline in{' '}
              <Text style={[styles.acceptTimerTime, timeLeft <= 10 && { color: '#EF4444' }]}>
                {formatTimer(timeLeft)}
              </Text>
            </Text>
          </View>
        )}
        <View style={styles.requestBottomActions}>
          <TouchableOpacity style={styles.largeDeclineButton} onPress={() => onDecline(order)} activeOpacity={0.84}>
            <Text style={styles.largeDeclineTitle}>Decline</Text>
            <Text style={styles.largeButtonSubtitle}>Reject this request</Text>
          </TouchableOpacity>
          {isMobileOrder && (
            <TouchableOpacity style={styles.largeAcceptButton} onPress={() => onAccept(order)} disabled={accepting} activeOpacity={0.84}>
              <Text style={styles.largeAcceptTitle}>{accepting ? 'Accepting...' : 'Accept'}</Text>
              <Text style={styles.largeAcceptSubtitle}>{quote ? 'Send your price to the customer' : 'Accept and head out'}</Text>
            </TouchableOpacity>
          )}
          {isShopOrder && (
            <TouchableOpacity style={styles.largeScheduleButton} onPress={() => onSchedule && onSchedule(order)} activeOpacity={0.84}>
              <Text style={styles.largeScheduleTitle}>Book Appointment</Text>
              <Text style={styles.largeScheduleSubtitle}>Pick a date & time</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

    </View>
  );
}

function EarningStat({ icon, value, label }) {
  return (
    <View style={styles.earningStat}>
      <Ionicons name={icon} size={19} color="#5E646D" />
      <Text style={styles.earningStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.earningStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// singleLine: the label and the value each stay on one line (the label as wide as its text);
// valueLines lets the value wrap anyway (an address).
export function RequestInfoRow({ icon, color, label, value, chevron, onPress, valueStyle, labelStyle, singleLine = false, valueLines }) {
  const RowComponent = onPress ? TouchableOpacity : View;
  const rowProps = onPress ? { activeOpacity: 0.82, onPress } : {};
  return (
    <RowComponent style={[styles.requestInfoRow, chevron && styles.requestInfoRowChevron]} {...rowProps}>
      <View style={[styles.requestInfoIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.requestInfoLabel, labelStyle, singleLine && styles.requestInfoLabelFit]} numberOfLines={singleLine ? 1 : undefined}>{label}</Text>
      <Text style={[styles.requestInfoValue, valueStyle]} numberOfLines={valueLines || (singleLine ? 1 : 2)}>{value}</Text>
      {chevron && <Ionicons style={styles.requestInfoChevron} name="chevron-forward" size={16} color="#5E646D" />}
    </RowComponent>
  );
}

const styles = StyleSheet.create({
  priceCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  priceRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  priceHeader: { alignItems: 'center' },
  priceRowText: { flex: 1, minWidth: 0 },
  priceLabel: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '600' },
  priceLabelStrong: { fontWeight: '700' },
  priceSub: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 2 },
  priceValue: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '600', flexShrink: 0 },
  priceValueStrong: { color: '#F04416', fontSize: 15, fontWeight: '800' },
  priceFootnote: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', paddingBottom: 10 },
  container: { flex: 1, backgroundColor: '#020C1A' },
  requestDetailShell: { flex: 1, backgroundColor: '#FFFFFF' },
  requestDetailHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 72, backgroundColor: '#FFFFFF' },
  requestHeaderIconBtn: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  requestHeaderTitle: { position: 'absolute', left: 72, right: 72, bottom: 13, color: '#17191D', fontSize: 19, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  requestDetailScroll: { backgroundColor: '#FFFFFF' },
  requestDetailContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12 },
  requestSummaryCard: { height: 94, borderRadius: 8, borderWidth: 1.4, borderColor: 'rgba(240,68,22,0.34)', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'stretch', paddingVertical: 9, paddingHorizontal: 6, marginBottom: 10, overflow: 'hidden', shadowColor: '#F04416', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  // The three columns (earnings, drive time, distance) share the width equally,
  // whatever their text.
  earningsMain: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  earningsLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginBottom: 5, textAlign: 'center' },
  earningsAmount: { color: '#F04416', fontSize: 20, lineHeight: 23, fontWeight: '800', textAlign: 'center' },
  earningsNet: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  earningsDivider: { width: 1, marginVertical: 0, backgroundColor: '#E1E4E8' },
  earningStat: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2 },
  earningStatValue: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  earningStatLabel: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  verifiedCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  verifiedInfo: { flex: 1, minWidth: 0 },
  verifiedTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', marginBottom: 3 },
  trustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedTrustedLine: { minHeight: 16 },
  vehicleTrustedLine: { minHeight: 16 },
  verifiedTrusted: { color: '#F04416', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  // The customer and vehicle cards share one layout: same size, and the right
  // part set off by a thin line (lockedContact / vehicleMetaBox).
  lockedContact: { width: 110, minHeight: 44, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 8, alignItems: 'center', justifyContent: 'center', gap: 3 },
  lockedContactText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  vehicleInfoCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  requestVehicleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceType: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
  serviceVehicle: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 3 },
  vehicleMetaBox: { width: 110, minHeight: 44, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 8, justifyContent: 'center' },
  requestSpecRow: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  requestSpecLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  requestSpecValue: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  requestBriefCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, padding: 12, marginBottom: 8 },
  jobDetailHeading: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 11 },
  jobDetailSectionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  jobDetailSectionLabel: { flex: 1, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  diagnosticIndent: { paddingLeft: 20 },
  diagnosticRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, paddingRight: 10, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  diagnosticDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C9D1', marginTop: 5 },
  diagnosticLabel: { flex: 2, color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  diagnosticValue: { flex: 1, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'right' },
  noteBlock: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E1E4E8', gap: 6 },
  noteBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  // Titles inside Job Details (Customer Note, Customer Diagnostic, locations).
  jobDetailValue: { fontSize: 12, lineHeight: 16 },
  jobDetailTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '600' },
  noteBlockText: { color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '500' },
  noteBlockEmpty: { color: '#5E646D' },
  noteFoldText: { flex: 1, minWidth: 0 },
  noteFoldPreview: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 1 },
  foldHidden: { display: 'none' },
  requestInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingRight: 10, borderBottomWidth: 1, borderBottomColor: '#E1E4E8', position: 'relative' },
  requestInfoLabelFit: { width: 'auto', flexShrink: 0 },
  requestInfoIcon: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  requestInfoLabel: { width: 104, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  requestInfoValue: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  requestInfoChevron: { position: 'absolute', right: 0 },
  // Room for the chevron on the right.
  requestInfoRowChevron: { paddingRight: 22 },
  requestBottomPanel: { position: 'absolute', left: 10, right: 10, bottom: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  requestBottomActions: { flexDirection: 'row', gap: 10 },
  largeDeclineButton: { flex: 1, minHeight: 60, borderRadius: 8, borderWidth: 1.5, borderColor: '#F04416', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 3 },
  largeDeclineTitle: { color: '#F04416', fontSize: 17, lineHeight: 20, fontWeight: '800' },
  largeButtonSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  largeAcceptButton: { flex: 1, minHeight: 60, borderRadius: 8, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', gap: 3 },
  largeAcceptTitle: { color: '#fff', fontSize: 17, lineHeight: 20, fontWeight: '800' },
  largeAcceptSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 8 },
  largeScheduleButton: { flex: 1, minHeight: 60, borderRadius: 8, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', gap: 3 },
  largeScheduleTitle: { color: '#fff', fontSize: 17, lineHeight: 20, fontWeight: '800' },
  largeScheduleSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  acceptTimerBanner: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 9 },
  acceptTimerText: { color: '#5E646D', fontSize: 14, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  acceptTimerTime: { color: '#F04416', fontWeight: '800' },
});
