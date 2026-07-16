import { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { isTowingService, getDropoffAddress, getProviderIntakeItems } from '../utils/serviceUtils';
import { formatCurrency } from '../utils/estimateUtils';
import { JOB_STEPS, ACCEPT_BLUE } from '../constants';
import { RequestInfoRow } from './RequestDetailScreen';

export default function JobDetailScreen({ job, onBack, onStatusChange, refreshControl }) {
  const initialStepIndex = Math.max(0, JOB_STEPS.findIndex(s => s.key === (job.status || 'on_the_way')));
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex);
  const [mapOpen, setMapOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    const idx = Math.max(0, JOB_STEPS.findIndex(s => s.key === (job.status || 'on_the_way')));
    setCurrentStepIndex(idx);
  }, [job.id, job.status]);

  const isComplete = currentStepIndex >= JOB_STEPS.length - 1;
  const nextStep = JOB_STEPS[Math.min(currentStepIndex + 1, JOB_STEPS.length - 1)];
  const total = job.payment?.total || 0;
  const address = job.pickup?.address || job.selectedAddress || 'Location pending';
  const isTowing = isTowingService(job);
  const dropoffAddress = getDropoffAddress(job);
  const customerNote = job.customerNote || null;
  const customerFiles = job.customerFiles || [];
  const intakeRows = getProviderIntakeItems(job);

  const noteRow = { key: 'note', icon: 'chatbox-outline', color: '#2F80FF', label: 'Customer Note', value: customerNote || 'No additional info', chevron: !!(customerNote || customerFiles.length), onPress: (customerNote || customerFiles.length) ? () => setNoteOpen(true) : undefined };
  const locationRows = [
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    { key: 'payment', icon: 'card-outline', color: '#EAB308', label: 'Payment', value: job.payment?.method ? `${job.payment.method} · Card on file` : 'Card on file' },
    { key: 'payout', icon: 'cash-outline', color: '#EAB308', label: 'Est. Payout', value: total ? formatCurrency(total) : 'TBD' },
  ];

  const arrivedIndex = Math.max(0, JOB_STEPS.findIndex(s => s.key === 'arrived'));
  const isArrived = currentStepIndex >= arrivedIndex;
  const markArrived = () => {
    setCurrentStepIndex(arrivedIndex);
    onStatusChange?.(job.id, 'arrived');
  };

  const openMapApp = async (provider) => {
    const destination = encodeURIComponent(address);
    const urls = {
      google: {
        app: `comgooglemaps://?daddr=${destination}&directionsmode=driving`,
        web: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
      },
      apple: {
        app: `maps://?daddr=${destination}&dirflg=d`,
        web: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
      },
      waze: {
        app: `waze://?q=${destination}&navigate=yes`,
        web: `https://waze.com/ul?q=${destination}&navigate=yes`,
      },
    };
    const target = urls[provider] || urls.google;
    setMapOpen(false);
    const canOpenApp = await Linking.canOpenURL(target.app);
    Linking.openURL(canOpenApp ? target.app : target.web);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020C1A' }}>
      <View style={styles.jobHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.jobBackBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.jobHeaderTitle}>Job #{job.number}</Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.jobMenuBtn}>
          <Ionicons name="apps-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.jobContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.jobStatusBar}>
          <View style={styles.jobStatusLeft}>
            <View style={styles.jobStatusDot} />
            <Text style={styles.jobStatusText}>{JOB_STEPS[currentStepIndex]?.label || 'Accepted'}</Text>
          </View>
          <Text style={styles.jobEtaText}>ETA {job.eta}</Text>
        </View>

        <View style={styles.jobCard}>
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitials}>{job.customer.initials}</Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{job.customer.name}</Text>
              <Text style={styles.customerPhone}>{job.customer.phone}</Text>
            </View>
            <View style={styles.customerActions}>
              <TouchableOpacity
                style={styles.callBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const phone = job.customer?.phone;
                  if (phone) Linking.openURL(`tel:${phone}`);
                }}
              >
                <Ionicons name="call" size={20} color="#42D463" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.msgBtn}
                activeOpacity={0.8}
                onPress={() => {
                  const phone = job.customer?.phone;
                  if (phone) Linking.openURL(`sms:${phone}`);
                }}
              >
                <Ionicons name="chatbox" size={20} color="#2F80FF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.jobCard}>
          <View style={styles.serviceRow}>
            <View style={[styles.serviceIconWrap, { backgroundColor: (job.accent || '#42D463') + '20' }]}>
              <Ionicons name={job.service.icon} size={26} color={job.accent || '#42D463'} />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceType}>{job.service.type}</Text>
              <Text style={styles.serviceVehicle}>{job.vehicle.year} {job.vehicle.make} {job.vehicle.model}</Text>
              <Text style={styles.serviceAddress}>{address}</Text>
            </View>
          </View>
        </View>

        <View style={styles.jobCard}>
          <JobStepper steps={JOB_STEPS} currentIndex={currentStepIndex} />
        </View>

        <View style={styles.jobBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>

          <RequestInfoRow icon={noteRow.icon} color={noteRow.color} label={noteRow.label} value={noteRow.value} chevron={noteRow.chevron} onPress={noteRow.onPress} />

          {intakeRows.length > 0 && (
            <>
              <View style={styles.jobSectionRow}>
                <View style={[styles.jobInfoIcon, { backgroundColor: '#F04416' + '18' }]}>
                  <Ionicons name="clipboard-outline" size={16} color="#F04416" />
                </View>
                <Text style={styles.jobSectionLabel} numberOfLines={1}>Customer Diagnostic</Text>
              </View>
              <View style={styles.jobDiagnosticIndent}>
                {intakeRows.map((row, index) => (
                  <View key={row.key || `intake-${index}`} style={styles.jobDiagnosticRow}>
                    <View style={styles.jobDiagnosticDot} />
                    <Text style={styles.jobDiagnosticLabel} numberOfLines={2}>{row.label}</Text>
                    <Text style={styles.jobDiagnosticValue} numberOfLines={1}>{String(row.value ?? '')}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {locationRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} />
          ))}
        </View>

        <TouchableOpacity style={styles.openNavBtn} onPress={() => setMapOpen(true)} activeOpacity={0.84}>
          <Ionicons name="navigate" size={22} color="#2F80FF" />
          <View>
            <Text style={styles.openNavBtnTitle}>Open Navigation</Text>
            <Text style={styles.openNavBtnSub}>Choose your preferred app</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.customerNotifiedBanner}>
          <Ionicons name="notifications-outline" size={16} color="#A8B3C8" />
          <Text style={styles.customerNotifiedText}>Customer has been notified that you're on the way.</Text>
        </View>

        <TouchableOpacity
          style={[styles.arrivedActionBtn, isArrived && styles.arrivedActionBtnDone]}
          onPress={markArrived}
          disabled={isArrived}
          activeOpacity={0.84}
        >
          <View style={[styles.actionSlidePill, { display: 'none' }]}>
            <Ionicons name={isArrived ? 'checkmark' : 'chevron-forward'} size={20} color="#fff" />
          </View>
          <View style={styles.actionSlideTextWrap}>
            <Text style={styles.actionSlideBtnTitle}>{isArrived ? 'Arrived' : "I've Arrived"}</Text>
            <Text style={styles.actionSlideBtnSub}>
              {isArrived ? 'You are at the location' : 'Confirm when you arrive at the location'}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={noteOpen} transparent animationType="slide" onRequestClose={() => setNoteOpen(false)}>
        <View style={styles.noteModalOverlay}>
          <TouchableOpacity style={styles.noteModalBackdrop} activeOpacity={1} onPress={() => setNoteOpen(false)} />
          <View style={styles.noteModalCard}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Customer Note</Text>
              <TouchableOpacity onPress={() => setNoteOpen(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#5E646D" />
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

      <Modal visible={mapOpen} transparent animationType="fade" onRequestClose={() => setMapOpen(false)}>
        <View style={styles.mapModalOverlay}>
          <TouchableOpacity style={styles.mapModalBackdrop} activeOpacity={1} onPress={() => setMapOpen(false)} />
          <View style={styles.mapChoiceCard}>
            <View style={styles.mapChoiceHeader}>
              <Text style={styles.mapChoiceTitle}>Choose Map</Text>
              <TouchableOpacity onPress={() => setMapOpen(false)} activeOpacity={0.8}>
                <Ionicons name="close" size={20} color="#D7DCE8" />
              </TouchableOpacity>
            </View>
            {[
              { id: 'google', label: 'Google Maps', icon: 'map-outline', color: '#2F80FF' },
              { id: 'apple', label: 'Apple Maps', icon: 'logo-apple', color: '#D7DCE8' },
              { id: 'waze', label: 'Waze', icon: 'navigate-circle-outline', color: '#42D463' },
            ].map(app => (
              <TouchableOpacity key={app.label} style={styles.mapChoiceRow} onPress={() => openMapApp(app.id)} activeOpacity={0.84}>
                <Ionicons name={app.icon} size={20} color={app.color} />
                <Text style={styles.mapChoiceText}>{app.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function JobStepper({ steps, currentIndex }) {
  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFirst = index === 0;
        const isLast = index === steps.length - 1;
        return (
          <View key={step.key} style={styles.stepperItem}>
            <View style={styles.stepperRow}>
              <View style={[styles.stepperLineSeg, { backgroundColor: isFirst ? 'transparent' : index <= currentIndex ? '#F04416' : '#E1E4E8' }]} />
              <View style={[styles.stepperCircle, isCompleted && styles.stepperCircleCompleted, isCurrent && styles.stepperCircleCurrent]}>
                {isCompleted
                  ? <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  : <Ionicons name="car-outline" size={13} color={isCurrent ? '#FFFFFF' : '#8B9098'} />}
              </View>
              <View style={[styles.stepperLineSeg, { backgroundColor: isLast ? 'transparent' : index < currentIndex ? '#F04416' : '#E1E4E8' }]} />
            </View>
            <Text style={[styles.stepperLabel, (isCompleted || isCurrent) && styles.stepperLabelActive]} numberOfLines={1}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function JobInfoRow({ icon, color, label, value, chevron, onPress }) {
  const RowComponent = onPress ? TouchableOpacity : View;
  return (
    <RowComponent style={styles.jobInfoRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.jobInfoIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.jobInfoLabel}>{label}</Text>
      <Text style={styles.jobInfoValue} numberOfLines={2}>{value}</Text>
      {chevron && <Ionicons name="chevron-forward" size={16} color="#8B9098" style={styles.jobInfoChevron} />}
    </RowComponent>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  jobHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingTop: 72, paddingBottom: 10, backgroundColor: '#020C1A' },
  jobHeaderTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  jobBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  jobMenuBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  jobContent: { paddingHorizontal: 15, paddingBottom: 100, paddingTop: 6 },
  jobStatusBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(66,212,99,0.08)', borderWidth: 1, borderColor: 'rgba(66,212,99,0.22)', borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10 },
  jobStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  jobStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#42D463' },
  jobStatusText: { color: '#42D463', fontSize: 14, fontWeight: '700' },
  jobEtaText: { color: '#D7DCE8', fontSize: 13, fontWeight: '700' },
  jobCard: { backgroundColor: '#07182B', borderWidth: 1, borderColor: '#17304E', borderRadius: 13, padding: 13, marginBottom: 10 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  customerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E3048', alignItems: 'center', justifyContent: 'center' },
  customerInitials: { color: '#fff', fontSize: 17, fontWeight: '700' },
  customerInfo: { flex: 1 },
  customerName: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 3 },
  customerPhone: { color: '#A8B3C8', fontSize: 13, fontWeight: '600' },
  customerActions: { flexDirection: 'row', gap: 10 },
  callBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#42D463', alignItems: 'center', justifyContent: 'center' },
  msgBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#2F80FF', alignItems: 'center', justifyContent: 'center' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  serviceIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1, minWidth: 0 },
  serviceType: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 2, flexShrink: 1 },
  serviceVehicle: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginBottom: 3 },
  serviceAddress: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  stepperContainer: { flexDirection: 'row' },
  stepperItem: { flex: 1, alignItems: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 7 },
  stepperLineSeg: { flex: 1, height: 2 },
  stepperCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center' },
  stepperCircleCompleted: { backgroundColor: '#F04416', borderColor: '#F04416' },
  stepperCircleCurrent: { backgroundColor: '#F04416', borderColor: '#F04416' },
  stepperLabel: { color: '#8B9098', fontSize: 8, fontWeight: '700', textAlign: 'center' },
  stepperLabelActive: { color: '#F04416' },
  jobDetailHeading: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 11 },
  jobDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  jobDetailRowBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(167,180,200,0.1)' },
  jobDetailLabel: { color: '#7A8BA8', fontSize: 13, fontWeight: '600', flex: 1 },
  jobDetailValue: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  jobBriefCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, padding: 12, marginBottom: 8 },
  jobBriefHeading: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 11 },
  jobInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8', position: 'relative' },
  jobInfoIcon: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  jobInfoLabel: { width: 104, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  jobInfoValue: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  jobInfoChevron: { position: 'absolute', right: 0 },
  jobSectionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  jobSectionLabel: { flex: 1, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  jobDiagnosticIndent: { paddingLeft: 34 },
  jobDiagnosticRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  jobDiagnosticDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C9D1', marginTop: 4 },
  jobDiagnosticLabel: { flex: 2, color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  jobDiagnosticValue: { flex: 1, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  noteModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  noteModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  noteModalCard: { borderRadius: 14, backgroundColor: '#FFFFFF', padding: 18 },
  noteModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  noteModalTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  noteModalText: { color: '#17191D', fontSize: 14, lineHeight: 20, fontWeight: '400' },
  noteFilesBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#ECEEF0' },
  noteFilesTitle: { color: '#8B9098', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  noteFileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  noteFileIcon: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center' },
  noteFileName: { flex: 1, color: '#17191D', fontSize: 13, fontWeight: '500' },
  openNavBtn: { height: 62, borderRadius: 14, borderWidth: 1.5, borderColor: '#2F80FF', backgroundColor: 'rgba(47,128,255,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  openNavBtnTitle: { color: '#2F80FF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  openNavBtnSub: { color: '#7A8BA8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  customerNotifiedBanner: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(168,179,200,0.14)', backgroundColor: 'rgba(168,179,200,0.06)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, marginBottom: 10 },
  customerNotifiedText: { color: '#A8B3C8', fontSize: 11, lineHeight: 14, fontWeight: '600', flex: 1 },
  arrivedActionBtn: { height: 62, borderRadius: 15, backgroundColor: ACCEPT_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: ACCEPT_BLUE, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  arrivedActionBtnDone: { backgroundColor: '#22C55E', shadowColor: '#22C55E' },
  actionSlidePill: { width: 70, height: 70, backgroundColor: '#42D463', alignItems: 'center', justifyContent: 'center' },
  actionSlideTextWrap: { flex: 1, paddingHorizontal: 18 },
  actionSlideBtnTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 3 },
  actionSlideBtnSub: { color: '#7A8BA8', fontSize: 12, fontWeight: '600' },
  mapModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  mapModalBackdrop: { ...StyleSheet.absoluteFillObject },
  mapChoiceCard: { borderRadius: 14, borderWidth: 1, borderColor: '#17304E', backgroundColor: '#07182B', padding: 14 },
  mapChoiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  mapChoiceTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  mapChoiceRow: { height: 48, borderRadius: 11, backgroundColor: '#0A1D32', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginTop: 8 },
  mapChoiceText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
