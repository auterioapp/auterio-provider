import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import SwipePager from '../components/SwipePager';
import { getServiceMeta, formatMoney, getVehicleLabel, getRequestLocation } from '../utils/serviceUtils';

export default function RequestsScreen({ requests, acceptingId, filter, onFilterChange, onAccept, onDecline, onOpen, allowScheduling, refreshControl, scrollSignal }) {
  const scrollRef = useScrollToTop(scrollSignal);
  const acceptedCount = 2;
  const tabs = [
    { key: 'new', label: `New (${requests.length})` },
    { key: 'accepted', label: `Accepted (${acceptedCount})` },
    { key: 'declined', label: 'Declined' },
  ];

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, styles.homeContainer]}
      contentContainerStyle={styles.requestsContent}
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
    >
      <View style={styles.requestsHeader}>
        <Text style={styles.requestsTitle}>Requests</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
          <Text style={styles.filterText}>Filter</Text>
          <Ionicons name="filter-outline" size={20} color="#17191D" />
        </TouchableOpacity>
      </View>

      <View>
        <SwipePager
          tabs={tabs}
          activeKey={filter}
          onChange={onFilterChange}
          tabBarStyle={styles.requestTabs}
          tabStyle={styles.requestTab}
          tabTextStyle={styles.requestTabText}
          pagerStyle={styles.requestsSwipePager}
          pageStyle={styles.requestsSwipePage}
        >
          <View style={styles.requestList}>
            {requests.map(order => (
              <RequestCard
                key={order.id}
                order={order}
                accepting={acceptingId === order.id}
                onAccept={onAccept}
                onDecline={onDecline}
                onOpen={onOpen}
                allowScheduling={allowScheduling}
              />
            ))}
          </View>
          <View style={styles.requestEmptyState}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#7A8BA8" />
            <Text style={styles.requestEmptyText}>No accepted requests yet</Text>
          </View>
          <View style={styles.requestEmptyState}>
            <Ionicons name="close-circle-outline" size={28} color="#7A8BA8" />
            <Text style={styles.requestEmptyText}>No declined requests yet</Text>
          </View>
        </SwipePager>
      </View>
    </ScrollView>
  );
}

function RequestCard({ order, accepting, onAccept, onDecline, onOpen, allowScheduling }) {
  const serviceMeta = getServiceMeta(order);
  const icon = serviceMeta.icon;
  const title = serviceMeta.title;
  const vehicle = getVehicleLabel(order);
  const location = getRequestLocation(order);

  return (
    <TouchableOpacity style={[styles.activeListCard, styles.neutralListCard, styles.requestCardWrap]} onPress={() => onOpen && onOpen(order)} activeOpacity={0.86}>
      <View style={styles.requestCardTop}>
        <View style={styles.activeListIcon}>
          <Ionicons name={icon} size={20} color="#F04416" />
        </View>
        <View style={styles.activeListInfo}>
          <Text style={styles.neutralListStatus}>NEW REQUEST</Text>
          <Text style={styles.activeListTitle} numberOfLines={1}>{title}</Text>
          {!!vehicle && <Text style={styles.activeListVehicle} numberOfLines={1}>{vehicle}</Text>}
          <Text style={styles.activeListAddress} numberOfLines={1}>{location}</Text>
        </View>
        <View style={styles.activeListAside}>
          <Text style={styles.neutralListPrice}>{formatMoney(order)}</Text>
          <View style={styles.activeListEtaRow}>
            <Ionicons name="time-outline" size={10} color="#F04416" style={styles.activeListEtaIcon} />
            <Text style={styles.neutralListEta} numberOfLines={1}>{order.eta || 'ETA 15 min'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardBtnRow}>
        <TouchableOpacity style={styles.cardBtnDecline} activeOpacity={0.82} onPress={(e) => { e.stopPropagation(); onDecline && onDecline(order); }}>
          <Text style={styles.cardBtnDeclineText}>Decline</Text>
        </TouchableOpacity>
        {allowScheduling && (
          <TouchableOpacity style={styles.cardBtnSchedule} activeOpacity={0.82} onPress={(e) => { e.stopPropagation(); onOpen && onOpen(order); }}>
            <Ionicons name="calendar-outline" size={14} color="#7C3AED" />
            <Text style={styles.cardBtnScheduleText}>Schedule</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cardBtnAccept} activeOpacity={0.82} onPress={(e) => { e.stopPropagation(); onAccept && onAccept(order); }}>
          <Text style={styles.cardBtnAcceptText}>{accepting ? 'Accepting…' : 'Accept'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020C1A' },
  homeContainer: { backgroundColor: '#FFFFFF' },
  requestsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  requestsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  requestsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  filterButton: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E6E8EB', backgroundColor: '#F5F6F7', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 },
  filterText: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  requestTabs: { height: 42, flexDirection: 'row', borderRadius: 21, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#ECEEF0', padding: 3, marginBottom: 12 },
  requestTab: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  requestTabText: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  requestsSwipePager: { minHeight: 520 },
  requestsSwipePage: { minHeight: 520 },
  requestList: { gap: 11 },
  requestEmptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestEmptyText: { color: '#7A8BA8', fontSize: 13, fontWeight: '700' },
  activeListCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', overflow: 'hidden', position: 'relative' },
  neutralListCard: {},
  requestCardWrap: { paddingTop: 10, paddingBottom: 0 },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingBottom: 10 },
  cardBtnRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#ECEEF0' },
  cardBtnDecline: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#ECEEF0' },
  cardBtnDeclineText: { color: '#EF4444', fontSize: 13, fontWeight: '700' },
  cardBtnSchedule: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 11, borderRightWidth: 1, borderRightColor: '#ECEEF0' },
  cardBtnScheduleText: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },
  cardBtnAccept: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#16A34A' },
  cardBtnAcceptText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  activeListIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  activeListInfo: { flex: 1, minWidth: 0 },
  activeListTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '800' },
  activeListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1 },
  activeListAddress: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 1 },
  activeListAside: { width: 98, maxWidth: 98, alignItems: 'flex-end', flexShrink: 0, overflow: 'hidden' },
  activeListEtaRow: { maxWidth: 98, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginBottom: 4, overflow: 'hidden' },
  activeListEtaIcon: { flexShrink: 0 },
  neutralListStatus: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  neutralListPrice: { color: '#F04416', fontSize: 20, lineHeight: 24, fontWeight: '800', marginBottom: 6, maxWidth: 98, textAlign: 'right' },
  neutralListEta: { color: '#F04416', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, maxWidth: 82 },
});
