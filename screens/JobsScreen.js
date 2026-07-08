import { Fragment, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import SwipePager from '../components/SwipePager';
import { getJobStatusMeta, getJobStatusNote, getJobProgressIndex, getWorkflowJobStatus } from '../utils/jobUtils';
import { getServiceMeta } from '../utils/serviceUtils';
import { JOB_STEPS, ACTIVE_SHOP_STATUSES } from '../constants';
import CalendarScreen from './CalendarScreen';

export default function JobsScreen({ jobs, jobWorkflows = {}, onOpen, refreshControl, scrollSignal, providerType = 'mobile', isDemo = false }) {
  const hasAppointments = providerType === 'shop' || providerType === 'both';
  const scrollRef = useScrollToTop(scrollSignal);
  const [activeTab, setActiveTab] = useState('active');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const jobsWithStatus = jobs.map(job => ({
    ...job,
    displayStatus: ACTIVE_SHOP_STATUSES.includes(job.shopStatus)
      ? job.shopStatus
      : getWorkflowJobStatus(job.status, jobWorkflows[job.id]),
  }));
  const q = searchQuery.toLowerCase().trim();
  const matchesSearch = (job) => !q
    || (job.service?.type || job.issue?.name || '').toLowerCase().includes(q)
    || (job.customer?.name || '').toLowerCase().includes(q)
    || (job.pickup?.address || '').toLowerCase().includes(q)
    || String(job.number || '').includes(q);
  const activeJobsList = jobsWithStatus.filter(job => job.displayStatus !== 'completed' && job.displayStatus !== 'scheduled' && job.displayStatus !== 'confirmed' && job.displayStatus !== 'proposed' && matchesSearch(job));
  const scheduledJobsList = jobsWithStatus.filter(job => (job.displayStatus === 'scheduled' || job.displayStatus === 'confirmed' || job.displayStatus === 'proposed') && matchesSearch(job));
  const completedJobs = jobsWithStatus.filter(job => job.displayStatus === 'completed' && matchesSearch(job));
  const tabs = [
    { key: 'active', label: 'Active', icon: 'time-outline', color: '#2F80FF' },
    ...(hasAppointments ? [{ key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', color: '#2563EB' }] : []),
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle', color: '#16A34A' },
  ];

  const renderJobsPage = (tabKey) => {
    const pageJobs = tabKey === 'scheduled' ? scheduledJobsList : tabKey === 'completed' ? completedJobs : activeJobsList;
    return (
      <View>
        <View style={styles.jobsStatsRow}>
          <JobMetric title="Today's Earnings" value={isDemo ? '$423' : '$0'} meta={isDemo ? '4 completed jobs' : 'No jobs yet'} icon="wallet-outline" color="#F04416" />
          <JobMetric title="This Week" value={isDemo ? '$1,247' : '$0'} meta={isDemo ? '12 completed jobs' : 'No jobs yet'} icon="stats-chart-outline" color="#17191D" />
          <JobMetric title="Rating" value={isDemo ? '4.9' : '—'} meta={isDemo ? 'Based on 128 reviews' : 'No reviews yet'} icon="star" color="#FFC107" star={isDemo} />
        </View>

        <View style={styles.jobsSectionHeader}>
          <Text style={styles.jobsSectionTitle}>{tabKey === 'scheduled' ? 'Scheduled Jobs' : tabKey === 'completed' ? 'Completed Jobs' : 'Active Jobs'}</Text>
          {tabKey === 'active' && <Text style={styles.jobsSortText}>Sort by: Status</Text>}
        </View>

        <View style={styles.activeJobsList}>
          {pageJobs.length ? pageJobs.map(job => (
            tabKey === 'scheduled'
              ? <ScheduledJobCard key={job.id} job={job} onOpen={onOpen} />
              : <ActiveJobCard key={job.id} job={job} onOpen={onOpen} completed={tabKey === 'completed'} />
          )) : (
            <View style={styles.requestEmptyState}>
              <Ionicons name="briefcase-outline" size={28} color="#7A8BA8" />
              <Text style={styles.requestEmptyText}>No jobs in this view</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Fragment>
    <ScrollView
      ref={scrollRef}
      style={[styles.container, styles.homeContainer]}
      contentContainerStyle={styles.jobsContent}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View style={styles.jobsHeader}>
        <Text style={styles.jobsTitle}>Jobs</Text>
        {hasAppointments && (
          <TouchableOpacity style={styles.calendarBtn} activeOpacity={0.84} onPress={() => setCalendarOpen(true)}>
            <Ionicons name="calendar-outline" size={14} color="#17191D" />
            <Text style={styles.calendarText}>Calendar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#5E646D" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search jobs, customers, services..."
            placeholderTextColor="#8B9098"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#8B9098" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.86}>
          <Ionicons name="filter-outline" size={17} color="#17191D" />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View>
        <SwipePager
          tabs={tabs}
          activeKey={activeTab}
          onChange={setActiveTab}
          tabBarStyle={styles.jobsTabs}
          tabStyle={styles.jobsTab}
          tabTextStyle={styles.jobsTabText}
          activeTextStyle={styles.jobsTabTextActive}
          indicatorStyle={styles.jobsTabIndicator}
          pagerStyle={styles.jobsSwipePager}
          pageStyle={styles.jobsSwipePage}
        >
          {renderJobsPage('active')}
          {renderJobsPage('scheduled')}
          {renderJobsPage('completed')}
        </SwipePager>
      </View>
    </ScrollView>

    <CalendarScreen
      visible={calendarOpen}
      onClose={() => setCalendarOpen(false)}
      onOpenJob={(job) => { setCalendarOpen(false); onOpen(job); }}
    />
    </Fragment>
  );
}

function cityState(full = '') {
  const parts = full.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) return `${parts[parts.length - 2]}, ${parts[parts.length - 1].split(' ')[0]}`;
  return full || '—';
}

const SHOP_STATUS_BADGE = {
  checked_in:       { label: 'CHECKED IN',      color: '#2563EB' },
  inspection:       { label: 'WORKING',          color: '#F04416' },
  estimate:         { label: 'BUILD ESTIMATE',   color: '#F04416' },
  waiting_approval: { label: 'WAITING APPROVAL', color: '#1F6BFF' },
  in_progress:      { label: 'IN PROGRESS',      color: '#2563EB' },
  completed:        { label: 'COMPLETED',         color: '#22C55E' },
};

function ActiveJobCard({ job, onOpen, completed }) {
  const status = job.displayStatus || job.status;
  const meta = getJobStatusMeta(status);

  const isShopJob = ACTIVE_SHOP_STATUSES.includes(job.shopStatus);
  const cardAccent = isShopJob ? '#2563EB' : '#F04416';

  const badge = isShopJob && job.shopStatus
    ? (SHOP_STATUS_BADGE[job.shopStatus] || { label: status.toUpperCase().replace(/_/g, ' '), color: '#2563EB' })
    : { label: completed ? 'COMPLETED' : meta.label, color: completed ? '#16A34A' : (meta.color || '#F04416') };

  const vehicle = job.vehicle
    ? [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(' ') || job.vehicle.make || 'Vehicle'
    : job.vehicleType || 'Vehicle';
  const note = getJobStatusNote(status, job);
  const distance = job.distance || '';
  const payout = job.payment?.total ?? job.payment?.totalHeld ?? job.payment?.priceMin ?? 0;
  const priceLabel = payout ? `$${payout}` : 'TBD';

  return (
    <TouchableOpacity style={[styles.activeListCard, completed && styles.neutralListCard]} onPress={() => onOpen(job)} activeOpacity={0.86}>
      {!completed && <View style={[styles.activeListAccent, { backgroundColor: cardAccent }]} />}
      <View style={styles.activeListIcon}>
        <Ionicons name={job.icon || job.service?.icon || 'briefcase-outline'} size={20} color={cardAccent} />
      </View>
      <View style={styles.activeListInfo}>
        <View style={[styles.activeListBadgePill, { backgroundColor: badge.color + '18', borderColor: badge.color + '44' }]}>
          <Text style={[styles.activeListBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.activeListTitle} numberOfLines={1}>{job.service?.type || job.issue?.name || 'Service'}</Text>
        <Text style={styles.activeListVehicle} numberOfLines={1}>{vehicle}</Text>
        <Text style={styles.activeListAddress} numberOfLines={1}>{cityState(job.pickup?.address || job.selectedAddress)}</Text>
      </View>
      <View style={styles.activeListAside}>
        <Text style={[styles.activeListPrice, { color: cardAccent }]} numberOfLines={1}>{priceLabel}</Text>
        <View style={styles.activeListEtaRow}>
          {job.shopStatus === 'waiting_approval' && <Ionicons name="time-outline" size={10} color={cardAccent} style={styles.activeListEtaIcon} />}
          <Text style={[styles.activeListEta, { color: cardAccent }]}>{completed ? 'Receipt ready' : note}</Text>
        </View>
        {!!distance && <Text style={styles.activeListDistance} numberOfLines={1}>{distance}</Text>}
      </View>
    </TouchableOpacity>
  );
}

export function MiniJobProgress({ status, accent }) {
  const currentIndex = getJobProgressIndex(status);
  return (
    <View style={styles.miniProgressRow}>
      <View style={styles.miniProgressTrack} />
      {JOB_STEPS.map((step, index) => {
        const done = index <= currentIndex;
        return (
          <View key={step.key} style={styles.miniProgressItem}>
            <View style={[styles.miniProgressDot, done && { backgroundColor: accent }]}>
              <Ionicons name={step.icon} size={10} color={done ? '#FFFFFF' : '#8B9098'} />
            </View>
            <Text style={[styles.miniProgressText, done && { color: accent }]}>{step.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function JobAction({ label, icon, color, onPress, filled }) {
  return (
    <TouchableOpacity style={[styles.activeJobActionBtn, { borderColor: color + '66' }, filled && { backgroundColor: color + '18' }]} onPress={onPress} activeOpacity={0.84}>
      {!!icon && <Ionicons name={icon} size={15} color={color} />}
      <Text style={[styles.activeJobActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ScheduledJobCard({ job, onOpen }) {
  const payout = job.payment?.total ?? job.payment?.totalHeld ?? job.payment?.priceMin ?? 0;
  const serviceMeta = getServiceMeta(job);
  const vehicle = [job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || job.vehicle?.make || 'Vehicle';
  const address = cityState(job.pickup?.address) || 'Address pending';
  const apptTime = job.appointmentTime || job.time || job.scheduledSlotLabel || null;

  return (
    <TouchableOpacity style={[styles.scheduledCard, job.status === 'proposed' && styles.scheduledCardProposed]} onPress={() => onOpen(job)} activeOpacity={0.88}>
      <View style={[styles.scheduledStripe, job.status === 'proposed' && { backgroundColor: '#D97706' }]} />

      <View style={styles.scheduledTop}>
        <View style={styles.scheduledBadgeRow}>
          <View style={[styles.scheduledBadge, job.status === 'proposed' && styles.scheduledBadgeProposed]}>
            <Text style={styles.scheduledBadgeText}>{job.status === 'proposed' ? 'PROPOSED' : 'SHOP'}</Text>
          </View>
          <Text style={[styles.scheduledBadgeLabel, job.status === 'proposed' && { color: '#D97706' }]}>
            {job.status === 'proposed' ? 'Awaiting customer' : 'Confirmed Booking'}
          </Text>
        </View>
        {!!apptTime && (
          <View style={styles.scheduledTimeWrap}>
            <Ionicons name="calendar-outline" size={12} color={job.status === 'proposed' ? '#D97706' : '#2563EB'} />
            <Text style={[styles.scheduledTimeText, job.status === 'proposed' && { color: '#D97706' }]}>{apptTime}</Text>
          </View>
        )}
      </View>

      <View style={styles.scheduledBody}>
        <View style={styles.scheduledIconWrap}>
          <Ionicons name={serviceMeta.icon} size={24} color="#2563EB" />
        </View>
        <View style={styles.scheduledInfo}>
          <Text style={styles.scheduledTitle} numberOfLines={1}>{serviceMeta.title || job.service?.type || 'Service'}</Text>
          {!!vehicle && <Text style={styles.scheduledVehicle} numberOfLines={1}>{vehicle}</Text>}
          <View style={styles.scheduledMetaRow}>
            <Ionicons name="storefront-outline" size={13} color="#8B9098" />
            <Text style={styles.scheduledMeta} numberOfLines={1}>{address}</Text>
          </View>
        </View>
        <View style={styles.scheduledPriceBox}>
          <Text style={styles.scheduledPrice}>{payout ? `$${payout}` : 'TBD'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function JobMetric({ title, value, meta, icon, color, star }) {
  return (
    <View style={styles.jobsStatCard}>
      <View style={styles.jobsStatTop}>
        <Text style={styles.jobsStatTitle} numberOfLines={2}>{title}</Text>
        <View style={styles.jobsStatIcon}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
      </View>
      <View style={styles.jobsStatValueRow}>
        {star && <Ionicons name="star" size={16} color="#FFC107" />}
        <Text style={[styles.jobsStatValue, { color: star ? '#17191D' : color }]}>{value}</Text>
      </View>
      <Text style={styles.jobsStatMeta}>{meta}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  homeContainer: { backgroundColor: '#FFFFFF' },
  jobsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  jobsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  jobsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  calendarBtn: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E6E8EB', backgroundColor: '#F5F6F7', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  calendarText: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 11 },
  searchBox: { flex: 1, height: 34, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 },
  searchInput: { flex: 1, color: '#17191D', fontSize: 12, lineHeight: 15, fontWeight: '500', paddingVertical: 0 },
  filterButton: { height: 34, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11 },
  filterText: { color: '#17191D', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  jobsTabs: { height: 32, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', padding: 2, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  jobsTab: { flex: 1, height: 26, borderRadius: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4, zIndex: 1 },
  jobsTabText: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  jobsTabTextActive: { color: '#17191D' },
  jobsTabIndicator: { borderRadius: 7, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0' },
  jobsSwipePager: { minHeight: 640 },
  jobsSwipePage: { minHeight: 640 },
  jobsStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  jobsStatCard: { flex: 1, height: 82, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 9, justifyContent: 'space-between' },
  jobsStatTop: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  jobsStatIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  jobsStatTitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', flex: 1, minWidth: 0 },
  jobsStatValueRow: { minHeight: 25, flexDirection: 'row', alignItems: 'center', gap: 4 },
  jobsStatValue: { fontSize: 20, lineHeight: 24, fontWeight: '800' },
  jobsStatMeta: { color: '#5E646D', fontSize: 8, lineHeight: 11, fontWeight: '600' },
  jobsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  jobsSectionHeaderAlt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  jobsSectionTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  jobsSortText: { color: '#5E646D', fontSize: 10, fontWeight: '600' },
  activeJobsList: { gap: 8 },
  requestEmptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestEmptyText: { color: '#7A8BA8', fontSize: 13, fontWeight: '700' },
  activeListCard: { minHeight: 98, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingLeft: 11, paddingRight: 9, overflow: 'hidden', position: 'relative' },
  neutralListCard: { paddingLeft: 10 },
  activeListAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  activeListIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  activeListInfo: { flex: 1, minWidth: 0, overflow: 'hidden' },
  activeListBadgePill: { alignSelf: 'flex-start', borderRadius: 5, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, marginBottom: 4 },
  activeListBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  activeListTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '800' },
  activeListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1 },
  activeListAddress: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 1 },
  activeListAside: { width: 95, flexShrink: 0, alignItems: 'flex-end' },
  activeListPrice: { fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 6, textAlign: 'right' },
  activeListEtaRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginBottom: 4 },
  activeListEtaIcon: { flexShrink: 0 },
  activeListEta: { fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, flexWrap: 'wrap' },
  activeListDistance: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'right' },
  neutralListStatus: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  neutralListPrice: { color: '#F04416', fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 6, textAlign: 'right' },
  neutralListEta: { color: '#F04416', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, maxWidth: 88 },
  scheduledCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1.6, borderColor: 'rgba(37,99,235,0.35)', padding: 12, paddingLeft: 15, overflow: 'hidden' },
  scheduledCardProposed: { borderColor: 'rgba(217,119,6,0.4)' },
  scheduledStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: '#2563EB' },
  scheduledTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  scheduledBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  scheduledBadge: { backgroundColor: '#2563EB', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  scheduledBadgeProposed: { backgroundColor: '#D97706' },
  scheduledBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  scheduledBadgeLabel: { color: '#5E646D', fontSize: 11, fontWeight: '600' },
  scheduledTimeWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduledTimeText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  scheduledBody: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduledIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  scheduledInfo: { flex: 1, minWidth: 0 },
  scheduledTitle: { color: '#17191D', fontSize: 16, fontWeight: '800', lineHeight: 20, marginBottom: 2 },
  scheduledVehicle: { color: '#5E646D', fontSize: 11, fontWeight: '600', lineHeight: 15, marginBottom: 3 },
  scheduledMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scheduledMeta: { color: '#8B9098', fontSize: 11, fontWeight: '500', flex: 1 },
  scheduledPriceBox: { alignItems: 'flex-end', flexShrink: 0 },
  scheduledPrice: { color: '#2563EB', fontSize: 17, fontWeight: '800' },
  miniProgressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, position: 'relative', paddingTop: 1 },
  miniProgressTrack: { position: 'absolute', left: 25, right: 25, top: 7, height: 1, backgroundColor: '#E1E4E8' },
  miniProgressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  miniProgressDot: { width: 17, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8' },
  miniProgressText: { color: '#8B9098', fontSize: 7, lineHeight: 9, fontWeight: '600' },
  activeJobActionBtn: { flex: 1, height: 30, borderRadius: 8, borderWidth: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  activeJobActionText: { fontSize: 11, fontWeight: '700' },
});
