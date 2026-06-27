import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getServiceMeta, getVehicleLabel, getDropoffAddress, isTowingService, getProviderIntakeItems } from '../utils/serviceUtils';
import { REQUEST_MAP_REGION, REQUEST_ROUTE } from '../constants';

export default function RequestDetailScreen({ order, accepting, onBack, onAccept, onDecline, refreshControl }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const accent = order.accent || '#42D463';
  const serviceMeta = getServiceMeta(order);
  const icon = serviceMeta.icon;
  const title = serviceMeta.title;
  const vehicle = getVehicleLabel(order);
  const vehicleFallback = vehicle === 'Vehicle details pending' ? '' : vehicle;
  const displayVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ') || vehicleFallback || '2020 Honda Civic';
  const address = order.pickup?.address || '456 Oak Ave, San Francisco, CA 94102';
  const dropoffAddress = getDropoffAddress(order);
  const payout = Number(order.payment?.totalHeld || order.payment?.total || 120);
  const platformFee = Math.max(8, Math.round(payout * 0.1));
  const net = Math.max(0, payout - platformFee);
  const customerNote = order.orderContext?.customerNote || order.customerNote || null;
  const rawCustomerFiles = order.orderContext?.files || order.files || order.photos || [
    { name: 'Front damage photo', type: 'image' },
    { name: 'Warning light photo', type: 'image' },
    { name: 'Customer note attachment', type: 'file' },
  ];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);
  const isTowing = isTowingService(order);
  const intakeRows = getProviderIntakeItems(order)
    .filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    .map((item, index) => ({
      key: `intake-${item.key || index}`,
      icon: 'help-circle-outline',
      color: '#F04416',
      label: item.label,
      value: String(item.value),
    }));
  const noteRow = { key: 'note', icon: 'chatbox-outline', color: '#2F80FF', label: 'Customer Note', value: customerNote || 'No additional info', chevron: !!(customerNote || customerFiles.length), onPress: (customerNote || customerFiles.length) ? () => setNoteOpen(true) : undefined };
  const locationRows = [
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    { key: 'distance', icon: 'trail-sign-outline', color: '#42D463', label: 'Distance', value: order.distance || (isTowing ? '6.8 mi away' : '3.1 mi away') },
    { key: 'payout', icon: 'cash-outline', color: '#EAB308', label: 'Est. Payout', value: `$${payout}` },
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
            <Text style={styles.earningsAmount} numberOfLines={1}>${net}</Text>
            <Text style={styles.earningsNet} numberOfLines={1}>Net earnings</Text>
          </View>
          <View style={styles.earningsDivider} />
          <EarningStat icon="car-sport-outline" value="20 min" label="Drive time" />
          <View style={styles.earningsDivider} />
          <EarningStat icon="construct-outline" value="15 min" label="Work time" />
          <View style={styles.earningsDivider} />
          <EarningStat icon="time-outline" value="35 min" label="Total time" />
        </View>

        <View style={styles.verifiedCard}>
          <View style={styles.verifiedIcon}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#F04416" />
          </View>
          <View style={styles.verifiedInfo}>
            <Text style={styles.verifiedTitle} numberOfLines={1}>Verified Customer</Text>
            <View style={styles.ratingLine}>
              <Ionicons name="star" size={13} color="#FFC107" />
              <Text style={styles.ratingScore}>4.9</Text>
            </View>
            <View style={[styles.trustedLine, styles.verifiedTrustedLine]}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
              <Text style={styles.verifiedTrusted} numberOfLines={1}>Verified & trusted</Text>
            </View>
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
            <Text style={styles.serviceType} numberOfLines={2}>{displayVehicle}</Text>
            <Text style={styles.serviceVehicle} numberOfLines={1}>Sedan - 92,000 mi</Text>
            <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
              <Ionicons name="checkmark-circle-outline" size={13} color="#F04416" />
              <Text style={styles.verifiedTrusted}>VIN verified</Text>
            </View>
          </View>
          <View style={styles.vehicleMetaBox}>
            <View style={styles.requestSpecRow}>
              <Text style={styles.requestSpecLabel}>Service Type</Text>
              <Text style={styles.requestSpecValue} numberOfLines={1}>{title}</Text>
            </View>
          </View>
        </View>

        <View style={styles.mapPreview}>
          <MapView
            style={styles.mapView}
            initialRegion={REQUEST_MAP_REGION}
            scrollEnabled={false}
            zoomEnabled={false}
            rotateEnabled={false}
            pitchEnabled={false}
            toolbarEnabled={false}
          >
            <Polyline coordinates={REQUEST_ROUTE} strokeColor="#F04416" strokeWidth={4} />
            <Marker coordinate={REQUEST_ROUTE[0]} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.mapStartMarker} />
            </Marker>
            <Marker coordinate={REQUEST_ROUTE[REQUEST_ROUTE.length - 1]} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.mapEndMarker}>
                <Ionicons name="location" size={20} color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>
          <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>20 min{'\n'}6.8 mi</Text></View>
        </View>

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>

          <RequestInfoRow key={noteRow.key} icon={noteRow.icon} color={noteRow.color} label={noteRow.label} value={noteRow.value} chevron={noteRow.chevron} onPress={noteRow.onPress} />

          {intakeRows.length > 0 && (
            <>
              <View style={styles.jobDetailSectionRow}>
                <View style={[styles.requestInfoIcon, { backgroundColor: '#F04416' + '18' }]}>
                  <Ionicons name="clipboard-outline" size={16} color="#F04416" />
                </View>
                <Text style={styles.jobDetailSectionLabel} numberOfLines={1}>Customer Diagnostic</Text>
              </View>
              <View style={styles.diagnosticIndent}>
                {intakeRows.map(row => (
                  <View key={row.key} style={styles.diagnosticRow}>
                    <View style={styles.diagnosticDot} />
                    <Text style={styles.diagnosticLabel} numberOfLines={2}>{row.label}</Text>
                    <Text style={styles.diagnosticValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {locationRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} chevron={row.chevron} onPress={row.onPress} />
          ))}
        </View>
      </ScrollView>

      <View
        style={styles.requestBottomPanel}
        onLayout={(event) => setBottomPanelHeight(event.nativeEvent.layout.height)}
      >
        <View style={styles.acceptTimerBanner}>
          <Ionicons name="time-outline" size={16} color="#F04416" />
          <Text style={styles.acceptTimerText}>Auto-decline in <Text style={styles.acceptTimerTime}>00:55</Text></Text>
        </View>
        <View style={styles.requestBottomActions}>
          <TouchableOpacity style={styles.largeDeclineButton} onPress={() => onDecline(order)} activeOpacity={0.84}>
            <Text style={styles.largeDeclineTitle}>Decline</Text>
            <Text style={styles.largeButtonSubtitle}>Reject this request</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.largeAcceptButton} onPress={() => onAccept(order)} disabled={accepting} activeOpacity={0.84}>
            <Text style={styles.largeAcceptTitle}>{accepting ? 'Accepting...' : 'Accept'}</Text>
            <Text style={styles.largeAcceptSubtitle}>Accept and continue</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={noteOpen} transparent animationType="fade" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.noteModalOverlay}>
          <TouchableOpacity style={styles.noteModalBackdrop} activeOpacity={1} onPress={() => setNoteOpen(false)} />
          <View style={styles.noteModalCard}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Customer Note</Text>
              <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setNoteOpen(false)}>
                <Ionicons name="close" size={20} color="#17191D" />
              </TouchableOpacity>
            </View>

            <Text style={styles.noteModalText}>{customerNote || 'No additional note from customer.'}</Text>

            {!!customerFiles.length && (
              <View style={styles.noteFilesBlock}>
                <Text style={styles.noteFilesTitle}>Uploaded files</Text>
                {customerFiles.map((file, index) => {
                  const fileName = typeof file === 'string' ? file : file.name || `Attachment ${index + 1}`;
                  const fileType = typeof file === 'string' ? 'file' : file.type || 'file';
                  const fileIcon = fileType === 'image' || fileType === 'photo' ? 'image-outline' : 'document-attach-outline';
                  return (
                    <View key={`${fileName}-${index}`} style={styles.noteFileRow}>
                      <View style={styles.noteFileIcon}>
                        <Ionicons name={fileIcon} size={16} color="#F04416" />
                      </View>
                      <Text style={styles.noteFileName} numberOfLines={1}>{fileName}</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </Modal>
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

export function RequestInfoRow({ icon, color, label, value, chevron, onPress }) {
  const RowComponent = onPress ? TouchableOpacity : View;
  const rowProps = onPress ? { activeOpacity: 0.82, onPress } : {};
  return (
    <RowComponent style={styles.requestInfoRow} {...rowProps}>
      <View style={[styles.requestInfoIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.requestInfoLabel}>{label}</Text>
      <Text style={styles.requestInfoValue} numberOfLines={2}>{value}</Text>
      {chevron && <Ionicons style={styles.requestInfoChevron} name="chevron-forward" size={16} color="#8B9098" />}
    </RowComponent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  requestDetailShell: { flex: 1, backgroundColor: '#FFFFFF' },
  requestDetailHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, backgroundColor: '#FFFFFF' },
  requestHeaderIconBtn: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  requestHeaderTitle: { position: 'absolute', left: 72, right: 72, bottom: 13, color: '#17191D', fontSize: 19, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  requestDetailScroll: { backgroundColor: '#FFFFFF' },
  requestDetailContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12 },
  requestSummaryCard: { height: 94, borderRadius: 8, borderWidth: 1.4, borderColor: 'rgba(240,68,22,0.34)', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'stretch', paddingVertical: 9, paddingHorizontal: 6, marginBottom: 10, overflow: 'hidden', shadowColor: '#F04416', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  earningsMain: { width: '26%', minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingLeft: 4, paddingRight: 4 },
  earningsLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginBottom: 5, textAlign: 'center' },
  earningsAmount: { color: '#F04416', fontSize: 20, lineHeight: 23, fontWeight: '800', textAlign: 'center' },
  earningsNet: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  earningsDivider: { width: 1, marginVertical: 0, backgroundColor: '#E1E4E8' },
  earningStat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 1 },
  earningStatValue: { color: '#17191D', fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  earningStatLabel: { color: '#5E646D', fontSize: 9, lineHeight: 11, fontWeight: '600', textAlign: 'center' },
  verifiedCard: { height: 94, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  verifiedInfo: { flex: 1, minWidth: 0 },
  verifiedTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 16, marginBottom: 3 },
  ratingScore: { color: '#FFB000', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  trustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedTrustedLine: { minHeight: 16 },
  vehicleTrustedLine: { minHeight: 16 },
  verifiedTrusted: { color: '#F04416', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  lockedContact: { width: 126, minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 7 },
  lockedContactText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
  vehicleInfoCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requestVehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceType: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
  serviceVehicle: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 3 },
  vehicleMetaBox: { width: 100, minHeight: 44, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 8, justifyContent: 'center' },
  requestSpecRow: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  requestSpecLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  requestSpecValue: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  mapPreview: { height: 148, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  mapView: { ...StyleSheet.absoluteFillObject },
  mapStartMarker: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#17191D', borderWidth: 3, borderColor: '#FFFFFF' },
  mapEndMarker: { width: 32, height: 38, borderRadius: 16, backgroundColor: '#F04416', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  mapBubble: { position: 'absolute', left: '45%', top: 34, borderRadius: 8, backgroundColor: 'rgba(23,25,29,0.9)', paddingHorizontal: 8, paddingVertical: 6 },
  mapBubbleText: { color: '#FFFFFF', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  requestBriefCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, padding: 12, marginBottom: 8 },
  jobDetailHeading: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 11 },
  jobDetailSectionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  jobDetailSectionLabel: { flex: 1, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  diagnosticIndent: { paddingLeft: 34 },
  diagnosticRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  diagnosticDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C9D1', marginTop: 4 },
  diagnosticLabel: { flex: 2, color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  diagnosticValue: { flex: 1, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  requestInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8', position: 'relative' },
  requestInfoIcon: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  requestInfoLabel: { width: 104, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  requestInfoValue: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  requestInfoChevron: { position: 'absolute', right: 0 },
  requestBottomPanel: { position: 'absolute', left: 10, right: 10, bottom: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  requestBottomActions: { flexDirection: 'row', gap: 10 },
  largeDeclineButton: { flex: 1, minHeight: 60, borderRadius: 8, borderWidth: 1.5, borderColor: '#F04416', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 3 },
  largeDeclineTitle: { color: '#F04416', fontSize: 17, lineHeight: 20, fontWeight: '800' },
  largeButtonSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  largeAcceptButton: { flex: 1, minHeight: 60, borderRadius: 8, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', gap: 3 },
  largeAcceptTitle: { color: '#fff', fontSize: 17, lineHeight: 20, fontWeight: '800' },
  largeAcceptSubtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  acceptTimerBanner: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 9 },
  acceptTimerText: { color: '#5E646D', fontSize: 14, lineHeight: 18, fontWeight: '700', textAlign: 'center' },
  acceptTimerTime: { color: '#F04416', fontWeight: '800' },
  noteModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  noteModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.32)' },
  noteModalCard: { borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 96, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  noteModalHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noteModalTitle: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  noteCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  noteModalText: { color: '#17191D', fontSize: 14, lineHeight: 20, fontWeight: '500' },
  noteSection: { marginBottom: 4 },
  noteSectionBorder: { borderTopWidth: 1, borderTopColor: '#ECEEF0', paddingTop: 12, marginTop: 12 },
  noteSectionLabel: { color: '#8B9098', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  noteAnswerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  noteAnswerLabel: { color: '#5E646D', fontSize: 13, lineHeight: 18, flex: 1 },
  noteAnswerValue: { color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'right', maxWidth: '50%' },
  noteEmpty: { color: '#8B9098', fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
  noteFilesBlock: { borderTopWidth: 1, borderTopColor: '#ECEEF0', paddingTop: 11, gap: 8 },
  noteFilesTitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  noteFileRow: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 },
  noteFileIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  noteFileName: { flex: 1, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
