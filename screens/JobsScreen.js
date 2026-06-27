import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import SwipePager from '../components/SwipePager';
import { getJobStatusMeta, getJobStatusNote, getJobProgressIndex, getWorkflowJobStatus } from '../utils/jobUtils';
import { JOB_STEPS } from '../constants';
import { scheduledJobs } from '../data';

export default function JobsScreen({ jobs, jobWorkflows = {}, onOpen, refreshControl, scrollSignal }) {
  const scrollRef = useScrollToTop(scrollSignal);
  const [activeTab, setActiveTab] = useState('active');
  const jobsWithStatus = jobs.map(job => ({
    ...job,
    displayStatus: getWorkflowJobStatus(job.status, jobWorkflows[job.id]),
  }));
  const activeJobsList = jobsWithStatus.filter(job => job.displayStatus !== 'completed' && job.displayStatus !== 'scheduled');
  const completedJobs = jobsWithStatus.filter(job => job.displayStatus === 'completed');
  const tabs = [
    { key: 'active', label: `Active (${activeJobsList.length})` },
    { key: 'scheduled', label: `Scheduled (${scheduledJobs.length})` },
    { key: 'completed', label: `Completed (${Math.max(128, completedJobs.length)})` },
  ];

  const renderJobsPage = (tabKey) => {
    const pageJobs = tabKey === 'scheduled' ? scheduledJobs : tabKey === 'completed' ? completedJobs : activeJobsList;
    return (
      <View>
        <View style={styles.jobsStatsRow}>
          <JobMetric title="Today's Earnings" value="$423" meta="4 completed jobs" icon="wallet-outline" color="#F04416" />
          <JobMetric title="This Week" value="$1,247" meta="12 completed jobs" icon="stats-chart-outline" color="#17191D" />
          <JobMetric title="Rating" value="4.9" meta="Based on 128 reviews" icon="star" color="#FFC107" star />
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

        {tabKey === 'active' && (
          <>
            <View style={styles.jobsSectionHeaderAlt}>
              <Text style={styles.jobsSectionTitle}>Scheduled Jobs</Text>
            </View>
            <View style={styles.activeJobsList}>
              {scheduledJobs.slice(0, 1).map(job => <ScheduledJobCard key={job.id} job={job} onOpen={onOpen} />)}
            </View>
          </>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, styles.homeContainer]}
      contentContainerStyle={styles.jobsContent}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View style={styles.jobsHeader}>
        <Text style={styles.jobsTitle}>Jobs</Text>
        <TouchableOpacity style={styles.calendarBtn} activeOpacity={0.84}>
          <Ionicons name="calendar-outline" size={14} color="#17191D" />
          <Text style={styles.calendarText}>Calendar</Text>
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
          pagerStyle={styles.jobsSwipePager}
          pageStyle={styles.jobsSwipePage}
        >
          {renderJobsPage('active')}
          {renderJobsPage('scheduled')}
          {renderJobsPage('completed')}
        </SwipePager>
      </View>
    </ScrollView>
  );
}

function ActiveJobCard({ job, onOpen, completed }) {
  const status = job.displayStatus || job.status;
  const meta = getJobStatusMeta(status);
  const isInProgress = !completed;
  const accent = isInProgress ? (meta.color || '#F04416') : '#F04416';
  const vehicle = job.vehicle
    ? [job.vehicle.year, job.vehicle.make, job.vehicle.model].filter(Boolean).join(' ') || job.vehicle.make || 'Vehicle'
    : job.vehicleType || 'Vehicle';
  const note = getJobStatusNote(status, job);
  const distance = job.distance || (status === 'waiting_approval' ? '' : '6.2 mi');
  const payout = job.payment?.total ?? job.payment?.totalHeld ?? job.payment?.priceMin ?? 0;
  const priceLabel = payout ? `$${payout}` : 'TBD';

  return (
    <TouchableOpacity style={[styles.activeListCard, !isInProgress && styles.neutralListCard]} onPress={() => onOpen(job)} activeOpacity={0.86}>
      {isInProgress && <View style={[styles.activeListAccent, { backgroundColor: accent }]} />}
      <View style={styles.activeListIcon}>
        <Ionicons name={job.icon || job.service?.icon || 'briefcase-outline'} size={20} color={accent} />
      </View>
      <View style={styles.activeListInfo}>
        <Text style={[styles.activeListStatus, { color: accent }]}>{completed ? 'COMPLETED' : meta.label}</Text>
        <Text style={styles.activeListTitle} numberOfLines={1}>{job.service?.type || job.issue?.name || 'Service'}</Text>
        <Text style={styles.activeListVehicle} numberOfLines={1}>{vehicle}</Text>
        <Text style={styles.activeListAddress} numberOfLines={1}>{job.pickup?.address || job.selectedAddress || '—'}</Text>
      </View>
      <View style={styles.activeListAside}>
        <Text style={[styles.activeListPrice, { color: accent }]} numberOfLines={1}>{priceLabel}</Text>
        <View style={styles.activeListEtaRow}>
          <Ionicons name="time-outline" size={10} color={accent} style={styles.activeListEtaIcon} />
          <Text style={[styles.activeListEta, { color: accent }]} numberOfLines={1}>{completed ? 'Receipt ready' : note}</Text>
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
  return (
    <TouchableOpacity style={[styles.activeListCard, styles.neutralListCard]} onPress={() => onOpen(job)} activeOpacity={0.86}>
      <View style={styles.activeListIcon}>
        <Ionicons name={job.icon || job.service?.icon || 'calendar-outline'} size={20} color="#F04416" />
      </View>
      <View style={styles.activeListInfo}>
        <Text style={styles.neutralListStatus}>{job.time || 'SCHEDULED'}</Text>
        <Text style={styles.activeListTitle} numberOfLines={1}>{job.service?.type || 'Service'}</Text>
        <Text style={styles.activeListVehicle} numberOfLines={1}>{job.vehicle?.make || ''}{job.vehicle?.year ? ` - ${job.vehicle.year}` : ''}</Text>
        <Text style={styles.activeListAddress} numberOfLines={1}>{job.pickup?.address || '—'}</Text>
      </View>
      <View style={styles.activeListAside}>
        <Text style={styles.neutralListPrice} numberOfLines={1}>{payout ? `$${payout}` : 'TBD'}</Text>
        <View style={styles.activeListEtaRow}>
          <Ionicons name="time-outline" size={10} color="#F04416" style={styles.activeListEtaIcon} />
          <Text style={styles.neutralListEta} numberOfLines={1}>{job.eta || 'Scheduled'}</Text>
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
  jobsTabs: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F5F6F7', flexDirection: 'row', padding: 3, marginBottom: 12 },
  jobsTab: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  jobsTabText: { color: '#5E646D', fontSize: 11, fontWeight: '600' },
  jobsSwipePager: { minHeight: 640 },
  jobsSwipePage: { minHeight: 640 },
  jobsStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  jobsStatCard: { flex: 1, height: 82, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 9, justifyContent: 'space-between' },
  jobsStatTop: { minHeight: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  jobsStatIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  jobsStatTitle: { color: '#5E646D', fontSize: 8, lineHeight: 10, fontWeight: '700', flex: 1, minWidth: 0 },
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
  activeListStatus: { fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  activeListTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '800' },
  activeListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1 },
  activeListAddress: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 1 },
  activeListAside: { width: 80, flexShrink: 0, alignItems: 'flex-end' },
  activeListPrice: { fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 6, textAlign: 'right' },
  activeListEtaRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginBottom: 4 },
  activeListEtaIcon: { flexShrink: 0 },
  activeListEta: { fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0 },
  activeListDistance: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'right' },
  neutralListStatus: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  neutralListPrice: { color: '#F04416', fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 6, textAlign: 'right' },
  neutralListEta: { color: '#F04416', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, maxWidth: 88 },
  miniProgressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, position: 'relative', paddingTop: 1 },
  miniProgressTrack: { position: 'absolute', left: 25, right: 25, top: 7, height: 1, backgroundColor: '#E1E4E8' },
  miniProgressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  miniProgressDot: { width: 17, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8' },
  miniProgressText: { color: '#8B9098', fontSize: 7, lineHeight: 9, fontWeight: '600' },
  activeJobActionBtn: { flex: 1, height: 30, borderRadius: 8, borderWidth: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  activeJobActionText: { fontSize: 11, fontWeight: '700' },
});
