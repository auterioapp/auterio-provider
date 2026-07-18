import { useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import { getServiceMeta, formatMoney, getServiceMode, getRequestDistance, getCityState } from '../utils/serviceUtils';
import { useProvider } from '../ProviderContext';

const DEMO_INCOMING_REQUEST = {
  id: 'demo-request-001',
  status: 'pending',
  service: { issueName: 'Jump Start', serviceType: 'jump_start' },
  vehicle: { year: '2020', make: 'Honda', model: 'Civic', plate: 'ABC1234' },
  pickup: { address: '456 Oak Ave, San Francisco, CA 94102' },
  distance: '3.2 mi',
  eta: 'Est. 15 min',
  payment: { totalHeld: 89, dispatchFee: 0 },
  tracking: { mode: 'mobile' },
  customer: { name: 'Alex M.' },
  orderContext: { customerNote: 'Car won\'t start, battery seems dead.' },
};

const DEMO_BOOKING_REQUEST = {
  id: 'demo-request-002',
  status: 'pending',
  service: { issueName: 'Battery Replacement', serviceType: 'battery_replacement' },
  vehicle: { year: '2019', make: 'Toyota', model: 'Camry', plate: 'XYZ5678' },
  pickup: { address: '789 Pine St, San Francisco, CA 94103' },
  payment: { totalHeld: 145, dispatchFee: 0 },
  tracking: { mode: 'shop' },
  customer: { name: 'Sarah K.' },
  orderContext: { customerNote: 'Battery completely dead, needs full replacement.' },
  scheduledSlotLabel: 'Tomorrow, 10:00 AM',
};

const DEMO_SCHEDULE = [
  { time: '10:30 AM', title: 'Battery Jump', vehicle: 'Toyota Camry', eta: 'In 15 min' },
  { time: '12:15 PM', title: 'Tire Change', vehicle: 'Honda Accord', eta: 'In 2h' },
  { time: '2:00 PM', title: 'Diagnostics', vehicle: 'BMW X5', eta: 'In 3h 45m' },
];

const DEMO_ACTIVITY = [
  { icon: 'wallet-outline', color: '#22C55E', title: 'Payment received', meta: 'Today, 8:45 AM', value: '$89.00' },
  { icon: 'star', color: '#FFC107', title: 'New 5-star review', meta: 'Great service! Very professional.', value: '5.0' },
  { icon: 'checkmark-done', color: '#2F80FF', title: 'Job completed', meta: 'Battery Replacement - Job #12341', value: '$125.00' },
];

function ProfileSetupBanner({ onGoToProfile }) {
  return (
    <TouchableOpacity style={styles.setupBanner} activeOpacity={0.88} onPress={onGoToProfile}>
      <View style={styles.setupBannerIcon}>
        <Ionicons name="rocket-outline" size={20} color="#2563EB" />
      </View>
      <View style={styles.setupBannerBody}>
        <Text style={styles.setupBannerTitle}>Finish setting up your profile</Text>
        <Text style={styles.setupBannerSub}>Add services & hours to start receiving orders</Text>
      </View>
      <View style={styles.setupBannerBtn}>
        <Text style={styles.setupBannerBtnText}>Set up</Text>
        <Ionicons name="chevron-forward" size={14} color="#2563EB" />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ online, setOnline, requests = [], requestAnim, acceptingId, pendingCount, activeJobs, onOpenRequest, onViewAll, allowScheduling, onAccept, onDecline, refreshControl, scrollSignal, verificationStatus, isDemo, profileComplete, onGoToProfile }) {
  const { provider } = useProvider();
  const scrollRef = useScrollToTop(scrollSignal);
  const [showAllRequests, setShowAllRequests] = useState(false);
  const [showDemoRequest, setShowDemoRequest] = useState(true);
  const [showDemoBooking, setShowDemoBooking] = useState(true);
  const featuredRequest = requests[0] || null;
  const extraCount = requests.length - 1;
  const hasRealRequests = requests.length > 0;
  const showDemoPromo = isDemo && !hasRealRequests && !showDemoRequest && !showDemoBooking;
  const isLocked = !isDemo && verificationStatus !== 'verified';

  return (
    <>
    <ScrollView ref={scrollRef} style={[styles.container, styles.homeContainer]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
      <View style={styles.header}>
        <View><Text style={[styles.title, styles.homeTitle]}>Dashboard</Text></View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            activeOpacity={isLocked ? 0.6 : 1}
            onPress={isLocked ? () => Alert.alert(
              'Account not verified',
              verificationStatus === 'pending_review'
                ? 'Your account is under review. You can go online once it\'s approved.'
                : 'Upload your documents in Profile to activate your account and go online.'
            ) : undefined}
          >
            <View style={[styles.onlinePill, online && !isLocked && styles.onlinePillActive, isLocked && styles.onlinePillLocked]}>
              {isLocked
                ? <Ionicons name="lock-closed" size={12} color="#9CA3AF" style={{ marginRight: 4 }} />
                : null}
              <Text style={[styles.onlineText, online && !isLocked && styles.onlineTextActive]}>{isLocked ? 'Locked' : online ? 'Online' : 'Offline'}</Text>
              <Switch
                value={online && !isLocked}
                onValueChange={isLocked ? undefined : setOnline}
                disabled={isLocked}
                trackColor={{ false: '#E6E8EB', true: '#DEE0E3' }}
                thumbColor={online && !isLocked ? '#17191D' : '#8B9098'}
                style={styles.onlineSwitch}
              />
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.84}>
            <Ionicons name="notifications-outline" size={22} color="#17191D" />
            {!!pendingCount && <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.greeting, styles.homeTitle]}>Good morning, {provider.name}</Text>
      <Text style={styles.subGreeting}>Here's what's happening with your business today.</Text>

      <View style={styles.metricsGrid}>
        <Metric title="Today's Revenue" value={isDemo ? '$1,240.00' : '$0.00'} meta={isDemo ? '12% vs yesterday' : 'No jobs yet'} icon="cash-outline" color="#17191D" />
        <Metric title="Active Jobs" value={String(activeJobs)} meta="View ongoing jobs" icon="briefcase-outline" color="#F04416" />
        <Metric title="Pending Requests" value={String(pendingCount)} meta="View new requests" icon="receipt-outline" color="#17191D" />
        <Metric title="Jobs Completed" value={isDemo ? '8' : '0'} meta={isDemo ? '2 vs yesterday' : 'No jobs yet'} icon="checkmark-done" color="#F04416" />
      </View>

      {!profileComplete && !isDemo && <ProfileSetupBanner onGoToProfile={onGoToProfile} />}

      {!!featuredRequest && (
        <>
          <IncomingRequest
            order={featuredRequest}
            accepting={acceptingId === featuredRequest.id}
            onOpen={onOpenRequest}
            onAccept={onAccept}
            onDecline={onDecline}
            allowScheduling={allowScheduling}
          />
          {extraCount > 0 && (
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => setShowAllRequests(true)} activeOpacity={0.84}>
              <Text style={styles.viewAllText}>View all requests</Text>
              <View style={styles.viewAllBadge}><Text style={styles.viewAllBadgeText}>{requests.length}</Text></View>
            </TouchableOpacity>
          )}
        </>
      )}

      {showDemoPromo && (
        <View style={styles.demoPromoWrap}>
          <Text style={styles.demoPromoHeading}>Preview incoming requests</Text>
          <TouchableOpacity style={styles.demoPromoCard} activeOpacity={0.86} onPress={() => setShowDemoRequest(true)}>
            <View style={[styles.demoPromoIcon, { backgroundColor: '#FFF0E6' }]}>
              <Ionicons name="navigate-outline" size={20} color="#F97316" />
            </View>
            <View style={styles.demoPromoInfo}>
              <Text style={styles.demoPromoTitle}>Mobile request</Text>
              <Text style={styles.demoPromoSub}>Provider goes to the customer</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F97316" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.demoPromoCard, styles.demoPromoCardBlue]} activeOpacity={0.86} onPress={() => setShowDemoBooking(true)}>
            <View style={[styles.demoPromoIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="business-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.demoPromoInfo}>
              <Text style={[styles.demoPromoTitle, { color: '#1D4ED8' }]}>Booking request</Text>
              <Text style={styles.demoPromoSub}>Customer brings car to shop</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#2563EB" />
          </TouchableOpacity>
        </View>
      )}

      {isDemo && !hasRealRequests && showDemoRequest && (
        <>
          <IncomingRequest
            order={DEMO_INCOMING_REQUEST}
            accepting={false}
            onOpen={() => onOpenRequest && onOpenRequest(DEMO_INCOMING_REQUEST)}
            onAccept={() => setShowDemoRequest(false)}
            onDecline={() => setShowDemoRequest(false)}
            allowScheduling={false}
          />
          <TouchableOpacity style={styles.dismissDemoBtn} onPress={() => setShowDemoRequest(false)} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={15} color="#9CA3AF" />
            <Text style={styles.dismissDemoText}>Dismiss demo</Text>
          </TouchableOpacity>
        </>
      )}

      {isDemo && !hasRealRequests && showDemoBooking && (
        <>
          <IncomingRequest
            order={DEMO_BOOKING_REQUEST}
            accepting={false}
            onOpen={() => onOpenRequest && onOpenRequest(DEMO_BOOKING_REQUEST)}
            onAccept={() => setShowDemoBooking(false)}
            onDecline={() => setShowDemoBooking(false)}
            allowScheduling={false}
          />
          <TouchableOpacity style={styles.dismissDemoBtn} onPress={() => setShowDemoBooking(false)} activeOpacity={0.8}>
            <Ionicons name="close-circle-outline" size={15} color="#9CA3AF" />
            <Text style={styles.dismissDemoText}>Dismiss demo</Text>
          </TouchableOpacity>
        </>
      )}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {isDemo && <Text style={styles.linkText}>View all</Text>}
        </View>
        {isDemo ? DEMO_SCHEDULE.map((item, index) => (
          <View key={item.time} style={[styles.scheduleRow, index < DEMO_SCHEDULE.length - 1 && styles.rowBorder]}>
            <Text style={styles.timeText}>{item.time}</Text>
            <View style={styles.timelineDot} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>{item.title}</Text>
              <Text style={styles.scheduleVehicle}>{item.vehicle}</Text>
            </View>
            <Text style={styles.etaText}>{item.eta}</Text>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={28} color="#C8CDD4" />
            <Text style={styles.emptyStateText}>No scheduled jobs yet</Text>
          </View>
        )}
      </View>

      <View style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Activity</Text>
        {isDemo ? DEMO_ACTIVITY.map(item => (
          <View key={item.title} style={styles.activityRow}>
            <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{item.title}</Text>
              <Text style={styles.activityMeta}>{item.meta}</Text>
            </View>
            <Text style={[styles.activityValue, item.valueColor && { color: item.valueColor }]}>{item.value}</Text>
          </View>
        )) : (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={28} color="#C8CDD4" />
            <Text style={styles.emptyStateText}>No activity yet</Text>
          </View>
        )}
      </View>
    </ScrollView>

      <Modal visible={showAllRequests} transparent animationType="slide" onRequestClose={() => setShowAllRequests(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowAllRequests(false)} />
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>All Requests</Text>
            <View style={styles.viewAllBadge}><Text style={styles.viewAllBadgeText}>{requests.length}</Text></View>
            <TouchableOpacity onPress={() => setShowAllRequests(false)} style={styles.sheetClose}>
              <Ionicons name="close" size={20} color="#5E646D" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            {requests.map((order, i) => {
              const meta = getServiceMeta(order);
              const vehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');
              const addr = getCityState(order.pickup?.address) || 'Location pending';
              return (
                <TouchableOpacity
                  key={order.id || order._id || i}
                  style={[styles.sheetRow, i > 0 && styles.sheetRowBorder]}
                  onPress={() => { setShowAllRequests(false); onOpenRequest && onOpenRequest(order); }}
                  activeOpacity={0.84}
                >
                  <View style={[styles.sheetRowIcon, { backgroundColor: (meta.color || '#F97316') + '18' }]}>
                    <Ionicons name={meta.icon} size={20} color={meta.color || '#F97316'} />
                  </View>
                  <View style={styles.sheetRowInfo}>
                    <Text style={styles.sheetRowTitle} numberOfLines={1}>{meta.title}</Text>
                    {!!vehicle && <Text style={styles.sheetRowSub} numberOfLines={1}>{vehicle}</Text>}
                    <Text style={styles.sheetRowAddr} numberOfLines={1}>{addr}</Text>
                  </View>
                  <View style={styles.sheetRowRight}>
                    <Text style={styles.sheetRowPrice}>{formatMoney(order)}</Text>
                    <Text style={styles.sheetRowEta}>{order.eta || 'Est. 20 min'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}


const INCOMING_MODE = {
  mobile: { color: '#F97316', borderColor: 'rgba(240,68,22,0.42)', icon: 'navigate-outline',  label: 'Mobile',  sub: 'Comes to you',   locIcon: 'location-outline'  },
  shop:   { color: '#2563EB', borderColor: 'rgba(37,99,235,0.35)',  icon: 'business-outline', label: 'Shop',    sub: 'Drop off',       locIcon: 'storefront-outline' },
};

function IncomingRequest({ order, accepting, onOpen, onAccept, onDecline, allowScheduling }) {
  const serviceMeta = getServiceMeta(order);
  const isScheduledBooking = order.status === 'scheduled_pending' || order.isScheduledRequest || !!order.scheduledAt;
  const serviceMode = isScheduledBooking ? 'shop' : getServiceMode(order);
  const mode = INCOMING_MODE[serviceMode] || INCOMING_MODE.mobile;
  const address = getCityState(order.pickup?.address) || 'Location pending';
  const distance = getRequestDistance(order);
  const vehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');
  const isShop = serviceMode === 'shop';

  return (
    <TouchableOpacity
      style={[styles.incomingCard, { borderColor: mode.borderColor }]}
      onPress={() => onOpen && onOpen(order)}
      activeOpacity={0.88}
    >
      {/* Left mode stripe */}
      <View style={[styles.incomingStripe, { backgroundColor: mode.color }]} />

      <View style={styles.incomingTop}>
        <View style={styles.incomingLabelWrap}>
          <View style={[styles.newBadge, { backgroundColor: mode.color }]}>
            <Text style={styles.newBadgeText}>{isScheduledBooking ? 'APPOINTMENT' : mode.label.toUpperCase()}</Text>
          </View>
          <Text style={styles.incomingLabel}>{isScheduledBooking ? 'Booking Request' : 'New Request'}</Text>
        </View>
        <View style={styles.liveWrap}>
          <Text style={styles.justNow}>Just now</Text>
          <Ionicons name="radio-outline" size={18} color={mode.color} />
        </View>
      </View>

      <View style={styles.incomingBody}>
        <View style={[styles.incomingIcon, { backgroundColor: mode.color + '18' }]}>
          <Ionicons name={serviceMeta.icon} size={25} color={mode.color} />
        </View>
        <View style={styles.incomingInfo}>
          <Text style={styles.incomingTitle} numberOfLines={1}>{serviceMeta.title}</Text>
          {!!vehicle && <Text style={styles.incomingVehicle} numberOfLines={1}>{vehicle}</Text>}
          <View style={styles.incomingMetaRow}>
            <Ionicons name={mode.locIcon} size={15} color="#B7C1D7" />
            <Text style={styles.incomingMeta} numberOfLines={1}>{address}</Text>
          </View>
          {!isShop && (
            <View style={styles.incomingMetaRow}>
              <Ionicons name="navigate-outline" size={15} color="#B7C1D7" />
              <Text style={styles.incomingMeta}>{distance || '5.2 mi away'}</Text>
            </View>
          )}
        </View>
        <View style={styles.incomingPriceBox}>
          <Text style={[styles.incomingPrice, { color: mode.color }]}>{formatMoney(order)}</Text>
          <Text style={styles.incomingEta}>{order.eta || 'Est. 25 min'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Metric({ title, value, meta, icon, color, compact }) {
  return (
    <View style={[styles.metricCard, compact && styles.metricCardCompact]}>
      <View style={styles.metricTop}>
        <Text style={styles.metricTitle}>{title}</Text>
        <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon} size={16} color={color} />
        </View>
      </View>
      <Text style={[styles.metricValue, { color }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricMeta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  homeContainer: { backgroundColor: '#FFFFFF' },
  homeTitle: { color: '#17191D' },
  content: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112 },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: 26, lineHeight: 31, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  onlinePill: { height: 34, borderRadius: 17, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#E6E8EB', flexDirection: 'row', alignItems: 'center', paddingLeft: 11, paddingRight: 0 },
  onlinePillActive: { backgroundColor: '#F5F6F7', borderColor: '#DEE0E3' },
  onlinePillLocked: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  onlineText: { color: '#8B9098', fontSize: 11, fontWeight: '700' },
  onlineTextActive: { color: '#16A34A' },
  onlineSwitch: { transform: [{ scaleX: 0.62 }, { scaleY: 0.62 }], marginLeft: -5 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  greeting: { color: '#fff', fontSize: 19, lineHeight: 24, fontWeight: '700', marginBottom: 4 },
  subGreeting: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metricCard: { width: '48.75%', minHeight: 78, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', padding: 9 },
  metricCardCompact: { minHeight: 84 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  metricTitle: { color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', flex: 1 },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 20, lineHeight: 24, fontWeight: '800', marginBottom: 1 },
  metricMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  incomingCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1.6, padding: 12, paddingLeft: 15, marginBottom: 10, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4, overflow: 'hidden' },
  incomingStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  incomingModeText: { fontSize: 11, fontWeight: '700' },
  incomingBtnRow: { flexDirection: 'row', marginHorizontal: -12, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(240,68,22,0.15)' },
  incomingBtnDecline: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(240,68,22,0.15)' },
  incomingBtnDeclineText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  incomingBtnSchedule: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRightWidth: 1, borderRightColor: 'rgba(240,68,22,0.15)' },
  incomingBtnScheduleText: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },
  incomingBtnAccept: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A' },
  incomingBtnAcceptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  incomingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  incomingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  newBadge: { height: 17, borderRadius: 8, backgroundColor: '#17191D', paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  newBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  incomingLabel: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  justNow: { color: '#5E646D', fontSize: 12, fontWeight: '700' },
  incomingBody: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  incomingIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  incomingInfo: { flex: 1, minWidth: 0 },
  incomingTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '700', marginBottom: 1 },
  incomingVehicle: { color: '#5E646D', fontSize: 13, fontWeight: '600', marginBottom: 3 },
  incomingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  incomingMeta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600', flex: 1 },
  incomingPriceBox: { width: 58, alignItems: 'flex-end' },
  incomingPrice: { color: '#F04416', fontSize: 22, lineHeight: 26, fontWeight: '800' },
  incomingEta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'right' },
  incomingActions: { flexDirection: 'row', gap: 8 },
  reviewRequestBtn: { flex: 1, height: 40, borderRadius: 20, backgroundColor: '#F04416', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reviewRequestText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F04416', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10 },
  viewAllText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  viewAllBadge: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  viewAllBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetContainer: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 10, maxHeight: '80%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#DEE0E3', alignSelf: 'center', marginBottom: 12 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#ECEEF0' },
  sheetTitle: { flex: 1, color: '#17191D', fontSize: 17, fontWeight: '700' },
  sheetClose: { padding: 4 },
  sheetScroll: { paddingHorizontal: 16 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  sheetRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  sheetRowIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sheetRowInfo: { flex: 1, minWidth: 0 },
  sheetRowTitle: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  sheetRowSub: { color: '#5E646D', fontSize: 12, marginTop: 1 },
  sheetRowAddr: { color: '#8B9098', fontSize: 11, marginTop: 2 },
  sheetRowRight: { alignItems: 'flex-end', gap: 2 },
  sheetRowPrice: { color: '#17191D', fontSize: 14, fontWeight: '800' },
  sheetRowEta: { color: '#8B9098', fontSize: 11 },
  demoPromoWrap: { gap: 8, marginBottom: 10 },
  demoPromoHeading: { color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 2, marginBottom: 2 },
  demoPromoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7F0', borderRadius: 10, borderWidth: 1.5, borderColor: '#FDCBA6', paddingHorizontal: 14, paddingVertical: 13 },
  demoPromoCardBlue: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  demoPromoIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  demoPromoInfo: { flex: 1 },
  demoPromoTitle: { color: '#17191D', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  demoPromoSub: { color: '#9CA3AF', fontSize: 12, fontWeight: '500' },
  dismissDemoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, marginBottom: 4, marginTop: -4 },
  dismissDemoText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  sectionCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', padding: 12, marginBottom: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '700' },
  linkText: { color: '#F04416', fontSize: 13, fontWeight: '800' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  timeText: { width: 78, color: '#17191D', fontSize: 14, fontWeight: '600' },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F04416' },
  scheduleRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  scheduleInfo: { flex: 1, minWidth: 0 },
  scheduleTitle: { color: '#17191D', fontSize: 14, fontWeight: '600', marginBottom: 3 },
  scheduleVehicle: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  etaText: { color: '#F04416', fontSize: 13, fontWeight: '800' },
  activityRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityInfo: { flex: 1, minWidth: 0 },
  activityTitle: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  activityMeta: { color: '#5E646D', fontSize: 11, marginTop: 3 },
  activityValue: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 8 },
  emptyStateText: { color: '#8B9098', fontSize: 13, fontWeight: '500' },
  setupBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  setupBannerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setupBannerBody: { flex: 1, minWidth: 0 },
  setupBannerTitle: { color: '#1D4ED8', fontSize: 13, fontWeight: '800', marginBottom: 2 },
  setupBannerSub: { color: '#3B82F6', fontSize: 11, fontWeight: '600' },
  setupBannerBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  setupBannerBtnText: { color: '#2563EB', fontSize: 13, fontWeight: '800' },
});
