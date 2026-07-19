import { Fragment, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import SwipePager from '../components/SwipePager';
import { getJobStatusMeta, getJobProgressIndex, getWorkflowJobStatus } from '../utils/jobUtils';
import { getServiceMode, getVehicleTypeLabel } from '../utils/serviceUtils';
import { formatCurrency } from '../utils/estimateUtils';
import { JOB_STEPS, ACTIVE_SHOP_STATUSES } from '../constants';
import CalendarScreen from './CalendarScreen';

export default function JobsScreen({ jobs, jobWorkflows = {}, onOpen, refreshControl, scrollSignal, providerType = 'mobile', isDemo = false, initialTabSignal }) {
  const hasAppointments = providerType === 'shop' || providerType === 'both';
  const scrollRef = useScrollToTop(scrollSignal);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (initialTabSignal?.tab) setActiveTab(initialTabSignal.tab);
  }, [initialTabSignal?.nonce]);
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
    || getRequestedService(job).toLowerCase().includes(q)
    || (job.customer?.name || '').toLowerCase().includes(q)
    || (job.pickup?.address || '').toLowerCase().includes(q)
    || String(job.number || '').includes(q);
  const activeJobsList = jobsWithStatus.filter(job => job.displayStatus !== 'completed' && job.displayStatus !== 'scheduled' && job.displayStatus !== 'confirmed' && job.displayStatus !== 'proposed' && job.displayStatus !== 'cancelled' && job.displayStatus !== 'declined' && matchesSearch(job));
  const scheduledJobsList = jobsWithStatus.filter(job => (job.displayStatus === 'scheduled' || job.displayStatus === 'confirmed' || job.displayStatus === 'proposed') && matchesSearch(job));
  const completedJobs = jobsWithStatus.filter(job => job.displayStatus === 'completed' && matchesSearch(job));

  const tabs = [
    { key: 'active', label: 'Active', icon: 'time-outline', color: '#2F80FF', count: activeJobsList.length },
    ...(hasAppointments ? [{ key: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', color: '#2563EB', count: scheduledJobsList.length }] : []),
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle', color: '#16A34A', count: completedJobs.length },
  ];

  const renderJobsPage = (tabKey) => {
    const pageJobs = tabKey === 'scheduled' ? scheduledJobsList : tabKey === 'completed' ? completedJobs : activeJobsList;
    return (
      <View>
        <View style={styles.jobsSectionHeader}>
          <Text style={styles.jobsSectionTitle}>
            {tabKey === 'scheduled' ? `Scheduled Jobs (${pageJobs.length})` : tabKey === 'completed' ? 'Completed Jobs' : 'Active Jobs'}
          </Text>
          {tabKey === 'active' && <Text style={styles.jobsSortText}>Sort by: Newest</Text>}
          {tabKey === 'scheduled' && <Text style={styles.jobsSortText}>Sort by: Soonest</Text>}
        </View>

        <View style={styles.activeJobsList}>
          {pageJobs.length ? pageJobs.map(job => (
            tabKey === 'scheduled'
              ? <ScheduledJobCard key={job.id} job={job} onOpen={onOpen} />
              : <ActiveJobCard key={job.id} job={job} onOpen={onOpen} completed={tabKey === 'completed'} />
          )) : (
            <View style={styles.emptyJobsCard}>
              <Ionicons name="refresh" size={22} color="#2563EB" />
              <Text style={styles.emptyJobsTitle}>Can't find a job?</Text>
              <Text style={styles.emptyJobsText}>Pull to refresh or check your filters.</Text>
              <Text style={styles.emptyJobsLink}>Refresh jobs</Text>
            </View>
          )}
        </View>

        {tabKey === 'scheduled' && !!pageJobs.length && (
          <View style={styles.scheduleNoticeBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.scheduleNoticeText}>Arrive on time to keep your schedule and ratings on track.</Text>
          </View>
        )}
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
        <View style={styles.jobsHeaderActions}>
          {hasAppointments && (
            <TouchableOpacity style={styles.calendarIconBtn} activeOpacity={0.84} onPress={() => setCalendarOpen(true)}>
              <Ionicons name="calendar-outline" size={18} color="#17191D" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.86}>
            <Ionicons name="filter-outline" size={17} color="#17191D" />
            <Text style={styles.filterText}>Filter</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#5E646D" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search jobs, customers, services..."
            placeholderTextColor="#5E646D"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color="#5E646D" />
            </TouchableOpacity>
          )}
        </View>
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

const PROVIDER_TYPE_LEAKS = [
  'mobile', 'shop', 'both',
  'mobile mechanic', 'mobile & shop', 'mobile + shop', 'mobile and shop',
  'repair shop', 'auto service', 'auto service provider',
];
const isProviderTypeLeak = (value) => !!value && PROVIDER_TYPE_LEAKS.includes(String(value).trim().toLowerCase());
function getRequestedService(job) {
  const candidates = [job.service?.issueName, job.issue?.name, job.service?.type];
  return candidates.find(value => value && !isProviderTypeLeak(value)) || 'Service';
}

const SHOP_STATUS_BADGE = {
  checked_in:       { label: 'CHECKED IN',      color: '#2563EB' },
  inspection:       { label: 'WORKING',          color: '#F04416' },
  estimate:         { label: 'BUILD ESTIMATE',   color: '#F04416' },
  waiting_approval: { label: 'WAITING APPROVAL', color: '#1F6BFF' },
  in_progress:      { label: 'IN PROGRESS',      color: '#2563EB' },
  completed:        { label: 'COMPLETED',        color: '#22C55E' },
};

function ActiveJobCard({ job, onOpen, completed }) {
  const status = job.displayStatus || job.status;
  const meta = getJobStatusMeta(status);

  const isShopJob = getServiceMode(job) === 'shop';
  const cardAccent = isShopJob ? '#2563EB' : '#F04416';

  const rawBadgeLabel = isShopJob && job.shopStatus
    ? (SHOP_STATUS_BADGE[job.shopStatus]?.label || status.toUpperCase().replace(/_/g, ' '))
    : (completed ? 'COMPLETED' : meta.label);
  const badgeLabel = rawBadgeLabel.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const badgeColor = completed
    ? '#16A34A'
    : isShopJob && job.shopStatus
      ? (SHOP_STATUS_BADGE[job.shopStatus]?.color || cardAccent)
      : (meta.color || cardAccent);

  const vehicle = getVehicleTypeLabel(job);
  const serviceType = getRequestedService(job);
  const customerName = job.customer?.name || 'Customer';
  const payout = job.payment?.total ?? job.payment?.totalHeld ?? job.payment?.priceMin ?? 0;
  const priceLabel = payout ? formatCurrency(payout) : 'TBD';
  const avatarBg = completed ? '#EAF7EE' : (isShopJob ? '#EFF6FF' : '#FFF1E6');
  const avatarColor = completed ? '#22C55E' : cardAccent;

  return (
    <TouchableOpacity style={[styles.jobCard, { borderColor: cardAccent + '55' }]} onPress={() => onOpen(job)} activeOpacity={0.88}>
      <View style={styles.jobCardBadgeRow}>
        <View style={[styles.jobCardBadgePill, { backgroundColor: cardAccent + '18', borderColor: cardAccent + '44' }]}>
          <Text style={[styles.jobCardBadgeText, { color: cardAccent }]}>{isShopJob ? 'In-Shop' : 'Mobile'}</Text>
        </View>
        <View style={[styles.jobCardBadgePill, { backgroundColor: badgeColor + '18', borderColor: badgeColor + '44' }]}>
          <Text style={[styles.jobCardBadgeText, { color: badgeColor }]}>{badgeLabel}</Text>
        </View>
      </View>
      <View style={styles.jobCardMainRow}>
        <View style={[styles.jobCardAvatar, { backgroundColor: avatarBg }]}>
          <Ionicons name={job.icon || job.service?.icon || 'construct-outline'} size={22} color={avatarColor} />
        </View>
        <View style={styles.jobCardBody}>
          <Text style={styles.jobCardTitle} numberOfLines={1}>{serviceType}</Text>
          <View style={styles.jobCardMetaRow}>
            <Ionicons name="car-outline" size={12} color="#5E646D" />
            <Text style={styles.jobCardMetaText} numberOfLines={1}>{vehicle}</Text>
          </View>
          <View style={styles.jobCardMetaRow}>
            <Ionicons name="person-outline" size={12} color="#5E646D" />
            <Text style={styles.jobCardMetaText} numberOfLines={1}>{customerName}</Text>
          </View>
        </View>
        <View style={styles.jobCardAside}>
          <Text style={styles.jobCardPrice} numberOfLines={1}>{priceLabel}</Text>
          {!!job.number && <Text style={styles.jobCardNum}>#{job.number}</Text>}
        </View>
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
              <Ionicons name={step.icon} size={10} color={done ? '#FFFFFF' : '#5E646D'} />
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

function formatScheduleTime(job) {
  const d = job.scheduledAt ? new Date(job.scheduledAt) : null;
  if (d && !isNaN(d.getTime())) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / 86400000);
    const dayLabel = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const [timeBig, ampm] = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).split(' ');
    return { dayLabel, timeBig, ampm: ampm || '' };
  }
  const raw = job.appointmentTime || job.scheduledSlotLabel || job.scheduledSlot || job.time || '';
  const match = raw.match(/(\d{1,2}:\d{2})\s*([AP]M)/i);
  const dayLabel = raw.replace(/,?\s*\d{1,2}:\d{2}\s*[AP]M/i, '').trim();
  return { dayLabel: dayLabel || 'Scheduled', timeBig: match ? match[1] : '--:--', ampm: match ? match[2].toUpperCase() : '' };
}

function ScheduledJobCard({ job, onOpen }) {
  const payout = job.payment?.total ?? job.payment?.totalHeld ?? job.payment?.priceMin ?? 0;
  const vehicle = [job.vehicle?.year, job.vehicle?.make, job.vehicle?.model].filter(Boolean).join(' ') || job.vehicle?.make || 'Vehicle';
  const serviceType = getRequestedService(job);
  const isShopVisit = getServiceMode(job) === 'shop';
  const customerName = job.customer?.name || 'Customer';
  const { dayLabel, timeBig, ampm } = formatScheduleTime(job);
  const priceLabel = payout ? formatCurrency(payout) : 'TBD';

  const avatarBg = isShopVisit ? '#EFF6FF' : '#EAF7EE';
  const avatarColor = isShopVisit ? '#2563EB' : '#16A34A';
  const timeLabel = `${dayLabel}${timeBig ? ` Â· ${timeBig}${ampm ? ' ' + ampm : ''}` : ''}`;

  return (
    <TouchableOpacity style={[styles.jobCard, { borderColor: avatarColor + '55' }]} onPress={() => onOpen(job)} activeOpacity={0.88}>
      <View style={styles.jobCardMainRow}>
        <View style={[styles.jobCardAvatar, { backgroundColor: avatarBg }]}>
          <Ionicons name={job.icon || job.service?.icon || 'calendar-outline'} size={22} color={avatarColor} />
        </View>
        <View style={styles.jobCardBody}>
          <Text style={styles.jobCardTitle} numberOfLines={1}>{serviceType}</Text>
          <View style={styles.jobCardMetaRow}>
            <Ionicons name="car-outline" size={12} color="#5E646D" />
            <Text style={styles.jobCardMetaText} numberOfLines={1}>{vehicle}</Text>
          </View>
          <View style={styles.jobCardMetaRow}>
            <Ionicons name="person-outline" size={12} color="#5E646D" />
            <Text style={styles.jobCardMetaText} numberOfLines={1}>{customerName}</Text>
          </View>
          <View style={styles.jobCardMetaRow}>
            <Ionicons name="calendar-outline" size={12} color="#2F80FF" />
            <Text style={[styles.jobCardMetaText, { color: '#2F80FF', fontWeight: '600' }]} numberOfLines={1}>{timeLabel}</Text>
          </View>
        </View>
        <View style={styles.jobCardAside}>
          <Text style={styles.jobCardPrice} numberOfLines={1}>{priceLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  homeContainer: { backgroundColor: '#FFFFFF' },
  jobsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  jobsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  jobsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  jobsHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calendarIconBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
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
  jobsSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  jobsSectionHeaderAlt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 8 },
  jobsSectionTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  jobsSortText: { color: '#5E646D', fontSize: 10, fontWeight: '600' },
  activeJobsList: { gap: 6 },
  emptyJobsCard: { minHeight: 150, borderRadius: 12, borderWidth: 1.5, borderColor: '#D8DBE0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 24 },
  emptyJobsTitle: { color: '#17191D', fontSize: 15, fontWeight: '800', marginTop: 6 },
  emptyJobsText: { color: '#5E646D', fontSize: 12, fontWeight: '500' },
  emptyJobsLink: { color: '#2563EB', fontSize: 13, fontWeight: '700', marginTop: 6 },
  jobCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14 },
  jobCardMainRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  jobCardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  jobCardBody: { flex: 1, minWidth: 0 },
  jobCardBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  jobCardBadgePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 5, borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1 },
  jobCardBadgeText: { fontSize: 9, fontWeight: '700' },
  jobCardTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  jobCardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  jobCardMetaText: { color: '#5E646D', fontSize: 12 },
  jobCardAside: { alignItems: 'flex-end', flexShrink: 0 },
  jobCardPrice: { color: '#17191D', fontSize: 15, fontWeight: '800' },
  jobCardNum: { color: '#5E646D', fontSize: 11, fontWeight: '600', marginTop: 4 },
  scheduleNoticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 10, padding: 11, marginTop: 12 },
  scheduleNoticeText: { color: '#1D4ED8', fontSize: 12, fontWeight: '600', flex: 1 },
  miniProgressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, position: 'relative', paddingTop: 1 },
  miniProgressTrack: { position: 'absolute', left: 25, right: 25, top: 7, height: 1, backgroundColor: '#E1E4E8' },
  miniProgressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  miniProgressDot: { width: 17, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8' },
  miniProgressText: { color: '#5E646D', fontSize: 7, lineHeight: 9, fontWeight: '600' },
  activeJobActionBtn: { flex: 1, height: 30, borderRadius: 8, borderWidth: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  activeJobActionText: { fontSize: 11, fontWeight: '700' },
});
