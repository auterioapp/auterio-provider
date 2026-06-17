import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

const API_URL = 'https://auterio-backend-production.up.railway.app/api';
const PROVIDER = {
  id: 'provider-demo-001',
  name: 'Alex',
  company: 'Auterio Provider',
  initials: 'AP',
  phone: '+15551234567',
  rating: 4.9,
  eta: '18-25 min',
};
const ACCEPT_BLUE = '#276EF1';
const TAB_BAR_PADDING = 8;
const TABS = [
  { key: 'home', screen: 'home', icon: 'home', label: 'Home' },
  { key: 'requests', screen: 'requests', icon: 'chatbox-outline', label: 'Requests' },
  { key: 'jobs', screen: 'jobs', icon: 'briefcase-outline', label: 'Jobs' },
  { key: 'earnings', icon: 'cash-outline', label: 'Earnings' },
  { key: 'profile', icon: 'person-outline', label: 'Profile' },
];
const REQUEST_ROUTE = [
  { latitude: 37.7694, longitude: -122.4862 },
  { latitude: 37.7608, longitude: -122.4350 },
  { latitude: 37.7912, longitude: -122.4098 },
];
const REQUEST_MAP_REGION = {
  latitude: 37.7756,
  longitude: -122.4475,
  latitudeDelta: 0.075,
  longitudeDelta: 0.085,
};

const activity = [
  { icon: 'wallet-outline', color: '#22C55E', title: 'Payment received', meta: 'Today, 8:45 AM', value: '$89.00' },
  { icon: 'star', color: '#FFC107', title: 'New 5-star review', meta: 'Great service! Very professional.', value: '5.0' },
  { icon: 'checkmark-done', color: '#2F80FF', title: 'Job completed', meta: 'Battery Replacement - Job #12341', value: '$125.00' },
];

const schedule = [
  { time: '10:30 AM', title: 'Battery Jump', vehicle: 'Toyota Camry', eta: 'In 15 min' },
  { time: '12:15 PM', title: 'Tire Change', vehicle: 'Honda Accord', eta: 'In 2h' },
  { time: '2:00 PM', title: 'Diagnostics', vehicle: 'BMW X5', eta: 'In 3h 45m' },
];

const demoRequests = [
  {
    id: 'demo-request-1',
    demo: true,
    accent: '#42D463',
    icon: 'battery-charging-outline',
    service: { issueName: 'Battery Jump' },
    vehicle: { make: 'Toyota Highlander', year: '2018' },
    pickup: { address: '123 Main St, San Francisco, CA' },
    payment: { totalHeld: 89 },
    eta: 'ETA 15 min',
    distance: '5.2 mi away',
  },
  {
    id: 'demo-request-2',
    demo: true,
    accent: '#FF9F1A',
    icon: 'car-sport-outline',
    service: { issueName: 'Towing' },
    vehicle: { make: 'Honda Civic', year: '2020' },
    pickup: { address: '456 Oak Ave, San Francisco, CA' },
    dropoff: { address: '789 Pine St, San Francisco, CA 94108' },
    payment: { totalHeld: 120 },
    eta: 'ETA 20 min',
    distance: '6.8 mi away',
  },
  {
    id: 'demo-request-3',
    demo: true,
    accent: '#A855F7',
    icon: 'construct-outline',
    service: { issueName: 'Tire Change' },
    vehicle: { make: 'Nissan Altima', year: '2019' },
    pickup: { address: '789 Pine St, San Francisco, CA' },
    payment: { totalHeld: 69 },
    eta: 'ETA 12 min',
    distance: '3.1 mi away',
  },
  {
    id: 'demo-request-4',
    demo: true,
    accent: '#2F80FF',
    icon: 'speedometer-outline',
    service: { issueName: 'Diagnostics' },
    vehicle: { make: 'BMW X5', year: '2017' },
    pickup: { address: '321 Elm St, San Francisco, CA' },
    payment: { totalHeld: 95 },
    eta: 'ETA 18 min',
    distance: '4.5 mi away',
  },
];

const demoJobs = [
  {
    id: 'job-12345',
    number: '12345',
    status: 'on_the_way',
    eta: '10:24 AM',
    accent: '#42D463',
    icon: 'battery-charging-outline',
    customer: { name: 'John Smith', initials: 'JS', phone: '(415) 555-0198' },
    service: { type: 'Battery Jump', icon: 'battery-charging-outline' },
    vehicle: { make: 'Toyota Highlander', year: '2018', color: 'White' },
    pickup: { address: '123 Main St, San Francisco, CA' },
    payment: { method: 'VISA', last4: '4242', total: 89 },
    customerNote: "Car won't start, lights are dim.",
    createdAt: 'Today, 9:15 AM',
  },
  {
    id: 'job-12346',
    number: '12346',
    status: 'arrived',
    eta: '12:30 PM',
    accent: '#FF9F1A',
    icon: 'car-sport-outline',
    customer: { name: 'Maria Garcia', initials: 'MG', phone: '(415) 555-0234' },
    service: { type: 'Towing', icon: 'car-sport-outline' },
    vehicle: { make: 'Honda Civic', year: '2020', color: 'Blue' },
    pickup: { address: '456 Oak Ave, San Francisco, CA' },
    dropoff: { address: '789 Pine St, San Francisco, CA 94108' },
    payment: { method: 'VISA', last4: '1234', total: 120 },
    customerNote: 'Car broke down on the highway.',
    createdAt: 'Today, 11:50 AM',
  },
  {
    id: 'job-12347',
    number: '12347',
    status: 'waiting_approval',
    eta: '12 min',
    accent: '#EAB308',
    icon: 'battery-charging-outline',
    customer: { name: 'David Lee', initials: 'DL', phone: '(415) 555-0312' },
    service: { type: 'Battery Replacement', icon: 'battery-charging-outline' },
    vehicle: { make: 'BMW X5', year: '2017', color: 'Black' },
    pickup: { address: '789 Pine St, San Francisco, CA' },
    payment: { method: 'Mastercard', last4: '5678', total: 180 },
    customerNote: 'Customer reviewing your estimate.',
    createdAt: 'Today, 1:30 PM',
  },
];

const JOB_STEPS = [
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On the way', icon: 'car-sport-outline' },
  { key: 'arrived', label: 'Arrived', icon: 'car-outline' },
  { key: 'inspection', label: 'Working', icon: 'construct-outline' },
  { key: 'completed', label: 'Complete', icon: 'checkmark-done-outline' },
];

const scheduledJobs = [
  {
    id: 'scheduled-1',
    number: '23001',
    status: 'scheduled',
    eta: 'In 2h 15m',
    time: '2:30 PM',
    accent: '#2F80FF',
    icon: 'calendar-outline',
    customer: { name: 'Rosa Carter', initials: 'RC', phone: '(415) 555-0147' },
    service: { type: 'Tire Change', icon: 'calendar-outline' },
    vehicle: { make: 'Nissan Altima', year: '2019', color: 'Gray' },
    pickup: { address: '321 Market St, San Francisco, CA' },
    payment: { method: 'VISA', last4: '8842', total: 69 },
    customerNote: 'Scheduled roadside tire change.',
    createdAt: 'Today, 2:30 PM',
  },
  {
    id: 'scheduled-2',
    number: '23002',
    status: 'scheduled',
    eta: 'Tomorrow',
    time: '9:00 AM',
    accent: '#2F80FF',
    icon: 'calendar-outline',
    customer: { name: 'Evan Brooks', initials: 'EB', phone: '(415) 555-0183' },
    service: { type: 'Diagnostics', icon: 'calendar-outline' },
    vehicle: { make: 'Ford Escape', year: '2021', color: 'Blue' },
    pickup: { address: '88 Mission St, San Francisco, CA' },
    payment: { method: 'VISA', last4: '3920', total: 95 },
    customerNote: 'Scheduled diagnostic appointment.',
    createdAt: 'Tomorrow, 9:00 AM',
  },
];

export default function App() {
  const [online, setOnline] = useState(true);
  const [activeScreen, setActiveScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [previewTab, setPreviewTab] = useState('home');
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [requestFilter, setRequestFilter] = useState('new');
  const [requests, setRequests] = useState([]);
  const [dismissedDemoIds, setDismissedDemoIds] = useState([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const requestAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;

  const visibleDemoRequests = demoRequests.filter(order => !dismissedDemoIds.includes(order.id));
  const dashboardRequests = requests.length ? requests : visibleDemoRequests;
  const activeJobs = useMemo(() => requests.filter(order => order.status && order.status !== 'pending').length + 3, [requests]);
  const featuredRequest = dashboardRequests[0];
  const pendingCount = dashboardRequests.length;
  const tabWidth = tabBarWidth ? (tabBarWidth - TAB_BAR_PADDING * 2) / TABS.length : 0;
  const isLightVisible = !!selectedRequest || (!selectedRequest && (activeScreen === 'home' || activeScreen === 'requests' || activeScreen === 'jobs'));

  useEffect(() => { loadRequests(); }, []);

  useEffect(() => {
    if (!featuredRequest) { requestAnim.setValue(0); return; }
    requestAnim.setValue(0);
    Animated.spring(requestAnim, { toValue: 1, tension: 74, friction: 10, useNativeDriver: true }).start();
  }, [featuredRequest?.id]);

  const loadRequests = async () => {
    try {
      const data = await fetchJson(`${API_URL}/orders?status=pending`);
      setRequests(Array.isArray(data) ? data.filter(o => !o.status || o.status === 'pending') : []);
    } catch (error) {
      console.log('Load requests error:', error.message);
    }
  };

  const acceptOrder = async (order) => {
    if (order.demo) { dismissRequest(order); return; }
    try {
      setAcceptingId(order.id);
      await fetchJson(`${API_URL}/orders/${order.id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: {
            id: PROVIDER.id, name: PROVIDER.company,
            type: order.provider?.type || 'Mobile Service Provider',
            phone: PROVIDER.phone, initials: PROVIDER.initials,
            rating: PROVIDER.rating, eta: PROVIDER.eta, color: '#FF6B00',
          },
        }),
      });
      await loadRequests();
    } catch (error) {
      console.log('Accept order error:', error.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const dismissRequest = (order) => {
    if (order.demo) { setDismissedDemoIds(c => [...c, order.id]); return; }
    setRequests(c => c.filter(item => item.id !== order.id));
  };

  const snapTabIndicator = (index) => {
    if (!tabWidth) return;
    Animated.spring(tabIndicatorX, {
      toValue: index * tabWidth,
      tension: 92,
      friction: 13,
      useNativeDriver: true,
    }).start();
  };

  const getTabIndexFromX = (x) => {
    if (!tabWidth) return TABS.findIndex(tab => tab.key === activeTab);
    const innerX = Math.max(0, Math.min(x - TAB_BAR_PADDING, tabWidth * TABS.length - 1));
    return Math.max(0, Math.min(TABS.length - 1, Math.floor(innerX / tabWidth)));
  };

  const moveIndicatorWithFinger = (x) => {
    if (!tabWidth) return;
    const maxX = (TABS.length - 1) * tabWidth;
    const nextX = Math.max(0, Math.min(x - TAB_BAR_PADDING - tabWidth / 2, maxX));
    tabIndicatorX.setValue(nextX);
  };

  const selectTabAt = (index) => {
    const tab = TABS[index] || TABS[0];
    setActiveTab(tab.key);
    setPreviewTab(tab.key);
    if (tab.screen) setActiveScreen(tab.screen);
    snapTabIndicator(index);
  };

  const previewTabTouch = (event) => {
    const x = event.nativeEvent.locationX;
    const index = getTabIndexFromX(x);
    setPreviewTab((TABS[index] || TABS[0]).key);
  };

  const moveTabTouch = (event) => {
    const x = event.nativeEvent.locationX;
    tabIndicatorX.stopAnimation();
    previewTabTouch(event);
    moveIndicatorWithFinger(x);
  };

  const releaseTabTouch = (event) => {
    selectTabAt(getTabIndexFromX(event.nativeEvent.locationX));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, isLightVisible && styles.homeSafe]} edges={['top', 'left', 'right']}>
        <StatusBar style={isLightVisible ? 'dark' : 'light'} backgroundColor={isLightVisible ? '#FFFFFF' : '#020C1A'} />

        {activeScreen === 'requests' ? (
          <RequestsScreen
            requests={dashboardRequests}
            acceptingId={acceptingId}
            filter={requestFilter}
            onFilterChange={setRequestFilter}
            onAccept={acceptOrder}
            onDecline={dismissRequest}
            onOpen={setSelectedRequest}
          />
        ) : activeScreen === 'jobs' ? (
          <JobsScreen jobs={demoJobs} onOpen={setSelectedJob} />
        ) : (
          <HomeScreen
            online={online}
            setOnline={setOnline}
            featuredRequest={featuredRequest}
            requestAnim={requestAnim}
            acceptingId={acceptingId}
            pendingCount={pendingCount}
            activeJobs={activeJobs}
            onAccept={acceptOrder}
            onDecline={dismissRequest}
            onOpenRequest={setSelectedRequest}
          />
        )}

        <View
          style={styles.tabBar}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setTabBarWidth(width);
            const index = Math.max(0, TABS.findIndex(tab => tab.key === activeTab));
            tabIndicatorX.setValue(index * ((width - TAB_BAR_PADDING * 2) / TABS.length));
          }}
          onStartShouldSetResponder={() => false}
          onMoveShouldSetResponder={() => true}
          onResponderMove={moveTabTouch}
          onResponderRelease={releaseTabTouch}
          onResponderTerminate={releaseTabTouch}
        >
          {!!tabWidth && (
            <Animated.View
              pointerEvents="none"
              style={[styles.tabIndicator, { width: tabWidth, transform: [{ translateX: tabIndicatorX }] }]}
            />
          )}
          {TABS.map((tab, index) => (
            <Tab
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              active={previewTab === tab.key}
              badge={tab.key === 'requests' ? pendingCount : tab.key === 'jobs' ? activeJobs : undefined}
              onPress={() => selectTabAt(index)}
              onPressIn={() => {
                setPreviewTab(tab.key);
                snapTabIndicator(index);
              }}
            />
          ))}
        </View>

        <Modal
          visible={!!selectedRequest}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedRequest(null)}
        >
          <View style={styles.requestModalOverlay}>
            <TouchableOpacity
              style={styles.requestModalBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedRequest(null)}
            />
            <View style={styles.requestModalSheet}>
              {!!selectedRequest && (
                <RequestDetailScreen
                  order={selectedRequest}
                  accepting={acceptingId === selectedRequest.id}
                  onBack={() => setSelectedRequest(null)}
                  onAccept={async (o) => { await acceptOrder(o); setSelectedRequest(null); }}
                  onDecline={(o) => { dismissRequest(o); setSelectedRequest(null); }}
                />
              )}
            </View>
          </View>
        </Modal>

        <Modal
          visible={!!selectedJob}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedJob(null)}
        >
          <View style={styles.requestModalOverlay}>
            <TouchableOpacity
              style={styles.requestModalBackdrop}
              activeOpacity={1}
              onPress={() => setSelectedJob(null)}
            />
            <View style={styles.requestModalSheet}>
              {!!selectedJob && (
                <JobPopupScreen
                  job={selectedJob}
                  onBack={() => setSelectedJob(null)}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function HomeScreen({ online, setOnline, featuredRequest, requestAnim, acceptingId, pendingCount, activeJobs, onAccept, onDecline, onOpenRequest }) {
  return (
    <ScrollView style={[styles.container, styles.homeContainer]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={[styles.title, styles.homeTitle]}>Dashboard</Text></View>
        <View style={styles.headerActions}>
          <View style={[styles.onlinePill, online && styles.onlinePillActive]}>
            <Text style={[styles.onlineText, online && styles.onlineTextActive]}>{online ? 'Online' : 'Offline'}</Text>
            <Switch value={online} onValueChange={setOnline} trackColor={{ false: '#E6E8EB', true: '#DEE0E3' }} thumbColor={online ? '#17191D' : '#8B9098'} style={styles.onlineSwitch} />
          </View>
          <TouchableOpacity style={styles.bellBtn} activeOpacity={0.84}>
            <Ionicons name="notifications-outline" size={22} color="#17191D" />
            {!!pendingCount && <View style={styles.badge}><Text style={styles.badgeText}>{pendingCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.greeting, styles.homeTitle]}>Good morning, {PROVIDER.name}</Text>
      <Text style={styles.subGreeting}>Here's what's happening with your business today.</Text>

      <View style={styles.metricsGrid}>
        <Metric title="Today's Revenue" value="$1,240.00" meta="12% vs yesterday" icon="cash-outline" color="#17191D" />
        <Metric title="Active Jobs" value={String(activeJobs)} meta="View ongoing jobs" icon="briefcase-outline" color="#F04416" />
        <Metric title="Pending Requests" value={String(pendingCount)} meta="View new requests" icon="receipt-outline" color="#17191D" />
        <Metric title="Jobs Completed" value="8" meta="2 vs yesterday" icon="checkmark-done" color="#F04416" />
      </View>

      {!!featuredRequest && (
        <IncomingRequest
          order={featuredRequest}
          accepting={acceptingId === featuredRequest.id}
          animation={requestAnim}
          onAccept={onAccept}
          onDecline={onDecline}
          onOpen={onOpenRequest}
        />
      )}

      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <Text style={styles.linkText}>View all</Text>
        </View>
        {schedule.map((item, index) => (
          <View key={item.time} style={[styles.scheduleRow, index < schedule.length - 1 && styles.rowBorder]}>
            <Text style={styles.timeText}>{item.time}</Text>
            <View style={styles.timelineDot} />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleTitle}>{item.title}</Text>
              <Text style={styles.scheduleVehicle}>{item.vehicle}</Text>
            </View>
            <Text style={styles.etaText}>{item.eta}</Text>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>Recent Activity</Text>
        {activity.map(item => (
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
        ))}
      </View>
    </ScrollView>
  );
}

function IncomingRequest({ order, accepting, animation, onAccept, onDecline, onOpen }) {
  const translateY = animation.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  const serviceMeta = getServiceMeta(order);
  const title = serviceMeta.title;
  const address = order.pickup?.address || 'Location pending';
  const vehicle = [order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ');

  return (
    <Animated.View style={[styles.incomingCard, { opacity: animation, transform: [{ translateY }] }]}>
      <TouchableOpacity onPress={() => onOpen && onOpen(order)} activeOpacity={0.88} style={{ marginBottom: 10 }}>
        <View style={styles.incomingTop}>
          <View style={styles.incomingLabelWrap}>
            <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
            <Text style={styles.incomingLabel}>New Request</Text>
          </View>
          <View style={styles.liveWrap}>
            <Text style={styles.justNow}>Just now</Text>
            <Ionicons name="radio-outline" size={18} color="#F04416" />
          </View>
          </View>
          <View style={styles.incomingBody}>
            <View style={styles.incomingIcon}>
            <Ionicons name={serviceMeta.icon} size={25} color="#17191D" />
          </View>
          <View style={styles.incomingInfo}>
            <Text style={styles.incomingTitle} numberOfLines={1}>{title}</Text>
            {!!vehicle && <Text style={styles.incomingVehicle} numberOfLines={1}>{vehicle}</Text>}
            <View style={styles.incomingMetaRow}>
              <Ionicons name="location-outline" size={15} color="#B7C1D7" />
              <Text style={styles.incomingMeta} numberOfLines={1}>{address}</Text>
            </View>
            <View style={styles.incomingMetaRow}>
              <Ionicons name="navigate-outline" size={15} color="#B7C1D7" />
              <Text style={styles.incomingMeta}>{order.distance || '5.2 mi away'}</Text>
            </View>
          </View>
          <View style={styles.incomingPriceBox}>
            <Text style={styles.incomingPrice}>{formatMoney(order)}</Text>
            <Text style={styles.incomingEta}>{order.eta || 'Est. 25 min'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.incomingActions}>
        <TouchableOpacity style={styles.reviewRequestBtn} onPress={() => onOpen && onOpen(order)} activeOpacity={0.84}>
          <Text style={styles.reviewRequestText}>Review request</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function RequestsScreen({ requests, acceptingId, filter, onFilterChange, onAccept, onDecline, onOpen }) {
  const acceptedCount = 2;
  const tabs = [
    { key: 'new', label: `New (${requests.length})` },
    { key: 'accepted', label: `Accepted (${acceptedCount})` },
    { key: 'declined', label: 'Declined' },
  ];

  return (
    <ScrollView style={[styles.container, styles.homeContainer]} contentContainerStyle={styles.requestsContent} showsVerticalScrollIndicator={false}>
      <View style={styles.requestsHeader}>
        <Text style={styles.requestsTitle}>Requests</Text>
        <TouchableOpacity style={styles.filterButton} activeOpacity={0.8}>
          <Text style={styles.filterText}>Filter</Text>
            <Ionicons name="filter-outline" size={20} color="#17191D" />
        </TouchableOpacity>
      </View>

      <View style={styles.requestTabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.requestTab, filter === tab.key && styles.requestTabActive]} onPress={() => onFilterChange(tab.key)} activeOpacity={0.8}>
            <Text style={[styles.requestTabText, filter === tab.key && styles.requestTabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {filter === 'new' ? (
        <View style={styles.requestList}>
          {requests.map(order => (
            <RequestCard
              key={order.id}
              order={order}
              accepting={acceptingId === order.id}
              onAccept={onAccept}
              onDecline={onDecline}
              onOpen={onOpen}
            />
          ))}
        </View>
      ) : (
        <View style={styles.requestEmptyState}>
          <Ionicons name={filter === 'accepted' ? 'checkmark-circle-outline' : 'close-circle-outline'} size={28} color="#7A8BA8" />
          <Text style={styles.requestEmptyText}>{filter === 'accepted' ? 'No accepted requests yet' : 'No declined requests yet'}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function RequestCard({ order, accepting, onAccept, onDecline, onOpen }) {
  const serviceMeta = getServiceMeta(order);
  const icon = serviceMeta.icon;
  const title = serviceMeta.title;
  const vehicle = getVehicleLabel(order);
  const location = getRequestLocation(order);
  const distance = getRequestDistance(order);

  return (
    <View style={styles.requestCard}>
      <TouchableOpacity onPress={() => onOpen && onOpen(order)} activeOpacity={0.88} style={styles.requestCardHit}>
        <View style={styles.requestListIcon}>
          <Ionicons name={icon} size={25} color="#17191D" />
        </View>
        <View style={styles.requestListInfo}>
          <Text style={styles.requestListTitle} numberOfLines={1}>{title}</Text>
          {!!vehicle && <Text style={styles.requestListVehicle} numberOfLines={1}>{vehicle}</Text>}
          <View style={styles.requestListMetaRow}>
            <Ionicons name="location-outline" size={15} color="#5E646D" />
            <Text style={styles.requestListMeta} numberOfLines={1}>{location}</Text>
          </View>
          <View style={styles.requestListMetaRow}>
            <Ionicons name="navigate-outline" size={15} color="#5E646D" />
            <Text style={styles.requestListMeta}>{distance}</Text>
          </View>
        </View>
        <View style={styles.requestListAside}>
          <Text style={styles.requestListPrice}>{formatMoney(order)}</Text>
          <View style={styles.requestListEtaPill}>
            <Text style={styles.requestListEtaText}>{order.eta || 'ETA 15 min'}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.incomingActions}>
        <TouchableOpacity style={styles.reviewRequestBtn} onPress={() => onOpen && onOpen(order)} activeOpacity={0.84}>
          <Text style={styles.reviewRequestText}>Review request</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function JobsScreen({ jobs, onOpen }) {
  const [activeTab, setActiveTab] = useState('active');
  const activeJobsList = jobs.filter(job => job.status !== 'completed' && job.status !== 'scheduled');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const tabs = [
    { key: 'active', label: `Active (${activeJobsList.length})` },
    { key: 'scheduled', label: `Scheduled (${scheduledJobs.length})` },
    { key: 'completed', label: `Completed (${Math.max(128, completedJobs.length)})` },
  ];
  const visibleJobs = activeTab === 'scheduled' ? scheduledJobs : activeTab === 'completed' ? completedJobs : activeJobsList;

  return (
    <ScrollView style={[styles.container, styles.homeContainer]} contentContainerStyle={styles.jobsContent} showsVerticalScrollIndicator={false}>
      <View style={styles.jobsHeader}>
        <Text style={styles.jobsTitle}>Jobs</Text>
        <TouchableOpacity style={styles.calendarBtn} activeOpacity={0.84}>
          <Ionicons name="calendar-outline" size={14} color="#17191D" />
          <Text style={styles.calendarText}>Calendar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.jobsTabs}>
        {tabs.map(tab => (
          <TouchableOpacity key={tab.key} style={[styles.jobsTab, activeTab === tab.key && styles.jobsTabActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.84}>
            <Text style={[styles.jobsTabText, activeTab === tab.key && styles.jobsTabActiveText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.jobsStatsRow}>
        <JobMetric title="Today's Earnings" value="$423" meta="4 completed jobs" icon="wallet-outline" color="#F04416" />
        <JobMetric title="This Week" value="$1,247" meta="12 completed jobs" icon="stats-chart-outline" color="#17191D" />
        <JobMetric title="Rating" value="4.9" meta="Based on 128 reviews" icon="star" color="#FFC107" star />
      </View>

      <View style={styles.jobsSectionHeader}>
        <Text style={styles.jobsSectionTitle}>{activeTab === 'scheduled' ? 'Scheduled Jobs' : activeTab === 'completed' ? 'Completed Jobs' : 'Active Jobs'}</Text>
        {activeTab === 'active' && <Text style={styles.jobsSortText}>Sort by: Status</Text>}
      </View>

      <View style={styles.activeJobsList}>
        {visibleJobs.length ? visibleJobs.map(job => (
          activeTab === 'scheduled'
            ? <ScheduledJobCard key={job.id} job={job} onOpen={onOpen} />
            : <ActiveJobCard key={job.id} job={job} onOpen={onOpen} completed={activeTab === 'completed'} />
        )) : (
          <View style={styles.requestEmptyState}>
            <Ionicons name="briefcase-outline" size={28} color="#7A8BA8" />
            <Text style={styles.requestEmptyText}>No jobs in this view</Text>
          </View>
        )}
      </View>

      {activeTab === 'active' && (
        <>
          <View style={styles.jobsSectionHeaderAlt}>
            <Text style={styles.jobsSectionTitle}>Scheduled Jobs</Text>
          </View>
          <View style={styles.activeJobsList}>
            {scheduledJobs.slice(0, 1).map(job => <ScheduledJobCard key={job.id} job={job} onOpen={onOpen} />)}
          </View>
        </>
      )}
    </ScrollView>
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

function ActiveJobCard({ job, onOpen, completed }) {
  const accent = '#F04416';
  const meta = getJobStatusMeta(job.status);
  const vehicle = `${job.vehicle.make} - ${job.vehicle.year}`;
  const note = job.status === 'waiting_approval' ? 'Waiting 12 min' : job.status === 'arrived' ? 'Waiting inspection' : '15 min to customer';

  return (
    <TouchableOpacity style={[styles.activeJobCard, { borderColor: accent + '50' }]} onPress={() => onOpen(job)} activeOpacity={0.86}>
      <View style={styles.activeJobTop}>
        <View style={styles.activeJobIcon}>
          <Ionicons name={job.icon || job.service.icon || 'briefcase-outline'} size={24} color={accent} />
        </View>
        <View style={styles.activeJobInfo}>
          <Text style={styles.activeJobTitle}>{job.service.type}</Text>
          <Text style={styles.activeJobVehicle}>{vehicle}</Text>
          <View style={styles.activeJobAddressRow}>
            <Ionicons name="location" size={12} color="#5E646D" />
            <Text style={styles.activeJobAddress} numberOfLines={1}>{job.pickup.address}</Text>
          </View>
        </View>
        <View style={styles.activeJobAside}>
          <View style={[styles.activeJobStatusPill, { backgroundColor: accent + '20' }]}>
            <Text style={[styles.activeJobStatusText, { color: accent }]}>{meta.label}</Text>
          </View>
          <Text style={[styles.activeJobPrice, { color: accent }]}>${job.payment.total}</Text>
          <Text style={styles.activeJobNote}>{note}</Text>
        </View>
      </View>

      {job.status !== 'waiting_approval' && <MiniJobProgress status={job.status} accent={accent} />}

      {job.status === 'waiting_approval' && (
        <View style={styles.waitingBanner}>
          <Ionicons name="time-outline" size={13} color={accent} />
          <Text style={styles.waitingBannerText}>Customer reviewing your estimate</Text>
        </View>
      )}

      <View style={styles.activeJobActions}>
        <JobAction label="View Details" icon="document-text-outline" color={accent} onPress={() => onOpen(job)} />
        <JobAction label={meta.actionLabel} icon={meta.actionIcon} color={accent} onPress={() => onOpen(job)} filled={job.status === 'arrived'} />
      </View>
    </TouchableOpacity>
  );
}

function MiniJobProgress({ status, accent }) {
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

function JobAction({ label, icon, color, onPress, filled }) {
  return (
    <TouchableOpacity style={[styles.activeJobActionBtn, { borderColor: color + '66' }, filled && { backgroundColor: color + '18' }]} onPress={onPress} activeOpacity={0.84}>
      {!!icon && <Ionicons name={icon} size={15} color={color} />}
      <Text style={[styles.activeJobActionText, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ScheduledJobCard({ job, onOpen }) {
  return (
    <TouchableOpacity style={styles.scheduledJobCard} onPress={() => onOpen(job)} activeOpacity={0.86}>
      <View style={styles.scheduledIcon}>
        <Ionicons name="calendar-outline" size={22} color="#F04416" />
      </View>
      <View style={styles.scheduledInfo}>
        <Text style={styles.scheduledTime}>{job.time}</Text>
        <Text style={styles.scheduledTitle}>{job.service.type}</Text>
        <Text style={styles.scheduledVehicle}>{job.vehicle.make} - {job.vehicle.year}</Text>
        <Text style={styles.scheduledAddress} numberOfLines={1}>{job.pickup.address}</Text>
      </View>
      <View style={styles.scheduledAside}>
        <View style={styles.scheduledPill}><Text style={styles.scheduledPillText}>SCHEDULED</Text></View>
        <Text style={styles.scheduledEta}>{job.eta}</Text>
        <Text style={styles.scheduledPay}>Estimated earnings ${job.payment.total}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7A8BA8" />
    </TouchableOpacity>
  );
}

function getJobProgressIndex(status) {
  if (status === 'accepted') return 0;
  if (status === 'on_the_way') return 1;
  if (status === 'arrived') return 2;
  if (status === 'inspection' || status === 'waiting_approval') return 3;
  if (status === 'completed') return 4;
  return 0;
}

function getJobStatusMeta(status) {
  if (status === 'arrived') return { label: 'ARRIVED', actionLabel: 'Start Inspection', actionIcon: 'construct-outline' };
  if (status === 'waiting_approval') return { label: 'WAITING APPROVAL', actionLabel: 'Message Customer', actionIcon: 'chatbubble-outline' };
  if (status === 'completed') return { label: 'COMPLETED', actionLabel: 'Receipt', actionIcon: 'receipt-outline' };
  return { label: 'ON THE WAY', actionLabel: 'Navigate', actionIcon: 'navigate-outline' };
}

function RequestDetailScreen({ order, accepting, onBack, onAccept, onDecline }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const accent = order.accent || '#42D463';
  const serviceMeta = getServiceMeta(order);
  const icon = serviceMeta.icon;
  const title = serviceMeta.title;
  const displayTitle = title;
  const vehicle = getVehicleLabel(order);
  const vehicleFallback = vehicle === 'Vehicle details pending' ? '' : vehicle;
  const displayVehicle = [order.vehicle?.year, order.vehicle?.make, order.vehicle?.model].filter(Boolean).join(' ') || vehicleFallback || '2020 Honda Civic';
  const address = order.pickup?.address || '456 Oak Ave, San Francisco, CA 94102';
  const dropoffAddress = getDropoffAddress(order);
  const payout = Number(order.payment?.totalHeld || order.payment?.total || 120);
  const platformFee = Math.max(8, Math.round(payout * 0.1));
  const net = Math.max(0, payout - platformFee);
  const requestNumber = order.number || String(order.id || '12346').replace(/\D/g, '').slice(-5) || '12346';
  const customerNote = order.orderContext?.customerNote || order.customerNote || 'Car broke down on the highway.';
  const rawCustomerFiles = order.orderContext?.files || order.files || order.photos || [
    { name: 'Front damage photo', type: 'image' },
    { name: 'Warning light photo', type: 'image' },
    { name: 'Customer note attachment', type: 'file' },
  ];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);
  const isTowing = isTowingService(order);
  const jobDetailRows = [
    { key: 'note', icon: 'chatbox-outline', color: '#2F80FF', label: 'Customer Note', value: customerNote, chevron: true, onPress: () => setNoteOpen(true) },
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
      >
        <View style={styles.requestSummaryCard}>
          <View style={styles.earningsMain}>
            <Text style={styles.earningsLabel}>ESTIMATED{`\n`}EARNINGS</Text>
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
            <Text style={styles.lockedContactText}>Contact available{`\n`}after acceptance</Text>
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
              <Text style={styles.requestSpecValue} numberOfLines={1}>{displayTitle}</Text>
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
          <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>20 min{`\n`}6.8 mi</Text></View>
        </View>

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>
          {jobDetailRows.map(row => (
            <RequestInfoRow
              key={row.key}
              icon={row.icon}
              color={row.color}
              label={row.label}
              value={row.value}
              chevron={row.chevron}
              onPress={row.onPress}
            />
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
            <Text style={styles.noteModalText}>{customerNote}</Text>
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

function RequestInfoRow({ icon, color, label, value, chevron, onPress }) {
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

function JobPopupScreen({ job, onBack }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [navigationChoiceOpen, setNavigationChoiceOpen] = useState(false);
  const currentStepIndex = getJobProgressIndex(job.status);
  const address = job.pickup?.address || 'Location pending';
  const isTowing = isTowingService(job);
  const dropoffAddress = getDropoffAddress(job);
  const vin = getVehicleVin(job);
  const phone = job.customer?.phone || '';
  const customerNote = job.customerNote || 'No note provided';
  const acceptedLabel = getAcceptedAtLabel(job);
  const rawCustomerFiles = job.orderContext?.files || job.files || job.photos || [
    { name: 'Inspection photo', type: 'image' },
    { name: 'Customer attachment', type: 'file' },
  ];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);
  const jobDetailsRows = [
    { key: 'note', icon: 'chatbox-outline', color: '#2F80FF', label: 'Customer Note', value: customerNote, chevron: true, onPress: () => setNoteOpen(true) },
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    { key: 'distance', icon: 'trail-sign-outline', color: '#42D463', label: 'Distance', value: job.distance || '5.2 mi away' },
    { key: 'payout', icon: 'cash-outline', color: '#EAB308', label: 'Est. Payout', value: `$${job.payment?.total || 0}` },
  ];
  const openNavigationApp = async (provider) => {
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
    setNavigationChoiceOpen(false);
    const canOpenApp = await Linking.canOpenURL(target.app);
    Linking.openURL(canOpenApp ? target.app : target.web);
  };

  if (routeOpen) {
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => setRouteOpen(false)} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="chevron-back" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[styles.requestHeaderIconBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobRouteContent} showsVerticalScrollIndicator={false}>
          <View style={styles.jobRouteMap}>
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
            <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>{job.eta || '15 min'}{`\n`}To customer</Text></View>
          </View>

          <View style={styles.jobCustomerCard}>
            <View style={styles.customerPopupAvatar}>
              <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
            </View>
            <View style={styles.customerPopupInfo}>
              <View style={styles.customerNameRatingRow}>
                <Text style={styles.customerPopupName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
                <View style={styles.customerRatingPill}>
                  <Ionicons name="star" size={11} color="#FFC107" />
                  <Text style={styles.customerRatingText}>4.9</Text>
                </View>
              </View>
              <View style={styles.customerTrustedLine}>
                <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
                <Text style={styles.customerTrustedText}>Verified & trusted</Text>
              </View>
            </View>
            <View style={styles.customerActionsDivider} />
            <View style={styles.customerPopupActions}>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call-outline" size={19} color="#F04416" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                <Ionicons name="chatbox-outline" size={19} color="#F04416" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.routeAddressCard}>
            <View style={styles.routeAddressIcon}>
              <Ionicons name="location-outline" size={20} color="#F04416" />
            </View>
            <View style={styles.routeAddressInfo}>
              <Text style={styles.routeAddressLabel}>Customer Location</Text>
              <Text style={styles.routeAddressText} numberOfLines={2}>{address}</Text>
            </View>
            <TouchableOpacity style={styles.navigateBtn} activeOpacity={0.84} onPress={() => setNavigationChoiceOpen(true)}>
              <Text style={styles.navigateBtnText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.routeBottomPanel}>
          <TouchableOpacity style={styles.arrivedRouteBtn} activeOpacity={0.86} onPress={() => setRouteOpen(false)}>
            <Text style={styles.arrivedRouteText}>Arrived</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={navigationChoiceOpen} transparent animationType="fade" onRequestClose={() => setNavigationChoiceOpen(false)}>
          <View style={styles.navChoiceOverlay}>
            <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setNavigationChoiceOpen(false)} />
            <View style={styles.navChoiceCard}>
              <View style={styles.navChoiceHeader}>
                <Text style={styles.navChoiceTitle}>Choose navigation</Text>
                <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setNavigationChoiceOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>
              {[
                { id: 'google', label: 'Google Maps', icon: 'map-outline' },
                { id: 'apple', label: 'Apple Maps', icon: 'navigate-outline' },
                { id: 'waze', label: 'Waze', icon: 'navigate-circle-outline' },
              ].map(option => (
                <TouchableOpacity key={option.id} style={styles.navChoiceRow} activeOpacity={0.84} onPress={() => openNavigationApp(option.id)}>
                  <Ionicons name={option.icon} size={20} color="#F04416" />
                  <Text style={styles.navChoiceText}>{option.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#8B9098" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.requestDetailShell}>
      <View style={styles.requestDetailHeader}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
          <Ionicons name="close" size={24} color="#17191D" />
        </TouchableOpacity>
        <View style={styles.jobPopupHeaderTextWrap}>
          <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
          <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
        </View>
        <View style={styles.requestHeaderIconBtn} />
      </View>

      <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobPopupContent} showsVerticalScrollIndicator={false}>
        <View style={styles.jobCustomerCard}>
          <View style={styles.customerPopupAvatar}>
            <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
          </View>
          <View style={styles.customerPopupInfo}>
            <View style={styles.customerNameRatingRow}>
              <Text style={styles.customerPopupName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
              <View style={styles.customerRatingPill}>
                <Ionicons name="star" size={11} color="#FFC107" />
                <Text style={styles.customerRatingText}>4.9</Text>
              </View>
            </View>
            <View style={styles.customerTrustedLine}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#F04416" />
              <Text style={styles.customerTrustedText}>Verified & trusted</Text>
            </View>
          </View>
          <View style={styles.customerActionsDivider} />
          <View style={styles.customerPopupActions}>
            <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Ionicons name="call-outline" size={19} color="#F04416" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.customerPopupActionBtn} activeOpacity={0.82} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
              <Ionicons name="chatbox-outline" size={19} color="#F04416" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.vehicleInfoCard}>
          <View style={styles.requestVehicleIcon}>
            <Ionicons name={job.service?.icon || job.icon || 'car-outline'} size={22} color="#F04416" />
          </View>
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceType} numberOfLines={2}>{job.vehicle?.year} {job.vehicle?.make} {job.vehicle?.model}</Text>
            <Text style={styles.serviceVehicle} numberOfLines={1}>{job.vehicle?.color || 'Color pending'}</Text>
            <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
              <Ionicons name="barcode-outline" size={13} color="#F04416" />
              <Text style={styles.verifiedTrusted} numberOfLines={1}>VIN {vin}</Text>
            </View>
          </View>
          <View style={styles.vehicleMetaBox}>
            <View style={styles.requestSpecRow}>
              <Text style={styles.requestSpecLabel}>Service Type</Text>
              <Text style={styles.requestSpecValue} numberOfLines={1}>{job.service?.type || 'Service'}</Text>
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
          <View style={styles.mapBubble}><Text style={styles.mapBubbleText}>{job.eta || '15 min'}{`\n`}On route</Text></View>
        </View>

        <View style={styles.jobProgressCard}>
          <JobStepper steps={JOB_STEPS} currentIndex={currentStepIndex} />
        </View>

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>
          {jobDetailsRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} chevron={row.chevron} onPress={row.onPress} />
          ))}
        </View>

        <TouchableOpacity style={styles.onTheWayBtn} activeOpacity={0.86} onPress={() => setRouteOpen(true)}>
          <Text style={styles.onTheWayText}>On the way</Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>

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
            <Text style={styles.noteModalText}>{customerNote}</Text>
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

function JobDetailScreen({ job, onBack }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(
    Math.max(0, JOB_STEPS.findIndex(s => s.key === 'on_the_way'))
  );
  const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => {
    setCurrentStepIndex(Math.max(0, JOB_STEPS.findIndex(s => s.key === 'on_the_way')));
  }, [job.id]);

  const isComplete = currentStepIndex >= JOB_STEPS.length - 1;
  const nextStep = JOB_STEPS[Math.min(currentStepIndex + 1, JOB_STEPS.length - 1)];
  const total = job.payment?.total || 0;
  const address = job.pickup?.address || 'Location pending';
  const isTowing = isTowingService(job);
  const dropoffAddress = getDropoffAddress(job);
  const jobDetailsRows = [
    { label: 'Service Type', value: job.service.type },
    { label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ label: 'Drop-off Location', value: dropoffAddress }] : []),
    { label: 'Payment Method', value: `${job.payment.method} - Card on file` },
    { label: 'Customer Note', value: job.customerNote },
    { label: 'Created', value: job.createdAt },
  ];

  const arrivedIndex = Math.max(0, JOB_STEPS.findIndex(s => s.key === 'arrived'));
  const isArrived = currentStepIndex >= arrivedIndex;
  const markArrived = () => setCurrentStepIndex(arrivedIndex);
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

      <ScrollView style={styles.container} contentContainerStyle={styles.jobContent} showsVerticalScrollIndicator={false}>
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
              <TouchableOpacity style={styles.callBtn} activeOpacity={0.8}>
                <Ionicons name="call" size={20} color="#42D463" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.msgBtn} activeOpacity={0.8}>
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

        <View style={styles.jobCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>
          {jobDetailsRows.map((row, index) => (
            <JobDetailRow key={row.label} label={row.label} value={row.value} last={index === jobDetailsRows.length - 1} />
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
            <Ionicons name={isArrived ? "checkmark" : "chevron-forward"} size={20} color="#fff" />
          </View>
          <View style={styles.actionSlideTextWrap}>
            <Text style={styles.actionSlideBtnTitle}>{isArrived ? 'Arrived' : "I've Arrived"}</Text>
            <Text style={styles.actionSlideBtnSub}>
              {isArrived ? 'You are at the location' : 'Confirm when you arrive at the location'}
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

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

function JobStepper({ steps, currentIndex }) {
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

function JobDetailRow({ label, value, last }) {
  return (
    <View style={[styles.jobDetailRow, !last && styles.jobDetailRowBorder]}>
      <Text style={styles.jobDetailLabel}>{label}</Text>
      <Text style={styles.jobDetailValue} numberOfLines={2}>{value}</Text>
    </View>
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

function Tab({ icon, label, active, badge, onPress, onPressIn }) {
  return (
    <TouchableOpacity style={styles.tabItem} onPress={onPress} onPressIn={onPressIn} activeOpacity={0.72}>
      <View>
        <Ionicons name={icon} size={24} color={active ? '#F04416' : '#17191D'} />
        {!!badge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function formatMoney(order) {
  const rawValue = order.pricing?.total ?? order.payment?.totalHeld ?? order.price ?? order.total ?? order.estimate ?? order.service?.price;
  if (typeof rawValue === 'number') return `$${Math.round(rawValue)}`;
  if (typeof rawValue === 'string' && rawValue.trim()) return rawValue.startsWith('$') ? rawValue : `$${rawValue}`;
  return '$89';
}

const SERVICE_TYPES = [
  { title: 'Towing', icon: 'car-sport-outline', matches: ['tow', 'towing', 'transport', 'flatbed', 'эваку'] },
  { title: 'Jump Start', icon: 'battery-charging-outline', matches: ['jump', 'jump start', 'battery jump', 'boost', 'start car', 'dead battery'] },
  { title: 'Battery Replacement', icon: 'battery-full-outline', matches: ['battery replacement', 'replace battery', 'new battery'] },
  { title: 'Tire Change', icon: 'disc-outline', matches: ['tire', 'tyre', 'flat', 'wheel', 'колес', 'шина'] },
  { title: 'Diagnostics', icon: 'speedometer-outline', matches: ['diagnostic', 'diagnostics', 'check engine', 'scan'] },
  { title: 'Mobile Mechanic', icon: 'construct-outline', matches: ['mechanic', 'repair', 'mobile service', 'fix', 'engine'] },
  { title: 'Lockout', icon: 'lock-open-outline', matches: ['lockout', 'locked', 'keys'] },
  { title: 'Fuel Delivery', icon: 'water-outline', matches: ['fuel', 'gas', 'petrol'] },
];

const DEMO_SERVICE_BY_ID = {
  9025: { title: 'Towing', icon: 'car-sport-outline' },
  4427: { title: 'Jump Start', icon: 'battery-charging-outline' },
  9462: { title: 'Tire Change', icon: 'disc-outline' },
};

const DEMO_REQUEST_DETAILS_BY_ID = {
  9025: { vehicle: 'Toyota Highlander - 2018', location: '123 Main St, San Francisco, CA', distance: '5.2 mi away' },
  4427: { vehicle: 'Honda Civic - 2020', location: '456 Oak Ave, San Francisco, CA', distance: '6.8 mi away' },
  9462: { vehicle: 'Nissan Altima - 2019', location: '789 Pine St, San Francisco, CA', distance: '3.1 mi away' },
};

const DEMO_VIN_BY_JOB_ID = {
  'job-12345': '5TDJZRFH8JS12345',
  'job-12346': '2HGFC2F59LH12346',
  'job-12347': '5UXKR0C54H012347',
};

function getServiceTitle(order) {
  return getServiceMeta(order).title;
}

function getServiceMeta(order) {
  const serviceText = getServiceTypeText(order);
  const matched = SERVICE_TYPES.find(type => type.matches.some(match => serviceText.includes(match)));
  if (matched) return { title: matched.title, icon: matched.icon };

  const explicitTitle = getRawServiceTitle(order);
  if (explicitTitle && explicitTitle.toLowerCase() !== 'service request') {
    return { title: explicitTitle, icon: order.icon || order.service?.icon || 'construct-outline' };
  }

  const demoService = DEMO_SERVICE_BY_ID[String(order.id || order.number || '')];
  if (demoService) return demoService;

  const requestNumber = order.number || order.id;
  return {
    title: requestNumber ? `Request #${requestNumber}` : 'New Request',
    icon: order.icon || order.service?.icon || 'receipt-outline',
  };
}

function getRawServiceTitle(order) {
  if (typeof order.service === 'string' && order.service.trim()) return order.service.trim();
  return (
    order.issueName ||
    order.serviceType ||
    order.serviceName ||
    order.requestedService ||
    order.recommendedService ||
    order.issue?.name ||
    order.issue?.title ||
    order.service?.type ||
    order.service?.issueName ||
    order.service?.recommendedService ||
    order.service?.name ||
    order.problem ||
    order.issue ||
    order.selectedProblem ||
    order.title ||
    ''
  );
}

function getServiceTypeText(order) {
  const rawService = [
    getRawServiceTitle(order),
    order.category,
    order.service?.category,
    order.service?.description,
    order.issue?.category,
    order.orderContext?.issue,
    order.orderContext?.problem,
    order.orderContext?.service,
    order.orderContext?.serviceType,
    order.orderContext?.recommendedService,
  ].filter(Boolean).join(' ');
  return String(rawService).trim().toLowerCase();
}

function isTowingService(order) {
  const serviceText = getServiceTypeText(order);
  return serviceText.includes('tow') || serviceText.includes('эваку') || serviceText.includes('буксир');
}

function getDropoffAddress(order) {
  return (
    (typeof order.dropoff === 'string' ? order.dropoff : '') ||
    order.dropoff?.address ||
    (typeof order.dropOff === 'string' ? order.dropOff : '') ||
    order.dropOff?.address ||
    (typeof order.destination === 'string' ? order.destination : '') ||
    order.destination?.address ||
    order.towDestination?.address ||
    order.service?.dropoffAddress ||
    order.service?.destinationAddress ||
    order.dropoffAddress ||
    order.destinationAddress ||
    'Drop-off location pending'
  );
}

function getDemoRequestDetails(order) {
  return DEMO_REQUEST_DETAILS_BY_ID[String(order.id || order.number || '')] || {};
}

function getRequestLocation(order) {
  const demo = getDemoRequestDetails(order);
  return (
    order.pickup?.address ||
    order.location?.address ||
    order.address ||
    order.selectedAddress ||
    order.orderContext?.location ||
    order.orderContext?.address ||
    demo.location ||
    'Location pending'
  );
}

function getRequestDistance(order) {
  const demo = getDemoRequestDetails(order);
  return order.distance || order.orderContext?.distance || demo.distance || 'Distance pending';
}

function getVehicleVin(job) {
  return job.vehicle?.vin || job.vin || DEMO_VIN_BY_JOB_ID[job.id] || 'VIN pending';
}

function getAcceptedAtLabel(job) {
  const rawValue = job.acceptedAt || job.createdAt || job.date;
  if (!rawValue) return 'Accepted today, 10:24 AM';
  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return `Accepted ${rawValue}`;
  return `Accepted ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function getVehicleLabel(order) {
  const demo = getDemoRequestDetails(order);
  const make = order.vehicle?.make;
  const model = order.vehicle?.model;
  const year = order.vehicle?.year;
  const label = [make, model].filter(Boolean).join(' ');
  if (label && year) return `${label} - ${year}`;
  if (label) return label;
  if (year) return `Vehicle - ${year}`;
  if (demo.vehicle) return demo.vehicle;
  return 'Vehicle details pending';
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (contentType.includes('application/json') && text) {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || message;
    } else if (text) {
      message = `${message} ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`;
    }
    throw new Error(message);
  }
  if (!text) return null;
  if (!contentType.includes('application/json')) throw new Error(`Expected JSON, received ${contentType || 'unknown content type'}`);
  return JSON.parse(text);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020C1A' },
  homeSafe: { backgroundColor: '#FFFFFF' },
  container: { flex: 1, backgroundColor: '#020C1A' },
  homeContainer: { backgroundColor: '#FFFFFF' },
  homeTitle: { color: '#17191D' },
  content: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112 },
  header: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { color: '#fff', fontSize: 26, lineHeight: 31, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  onlinePill: { height: 34, borderRadius: 17, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#E6E8EB', flexDirection: 'row', alignItems: 'center', paddingLeft: 11, paddingRight: 0 },
  onlinePillActive: { backgroundColor: '#F5F6F7', borderColor: '#DEE0E3' },
  onlineText: { color: '#8B9098', fontSize: 11, fontWeight: '700' },
  onlineTextActive: { color: '#17191D' },
  onlineSwitch: { transform: [{ scaleX: 0.62 }, { scaleY: 0.62 }], marginLeft: -5 },
  bellBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -5, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  greeting: { color: '#fff', fontSize: 19, lineHeight: 24, fontWeight: '700', marginBottom: 4 },
  subGreeting: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '500', marginBottom: 12 },
  incomingCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1.6, borderColor: 'rgba(240,68,22,0.42)', padding: 12, marginBottom: 10, shadowColor: '#F04416', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  incomingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  incomingLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 },
  newBadge: { height: 21, borderRadius: 11, backgroundColor: '#17191D', paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center' },
  newBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  incomingLabel: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  liveWrap: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  justNow: { color: '#5E646D', fontSize: 12, fontWeight: '700' },
  incomingBody: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  incomingIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  incomingInfo: { flex: 1, minWidth: 0 },
  incomingTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '700', marginBottom: 1 },
  incomingVehicle: { color: '#5E646D', fontSize: 11, fontWeight: '600', marginBottom: 3 },
  incomingMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  incomingMeta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600', flex: 1 },
  incomingPriceBox: { width: 58, alignItems: 'flex-end' },
  incomingPrice: { color: '#F04416', fontSize: 22, lineHeight: 26, fontWeight: '800' },
  incomingEta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '700', textAlign: 'right' },
  incomingActions: { flexDirection: 'row', gap: 8 },
  reviewRequestBtn: { flex: 1, height: 40, borderRadius: 20, backgroundColor: '#17191D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  reviewRequestText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  metricCard: { width: '48.75%', minHeight: 78, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', padding: 9 },
  metricCardCompact: { minHeight: 84 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  metricTitle: { color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', flex: 1 },
  metricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 20, lineHeight: 24, fontWeight: '800', marginBottom: 1 },
  metricMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  sectionCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', padding: 12, marginBottom: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '700' },
  linkText: { color: '#F04416', fontSize: 13, fontWeight: '800' },
  loadingBox: { minHeight: 84, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 7 },
  emptyText: { color: '#5E646D', fontSize: 12, fontWeight: '700' },
  scheduleRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  timeText: { width: 78, color: '#17191D', fontSize: 14, fontWeight: '600' },
  timelineDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F04416' },
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
  requestsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  requestsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  requestsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  filterButton: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E6E8EB', backgroundColor: '#F5F6F7', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12 },
  filterText: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  requestTabs: { height: 42, flexDirection: 'row', borderRadius: 21, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#ECEEF0', padding: 3, marginBottom: 12 },
  requestTab: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  requestTabActive: { backgroundColor: '#17191D' },
  requestTabText: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  requestTabTextActive: { color: '#FFFFFF' },
  requestList: { gap: 11 },
  requestCard: { borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1.6, borderColor: 'rgba(240,68,22,0.42)', padding: 12, shadowColor: '#F04416', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  requestCardHit: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  requestListIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  requestListInfo: { flex: 1, minWidth: 0 },
  requestListTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '700', marginBottom: 1 },
  requestListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', marginBottom: 3 },
  requestListMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  requestListMeta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600', flex: 1 },
  requestListAside: { width: 62, alignItems: 'flex-end' },
  requestListPrice: { color: '#F04416', fontSize: 22, lineHeight: 26, fontWeight: '800', marginBottom: 6 },
  requestListEtaPill: { minWidth: 62, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  requestListEtaText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  requestEmptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestEmptyText: { color: '#7A8BA8', fontSize: 13, fontWeight: '700' },
  requestModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  requestModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.42)' },
  requestModalSheet: { height: '88%', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 20, shadowOffset: { width: 0, height: -8 }, elevation: 18 },
  tabBar: { position: 'absolute', left: 22, right: 22, bottom: 14, height: 68, borderRadius: 34, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: 'rgba(255,255,255,0.86)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: TAB_BAR_PADDING, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  tabIndicator: { position: 'absolute', left: TAB_BAR_PADDING, top: 4, bottom: 4, borderRadius: 30, backgroundColor: '#DEE0E3' },
  tabItem: { flex: 1, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
  tabLabel: { color: '#17191D', fontSize: 12, lineHeight: 15, fontWeight: '500' },
  tabLabelActive: { color: '#F04416' },
  tabBadge: { position: 'absolute', top: -8, right: -11, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  jobListCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#07182B', borderWidth: 1, borderColor: '#17304E', borderRadius: 13, padding: 13 },
  jobListIconWrap: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  jobListInfo: { flex: 1, minWidth: 0 },
  jobListTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  jobListVehicle: { color: '#A8B3C8', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  jobListAddress: { color: '#7A8BA8', fontSize: 11, fontWeight: '600' },
  jobListAside: { alignItems: 'flex-end', gap: 8 },
  jobListPrice: { fontSize: 18, fontWeight: '800' },
  jobListStatusPill: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3 },
  jobListStatusText: { fontSize: 10, fontWeight: '700' },
  jobsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  jobsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  jobsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  calendarBtn: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E6E8EB', backgroundColor: '#F5F6F7', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  calendarText: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  jobsTabs: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F5F6F7', flexDirection: 'row', padding: 3, marginBottom: 12 },
  jobsTab: { flex: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  jobsTabActive: { backgroundColor: '#17191D' },
  jobsTabText: { color: '#5E646D', fontSize: 11, fontWeight: '600' },
  jobsTabActiveText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
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
  activeJobCard: { borderRadius: 8, borderWidth: 1, backgroundColor: '#F3F4F5', padding: 10, position: 'relative' },
  activeJobTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8 },
  activeJobIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  activeJobInfo: { flex: 1, minWidth: 0 },
  activeJobTitle: { color: '#17191D', fontSize: 15, lineHeight: 18, fontWeight: '700', marginBottom: 2 },
  activeJobVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', marginBottom: 2 },
  activeJobAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  activeJobAddress: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '500', flex: 1 },
  activeJobAside: { width: 102, alignItems: 'flex-end' },
  activeJobStatusPill: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, marginBottom: 4, maxWidth: 102 },
  activeJobStatusText: { fontSize: 8, fontWeight: '800', textAlign: 'center' },
  activeJobPrice: { fontSize: 19, lineHeight: 22, fontWeight: '800' },
  activeJobNote: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '500', textAlign: 'right' },
  miniProgressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, position: 'relative', paddingTop: 1 },
  miniProgressTrack: { position: 'absolute', left: 25, right: 25, top: 7, height: 1, backgroundColor: '#E1E4E8' },
  miniProgressItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  miniProgressDot: { width: 17, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8' },
  miniProgressText: { color: '#8B9098', fontSize: 7, lineHeight: 9, fontWeight: '600' },
  waitingBanner: { minHeight: 24, borderRadius: 7, backgroundColor: 'rgba(240,68,22,0.08)', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, marginBottom: 8 },
  waitingBannerText: { color: '#5E646D', fontSize: 10, fontWeight: '500' },
  activeJobActions: { flexDirection: 'row', gap: 7 },
  activeJobActionBtn: { flex: 1, height: 30, borderRadius: 8, borderWidth: 1, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  activeJobActionText: { fontSize: 11, fontWeight: '700' },
  scheduledJobCard: { minHeight: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  scheduledIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  scheduledInfo: { flex: 1, minWidth: 0 },
  scheduledTime: { color: '#F04416', fontSize: 10, lineHeight: 12, fontWeight: '700', marginBottom: 1 },
  scheduledTitle: { color: '#17191D', fontSize: 14, lineHeight: 17, fontWeight: '700' },
  scheduledVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '500' },
  scheduledAddress: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '500' },
  scheduledAside: { width: 98, alignItems: 'flex-end' },
  scheduledPill: { borderRadius: 7, backgroundColor: 'rgba(240,68,22,0.1)', paddingHorizontal: 7, paddingVertical: 3, marginBottom: 5 },
  scheduledPillText: { color: '#F04416', fontSize: 8, fontWeight: '800' },
  scheduledEta: { color: '#F04416', fontSize: 13, lineHeight: 16, fontWeight: '800' },
  scheduledPay: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '500', textAlign: 'right' },
  requestDetailShell: { flex: 1, backgroundColor: '#FFFFFF' },
  requestDetailHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 6, backgroundColor: '#FFFFFF' },
  requestHeaderIconBtn: { width: 42, height: 42, alignItems: 'flex-start', justifyContent: 'center' },
  requestHeaderMenuBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#F5F6F7', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  requestHeaderTitle: { position: 'absolute', left: 72, right: 72, bottom: 13, color: '#17191D', fontSize: 19, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  jobPopupHeaderTextWrap: { position: 'absolute', left: 72, right: 72, bottom: 10, alignItems: 'center' },
  jobPopupHeaderTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '700', textAlign: 'center' },
  jobPopupAcceptedText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', textAlign: 'center', marginTop: 1 },
  requestDetailScroll: { backgroundColor: '#FFFFFF' },
  requestDetailContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 12 },
  jobPopupContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 28 },
  requestSummaryCard: { height: 94, borderRadius: 8, borderWidth: 1.4, borderColor: 'rgba(240,68,22,0.34)', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'stretch', paddingVertical: 9, paddingHorizontal: 6, marginBottom: 10, overflow: 'hidden', shadowColor: '#F04416', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  earningsMain: { width: '26%', minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingLeft: 4, paddingRight: 4 },
  earningsLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginBottom: 5, letterSpacing: 0, textAlign: 'center' },
  earningsAmount: { color: '#F04416', fontSize: 20, lineHeight: 23, fontWeight: '800', textAlign: 'center' },
  netRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  earningsNet: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  earningsDivider: { width: 1, marginVertical: 0, backgroundColor: '#E1E4E8' },
  summaryMetaRow: { display: 'none' },
  summaryStatsPanel: { flex: 1, minWidth: 0, justifyContent: 'center', paddingHorizontal: 10 },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryFeesText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', textAlign: 'center' },
  earningStat: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 1 },
  earningStatDivider: { width: 1, height: 82, backgroundColor: '#E1E4E8' },
  earningStatValue: { color: '#17191D', fontSize: 13, lineHeight: 16, fontWeight: '700', textAlign: 'center' },
  earningStatLabel: { color: '#5E646D', fontSize: 9, lineHeight: 11, fontWeight: '600', textAlign: 'center' },
  etaCustomerBox: { width: 106, minWidth: 0, paddingLeft: 14, justifyContent: 'center', alignItems: 'stretch', gap: 9 },
  newRequestChip: { borderRadius: 8, backgroundColor: 'rgba(34,197,94,0.22)', paddingHorizontal: 9, paddingVertical: 6, alignItems: 'center' },
  newRequestChipText: { color: '#22C55E', fontSize: 12, lineHeight: 14, fontWeight: '800' },
  etaCustomerLabel: { color: '#5E646D', fontSize: 11, lineHeight: 13, fontWeight: '700' },
  etaCustomerValue: { color: '#F04416', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  verifiedCard: { height: 94, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  verifiedIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  verifiedInfo: { flex: 1, minWidth: 0 },
  verifiedTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginBottom: 3 },
  ratingLine: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 16, marginBottom: 3 },
  ratingScore: { color: '#FFB000', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  ratingJobs: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', flexShrink: 1 },
  trustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedTrustedLine: { minHeight: 16 },
  verifiedTrusted: { color: '#F04416', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  lockedContact: { width: 126, minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 7 },
  lockedContactText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', flex: 1, textAlign: 'center' },
  jobCustomerCard: { height: 94, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerPopupAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  customerPopupInitials: { color: '#17191D', fontSize: 14, fontWeight: '800' },
  customerPopupInfo: { flex: 1, minWidth: 0 },
  customerNameRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  customerPopupName: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', flexShrink: 1 },
  customerRatingPill: { height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, flexShrink: 0 },
  customerRatingText: { color: '#17191D', fontSize: 10, fontWeight: '800' },
  customerTrustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 16 },
  customerTrustedText: { color: '#F04416', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  customerActionsDivider: { width: 1, height: 48, backgroundColor: '#E1E4E8', marginHorizontal: 1 },
  customerPopupActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerPopupActionBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center' },
  vehicleInfoCard: { height: 94, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requestVehicleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  vehicleMetaBox: { width: 104, minHeight: 48, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 9, justifyContent: 'center' },
  requestSpecRow: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  requestSpecLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  requestSpecValue: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  difficultyDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFB000' },
  mapPreview: { height: 148, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  mapView: { ...StyleSheet.absoluteFillObject },
  mapStartMarker: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#17191D', borderWidth: 3, borderColor: '#FFFFFF' },
  mapEndMarker: { width: 32, height: 38, borderRadius: 16, backgroundColor: '#F04416', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  mapBubble: { position: 'absolute', left: '45%', top: 34, borderRadius: 8, backgroundColor: 'rgba(23,25,29,0.9)', paddingHorizontal: 8, paddingVertical: 6 },
  mapBubbleText: { color: '#FFFFFF', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  jobProgressCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, paddingHorizontal: 10, paddingTop: 12, paddingBottom: 10, marginBottom: 8 },
  onTheWayBtn: { height: 54, borderRadius: 10, backgroundColor: '#17191D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2, marginBottom: 8 },
  onTheWayText: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  jobRouteContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 104 },
  jobRouteMap: { height: 330, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 10, overflow: 'hidden', position: 'relative' },
  routeAddressCard: { minHeight: 76, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  routeAddressIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  routeAddressInfo: { flex: 1, minWidth: 0 },
  routeAddressLabel: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '700', marginBottom: 2 },
  routeAddressText: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  navigateBtn: { height: 38, borderRadius: 8, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  navigateBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  routeBottomPanel: { position: 'absolute', left: 10, right: 10, bottom: 28, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', padding: 10, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  arrivedRouteBtn: { height: 58, borderRadius: 10, backgroundColor: '#F04416', alignItems: 'center', justifyContent: 'center' },
  arrivedRouteText: { color: '#FFFFFF', fontSize: 17, lineHeight: 21, fontWeight: '800' },
  navChoiceOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  navChoiceBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.32)' },
  navChoiceCard: { borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 96, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  navChoiceHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  navChoiceTitle: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  navChoiceRow: { height: 48, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, marginTop: 8 },
  navChoiceText: { flex: 1, color: '#17191D', fontSize: 14, fontWeight: '700' },
  requestBriefCard: { backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', borderRadius: 8, padding: 12, marginBottom: 8 },
  requestInfoRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8', position: 'relative' },
  requestInfoIcon: { width: 25, height: 25, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  requestInfoLabel: { width: 104, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  requestInfoValue: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
  requestInfoChevron: { position: 'absolute', right: 0 },
  requestInfoValueNode: { flex: 1, alignItems: 'flex-end' },
  photoRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 5 },
  photoThumb: { width: 28, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8' },
  photoThumbDark: { width: 28, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center' },
  photoMore: { width: 31, height: 26, borderRadius: 6, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E1E4E8' },
  photoMoreText: { color: '#5E646D', fontSize: 10, fontWeight: '700' },
  noteModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  noteModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.32)' },
  noteModalCard: { borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 96, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  noteModalHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noteModalTitle: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '700' },
  noteCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  noteModalText: { color: '#17191D', fontSize: 14, lineHeight: 20, fontWeight: '500', marginBottom: 12 },
  noteFilesBlock: { borderTopWidth: 1, borderTopColor: '#ECEEF0', paddingTop: 11, gap: 8 },
  noteFilesTitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  noteFileRow: { minHeight: 38, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 },
  noteFileIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  noteFileName: { flex: 1, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
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
  jobHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#020C1A' },
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
  vehicleTrustedLine: { minHeight: 16 },
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
  jobActionRow: { flexDirection: 'row', gap: 11, marginBottom: 10 },
  reqDetailAside: { alignItems: 'flex-end', paddingTop: 2 },
  reqDetailPrice: { fontSize: 22, lineHeight: 26, fontWeight: '800', marginBottom: 6 },
  reqDetailEta: { color: '#B7C1D7', fontSize: 11, fontWeight: '700' },
  openNavBtn: { height: 62, borderRadius: 14, borderWidth: 1.5, borderColor: '#2F80FF', backgroundColor: 'rgba(47,128,255,0.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 },
  openNavBtnTitle: { color: '#2F80FF', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  openNavBtnSub: { color: '#7A8BA8', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  customerNotifiedBanner: { minHeight: 38, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(168,179,200,0.14)', backgroundColor: 'rgba(168,179,200,0.06)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 11, marginBottom: 10 },
  customerNotifiedText: { color: '#A8B3C8', fontSize: 11, lineHeight: 14, fontWeight: '600', flex: 1 },
  arrivedActionBtn: { height: 62, borderRadius: 15, backgroundColor: ACCEPT_BLUE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: ACCEPT_BLUE, shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  arrivedActionBtnDone: { backgroundColor: '#22C55E', shadowColor: '#22C55E' },
  arrivedActionText: { color: '#fff', fontSize: 17, lineHeight: 21, fontWeight: '800' },
  actionSlideBtn: { height: 70, borderRadius: 18, borderWidth: 1.5, borderColor: '#42D463', backgroundColor: '#061326', flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  actionSlidePill: { width: 70, height: 70, backgroundColor: '#42D463', alignItems: 'center', justifyContent: 'center' },
  actionSlidePillText: { color: '#fff', fontSize: 20, fontWeight: '900' },
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

