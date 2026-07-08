import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, KeyboardAvoidingView, Linking, Modal, PanResponder, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import WelcomeScreen from './screens/WelcomeScreen';
import AuthScreen from './screens/AuthScreen';
import BusinessInfoScreen from './screens/BusinessInfoScreen';
import ProviderSetupScreen from './screens/ProviderSetupScreen';
import HomeScreen from './screens/HomeScreen';
import EarningsScreen from './screens/EarningsScreen';
import ProfileScreen from './screens/ProfileScreen';
import RequestsScreen from './screens/RequestsScreen';
import RequestDetailScreen, { RequestInfoRow } from './screens/RequestDetailScreen';
import ShopRequestDetailScreen from './screens/ShopRequestDetailScreen';
import { getServiceMode } from './utils/serviceUtils';
import JobsScreen from './screens/JobsScreen';
import JobDetailScreen, { JobStepper } from './screens/JobDetailScreen';
import { getJobProgressIndex } from './utils/jobUtils';
import { API_URL, PROVIDER, ACCEPT_BLUE, TAB_BAR_PADDING, TAB_INDICATOR_EXTRA_WIDTH, TAB_INDICATOR_DROP_SCALE, TABS, REQUEST_ROUTE, REQUEST_MAP_REGION, JOB_STEPS, ACTIVE_SHOP_STATUSES } from './constants';

import { formatMoney, getServiceMeta, getServiceTitle, getOrderServiceType, getServiceFlowSchema, getDiagnosisSchema, getProviderIntakeItems, isTowingService, getDropoffAddress, getRequestLocation, getRequestDistance, getVehicleVin, normalizeComplaintItem, getCustomerComplaintItems, getAcceptedAtLabel, getVehicleLabel, getBackendStatusFromWorkflowStage } from './utils/serviceUtils';
import { getRecommendedServicesFromDiagnosis, getDemoEstimate, getEstimateCatalog, getEstimatePriceCheck, sumAmounts, formatCurrency } from './utils/estimateUtils';
import { loadPricing, savePricing, DEFAULT_PRICING } from './utils/pricingStore';
import { setAuthFailureHandler as setApiAuthFailureHandler } from './apiClient';

const DEMO_EMAIL = 'auterioapp@gmail.com';

function applyProviderUser(user) {
  if (!user) return;
  if ((user.email || '').toLowerCase() === DEMO_EMAIL) return;
  if (user._id) PROVIDER.id = user._id;
  if (user.companyName) { PROVIDER.company = user.companyName; }
  if (user.name) PROVIDER.name = user.name;
  PROVIDER.initials = ((user.companyName || user.name) || 'P').slice(0, 2).toUpperCase();
  if (user.phone) PROVIDER.phone = user.phone;
}

Text.defaultProps = Text.defaultProps || {};
Text.defaultProps.allowFontScaling = false;

async function registerPushToken(providerId) {
  if (!Device.isDevice) return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    await fetchJson(`${API_URL}/profiles/${providerId}/push-token`, {
      method: 'PATCH',
      body: JSON.stringify({ pushToken }),
    });
  } catch (e) {
    console.log('Push token registration failed:', e.message);
  }
}


function normalizeOrderToJob(order) {
  const serviceMeta = getServiceMeta(order);
  const requestId = order.id || order._id || `local-${Date.now()}`;
  const number = order.number || String(requestId).replace(/\D/g, '').slice(-5) || '12345';
  const vehicleLabel = getVehicleLabel(order);
  const [fallbackMake, fallbackYear] = vehicleLabel.split(' - ');
  const customerName = order.customer?.name || order.contactInfo?.name || 'Customer';
  const initials = customerName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CU';
  const total = Number(order.payment?.total || order.payment?.totalHeld || order.payment?.priceMax || order.price || order.total || 89);

  return {
    ...order,
    id: requestId,
    number,
    status: order.status && order.status !== 'pending' ? order.status : 'accepted',
    eta: order.tracking?.eta || order.eta || '20-30 min',
    accent: order.accent || '#F04416',
    icon: order.icon || serviceMeta.icon,
    customer: {
      name: customerName,
      initials,
      phone: order.customer?.phone || order.contactInfo?.phone || '',
      email: order.customer?.email || order.contactInfo?.email || '',
    },
    service: {
      ...(order.service || {}),
      type: order.service?.type || serviceMeta.title,
      icon: order.service?.icon || serviceMeta.icon,
    },
    vehicle: {
      make: order.vehicle?.make || fallbackMake || 'Vehicle',
      model: order.vehicle?.model || '',
      year: order.vehicle?.year || fallbackYear || '',
      color: order.vehicle?.color || 'Color pending',
      vin: order.vehicle?.vin,
    },
    pickup: {
      ...(order.pickup || {}),
      address: order.pickup?.address || getRequestLocation(order),
    },
    payment: {
      ...(order.payment || {}),
      total,
    },
    customerNote: order.customerNote || order.orderContext?.customerNote || 'No note provided',
    createdAt: order.acceptedAt || order.createdAt || order.date || new Date().toISOString(),
  };
}

const DEMO_JOBS = [
  { id: 'demo-job-001', status: 'on_the_way', eta: '12 min', icon: 'car-outline', service: { type: 'Oil Change' }, vehicle: { year: '2021', make: 'Toyota', model: 'Camry' }, pickup: { address: '142 Maple St, Austin TX' }, payment: { total: 89 }, distance: '3.2 mi' },
  { id: 'demo-job-002', status: 'waiting_approval', icon: 'construct-outline', service: { type: 'Brake Inspection' }, vehicle: { year: '2019', make: 'Honda', model: 'Civic' }, pickup: { address: '78 Oak Ave, Austin TX' }, payment: { total: 210 }, distance: '1.8 mi' },
  { id: 'demo-job-003', status: 'inspection', icon: 'flash-outline', service: { type: 'Battery Replacement' }, vehicle: { year: '2020', make: 'Ford', model: 'F-150' }, pickup: { address: '500 Congress Ave, Austin TX' }, payment: { total: 145 }, distance: '5.1 mi' },
  { id: 'demo-job-004', status: 'scheduled', appointmentTime: 'Tomorrow, 10:00 AM', icon: 'calendar-outline', service: { type: 'Full Service' }, vehicle: { year: '2022', make: 'BMW', model: '3 Series' }, pickup: { address: '310 Lamar Blvd, Austin TX' }, payment: { total: 320 } },
  { id: 'demo-job-005', status: 'scheduled', appointmentTime: 'Thu, Jul 10 · 2:00 PM', icon: 'calendar-outline', service: { type: 'Tire Rotation' }, vehicle: { year: '2018', make: 'Chevrolet', model: 'Silverado' }, pickup: { address: '900 S 1st St, Austin TX' }, payment: { total: 60 } },
  { id: 'demo-job-006', status: 'completed', icon: 'checkmark-circle-outline', service: { type: 'AC Diagnostics' }, vehicle: { year: '2017', make: 'Nissan', model: 'Altima' }, pickup: { address: '25 W 6th St, Austin TX' }, payment: { total: 175 }, distance: '2.4 mi' },
  { id: 'demo-job-007', status: 'completed', icon: 'checkmark-circle-outline', service: { type: 'Engine Tune-Up' }, vehicle: { year: '2016', make: 'Hyundai', model: 'Elantra' }, pickup: { address: '602 E 11th St, Austin TX' }, payment: { total: 230 }, distance: '4.0 mi' },
];

export default function App() {
  const [authState, setAuthState] = useState('loading');
  const pendingBusinessType = useRef('mobile');
  const pendingCredentials = useRef(null);
  const [businessInfoLoading, setBusinessInfoLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [activeScreen, setActiveScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [previewTab, setPreviewTab] = useState('home');
  const [screenResetNonce, setScreenResetNonce] = useState(0);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [requestFilter, setRequestFilter] = useState('new');
  const [requests, setRequests] = useState([]);
  const [requestsLoaded, setRequestsLoaded] = useState(false);
  const [acceptedJobs, setAcceptedJobs] = useState([]);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState([]);
  const dismissedRealIdsRef = useRef([]);
  const [acceptingId, setAcceptingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [providerType, setProviderType] = useState('mobile');
  const providerTypeRef = useRef('mobile');
  const [counterModalOrder, setCounterModalOrder] = useState(null);
  const [declineModalOrder, setDeclineModalOrder] = useState(null);
  const [allowScheduling, setAllowScheduling] = useState(false);
  const [appointmentOrder, setAppointmentOrder] = useState(null);
  const [jobWorkflows, setJobWorkflows] = useState({});
  const [toastMsg, setToastMsg] = useState(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);
  const requestAnim = useRef(new Animated.Value(0)).current;
  const tabIndicatorX = useRef(new Animated.Value(0)).current;
  const tabIndicatorDrop = useRef(new Animated.Value(1)).current;
  const tabDragIndex = useRef(null);
  const tabIsDragging = useRef(false);
  const tabBarRef = useRef(null);
  const tabBarPageX = useRef(0);
  const tabIndicatorPosition = useRef(0);
  const tabIndicatorTarget = useRef(0);
  const tabDragFrame = useRef(null);

  const dashboardRequests = requests;
  const providerJobs = useMemo(() => isDemo ? [...DEMO_JOBS, ...acceptedJobs] : acceptedJobs, [acceptedJobs, isDemo]);
  const activeJobs = useMemo(() => providerJobs.filter(job =>
    ACTIVE_SHOP_STATUSES.includes(job.shopStatus) ||
    (job.status !== 'completed' && job.status !== 'scheduled' && job.status !== 'confirmed' && job.status !== 'proposed')
  ).length, [providerJobs]);
  const pendingCount = dashboardRequests.length;
  const tabWidth = tabBarWidth ? (tabBarWidth - TAB_BAR_PADDING * 2) / TABS.length : 0;
  const isLightVisible = !!selectedRequest || (!selectedRequest && (activeScreen === 'home' || activeScreen === 'requests' || activeScreen === 'jobs' || activeScreen === 'earnings' || activeScreen === 'profile'));

  const [isDemo, setIsDemo] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [profileComplete, setProfileComplete] = useState(false);
  const profileCompleteRef = useRef(false);
  const reminderIndexRef = useRef(0);

  const PROFILE_REMINDER_MESSAGES = [
    'Almost there! Add your services to start receiving orders.',
    'Set your working hours and unlock incoming requests.',
    'Complete your profile — providers earn more with a full setup.',
    'Finish setup in under 2 minutes and get your first order today.',
  ];

  useEffect(() => {
    if (profileCompleteRef.current || isDemo) return;
    const interval = setInterval(() => {
      if (profileCompleteRef.current || isDemo) return;
      const msg = PROFILE_REMINDER_MESSAGES[reminderIndexRef.current % PROFILE_REMINDER_MESSAGES.length];
      reminderIndexRef.current += 1;
      showToast(msg);
    }, 20 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isDemo]);

  const loadProviderJobsFromBackend = async (providerId) => {
    try {
      const data = await fetchJson(`${API_URL}/orders/provider/${providerId}`);
      if (!Array.isArray(data)) return;
      const active = data.filter(o =>
        ['accepted', 'confirmed', 'scheduled', 'en_route', 'arrived', 'estimate_sent', 'estimate_approved', 'in_progress'].includes(o.status)
      );
      const done = data.filter(o => o.status === 'completed');
      if (active.length > 0) {
        setAcceptedJobs(active.map(o => normalizeOrderToJob(o)));
        setAcceptedRequestIds(active.map(o => String(o.id || o._id)));
      }
      setCompletedOrders(done);
    } catch (e) {
      console.log('Load provider jobs error:', e.message);
    }
  };

  useEffect(() => {
    const init = async () => {
      // Migrate token from AsyncStorage to SecureStore (one-time, for existing users)
      const legacy = await AsyncStorage.getItem('providerToken').catch(() => null);
      if (legacy) {
        await SecureStore.setItemAsync('providerToken', legacy).catch(() => {});
        await AsyncStorage.removeItem('providerToken').catch(() => {});
      }

      const [token, refreshTok, entries] = await Promise.all([
        SecureStore.getItemAsync('providerToken'),
        SecureStore.getItemAsync('providerRefreshToken'),
        AsyncStorage.multiGet(['providerUser', '@setup_completed_v1', '@provider_verification_status']),
      ]);
      return { token, refreshTok, entries };
    };

    init().then(async ({ token, refreshTok, entries }) => {
      const user = entries[0][1] ? JSON.parse(entries[0][1]) : null;
      const setupDone = entries[1][1] === 'true';
      const savedStatus = entries[2][1] || 'unverified';
      if (token) {
        _authToken = token;
        _refreshToken = refreshTok || null;
        _onAuthFailure = handleLogout;
        applyProviderUser(user);
        const demo = PROVIDER.id === 'provider-demo-001';
        setIsDemo(demo);
        setVerificationStatus(demo ? 'verified' : savedStatus);
        let serverSetupDone = false;
        if (!demo) {
          try {
            const profile = await fetchJson(`${API_URL}/profiles/${PROVIDER.id}`);
            const businessName = (profile?.businessName || profile?.name || '').trim();
            if (businessName) {
              PROVIDER.company = businessName;
              PROVIDER.initials = businessName.slice(0, 2).toUpperCase();
            }
            if (profile?.contactName) PROVIDER.name = profile.contactName;
            serverSetupDone = profile?.setupCompleted === true;
          } catch {}
          loadProviderJobsFromBackend(PROVIDER.id);
          registerPushToken(PROVIDER.id);
        }
        setAuthState(demo || setupDone || serverSetupDone ? 'app' : 'setup');
      } else {
        setAuthState('welcome');
      }
    });
  }, []);

  const handleLogin = async (token, refreshTok, user, isRegister) => {
    _authToken = token || 'logged_in';
    _refreshToken = refreshTok || null;
    _onAuthFailure = handleLogout;
    await SecureStore.setItemAsync('providerToken', _authToken);
    if (refreshTok) await SecureStore.setItemAsync('providerRefreshToken', refreshTok);
    if (user) await AsyncStorage.setItem('providerUser', JSON.stringify(user));
    if (isRegister) {
      // Fresh account — wipe all previous user's local data before applying new user
      PROVIDER.id = 'provider-demo-001';
      PROVIDER.company = 'Auterio Provider';
      PROVIDER.name = 'Alex';
      PROVIDER.initials = 'AP';
      setProfileComplete(false);
      profileCompleteRef.current = false;
      await Promise.all([
        AsyncStorage.removeItem('@setup_completed_v1'),
        AsyncStorage.removeItem('@provider_verification_status'),
        AsyncStorage.removeItem('@warranty_policy'),
        AsyncStorage.removeItem('@service_radius'),
        savePricing({
          ...DEFAULT_PRICING,
          providerType: pendingBusinessType.current || 'mobile',
          businessName: user?.companyName || user?.name || '',
        }),
      ]);
    }
    applyProviderUser(user);
    const demo = PROVIDER.id === 'provider-demo-001';
    setIsDemo(demo);
    setVerificationStatus(demo ? 'verified' : 'unverified');
    if (!demo) {
      loadProviderJobsFromBackend(PROVIDER.id);
      registerPushToken(PROVIDER.id);
      // Ensure provider profile exists in DB (creates it if new), then sync name
      const profileName = (user?.companyName || user?.name || '').trim();
      fetchJson(`${API_URL}/profiles/${PROVIDER.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(profileName ? {
            name: profileName,
            businessName: profileName,
            contactName: user?.name || '',
            businessKind: user?.businessKind || 'company',
            initials: profileName.slice(0, 2).toUpperCase(),
          } : {}),
        }),
      }).catch(() => {});
    }
    if (demo) {
      setAuthState('app');
    } else {
      const setupDone = await AsyncStorage.getItem('@setup_completed_v1');
      let serverSetupDone = false;
      try {
        const profile = await fetchJson(`${API_URL}/profiles/${PROVIDER.id}`);
        serverSetupDone = profile?.setupCompleted === true;
      } catch {}
      setAuthState(isRegister || (setupDone !== 'true' && !serverSetupDone) ? 'setup' : 'app');
    }
  };

  const handleLogout = async () => {
    _authToken = null;
    _refreshToken = null;
    _onAuthFailure = null;
    setIsDemo(false);
    setVerificationStatus('unverified');
    setCompletedOrders([]);
    setAcceptedJobs([]);
    setAcceptedRequestIds([]);
    setProfileComplete(false);
    profileCompleteRef.current = false;
    PROVIDER.id = 'provider-demo-001';
    PROVIDER.company = 'Auterio Provider';
    PROVIDER.name = 'Alex';
    PROVIDER.initials = 'AP';
    await Promise.all([
      SecureStore.deleteItemAsync('providerToken'),
      SecureStore.deleteItemAsync('providerRefreshToken'),
      AsyncStorage.removeItem('providerUser'),
      AsyncStorage.removeItem('@setup_completed_v1'),
      AsyncStorage.removeItem('@provider_verification_status'),
      AsyncStorage.removeItem('@warranty_policy'),
      AsyncStorage.removeItem('@service_radius'),
      savePricing({ ...DEFAULT_PRICING }),
    ]);
    setAuthState('welcome');
  };

  const beginProviderRegistration = async (credentials) => {
    pendingCredentials.current = credentials;
    setAuthState('business-info');
  };

  const completeProviderRegistration = async ({ kind, businessName, name }) => {
    const credentials = pendingCredentials.current;
    if (!credentials) {
      setAuthState('register');
      return;
    }
    setBusinessInfoLoading(true);
    try {
      const isEmail = credentials.loginValue.includes('@');
      const displayBusinessName = kind === 'individual' ? name : businessName;
      const response = await fetch(`${API_URL}/auth/register-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isEmail ? credentials.loginValue : undefined,
          phone: isEmail ? undefined : credentials.loginValue,
          password: credentials.password,
          contactName: name,
          companyName: displayBusinessName,
          businessKind: kind,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create account');
      pendingCredentials.current = null;
      await handleLogin(data.token, data.refreshToken, data.user, true);
    } catch (error) {
      Alert.alert('Registration failed', error.message || 'Please try again.');
    } finally {
      setBusinessInfoLoading(false);
    }
  };

  useEffect(() => {
    setApiAuthFailureHandler(handleLogout);
    return () => setApiAuthFailureHandler(null);
  }, []);

  useEffect(() => {
    if (authState !== 'app') return;
    loadPricing().then(p => {
      const pt = p.providerType || 'mobile';
      setProviderType(pt);
      providerTypeRef.current = pt;
      const scheduling = pt === 'shop' ? true : pt === 'mobile' ? false : (p.allowScheduling ?? false);
      setAllowScheduling(scheduling);
      loadRequests();
    });
    if (!isDemo) {
      fetchJson(`${API_URL}/profiles/${PROVIDER.id}`)
        .then(data => {
          const businessName = (data?.businessName || data?.name || '').trim();
          if (businessName) {
            PROVIDER.company = businessName;
            PROVIDER.initials = businessName.slice(0, 2).toUpperCase();
            loadPricing().then(current => savePricing({ ...current, businessName }));
          }
          if (data?.contactName) PROVIDER.name = data.contactName;
          if (data?.verificationStatus) {
            setVerificationStatus(data.verificationStatus);
            AsyncStorage.setItem('@provider_verification_status', data.verificationStatus);
          }
        })
        .catch(() => {});
    }
  }, [authState]);

  useEffect(() => {
    if (activeScreen !== 'profile') {
      loadPricing().then(p => {
        const pt = p.providerType || 'mobile';
        setProviderType(pt);
        providerTypeRef.current = pt;
        const scheduling = pt === 'shop' ? true : pt === 'mobile' ? false : (p.allowScheduling ?? false);
        setAllowScheduling(scheduling);
      });
    }
  }, [activeScreen]);

  useEffect(() => {
    if (!dashboardRequests.length) { requestAnim.setValue(0); return; }
    requestAnim.setValue(0);
    Animated.spring(requestAnim, { toValue: 1, tension: 74, friction: 10, useNativeDriver: true }).start();
  }, [dashboardRequests.length > 0]);

  const loadRequests = async () => {
    if (verificationStatus === 'unverified') { setRequests([]); return; }
    const type = providerTypeRef.current;
    const isMobile = type === 'mobile' || type === 'both';
    const isShop = type === 'shop' || type === 'both';
    try {
      const [availableData, scheduledPendingData, scheduledData] = await Promise.all([
        isMobile ? fetchJson(`${API_URL}/orders/provider/available?providerId=${PROVIDER.id}`) : Promise.resolve([]),
        isShop   ? fetchJson(`${API_URL}/orders?status=scheduled_pending`)                     : Promise.resolve([]),
        isShop   ? fetchJson(`${API_URL}/orders?status=scheduled`)                             : Promise.resolve([]),
      ]);

      const dismissed = dismissedRealIdsRef.current;

      const onDemandOrders = isMobile && Array.isArray(availableData)
        ? availableData.filter(o =>
            o.status === 'pending' &&
            !acceptedRequestIds.includes(String(o.id || o._id)) &&
            !dismissed.includes(String(o.id || o._id))
          )
        : [];

      const bookingOrders = isShop && Array.isArray(scheduledPendingData)
        ? scheduledPendingData.filter(o =>
            o.status === 'scheduled_pending' &&
            String(o.provider?.id) === String(PROVIDER.id) &&
            !dismissed.includes(String(o.id || o._id))
          )
        : [];

      const scheduledOrders = isShop && Array.isArray(scheduledData)
        ? scheduledData.filter(o =>
            o.status === 'scheduled' &&
            !dismissed.includes(String(o.id || o._id))
          ).map(o => ({ ...o, isScheduledRequest: true }))
        : [];

      const all = [...bookingOrders, ...scheduledOrders, ...onDemandOrders].sort((a, b) => {
        const aTime = new Date(a.createdAt || a.date || 0).getTime() || 0;
        const bTime = new Date(b.createdAt || b.date || 0).getTime() || 0;
        return bTime - aTime;
      });
      setRequests(all);
    } catch (error) {
      console.log('Load requests error:', error.message);
    } finally {
      setRequestsLoaded(true);
    }
  };

  useEffect(() => {
    if (!online || verificationStatus === 'unverified') {
      if (verificationStatus === 'unverified') setRequests([]);
      return undefined;
    }
    const timer = setInterval(loadRequests, 3000);
    return () => clearInterval(timer);
  }, [online, acceptedRequestIds, verificationStatus]);

  useEffect(() => {
    if (isDemo) return;
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.type === 'proposal_accepted' && data?.orderId) {
        setAcceptedJobs(current => current.map(job =>
          String(job.id) === String(data.orderId) ? { ...job, status: 'scheduled' } : job
        ));
        showToast('Customer accepted your proposal!');
      }
      if (data?.type === 'estimate_approved' && data?.orderId) {
        setAcceptedJobs(current => current.map(job =>
          String(job.id) === String(data.orderId) ? { ...job, shopStatus: 'in_progress' } : job
        ));
        showToast('Customer approved the estimate!');
      }
    });
    return () => subscription.remove();
  }, [isDemo]);

  const updateShopStep = (order, newShopStatus, extra = {}) => {
    setAcceptedJobs(current => current.map(job =>
      String(job.id) === String(order.id)
        ? { ...job, shopStatus: newShopStatus, ...extra }
        : job
    ));
    const orderId = order.id || order._id;
    const isReal = orderId && !String(orderId).startsWith('demo');
    if (newShopStatus === 'checked_in' && isReal) {
      fetchJson(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'arrived' }),
      }).catch(e => console.log('Check-in sync error:', e.message));
    } else if (newShopStatus === 'waiting_approval' && extra?.estimate) {
      const { labor = 0, parts = 0, laborSubtotal = 0, partsSubtotal = 0, subtotal = 0, tax = 0, total = 0, note = '' } = extra.estimate;
      if (isReal) {
        fetchJson(`${API_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'estimate_sent',
            estimate: { labor, parts, laborSubtotal, partsSubtotal, subtotal, tax, total, note },
          }),
        }).catch(e => console.log('Estimate sync error:', e.message));
      }
      showToast('Estimate sent to customer');
    } else if (newShopStatus === 'completed') {
      showToast('Job completed!');
    }
  };

  const addAcceptedJob = (order, patch = {}) => {
    const nextJob = normalizeOrderToJob({ ...order, ...patch });
    const orderId = String(order.id || order._id || nextJob.id);
    setAcceptedRequestIds(current => current.includes(orderId) ? current : [...current, orderId]);
    setAcceptedJobs(current => [nextJob, ...current.filter(job => String(job.id) !== String(nextJob.id))]);
    setRequests(current => current.filter(item => String(item.id || item._id) !== orderId));
    return nextJob;
  };

  const guardProfileComplete = () => {
    if (profileCompleteRef.current || isDemo) return true;
    Alert.alert(
      'Profile not complete',
      'Add your services and working hours to start accepting orders. It only takes a minute!',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Set up profile', onPress: () => { setActiveScreen('profile'); setActiveTab('profile'); } },
      ]
    );
    return false;
  };

  const acceptOrder = async (order) => {
    if (!guardProfileComplete()) return;
    const orderId = String(order.id || order._id);
    setAcceptingId(order.id);
    const nextJob = addAcceptedJob(order, { status: 'accepted', acceptedAt: new Date().toISOString() });
    try {
      const acceptedOrder = await fetchJson(`${API_URL}/orders/${order.id}/accept`, {
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
      if (acceptedOrder) addAcceptedJob(acceptedOrder, { status: 'accepted' });
      loadRequests();
      return nextJob;
    } catch (error) {
      // Rollback optimistic update
      setAcceptedJobs(current => current.filter(j => String(j.id) !== orderId));
      setAcceptedRequestIds(current => current.filter(id => id !== orderId));
      setRequests(current =>
        current.some(r => String(r.id || r._id) === orderId) ? current : [order, ...current]
      );
      loadRequests();
      showToast(
        error?.status === 409
          ? 'This order was already taken by another provider.'
          : 'Could not accept order. Please try again.'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const confirmScheduledOrder = async (order) => {
    if (!guardProfileComplete()) return;
    const realId = String(order.id || order._id);
    setAcceptingId(order.id);
    dismissedRealIdsRef.current = [...dismissedRealIdsRef.current, realId];
    setRequests(c => c.filter(item => String(item.id || item._id) !== realId));
    try {
      await fetchJson(`${API_URL}/orders/${realId}/confirm-schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: {
            id: PROVIDER.id, name: PROVIDER.company,
            type: order.provider?.type || 'Auto Repair Shop',
            phone: PROVIDER.phone, initials: PROVIDER.initials,
            rating: PROVIDER.rating, eta: PROVIDER.eta, color: '#FF6B00',
          },
        }),
      });
      addAcceptedJob(order, { status: 'scheduled', acceptedAt: new Date().toISOString() });
    } catch (error) {
      console.log('Confirm order error:', error.message);
      dismissedRealIdsRef.current = dismissedRealIdsRef.current.filter(id => id !== realId);
      loadRequests();
      showToast('Could not confirm booking. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  const acceptScheduledBooking = async (order) => {
    if (!guardProfileComplete()) return;
    const realId = String(order.id || order._id);
    setAcceptingId(order.id);
    dismissedRealIdsRef.current = [...dismissedRealIdsRef.current, realId];
    setRequests(c => c.filter(item => String(item.id || item._id) !== realId));
    setSelectedRequest(null);
    try {
      await fetchJson(`${API_URL}/orders/${realId}/schedule-accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      addAcceptedJob(order, { status: 'confirmed', acceptedAt: new Date().toISOString() });
    } catch (e) {
      console.log('Schedule accept error:', e.message);
      dismissedRealIdsRef.current = dismissedRealIdsRef.current.filter(id => id !== realId);
      loadRequests();
      showToast(
        e?.status === 409
          ? 'This booking was already handled.'
          : 'Could not confirm booking. Please try again.'
      );
    } finally {
      setAcceptingId(null);
    }
  };

  const declineScheduledBooking = async (order, note) => {
    try {
      const realId = String(order.id || order._id);
      dismissedRealIdsRef.current = [...dismissedRealIdsRef.current, realId];
      setRequests(c => c.filter(item => String(item.id || item._id) !== realId));
      setSelectedRequest(null);
      setDeclineModalOrder(null);
      await fetchJson(`${API_URL}/orders/${realId}/schedule-decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerNote: note || null }),
      });
    } catch (e) {
      console.log('Schedule decline error:', e.message);
    }
  };

  const counterScheduledBooking = async (order, counterDate, counterSlot, note) => {
    try {
      const realId = String(order.id || order._id);
      dismissedRealIdsRef.current = [...dismissedRealIdsRef.current, realId];
      setRequests(c => c.filter(item => String(item.id || item._id) !== realId));
      setSelectedRequest(null);
      setCounterModalOrder(null);
      await fetchJson(`${API_URL}/orders/${realId}/schedule-counter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterDate, counterSlot, providerNote: note || null }),
      });
    } catch (e) {
      console.log('Schedule counter error:', e.message);
    }
  };

  const dismissRequest = (order) => {
    const realId = String(order.id || order._id || '');
    if (realId) dismissedRealIdsRef.current = [...dismissedRealIdsRef.current, realId];
    setRequests(c => c.filter(item => String(item.id || item._id) !== realId));
    if (!realId) return;
    if (realId) {
      fetchJson(`${API_URL}/orders/${realId}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: PROVIDER.id }),
      }).catch(() => {});
    }
  };

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    Animated.spring(toastAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToastMsg(null));
    }, 3000);
  };

  const scheduleOrder = async (order, appointmentTime) => {
    if (!guardProfileComplete()) return;
    try {
      setAcceptingId(order.id);
      const nextJob = addAcceptedJob(order, { status: 'proposed', appointmentTime, acceptedAt: new Date().toISOString() });
      fetchJson(`${API_URL}/orders/${order.id}/accept`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: {
            id: PROVIDER.id, name: PROVIDER.company,
            type: order.provider?.type || 'Mobile Service Provider',
            phone: PROVIDER.phone, initials: PROVIDER.initials,
            rating: PROVIDER.rating, eta: PROVIDER.eta, color: '#FF6B00',
          },
          appointmentTime,
        }),
      }).catch(e => console.log('Schedule order sync error:', e.message));
      return nextJob;
    } catch (error) {
      console.log('Schedule order error:', error.message);
    } finally {
      setAcceptingId(null);
    }
  };

  const updateJobWorkflow = (jobId, patch) => {
    setJobWorkflows(current => ({
      ...current,
      [jobId]: { ...(current[jobId] || {}), ...patch },
    }));

    const nextStatus = getBackendStatusFromWorkflowStage(patch?.stage);
    if (!nextStatus) return;

    const currentWorkflow = { ...(jobWorkflows[jobId] || {}), ...patch };
    const body = { status: nextStatus, estimate: patch?.estimate };

    if (nextStatus === 'completed') {
      body.serviceDetails = {
        servicesPerformed: (currentWorkflow.estimateItems || []).map(i => i.label).filter(Boolean),
        providerNotes: currentWorkflow.workSummary || '',
        photos: currentWorkflow.workPhotos || [],
        duration: currentWorkflow.workDuration || null,
        warranty: currentWorkflow.warranty || { days: 90, miles: 4000 },
        diagnosisResults: {
          batteryVoltage: currentWorkflow.batteryVoltage || null,
          diagnosisNotes: currentWorkflow.diagnosisNotes || '',
          answers: currentWorkflow.diagnosisAnswers || {},
        },
      };
    }

    fetchJson(`${API_URL}/orders/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch((error) => {
      console.log('Job status sync error:', error.message);
    });
  };

  const snapTabIndicator = (index) => {
    if (!tabWidth) return;
    stopTabDragLoop();
    tabIndicatorX.stopAnimation();
    tabIndicatorDrop.stopAnimation();
    const targetX = index * tabWidth;
    tabIndicatorTarget.current = targetX;
    Animated.parallel([
      Animated.timing(tabIndicatorX, {
        toValue: targetX,
        duration: 270,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(tabIndicatorDrop, {
          toValue: TAB_INDICATOR_DROP_SCALE,
          duration: 120,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(tabIndicatorDrop, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) tabIndicatorPosition.current = targetX;
    });
  };

  const getTabIndexFromX = (x) => {
    if (!tabWidth) return TABS.findIndex(tab => tab.key === activeTab);
    const safeX = Number.isFinite(x) ? x : TAB_BAR_PADDING + tabWidth * (Math.max(0, TABS.findIndex(tab => tab.key === activeTab)) + 0.5);
    const innerX = Math.max(0, Math.min(safeX - TAB_BAR_PADDING, tabWidth * TABS.length - 1));
    return Math.max(0, Math.min(TABS.length - 1, Math.floor(innerX / tabWidth)));
  };

  const getTabLocalX = (event) => {
    const pageX = event?.nativeEvent?.pageX;
    if (Number.isFinite(pageX) && Number.isFinite(tabBarPageX.current)) {
      return pageX - tabBarPageX.current;
    }
    return event?.nativeEvent?.locationX;
  };

  const updateTabBarMeasure = () => {
    requestAnimationFrame(() => {
      tabBarRef.current?.measure((x, y, width, height, pageX) => {
        if (Number.isFinite(pageX)) tabBarPageX.current = pageX;
      });
    });
  };

  const stopTabDragLoop = () => {
    if (tabDragFrame.current) {
      cancelAnimationFrame(tabDragFrame.current);
      tabDragFrame.current = null;
    }
  };

  const refreshApp = async () => {
    if (refreshing) return;
    pulseTabChange();
    setRefreshing(true);
    try {
      await loadRequests();
      if (isDemo) {
        setAcceptedJobs(current => current.map(job => {
          if (job.status === 'proposed') return { ...job, status: 'scheduled' };
          if (job.shopStatus === 'awaiting_approval') return { ...job, shopStatus: 'in_progress' };
          return job;
        }));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={refreshApp}
      tintColor="#F04416"
      colors={['#F04416']}
      progressBackgroundColor="#FFFFFF"
    />
  );

  const runTabDragLoop = () => {
    const nextX = tabIndicatorTarget.current;
    const currentX = tabIndicatorPosition.current;
    const delta = nextX - currentX;
    const smoothedX = Math.abs(delta) < 0.25 ? nextX : currentX + delta * 0.24;
    tabIndicatorPosition.current = smoothedX;
    tabIndicatorX.setValue(smoothedX);
    tabDragFrame.current = requestAnimationFrame(runTabDragLoop);
  };

  const startTabDragLoop = () => {
    stopTabDragLoop();
    tabDragFrame.current = requestAnimationFrame(runTabDragLoop);
  };

  const moveIndicatorWithFinger = (x) => {
    if (!tabWidth) return;
    const safeX = Number.isFinite(x) ? x : TAB_BAR_PADDING + tabWidth * ((tabDragIndex.current ?? TABS.findIndex(tab => tab.key === activeTab)) + 0.5);
    const maxX = (TABS.length - 1) * tabWidth;
    const nextX = Math.max(0, Math.min(safeX - TAB_BAR_PADDING - tabWidth / 2, maxX));
    tabIndicatorTarget.current = nextX;
    tabIndicatorDrop.setValue(1.06);
  };

  const selectTabAt = (index) => {
    const tab = TABS[index] || TABS[0];
    tabDragIndex.current = index;
    setActiveTab(tab.key);
    setPreviewTab(tab.key);
    if (tab.screen) setActiveScreen(tab.screen);
    setScreenResetNonce(current => current + 1);
    snapTabIndicator(index);
  };

  const previewTabTouch = (event) => {
    const x = event.nativeEvent.locationX;
    const index = getTabIndexFromX(x);
    tabDragIndex.current = index;
    setPreviewTab((TABS[index] || TABS[0]).key);
  };

  const moveTabTouch = (event) => {
    tabIsDragging.current = true;
    const x = event.nativeEvent.locationX;
    tabIndicatorX.stopAnimation();
    previewTabTouch(event);
    moveIndicatorWithFinger(x);
  };

  const releaseTabTouch = (event) => {
    const locationX = event?.nativeEvent?.locationX;
    const index = Number.isFinite(locationX) ? getTabIndexFromX(locationX) : tabDragIndex.current;
    tabIsDragging.current = false;
    stopTabDragLoop();
    Animated.timing(tabIndicatorDrop, {
      toValue: 1,
      duration: 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    selectTabAt(index ?? Math.max(0, TABS.findIndex(tab => tab.key === activeTab)));
  };

  const cancelTabTouch = () => {
    tabIsDragging.current = false;
    stopTabDragLoop();
    const index = Math.max(0, TABS.findIndex(tab => tab.key === activeTab));
    tabDragIndex.current = index;
    setPreviewTab(activeTab);
    snapTabIndicator(index);
  };

  const tabPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (event) => {
      tabIsDragging.current = true;
      tabIndicatorX.stopAnimation();
      const activeIndex = Math.max(0, TABS.findIndex(tab => tab.key === activeTab));
      tabIndicatorPosition.current = activeIndex * tabWidth;
      tabIndicatorTarget.current = tabIndicatorPosition.current;
      startTabDragLoop();
      const x = getTabLocalX(event);
      const index = getTabIndexFromX(x);
      tabDragIndex.current = index;
      setPreviewTab((TABS[index] || TABS[0]).key);
      moveIndicatorWithFinger(x);
    },
    onPanResponderMove: (event) => {
      const x = getTabLocalX(event);
      const index = getTabIndexFromX(x);
      tabDragIndex.current = index;
      setPreviewTab((TABS[index] || TABS[0]).key);
      moveIndicatorWithFinger(x);
    },
    onPanResponderRelease: (event) => {
      const x = getTabLocalX(event);
      const index = Number.isFinite(x) ? getTabIndexFromX(x) : tabDragIndex.current;
      tabIsDragging.current = false;
      selectTabAt(index ?? Math.max(0, TABS.findIndex(tab => tab.key === activeTab)));
    },
    onPanResponderTerminate: cancelTabTouch,
    onShouldBlockNativeResponder: () => true,
  }), [activeTab, tabWidth]);

  if (authState === 'loading') return null;

  if (authState === 'welcome') {
    return (
      <SafeAreaProvider>
        <WelcomeScreen onSignIn={() => setAuthState('login')} onSignUp={() => setAuthState('register')} />
      </SafeAreaProvider>
    );
  }

  if (authState === 'login' || authState === 'register') {
    return (
      <SafeAreaProvider>
        <AuthScreen
          mode={authState}
          onLogin={(token, refreshTok, user) => handleLogin(token, refreshTok, user, authState === 'register')}
          onRegisterCredentials={authState === 'register' ? beginProviderRegistration : undefined}
          onBack={() => setAuthState('welcome')}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'business-info') {
    return (
      <SafeAreaProvider>
        <BusinessInfoScreen
          loading={businessInfoLoading}
          onBack={() => setAuthState('register')}
          onContinue={completeProviderRegistration}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'setup') {
    return (
      <SafeAreaProvider>
        <ProviderSetupScreen
          onComplete={async () => {
            await AsyncStorage.setItem('@setup_completed_v1', 'true');
            await AsyncStorage.setItem('@provider_verification_status', 'unverified');
            fetchJson(`${API_URL}/profiles/${PROVIDER.id}`, {
              method: 'PUT',
              body: JSON.stringify({
                profileCompletion: 100,
                setupCompleted: true,
                lastActivityAt: new Date().toISOString(),
              }),
            }).catch(() => {});
            setAuthState('app');
          }}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safe, isLightVisible && styles.homeSafe]} edges={['top', 'left', 'right']}>
        <StatusBar style={isLightVisible ? 'dark' : 'light'} backgroundColor={isLightVisible ? '#FFFFFF' : '#020C1A'} />

        <View style={styles.screenSlot}>
          <View style={activeScreen !== 'home' ? styles.screenHidden : styles.screenVisible}>
            <HomeScreen
              online={online}
              setOnline={setOnline}
              requests={dashboardRequests}
              requestAnim={requestAnim}
              acceptingId={acceptingId}
              pendingCount={pendingCount}
              activeJobs={activeJobs}
              onOpenRequest={setSelectedRequest}
              onViewAll={() => setActiveScreen('requests')}
              allowScheduling={allowScheduling}
              onAccept={acceptOrder}
              onDecline={dismissRequest}
              refreshControl={refreshControl}
              scrollSignal={screenResetNonce}
              verificationStatus={verificationStatus}
              isDemo={isDemo}
              profileComplete={profileComplete}
              onGoToProfile={() => { setActiveScreen('profile'); setActiveTab('profile'); }}
            />
          </View>
          <View style={activeScreen !== 'requests' ? styles.screenHidden : styles.screenVisible}>
            <RequestsScreen
              requests={dashboardRequests}
              acceptingId={acceptingId}
              filter={requestFilter}
              onFilterChange={setRequestFilter}
              onAccept={acceptOrder}
              onDecline={dismissRequest}
              onConfirm={confirmScheduledOrder}
              onScheduleAccept={acceptScheduledBooking}
              onScheduleDecline={(order) => setDeclineModalOrder(order)}
              onCounter={(order) => setCounterModalOrder(order)}
              onOpen={setSelectedRequest}
              allowScheduling={allowScheduling}
              verificationStatus={verificationStatus}
              refreshControl={refreshControl}
              scrollSignal={screenResetNonce}
            />
          </View>
          <View style={activeScreen !== 'jobs' ? styles.screenHidden : styles.screenVisible}>
            <JobsScreen jobs={providerJobs} jobWorkflows={jobWorkflows} onOpen={setSelectedJob} refreshControl={refreshControl} scrollSignal={screenResetNonce} providerType={providerType} isDemo={isDemo} />
          </View>
          <View style={activeScreen !== 'earnings' ? styles.screenHidden : styles.screenVisible}>
            <EarningsScreen refreshControl={refreshControl} scrollSignal={screenResetNonce} isDemo={isDemo} completedOrders={completedOrders} />
          </View>
          <View style={activeScreen !== 'profile' ? styles.screenHidden : styles.screenVisible}>
            <ProfileScreen online={online} setOnline={setOnline} refreshControl={refreshControl} scrollSignal={screenResetNonce} onLogout={handleLogout} verificationStatus={verificationStatus} setVerificationStatus={setVerificationStatus} onProfileComplete={(val) => { profileCompleteRef.current = val; setProfileComplete(val); }} />
          </View>
        </View>

        <View pointerEvents="none" style={[styles.tabBarBackdrop, { backgroundColor: isLightVisible ? '#FFFFFF' : '#020C1A' }]} />

        <View
          ref={tabBarRef}
          style={styles.tabBar}
          {...tabPanResponder.panHandlers}
          onLayout={(event) => {
            const width = event.nativeEvent.layout.width;
            setTabBarWidth(width);
            updateTabBarMeasure();
            if (tabIsDragging.current) return;
            const index = Math.max(0, TABS.findIndex(tab => tab.key === activeTab));
            const nextX = index * ((width - TAB_BAR_PADDING * 2) / TABS.length);
            tabIndicatorPosition.current = nextX;
            tabIndicatorTarget.current = nextX;
            tabIndicatorX.setValue(nextX);
          }}
        >
          {!!tabWidth && (
            <Animated.View
              pointerEvents="none"
              style={[styles.tabIndicator, { width: tabWidth + TAB_INDICATOR_EXTRA_WIDTH, transform: [{ translateX: Animated.subtract(tabIndicatorX, TAB_INDICATOR_EXTRA_WIDTH / 2) }, { scaleX: tabIndicatorDrop }] }]}
            />
          )}
          {TABS.map((tab, index) => (
            <Tab
              key={tab.key}
              icon={tab.icon}
              label={tab.label}
              active={previewTab === tab.key}
              badge={tab.key === 'requests' ? pendingCount : tab.key === 'jobs' ? activeJobs : undefined}
            />
          ))}
        </View>

        <Modal
          visible={!!selectedRequest}
          animationType="slide"
          onRequestClose={() => setSelectedRequest(null)}
        >
          <View style={styles.requestModalOverlay}>
            <View style={styles.requestModalSheet}>
              {!!selectedRequest && getServiceMode(selectedRequest) === 'shop' ? (
                <ShopRequestDetailScreen
                  order={selectedRequest}
                  accepting={acceptingId === selectedRequest.id}
                  onBack={() => setSelectedRequest(null)}
                  onAccept={async (o) => {
                    if (o.status === 'scheduled_pending') {
                      await acceptScheduledBooking(o);
                    } else {
                      await confirmScheduledOrder(o);
                    }
                    setSelectedRequest(null);
                    showToast('Booking confirmed — check the Jobs tab');
                  }}
                  onSchedule={(o) => { setSelectedRequest(null); setAppointmentOrder(o); }}
                  onDecline={(o) => {
                    dismissRequest(o);
                    setSelectedRequest(null);
                  }}
                />
              ) : !!selectedRequest && (
                <RequestDetailScreen
                  order={selectedRequest}
                  accepting={acceptingId === selectedRequest.id}
                  providerType={providerType}
                  onBack={() => setSelectedRequest(null)}
                  onAccept={async (o) => {
                    if (o.status === 'scheduled_pending') {
                      setSelectedRequest(null);
                      await acceptScheduledBooking(o);
                    } else {
                      await acceptOrder(o);
                      setSelectedRequest(null);
                    }
                    showToast('Request accepted — check the Jobs tab');
                  }}
                  onSchedule={(o) => { setSelectedRequest(null); setAppointmentOrder(o); }}
                  onDecline={(o) => {
                    if (o.status === 'scheduled_pending') {
                      setSelectedRequest(null);
                      setDeclineModalOrder(o);
                    } else {
                      dismissRequest(o);
                      setSelectedRequest(null);
                    }
                  }}
                  refreshControl={refreshControl}
                />
              )}
            </View>
          </View>
        </Modal>

        <AppointmentModal
          order={appointmentOrder}
          onClose={() => { setSelectedRequest(appointmentOrder); setAppointmentOrder(null); }}
          onConfirm={async (order, appointmentTime) => {
            setAppointmentOrder(null);
            await scheduleOrder(order, appointmentTime);
            showToast('Proposal sent — waiting for customer confirmation');
          }}
        />

        <Modal
          visible={!!selectedJob}
          animationType="slide"
          onRequestClose={() => setSelectedJob(null)}
        >
          <View style={styles.requestModalOverlay}>
            <View style={styles.requestModalSheet}>
              {!!selectedJob && (selectedJob.status === 'scheduled' || selectedJob.status === 'confirmed' || selectedJob.status === 'proposed' || !!selectedJob.shopStatus) ? (
                <ShopRequestDetailScreen
                  order={selectedJob}
                  isAccepted
                  isProposed={selectedJob.status === 'proposed'}
                  onBack={() => setSelectedJob(null)}
                  onSchedule={(o) => { setSelectedJob(null); setAppointmentOrder(o); }}
                  onStepChange={(o, nextStatus, extra) => {
                    updateShopStep(o, nextStatus, extra);
                    setSelectedJob(prev => prev ? { ...prev, shopStatus: nextStatus, ...extra } : prev);
                  }}
                />
              ) : !!selectedJob && (
                <JobPopupScreen
                  job={selectedJob}
                  workflow={jobWorkflows[selectedJob.id] || {}}
                  onWorkflowChange={(patch) => updateJobWorkflow(selectedJob.id, patch)}
                  onBack={() => setSelectedJob(null)}
                  refreshControl={refreshControl}
                />
              )}
            </View>
          </View>
        </Modal>

        {/* ── Decline Booking Modal ── */}
        <DeclineBookingModal
          order={declineModalOrder}
          onClose={() => setDeclineModalOrder(null)}
          onConfirm={(order, note) => declineScheduledBooking(order, note)}
        />

        {/* ── Counter Offer Modal ── */}
        <CounterOfferModal
          order={counterModalOrder}
          onClose={() => setCounterModalOrder(null)}
          onConfirm={(order, counterDate, counterSlot, note) => counterScheduledBooking(order, counterDate, counterSlot, note)}
        />

        {!!toastMsg && (
          <Animated.View style={[toastStyles.toast, {
            opacity: toastAnim,
            transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }]}>
            <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
            <Text style={toastStyles.text}>{toastMsg}</Text>
          </Animated.View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const toastStyles = StyleSheet.create({
  toast: { position: 'absolute', bottom: 90, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#17191D', borderRadius: 28, paddingVertical: 16, paddingHorizontal: 22, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

function pulseTabChange() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function JobPopupScreen({ job, workflow = {}, onWorkflowChange, onBack, refreshControl }) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(workflow.stage === 'route');
  const [arrivedOpen, setArrivedOpen] = useState(workflow.stage === 'arrived');
  const [diagnosisOpen, setDiagnosisOpen] = useState(workflow.stage === 'diagnosis');
  const [estimateOpen, setEstimateOpen] = useState(workflow.stage === 'estimate');
  const [approvalOpen, setApprovalOpen] = useState(workflow.stage === 'approval');
  const [estimateDeclinedOpen, setEstimateDeclinedOpen] = useState(workflow.stage === 'estimate_declined');
  const [workOpen, setWorkOpen] = useState(workflow.stage === 'working');
  const [completeOpen, setCompleteOpen] = useState(workflow.stage === 'complete_review');
  const [invoiceOpen, setInvoiceOpen] = useState(workflow.stage === 'invoice');
  const [estimateItems, setEstimateItems] = useState(workflow.estimateItems || []);
  const [estimateRemovedItems, setEstimateRemovedItems] = useState(workflow.estimateRemovedItems || []);
  const [estimatePickerOpen, setEstimatePickerOpen] = useState(false);
  const [estimatePickerMode, setEstimatePickerMode] = useState('labor');
  const [estimateItemScope, setEstimateItemScope] = useState('required');
  const [estimatePreviewOpen, setEstimatePreviewOpen] = useState(false);
  const [estimateSearch, setEstimateSearch] = useState('');
  const [customEstimateName, setCustomEstimateName] = useState('');
  const [customEstimateHours, setCustomEstimateHours] = useState('');
  const [customEstimateAmount, setCustomEstimateAmount] = useState('');
  const [additionalApprovals, setAdditionalApprovals] = useState((workflow.additionalApprovals || []).filter(item => item.kind === 'required'));
  const [changeRequestOpen, setChangeRequestOpen] = useState(false);
  const [changeRequestName, setChangeRequestName] = useState('');
  const [changeRequestReason, setChangeRequestReason] = useState('');
  const [changeRequestAmount, setChangeRequestAmount] = useState('');
  const [changeRequestEvidence, setChangeRequestEvidence] = useState('');
  const [workPhotos, setWorkPhotos] = useState(workflow.workPhotos || ['Old battery', 'New battery', 'System test']);
  const [workSummary, setWorkSummary] = useState(workflow.workSummary || 'Replaced old battery with new Group 35 battery.\nSystem tested. Vehicle starts normally.');
  const [workCustomerNote, setWorkCustomerNote] = useState(workflow.workCustomerNote || 'Thanks for choosing our service!');
  const [diagnosisAnswers, setDiagnosisAnswers] = useState(workflow.diagnosisAnswers || {
    jumpStart: 'started',
    alternator: 'failed',
    loadTest: 'weak',
  });
  const [batteryVoltage, setBatteryVoltage] = useState(workflow.batteryVoltage || '');
  const [includeCallFee, setIncludeCallFee] = useState(true);
  const [providerTypeCached, setProviderTypeCached] = useState('mobile');
  const [workTimer, setWorkTimer] = useState(0);
  useEffect(() => { loadPricing().then(p => { const t = p.providerType || 'mobile'; setProviderTypeCached(t); setIncludeCallFee(t !== 'shop'); }); }, []);
  useEffect(() => {
    if (!workOpen) return;
    const startTs = workflow.estimateApprovedAt && !isNaN(new Date(workflow.estimateApprovedAt).getTime())
      ? new Date(workflow.estimateApprovedAt).getTime()
      : Date.now();
    const tick = () => setWorkTimer(Math.floor((Date.now() - startTs) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [workOpen, workflow.estimateApprovedAt]);
  const formatWorkTimer = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  useEffect(() => {
    if (!workOpen || !job.id) return;
    const interval = setInterval(async () => {
      try {
        const order = await fetchJson(`${API_URL}/orders/${job.id}`);
        const liveApprovals = order?.orderContext?.additionalApprovals;
        if (!Array.isArray(liveApprovals)) return;
        setAdditionalApprovals(prev => {
          const hasChange = liveApprovals.some(live => {
            const local = prev.find(p => p.id === live.id);
            return local && local.status !== live.status;
          });
          return hasChange ? liveApprovals.filter(item => item.kind === 'required') : prev;
        });
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [workOpen, job.id]);

  useEffect(() => {
    if (!approvalOpen || !job.id) return;
    const interval = setInterval(async () => {
      try {
        const order = await fetchJson(`${API_URL}/orders/${job.id}`);
        const step = order?.tracking?.currentStep;
        if (step === 'estimate_approved') {
          clearInterval(interval);
          setApprovalOpen(false);
          setWorkOpen(true);
          onWorkflowChange?.({
            stage: 'working',
            estimateItems,
            estimateRemovedItems,
            estimateApprovedAt: order?.orderContext?.estimateApprovedAt || 'Approved just now',
            approveOptional: order?.orderContext?.approveOptional ?? false,
            approvedTotal: order?.orderContext?.approvedTotal ?? null,
            additionalApprovals,
          });
        } else if (step === 'estimate_declined') {
          clearInterval(interval);
          setApprovalOpen(false);
          setEstimateDeclinedOpen(true);
          onWorkflowChange?.({ stage: 'estimate_declined', declineReason: order?.orderContext?.declineReason });
        }
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [approvalOpen]);
  const [diagnosisNotes, setDiagnosisNotes] = useState(workflow.diagnosisNotes || '');
  const [arrivedChecklist, setArrivedChecklist] = useState(workflow.arrivedChecklist || {
    photos: false,
    complaint: false,
    notes: false,
  });
  const [arrivedChecklistData, setArrivedChecklistData] = useState(workflow.arrivedChecklistData || {
    photos: '',
    complaint: '',
    notes: '',
  });
  const [complaintConfirmations, setComplaintConfirmations] = useState(workflow.complaintConfirmations || {});
  const [requiredPhotos, setRequiredPhotos] = useState(workflow.requiredPhotos || {
    front: null,
    vin: null,
    odometer: null,
    problem: null,
  });
  const [activeChecklistItem, setActiveChecklistItem] = useState(null);
  const [checklistDraft, setChecklistDraft] = useState('');
  const [navigationChoiceOpen, setNavigationChoiceOpen] = useState(false);
  const currentStepIndex = getJobProgressIndex(job.status);
  const isCompleted = job.status === 'completed';
  const address = job.pickup?.address || 'Location pending';
  const isTowing = isTowingService(job);
  const dropoffAddress = getDropoffAddress(job);
  const vin = getVehicleVin(job);
  const phone = job.customer?.phone || '';
  const customerNote = job.customerNote || 'No note provided';
  const acceptedLabel = getAcceptedAtLabel(job);
  const jobDuration = (() => {
    const start = job.acceptedAt ? new Date(job.acceptedAt).getTime() : null;
    const end = job.completedAt && job.completedAt !== 'Completed just now' ? new Date(job.completedAt).getTime() : Date.now();
    if (!start || isNaN(start)) return null;
    const mins = Math.round((end - start) / 60000);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60), m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  })();
  const customerFirstName = (job.customer?.name || 'customer').split(' ')[0] || 'customer';
  const rawCustomerFiles = job.orderContext?.files || job.files || job.photos || [
    { name: 'Inspection photo', type: 'image' },
    { name: 'Customer attachment', type: 'file' },
  ];
  const customerFiles = Array.isArray(rawCustomerFiles) ? rawCustomerFiles : [rawCustomerFiles].filter(Boolean);
  const intakeRows = getProviderIntakeItems(job)
    .filter(item => item.value !== undefined && item.value !== null && String(item.value).trim())
    .map((item, index) => ({
      key: `intake-${item.key || index}`,
      icon: 'help-circle-outline',
      color: '#F04416',
      label: item.label,
      value: String(item.value),
    }));
  const locationDetailRows = [
    { key: 'pickup', icon: 'location-outline', color: '#7C3AED', label: isTowing ? 'Pickup Location' : 'Service Location', value: address },
    ...(isTowing ? [{ key: 'dropoff', icon: 'flag-outline', color: '#EF4444', label: 'Drop-off Location', value: dropoffAddress }] : []),
    ...(!isCompleted ? [
      { key: 'distance', icon: 'trail-sign-outline', color: '#42D463', label: 'Distance', value: job.distance || '5.2 mi away' },
      { key: 'payout', icon: 'cash-outline', color: '#EAB308', label: 'Est. Payout', value: `$${job.payment?.total || 0}` },
    ] : []),
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

  if (estimateOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job, { includeServiceCallFee: includeCallFee });
    const estimateCatalog = getEstimateCatalog(estimatePickerMode);
    const filteredEstimateCatalog = estimateCatalog.filter(item => {
      const query = estimateSearch.trim().toLowerCase();
      if (!query) return true;
      return `${item.label} ${item.category || ''}`.toLowerCase().includes(query);
    });
    const openEstimatePicker = (mode = 'labor') => {
      pulseTabChange();
      setEstimatePickerMode(mode);
      setEstimateSearch('');
      setEstimateItemScope('required');
      setCustomEstimateName('');
      setCustomEstimateHours('');
      setCustomEstimateAmount('');
      setEstimatePickerOpen(true);
    };
    const addEstimateItem = (item) => {
      pulseTabChange();
      const nextItems = [...estimateItems, { ...item, scope: estimateItemScope, id: `${item.type}-${estimateItemScope}-${item.label}-${Date.now()}` }];
      setEstimateItems(nextItems);
      onWorkflowChange?.({ stage: 'estimate', estimateItems: nextItems, estimateRemovedItems });
      setEstimatePickerOpen(false);
      setEstimateSearch('');
      setEstimateItemScope('required');
      setCustomEstimateName('');
      setCustomEstimateHours('');
      setCustomEstimateAmount('');
    };
    const customAmount = Number.parseFloat(String(customEstimateAmount || '').replace(',', '.'));
    const customHours = Number.parseFloat(String(customEstimateHours || '').replace(',', '.'));
    const customPriceCheck = getEstimatePriceCheck(estimatePickerMode, customEstimateName, customAmount);
    const canAddCustomEstimate = customEstimateName.trim()
      && Number.isFinite(customAmount)
      && customAmount > 0
      && (estimatePickerMode === 'parts' || (Number.isFinite(customHours) && customHours > 0));
    const addCustomEstimateItem = () => {
      if (!canAddCustomEstimate) return;
      addEstimateItem({
        type: estimatePickerMode === 'parts' ? 'parts' : 'labor',
        label: customEstimateName.trim(),
        hours: estimatePickerMode === 'labor' ? `${customHours.toFixed(1)} hr` : undefined,
        amount: Math.round(customAmount * 100) / 100,
        category: 'Custom',
        priceWarning: customPriceCheck.warning,
      });
    };
    const removeEstimateItem = (item) => {
      pulseTabChange();
      const nextItems = estimateItems.filter(current => current.id !== item.id);
      const nextRemovedItems = item.source === 'custom'
        ? estimateRemovedItems
        : [...new Set([...estimateRemovedItems, item.id])];
      setEstimateItems(nextItems);
      setEstimateRemovedItems(nextRemovedItems);
      onWorkflowChange?.({ stage: 'estimate', estimateItems: nextItems, estimateRemovedItems: nextRemovedItems });
    };
    const sendEstimateToCustomer = () => {
      pulseTabChange();
      setEstimateOpen(false);
      setApprovalOpen(true);
      onWorkflowChange?.({
        stage: 'approval',
        estimateItems,
        estimateRemovedItems,
        estimateSentAt: workflow.estimateSentAt || 'Sent just now',
        estimate: {
          labor: estimate.labor,
          parts: estimate.parts,
          optionalLabor: estimate.optionalLabor,
          optionalParts: estimate.optionalParts,
          fees: estimate.fees,
          laborSubtotal: estimate.laborSubtotal,
          partsSubtotal: estimate.partsSubtotal,
          subtotal: estimate.subtotal,
          tax: estimate.tax,
          total: estimate.total,
          optionalSubtotal: estimate.optionalSubtotal,
          optionalTax: estimate.optionalTax,
          totalIfApproved: estimate.totalIfApproved,
        },
      });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setEstimateOpen(false); setDiagnosisOpen(true); onWorkflowChange?.({ stage: 'diagnosis' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
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

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.estimateContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.estimateHeaderRow}>
            <View style={styles.estimateHeaderText}>
              <Text style={styles.arrivedChecklistTitle}>Build Estimate</Text>
              <Text style={styles.arrivedChecklistSubtitle}>Add recommended services and parts.</Text>
            </View>
          </View>

          <View style={styles.recommendedReminderCard}>
            <View style={styles.recommendedReminderIcon}>
              <Ionicons name="bulb-outline" size={18} color="#F04416" />
            </View>
            <Text style={styles.recommendedReminderText}>
              If you find another issue, add it as Recommended. It will appear in the final estimate as an optional repair after customer approval.
            </Text>
          </View>

          <EstimateSection title="Labor" icon="construct-outline" color="#17191D" onAdd={() => openEstimatePicker('labor')}>
            {estimate.labor.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
            <EstimateLine label="Labor Subtotal" amount={estimate.laborSubtotal} strong />
          </EstimateSection>

          <EstimateSection title="Parts" icon="cube-outline" color="#16A34A" onAdd={() => openEstimatePicker('parts')}>
            {estimate.parts.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
            <EstimateLine label="Parts Subtotal" amount={estimate.partsSubtotal} strong mutedLabel />
          </EstimateSection>

          <EstimateSection title="Fees" icon="cash-outline" color="#7C3AED">
            {providerTypeCached === 'both' && (
              <View style={styles.callFeeToggleRow}>
                <View style={styles.callFeeToggleInfo}>
                  <Text style={styles.callFeeToggleLabel}>Service Call Fee</Text>
                  <Text style={styles.callFeeToggleSub}>{includeCallFee ? 'Mobile — provider drove to customer' : 'In-shop — no call fee applied'}</Text>
                </View>
                <Switch
                  value={includeCallFee}
                  onValueChange={setIncludeCallFee}
                  trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            )}
            {estimate.fees.map((item, index) => <EstimateLine key={`${item.label}-${index}`} {...item} />)}
            {estimate.fees.length === 0 && <EstimateLine label="No fees applied" amount={0} mutedLabel />}
          </EstimateSection>

          {(estimate.optionalLabor.length > 0 || estimate.optionalParts.length > 0) && (
            <View style={styles.optionalEstimateWrap}>
              <Text style={styles.optionalEstimateTitle}>Recommended repairs</Text>
              <Text style={styles.optionalEstimateSubtitle}>Additional issues found by the provider. Customer approval is separate.</Text>
              {estimate.optionalLabor.length > 0 && (
                <EstimateSection title="Recommended Labor" icon="construct-outline" color="#F04416" optional>
                  {estimate.optionalLabor.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                  <EstimateLine label="Recommended Labor Subtotal" amount={estimate.optionalLaborSubtotal} strong />
                </EstimateSection>
              )}
              {estimate.optionalParts.length > 0 && (
                <EstimateSection title="Recommended Parts" icon="cube-outline" color="#F04416" optional>
                  {estimate.optionalParts.map((item, index) => <EstimateLine key={`${item.id}-${index}`} {...item} onRemove={() => removeEstimateItem(item)} />)}
                  <EstimateLine label="Recommended Parts Subtotal" amount={estimate.optionalPartsSubtotal} strong mutedLabel />
                </EstimateSection>
              )}
            </View>
          )}

          <View style={styles.estimateTotalCard}>
            <EstimateLine label="Required Subtotal" amount={estimate.subtotal} strong />
            <EstimateLine label="Tax (6.75%)" amount={estimate.tax} />
            <EstimateLine label="Required Total" amount={estimate.total} total />
            {estimate.optionalSubtotal > 0 && (
              <>
                <EstimateLine label="Recommended Add-ons" amount={estimate.optionalSubtotal} strong mutedLabel />
                <EstimateLine label="Recommended Tax" amount={estimate.optionalTax} />
                <EstimateLine label="Total if approved" amount={estimate.totalIfApproved} total />
              </>
            )}
          </View>

          <TouchableOpacity style={styles.previewEstimateBtn} activeOpacity={0.84} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
            <Ionicons name="eye-outline" size={18} color="#16A34A" />
            <Text style={styles.previewEstimateText}>Preview for Customer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.startInspectionBtn} activeOpacity={0.86} onPress={sendEstimateToCustomer}>
            <Text style={styles.startInspectionText}>Send Estimate to Customer</Text>
          </TouchableOpacity>

          <View style={styles.estimateApprovalNote}>
            <Ionicons name="lock-closed-outline" size={14} color="#8B9098" />
            <Text style={styles.estimateApprovalText}>Customer approval required to start work</Text>
          </View>
        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview job={job} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
        </Modal>

        <Modal visible={estimatePickerOpen} transparent animationType="fade" onRequestClose={() => setEstimatePickerOpen(false)}>
          <View style={styles.estimatePickerOverlay}>
            <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setEstimatePickerOpen(false)} />
            <View style={styles.estimatePickerCard}>
              <View style={styles.navChoiceHeader}>
                <Text style={styles.navChoiceTitle}>{estimatePickerMode === 'labor' ? 'Add Labor' : 'Add Part'}</Text>
                <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setEstimatePickerOpen(false)}>
                  <Ionicons name="close" size={20} color="#17191D" />
                </TouchableOpacity>
              </View>

              <View style={styles.estimateSearchBox}>
                <Ionicons name="search-outline" size={16} color="#8B9098" />
                <TextInput
                  style={styles.estimateSearchInput}
                  value={estimateSearch}
                  onChangeText={setEstimateSearch}
                  placeholder={estimatePickerMode === 'labor' ? 'Search labor' : 'Search parts'}
                  placeholderTextColor="#8B9098"
                />
              </View>

              <View style={styles.estimateScopeControl}>
                {['required', 'optional'].map(scope => {
                  const active = estimateItemScope === scope;
                  return (
                    <TouchableOpacity
                      key={scope}
                      style={[styles.estimateScopeBtn, active && styles.estimateScopeBtnActive]}
                      activeOpacity={0.84}
                      onPress={() => {
                        pulseTabChange();
                        setEstimateItemScope(scope);
                      }}
                    >
                      <Text style={[styles.estimateScopeText, active && styles.estimateScopeTextActive]}>
                        {scope === 'required' ? 'Required' : 'Recommended'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.customEstimateBox}>
                <Text style={styles.customEstimateTitle}>{estimatePickerMode === 'labor' ? 'Custom labor' : 'Custom part'}</Text>
                <TextInput
                  style={styles.customEstimateInput}
                  value={customEstimateName}
                  onChangeText={setCustomEstimateName}
                  placeholder={estimatePickerMode === 'labor' ? 'Labor name' : 'Part name'}
                  placeholderTextColor="#8B9098"
                />
                <View style={styles.customEstimateRow}>
                  {estimatePickerMode === 'labor' && (
                    <TextInput
                      style={[styles.customEstimateInput, styles.customEstimateSmallInput]}
                      value={customEstimateHours}
                      onChangeText={setCustomEstimateHours}
                      placeholder="Hours"
                      placeholderTextColor="#8B9098"
                      keyboardType="decimal-pad"
                    />
                  )}
                  <TextInput
                    style={[styles.customEstimateInput, styles.customEstimateSmallInput]}
                    value={customEstimateAmount}
                    onChangeText={setCustomEstimateAmount}
                    placeholder={estimatePickerMode === 'labor' ? 'Labor price' : 'Part price'}
                    placeholderTextColor="#8B9098"
                    keyboardType="decimal-pad"
                  />
                </View>
                {!!customPriceCheck.warning && (
                  <View style={styles.priceWarningBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#F04416" />
                    <Text style={styles.priceWarningText}>Above typical range {formatCurrency(customPriceCheck.min)}-{formatCurrency(customPriceCheck.max)}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.customEstimateAddBtn, !canAddCustomEstimate && styles.startInspectionBtnDisabled]} activeOpacity={canAddCustomEstimate ? 0.84 : 1} disabled={!canAddCustomEstimate} onPress={addCustomEstimateItem}>
                  <Text style={[styles.customEstimateAddText, !canAddCustomEstimate && styles.startInspectionTextDisabled]}>{estimateItemScope === 'optional' ? 'Add Recommended' : 'Add Required'}</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.estimatePickerList} showsVerticalScrollIndicator={false}>
                {filteredEstimateCatalog.map(item => (
                  <TouchableOpacity key={`${item.type}-${item.label}`} style={styles.estimatePickerRow} activeOpacity={0.84} onPress={() => addEstimateItem(item)}>
                    <View style={styles.estimatePickerRowInfo}>
                      <Text style={styles.estimatePickerRowTitle}>{item.label}</Text>
                      <Text style={styles.estimatePickerRowMeta}>{estimateItemScope === 'optional' ? 'Recommended - ' : 'Required - '}{item.type === 'labor' ? `${item.hours || '1.0 hr'} labor` : item.category || 'Part'}</Text>
                    </View>
                    <Text style={styles.estimatePickerPrice}>{formatCurrency(item.amount)}</Text>
                    <Ionicons name="add-circle-outline" size={21} color="#16A34A" />
                  </TouchableOpacity>
                ))}
                {!filteredEstimateCatalog.length && (
                  <View style={styles.estimatePickerEmpty}>
                    <Text style={styles.requestEmptyText}>No items found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  if (estimateDeclinedOpen) {
    const declineReason = workflow.declineReason || 'No reason provided';
    const isShop = providerTypeCached === 'shop';
    const feeLabel = isShop ? 'Diagnostic Fee' : 'Service Call Fee';
    const feeAmount = isShop
      ? formatMoney(job.payment?.dispatchFee || job.payment?.totalHeld || 75)
      : formatMoney(job.payment?.dispatchFee || job.payment?.totalHeld || job.payment?.priceMin || 45);
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <View style={styles.requestHeaderIconBtn} />
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{acceptedLabel}</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[styles.requestHeaderIconBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={22} color="#17191D" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.requestDetailScroll} contentContainerStyle={styles.requestDetailContent} showsVerticalScrollIndicator={false}>
          <View style={styles.declinedNoticeCard}>
            <View style={styles.declinedNoticeIcon}>
              <Ionicons name="close-circle" size={32} color="#DC2626" />
            </View>
            <Text style={styles.declinedNoticeTitle}>Estimate Declined</Text>
            <Text style={styles.declinedNoticeSubtitle}>The customer has declined your estimate.</Text>
          </View>

          <View style={styles.declinedReasonCard}>
            <Text style={styles.declinedReasonLabel}>Reason from customer</Text>
            <Text style={styles.declinedReasonValue}>{declineReason}</Text>
          </View>

          <View style={styles.declinedFeeCard}>
            <View style={styles.declinedFeeRow}>
              <Ionicons name="card-outline" size={18} color="#16A34A" />
              <Text style={styles.declinedFeeLabel}>{feeLabel} charged</Text>
              <Text style={styles.declinedFeeAmount}>{feeAmount}</Text>
            </View>
            <Text style={styles.declinedFeeNote}>
              {isShop
                ? 'The diagnostic fee has been charged to the customer for the inspection performed.'
                : 'The service call fee has been charged to the customer for your time and travel to the location.'}
            </Text>
          </View>

          <Text style={styles.declinedActionsTitle}>What would you like to do?</Text>

          <TouchableOpacity
            style={styles.declinedReviseBtn}
            activeOpacity={0.86}
            onPress={() => {
              setEstimateDeclinedOpen(false);
              setEstimateOpen(true);
              onWorkflowChange?.({ stage: 'estimate', estimateItems, estimateRemovedItems });
            }}
          >
            <Ionicons name="create-outline" size={20} color="#FF6B00" />
            <Text style={styles.declinedReviseBtnText}>Send Revised Estimate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declinedCloseBtn}
            activeOpacity={0.86}
            onPress={() => {
              fetchJson(`${API_URL}/orders/${job.id}/cancel`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cancelledBy: 'provider', reason: 'Customer declined estimate' }),
              }).catch(() => {});
              onBack?.();
            }}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#5E646D" />
            <Text style={styles.declinedCloseBtnText}>Close Job</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (approvalOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job);
    const sentTotal = estimate.optionalSubtotal > 0 ? estimate.totalIfApproved : estimate.total;
    const sentLabel = workflow.estimateSentAt || 'Sent just now';
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setApprovalOpen(false); setEstimateOpen(true); onWorkflowChange?.({ stage: 'estimate' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
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

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.approvalContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.approvalHero}>
            <View style={styles.approvalClock}>
              <Ionicons name="time" size={34} color="#FFFFFF" />
            </View>
            <Text style={styles.approvalTitle}>Waiting Customer Approval</Text>
            <Text style={styles.approvalSubtitle}>We've sent the estimate to {customerFirstName}.</Text>
          </View>

          <TouchableOpacity style={styles.approvalEstimateCard} activeOpacity={0.86} onPress={() => { pulseTabChange(); setEstimatePreviewOpen(true); }}>
            <View style={styles.approvalEstimateTop}>
              <View>
                <Text style={styles.approvalCardLabel}>Estimate Sent</Text>
                <Text style={styles.approvalAmount}>{formatCurrency(sentTotal)}</Text>
                <Text style={styles.approvalSentTime}>{sentLabel}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B9098" />
            </View>
            <View style={styles.approvalViewRow}>
              <Ionicons name="eye-outline" size={15} color="#5E646D" />
              <Text style={styles.approvalViewText}>View Estimate</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.approvalNextCard}>
            <Text style={styles.approvalNextTitle}>What happens next?</Text>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>{customerFirstName} will review and approve the estimate.</Text>
            </View>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>You'll be notified as soon as we get a response.</Text>
            </View>
            <View style={styles.approvalNextRow}>
              <Ionicons name="ellipse-outline" size={15} color="#EAB308" />
              <Text style={styles.approvalNextText}>After the customer approves the estimate, you can start the work.</Text>
            </View>
          </View>

          <View style={styles.approvalActions}>
            <TouchableOpacity style={styles.approvalEditBtn} activeOpacity={0.86} onPress={() => { pulseTabChange(); setApprovalOpen(false); setEstimateOpen(true); onWorkflowChange?.({ stage: 'estimate' }); }}>
              <Text style={styles.approvalEditText}>Edit Estimate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approvalCallBtn} activeOpacity={0.86} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
              <Text style={styles.approvalCallText}>Call Customer</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview job={job} estimate={estimate} onClose={() => setEstimatePreviewOpen(false)} />
        </Modal>
      </View>
    );
  }

  if (workOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job);
    const approveOptional = workflow.approveOptional ?? false;
    const originalTotal = workflow.approvedTotal ?? (approveOptional ? estimate.totalIfApproved : estimate.total);
    const approvedAdditionalTotal = sumAmounts(additionalApprovals.filter(item => item.status === 'approved'));
    const pendingAdditionalTotal = sumAmounts(additionalApprovals.filter(item => item.status === 'pending'));
    const saveAdditionalApprovals = (nextItems) => {
      setAdditionalApprovals(nextItems);
      onWorkflowChange?.({ stage: 'working', additionalApprovals: nextItems, estimateItems, estimateRemovedItems, workPhotos, workSummary, workCustomerNote });
    };
    const openRequiredChangeRequest = () => {
      pulseTabChange();
      setChangeRequestName('');
      setChangeRequestReason('');
      setChangeRequestAmount('');
      setChangeRequestEvidence('');
      setChangeRequestOpen(true);
    };
    const changeRequestParsedAmount = Number.parseFloat(String(changeRequestAmount || '').replace(',', '.'));
    const canSubmitChangeRequest = changeRequestName.trim()
      && changeRequestReason.trim()
      && Number.isFinite(changeRequestParsedAmount)
      && changeRequestParsedAmount > 0
      && changeRequestEvidence.trim();
    const submitRequiredChangeRequest = () => {
      if (!canSubmitChangeRequest) return;
      pulseTabChange();
      const nextItem = {
        id: `required-change-${Date.now()}`,
        kind: 'required',
        status: 'pending',
        title: changeRequestName.trim(),
        description: changeRequestReason.trim(),
        evidence: changeRequestEvidence.trim(),
        amount: Math.round(changeRequestParsedAmount * 100) / 100,
      };
      saveAdditionalApprovals([...additionalApprovals, nextItem]);
      fetchJson(`${API_URL}/orders/${job.id}/change-request`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', changeRequest: nextItem }),
      }).catch(e => console.log('Change request sync error:', e.message));
      setChangeRequestOpen(false);
    };
    const updateAdditionalApproval = (id, status) => {
      pulseTabChange();
      saveAdditionalApprovals(additionalApprovals.map(item => item.id === id ? { ...item, status } : item));
    };
    const addWorkPhoto = () => {
      pulseTabChange();
      const nextPhotos = [...workPhotos, `Repair photo ${workPhotos.length + 1}`];
      setWorkPhotos(nextPhotos);
      onWorkflowChange?.({ stage: 'working', workPhotos: nextPhotos, workSummary, workCustomerNote, additionalApprovals });
    };
    const updateWorkSummary = (value) => {
      setWorkSummary(value);
      onWorkflowChange?.({ stage: 'working', workSummary: value, workCustomerNote, workPhotos, additionalApprovals });
    };
    const updateWorkCustomerNote = (value) => {
      setWorkCustomerNote(value);
      onWorkflowChange?.({ stage: 'working', workCustomerNote: value, workSummary, workPhotos, additionalApprovals });
    };
    const openCompleteReview = () => {
      pulseTabChange();
      setWorkOpen(false);
      setCompleteOpen(true);
      onWorkflowChange?.({ stage: 'complete_review', workPhotos, workSummary, workCustomerNote, additionalApprovals, estimateItems, estimateRemovedItems });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setWorkOpen(false); setApprovalOpen(true); onWorkflowChange?.({ stage: 'approval' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="chevron-back" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{workflow.estimateApprovedAt || 'Estimate approved'}</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[styles.requestHeaderIconBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.workContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <TouchableOpacity style={styles.approvedEstimateCard} activeOpacity={0.84} onPress={() => setEstimatePreviewOpen(true)}>
            <View style={styles.approvedEstimateLeft}>
              <View style={styles.approvedEstimateIconWrap}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <View>
                <Text style={styles.approvedEstimateTitle}>Estimate Approved</Text>
                <Text style={styles.approvedEstimateAmount}>{formatCurrency(originalTotal)}</Text>
              </View>
            </View>
            <View style={styles.approvedEstimateRight}>
              <View style={[styles.approvedEstimateBadge, !approveOptional && styles.approvedEstimateBadgePartial]}>
                <Text style={[styles.approvedEstimateBadgeText, !approveOptional && styles.approvedEstimateBadgeTextPartial]}>
                  {approveOptional ? 'Full Estimate' : 'Required Only'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#8B9098" />
            </View>
          </TouchableOpacity>

          <View style={styles.additionalApprovalCard}>
            <Text style={styles.approvalNextTitle}>Required change requests</Text>
            <Text style={styles.additionalApprovalSubtitle}>Use this only if the approved repair cannot be completed without an extra required item. Non-urgent recommendations should be saved for a future service.</Text>
            <View style={styles.additionalActionRow}>
              <TouchableOpacity style={styles.additionalRequiredBtn} activeOpacity={0.86} onPress={openRequiredChangeRequest}>
                <Ionicons name="alert-circle-outline" size={17} color="#FFFFFF" />
                <Text style={styles.additionalRequiredText}>Request required change</Text>
              </TouchableOpacity>
            </View>
            {additionalApprovals.length === 0 ? (
              <View style={styles.additionalEmptyBox}>
                <Ionicons name="document-text-outline" size={20} color="#8B9098" />
                <Text style={styles.additionalEmptyText}>No additional approvals yet.</Text>
              </View>
            ) : (
              additionalApprovals.map(item => {
                const isApproved = item.status === 'approved';
                const isDeclined = item.status === 'declined';
                const isPending = item.status === 'pending';
                return (
                  <View key={item.id} style={[styles.crCard, isApproved && styles.crCardApproved, isDeclined && styles.crCardDeclined]}>
                    <View style={styles.crHeader}>
                      <View style={[styles.crIconWrap, isApproved && styles.crIconWrapApproved, isDeclined && styles.crIconWrapDeclined]}>
                        <Ionicons
                          name={isApproved ? 'checkmark-circle-outline' : isDeclined ? 'close-circle-outline' : 'construct-outline'}
                          size={18}
                          color={isApproved ? '#16A34A' : isDeclined ? '#DC2626' : '#F04416'}
                        />
                      </View>
                      <View style={styles.crHeaderText}>
                        <Text style={styles.crTitle}>Additional Work Required</Text>
                        <Text style={styles.crSubtitle} numberOfLines={1}>{item.title}</Text>
                      </View>
                      <Text style={[styles.crAmount, isApproved && styles.crAmountApproved, isDeclined && styles.crAmountDeclined]}>
                        {formatCurrency(item.amount)}
                      </Text>
                    </View>
                    {item.description ? (
                      <View>
                        <Text style={styles.crFieldLabel}>Why is it required?</Text>
                        <Text style={styles.crDesc}>{item.description}</Text>
                      </View>
                    ) : null}
                    {item.evidence ? (
                      <View>
                        <Text style={styles.crFieldLabel}>Evidence</Text>
                        <View style={styles.crEvidenceRow}>
                          <Ionicons name="camera-outline" size={13} color="#8B9098" />
                          <Text style={styles.crEvidenceText}>{item.evidence}</Text>
                        </View>
                      </View>
                    ) : null}
                    <View style={[styles.crStatusRow, isApproved && styles.crStatusApproved, isDeclined && styles.crStatusDeclined, isPending && styles.crStatusPending]}>
                      <Ionicons
                        name={isApproved ? 'checkmark-circle' : isDeclined ? 'close-circle' : 'time-outline'}
                        size={14}
                        color={isApproved ? '#16A34A' : isDeclined ? '#DC2626' : '#8B9098'}
                      />
                      <Text style={[styles.crStatusText, isApproved && styles.crStatusTextApproved, isDeclined && styles.crStatusTextDeclined]}>
                        {isApproved ? 'Approved by customer' : isDeclined ? 'Declined by customer' : 'Waiting for customer...'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <View style={styles.repairProgressCard}>
            <View style={styles.repairProgressHeader}>
              <View>
                <Text style={styles.repairProgressTitle}>Repair in Progress</Text>
                <Text style={styles.repairProgressMeta}>Timer</Text>
                <Text style={styles.repairTimer}>{formatWorkTimer(workTimer)}</Text>
              </View>
              <View style={styles.repairLivePill}>
                <View style={styles.repairLiveDot} />
                <Text style={styles.repairLiveText}>In progress</Text>
              </View>
            </View>

            <View style={styles.repairFieldBlock}>
              <Text style={styles.repairFieldLabel}>Work Description</Text>
              <Text style={styles.repairFieldText}>Replacing battery and testing system.</Text>
            </View>

            <View style={styles.repairFieldBlock}>
              <Text style={styles.repairFieldLabel}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.repairPhotosRow}>
                {workPhotos.map((photo, index) => (
                  <View key={`${photo}-${index}`} style={styles.repairPhotoTile}>
                    <Ionicons name={index === 2 ? 'speedometer-outline' : 'battery-charging-outline'} size={22} color="#F04416" />
                    <Text style={styles.repairPhotoText} numberOfLines={2}>{photo}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.repairAddPhotoTile} activeOpacity={0.84} onPress={addWorkPhoto}>
                  <Ionicons name="add" size={22} color="#5E646D" />
                  <Text style={styles.repairAddPhotoText}>Add More</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>

          <View style={styles.workContactCard}>
            <View style={styles.customerPopupAvatar}>
              <Text style={styles.customerPopupInitials}>{job.customer?.initials || 'CU'}</Text>
            </View>
            <View style={styles.workContactInfo}>
              <Text style={styles.workContactName} numberOfLines={1}>{job.customer?.name || 'Customer'}</Text>
              <Text style={styles.workContactMeta}>Verified & trusted</Text>
            </View>
            <View style={styles.workContactActions}>
              <TouchableOpacity style={styles.workContactBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`tel:${phone}`)}>
                <Ionicons name="call-outline" size={18} color="#17191D" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.workContactBtn} activeOpacity={0.84} onPress={() => phone && Linking.openURL(`sms:${phone}`)}>
                <Ionicons name="chatbubble-outline" size={18} color="#17191D" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Work Summary</Text>
            <TextInput
              style={styles.repairSummaryInput}
              value={workSummary}
              onChangeText={updateWorkSummary}
              multiline
              placeholder="Describe completed work"
              placeholderTextColor="#8B9098"
            />
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Customer Note (Optional)</Text>
            <TextInput
              style={styles.repairCustomerNoteInput}
              value={workCustomerNote}
              onChangeText={updateWorkCustomerNote}
              multiline
              placeholder="Add a short note for the customer"
              placeholderTextColor="#8B9098"
            />
          </View>

          <TouchableOpacity style={styles.completeWorkBtn} activeOpacity={0.86} onPress={openCompleteReview}>
            <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
            <Text style={styles.completeWorkText}>Complete Work</Text>
          </TouchableOpacity>

        </ScrollView>

        <Modal visible={estimatePreviewOpen} transparent animationType="fade" onRequestClose={() => setEstimatePreviewOpen(false)}>
          <CustomerEstimatePreview
            job={job}
            estimate={approveOptional ? estimate : { ...estimate, optionalLabor: [], optionalParts: [], optionalSubtotal: 0, optionalTax: 0, totalIfApproved: estimate.total }}
            onClose={() => setEstimatePreviewOpen(false)}
          />
        </Modal>

        <Modal visible={changeRequestOpen} transparent animationType="fade" onRequestClose={() => setChangeRequestOpen(false)}>
          <KeyboardAvoidingView style={styles.checklistKeyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.changeRequestOverlay}>
              <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={() => setChangeRequestOpen(false)} />
              <View style={styles.changeRequestCard}>
                <View style={styles.navChoiceHeader}>
                  <View style={styles.changeRequestHeaderText}>
                    <Text style={styles.navChoiceTitle}>Required Change Request</Text>
                    <Text style={styles.changeRequestSubtitle}>Only use this if the approved repair cannot be completed without it.</Text>
                  </View>
                  <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setChangeRequestOpen(false)}>
                    <Ionicons name="close" size={20} color="#17191D" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.changeRequestLabel}>Work or part needed</Text>
                <TextInput
                  style={styles.changeRequestInput}
                  value={changeRequestName}
                  onChangeText={setChangeRequestName}
                  placeholder="Example: Battery terminal replacement"
                  placeholderTextColor="#8B9098"
                />

                <Text style={styles.changeRequestLabel}>Why is it required?</Text>
                <TextInput
                  style={styles.changeRequestTextArea}
                  value={changeRequestReason}
                  onChangeText={setChangeRequestReason}
                  multiline
                  placeholder="Explain why the approved repair cannot be completed without this change."
                  placeholderTextColor="#8B9098"
                />

                <Text style={styles.changeRequestLabel}>Price</Text>
                <TextInput
                  style={styles.changeRequestInput}
                  value={changeRequestAmount}
                  onChangeText={setChangeRequestAmount}
                  placeholder="64.00"
                  placeholderTextColor="#8B9098"
                  keyboardType="decimal-pad"
                />

                <Text style={styles.changeRequestLabel}>Evidence</Text>
                <TouchableOpacity style={styles.changeRequestEvidenceBox} activeOpacity={0.84} onPress={() => setChangeRequestEvidence('Photo attached: damaged battery terminal')}>
                  <Ionicons name={changeRequestEvidence ? 'checkmark-circle' : 'camera-outline'} size={20} color={changeRequestEvidence ? '#16A34A' : '#F04416'} />
                  <View style={styles.changeRequestEvidenceTextWrap}>
                    <Text style={styles.changeRequestEvidenceTitle}>{changeRequestEvidence ? 'Evidence attached' : 'Add required photo'}</Text>
                    <Text style={styles.changeRequestEvidenceHint}>{changeRequestEvidence || 'Tap to attach a photo or note for the customer.'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.startInspectionBtn, !canSubmitChangeRequest && styles.startInspectionBtnDisabled]} activeOpacity={canSubmitChangeRequest ? 0.86 : 1} disabled={!canSubmitChangeRequest} onPress={submitRequiredChangeRequest}>
                  <Text style={[styles.startInspectionText, !canSubmitChangeRequest && styles.startInspectionTextDisabled]}>Send to Customer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (invoiceOpen) {
    const completedIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'completed'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job, { includeServiceCallFee: includeCallFee });
    const approvedRequiredChanges = additionalApprovals.filter(item => item.status === 'approved');
    const approvedAdditionalTotal = sumAmounts(approvedRequiredChanges);
    const invoiceTotal = estimate.total + approvedAdditionalTotal;
    const invoiceTax = Math.round((estimate.tax + approvedAdditionalTotal * 0.0675) * 100) / 100;
    const invoiceSubtotal = estimate.subtotal + approvedAdditionalTotal - estimate.tax;
    const invoiceNumber = `INV-${job.number || '00000'}`;
    const invoiceDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const paymentMethod = job.payment?.method ? `${job.payment.method} ••••${job.payment.last4 || '****'}` : 'Card on file';

    const collectPayment = async () => {
      pulseTabChange();
      const startedAt = job?.startedAt ? new Date(job.startedAt) : null;
      const durationMins = startedAt ? Math.round((Date.now() - startedAt.getTime()) / 60000) : null;
      const workDuration = durationMins
        ? (durationMins < 60 ? `${durationMins} min` : `${Math.floor(durationMins / 60)}h ${durationMins % 60}m`)
        : null;
      let warranty = { id: '90d', days: 90, miles: 4000 };
      try {
        const wVal = await AsyncStorage.getItem('@warranty_policy');
        if (wVal) warranty = JSON.parse(wVal);
      } catch { }
      onWorkflowChange?.({
        stage: 'completed',
        workPhotos,
        workSummary,
        workCustomerNote,
        additionalApprovals,
        completedAt: 'Completed just now',
        invoiceNumber,
        workDuration,
        warranty,
      });
      onBack?.();
    };

    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setInvoiceOpen(false); setCompleteOpen(true); onWorkflowChange?.({ stage: 'complete_review' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="chevron-back" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>{invoiceNumber}</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[styles.requestHeaderIconBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={completedIndex} />
          </View>

          {/* Invoice header */}
          <View style={styles.invoiceHeaderCard}>
            <View style={styles.invoiceHeaderTop}>
              <View style={styles.invoiceIconWrap}>
                <Ionicons name="document-text-outline" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceTitle}>Invoice</Text>
                <Text style={styles.invoiceMeta}>{invoiceNumber} · {invoiceDate}</Text>
              </View>
              <View style={styles.invoiceStatusBadge}>
                <Text style={styles.invoiceStatusText}>Ready</Text>
              </View>
            </View>
          </View>

          {/* From / To */}
          <View style={styles.invoicePartyCard}>
            <View style={styles.invoicePartyRow}>
              <Text style={styles.invoicePartyLabel}>FROM</Text>
              <Text style={styles.invoicePartyName}>Auterio Provider</Text>
              <Text style={styles.invoicePartySub}>+1 (555) 123-4567</Text>
            </View>
            <View style={styles.invoiceDivider} />
            <View style={styles.invoicePartyRow}>
              <Text style={styles.invoicePartyLabel}>TO</Text>
              <Text style={styles.invoicePartyName}>{job.customer?.name || 'Customer'}</Text>
              <Text style={styles.invoicePartySub}>{job.vehicle?.make} {job.vehicle?.model} {job.vehicle?.year}</Text>
              {!!vin && <Text style={styles.invoicePartySub}>VIN: {vin}</Text>}
            </View>
          </View>

          {/* Labor */}
          {estimate.labor.length > 0 && (
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceSectionLabel}>LABOR</Text>
              {estimate.labor.map((item, i) => (
                <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invoiceLineName}>{item.label}</Text>
                    {!!item.hours && <Text style={styles.invoiceLineSub}>{item.hours}</Text>}
                  </View>
                  <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Parts */}
          {estimate.parts.length > 0 && (
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceSectionLabel}>PARTS & MATERIALS</Text>
              {estimate.parts.map((item, i) => (
                <View key={item.id || i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                  <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.label}</Text>
                  <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Fees */}
          {estimate.fees.length > 0 && (
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceSectionLabel}>FEES</Text>
              {estimate.fees.map((item, i) => (
                <View key={i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                  <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.label}</Text>
                  <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Change requests */}
          {approvedRequiredChanges.length > 0 && (
            <View style={styles.invoiceSection}>
              <Text style={styles.invoiceSectionLabel}>ADDITIONAL WORK</Text>
              {approvedRequiredChanges.map((item, i) => (
                <View key={i} style={[styles.invoiceLineRow, i > 0 && styles.invoiceLineRowBorder]}>
                  <Text style={[styles.invoiceLineName, { flex: 1 }]}>{item.name || item.label}</Text>
                  <Text style={styles.invoiceLineAmount}>{formatCurrency(item.amount)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Totals */}
          <View style={styles.invoiceTotalsCard}>
            <View style={styles.invoiceTotalRow}>
              <Text style={styles.invoiceTotalLabel}>Subtotal</Text>
              <Text style={styles.invoiceTotalValue}>{formatCurrency(invoiceSubtotal)}</Text>
            </View>
            <View style={[styles.invoiceTotalRow, styles.invoiceLineRowBorder]}>
              <Text style={styles.invoiceTotalLabel}>Tax (6.75%)</Text>
              <Text style={styles.invoiceTotalValue}>{formatCurrency(invoiceTax)}</Text>
            </View>
            <View style={[styles.invoiceTotalRow, styles.invoiceLineRowBorder]}>
              <Text style={styles.invoiceTotalLabelBold}>Total</Text>
              <Text style={styles.invoiceTotalValueBold}>{formatCurrency(invoiceTotal)}</Text>
            </View>
          </View>

          {/* Payment method */}
          <View style={styles.invoicePaymentRow}>
            <Ionicons name="card-outline" size={16} color="#6B7280" />
            <Text style={styles.invoicePaymentText}>Payment method: <Text style={{ color: '#17191D', fontWeight: '700' }}>{paymentMethod}</Text></Text>
          </View>

          {/* Collect Payment button */}
          <TouchableOpacity style={styles.collectPaymentBtn} activeOpacity={0.86} onPress={collectPayment}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.collectPaymentText}>Collect Payment · {formatCurrency(invoiceTotal)}</Text>
          </TouchableOpacity>

          {/* Warranty note */}
          <View style={styles.invoiceWarrantyRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color="#16A34A" />
            <Text style={styles.invoiceWarrantyText}>90-day / 4,000-mile warranty on parts and labor</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (completeOpen) {
    const completeIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'completed'));
    const estimate = getDemoEstimate(diagnosisAnswers, batteryVoltage, estimateItems, estimateRemovedItems, job);
    const originalTotal = estimate.optionalSubtotal > 0 ? estimate.totalIfApproved : estimate.total;
    const approvedRequiredChanges = additionalApprovals.filter(item => item.status === 'approved');
    const pendingRequiredChanges = additionalApprovals.filter(item => item.status === 'pending');
    const approvedAdditionalTotal = sumAmounts(approvedRequiredChanges);
    const finalTotal = originalTotal + approvedAdditionalTotal;
    const hasFinalPhotos = workPhotos.length > 0;
    const hasSummary = workSummary.trim().length > 0;
    const canSubmitCompletion = hasFinalPhotos && hasSummary && pendingRequiredChanges.length === 0;
    const submitCompletion = () => {
      if (!canSubmitCompletion) return;
      pulseTabChange();
      onWorkflowChange?.({
        stage: 'invoice',
        workPhotos,
        workSummary,
        workCustomerNote,
        additionalApprovals,
      });
      setCompleteOpen(false);
      setInvoiceOpen(true);
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setCompleteOpen(false); setWorkOpen(true); onWorkflowChange?.({ stage: 'working' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
            <Ionicons name="chevron-back" size={24} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.jobPopupHeaderTextWrap}>
            <Text style={styles.jobPopupHeaderTitle}>Job #{job.number}</Text>
            <Text style={styles.jobPopupAcceptedText}>Final review</Text>
          </View>
          <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={[styles.requestHeaderIconBtn, { alignItems: 'flex-end' }]}>
            <Ionicons name="close" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.completeContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={completeIndex} />
          </View>

          <View style={styles.completeHeroCard}>
            <View style={styles.completeHeroIcon}>
              <Ionicons name="clipboard-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.completeHeroInfo}>
              <Text style={styles.completeHeroTitle}>Complete Job</Text>
              <Text style={styles.completeHeroSubtitle}>Review final photos, work summary, approvals, and total before submitting completion.</Text>
            </View>
          </View>

          <View style={styles.completeChecklistCard}>
            <Text style={styles.approvalNextTitle}>Completion checklist</Text>
            <CompletionCheckRow done={hasFinalPhotos} title="Final photos added" detail={`${workPhotos.length} photo${workPhotos.length === 1 ? '' : 's'} attached`} />
            <CompletionCheckRow done={hasSummary} title="Work summary completed" detail={hasSummary ? 'Ready for customer review' : 'Add a summary before completing'} />
            <CompletionCheckRow done={!pendingRequiredChanges.length} title="No pending approvals" detail={pendingRequiredChanges.length ? 'Resolve pending required changes first' : 'All change requests resolved'} />
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Final Work Summary</Text>
            <Text style={styles.completeSummaryText}>{workSummary}</Text>
            {!!workCustomerNote.trim() && (
              <>
                <View style={styles.customerEstimateDivider} />
                <Text style={styles.repairFieldLabel}>Customer Note</Text>
                <Text style={styles.completeSummaryText}>{workCustomerNote}</Text>
              </>
            )}
          </View>

          <View style={styles.repairNoteCard}>
            <Text style={styles.repairFieldLabel}>Final Photos</Text>
            <View style={styles.completePhotosGrid}>
              {workPhotos.map((photo, index) => (
                <View key={`${photo}-complete-${index}`} style={styles.completePhotoTile}>
                  <Ionicons name={index === 2 ? 'speedometer-outline' : 'image-outline'} size={20} color="#F04416" />
                  <Text style={styles.repairPhotoText} numberOfLines={2}>{photo}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.workSummaryCard}>
            <EstimateLine label="Approved estimate" amount={originalTotal} strong />
            <EstimateLine label="Approved required changes" amount={approvedAdditionalTotal} />
            <EstimateLine label="Final total" amount={finalTotal} total />
          </View>

          {!canSubmitCompletion && (
            <View style={styles.completeBlockedCard}>
              <Ionicons name="alert-circle-outline" size={18} color="#F04416" />
              <Text style={styles.completeBlockedText}>
                {pendingRequiredChanges.length ? 'Resolve pending customer approvals before completing this job.' : 'Add final photos and work summary before completing this job.'}
              </Text>
            </View>
          )}

          <TouchableOpacity style={[styles.completeSubmitBtn, !canSubmitCompletion && styles.startInspectionBtnDisabled]} activeOpacity={canSubmitCompletion ? 0.86 : 1} disabled={!canSubmitCompletion} onPress={submitCompletion}>
            <Text style={[styles.completeSubmitText, !canSubmitCompletion && styles.startInspectionTextDisabled]}>Submit Completion</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (diagnosisOpen) {
    const workingIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'inspection'));
    const diagnosisSchema = getDiagnosisSchema(job);
    const recommendedServices = getRecommendedServicesFromDiagnosis(diagnosisAnswers, batteryVoltage, job);
    const setDiagnosisAnswer = (key, value) => {
      pulseTabChange();
      const nextAnswers = { ...diagnosisAnswers, [key]: value };
      setDiagnosisAnswers(nextAnswers);
      onWorkflowChange?.({ stage: 'diagnosis', diagnosisAnswers: nextAnswers });
    };
    const updateBatteryVoltage = (value) => {
      setBatteryVoltage(value);
      onWorkflowChange?.({ stage: 'diagnosis', batteryVoltage: value });
    };
    const updateDiagnosisNotes = (value) => {
      setDiagnosisNotes(value);
      onWorkflowChange?.({ stage: 'diagnosis', diagnosisNotes: value });
    };
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setDiagnosisOpen(false); setArrivedOpen(true); onWorkflowChange?.({ stage: 'arrived' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
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

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.diagnosisContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={workingIndex} />
          </View>

          <View style={styles.diagnosisHeader}>
            <Text style={styles.arrivedChecklistTitle}>Diagnosis</Text>
            <Text style={styles.arrivedChecklistSubtitle}>Run basic tests and record your findings.</Text>
          </View>

          <View style={styles.diagnosisCard}>
            <Text style={styles.diagnosisGroupTitle}>{diagnosisSchema.title}</Text>

            {!!diagnosisSchema.metric && (
              <View style={styles.diagnosisMetricRow}>
                <View style={styles.diagnosisMetricLeft}>
                  <Ionicons name={diagnosisSchema.metric.icon || 'speedometer-outline'} size={18} color="#16A34A" />
                  <Text style={styles.diagnosisItemTitle}>{diagnosisSchema.metric.label}</Text>
                </View>
                <View style={styles.diagnosisVoltageInputWrap}>
                  <TextInput
                    style={styles.diagnosisVoltageInput}
                    value={batteryVoltage}
                    onChangeText={updateBatteryVoltage}
                    placeholder="0.0"
                    placeholderTextColor="#8B9098"
                    keyboardType={diagnosisSchema.metric.keyboardType || 'default'}
                  />
                  {!!diagnosisSchema.metric.unit && <Text style={styles.diagnosisVoltageUnit}>{diagnosisSchema.metric.unit}</Text>}
                </View>
              </View>
            )}

            {diagnosisSchema.checks.map((check) => (
              <View key={check.key} style={styles.diagnosisBlock}>
                <View style={styles.diagnosisMetricLeft}>
                  <Ionicons name={check.icon || 'checkmark-circle-outline'} size={18} color={check.color || '#F04416'} />
                  <Text style={styles.diagnosisItemTitle}>{check.label}</Text>
                </View>
                <View style={styles.diagnosisOptionRow}>
                  {check.options.map(option => (
                    <DiagnosisOption
                      key={option.value}
                      label={option.label}
                      selected={diagnosisAnswers[check.key] === option.value}
                      onPress={() => setDiagnosisAnswer(check.key, option.value)}
                    />
                  ))}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.diagnosisNotesBlock}>
            <Text style={styles.diagnosisNotesLabel}>Technician Notes (optional)</Text>
            <TextInput
              style={styles.diagnosisNotesInput}
              value={diagnosisNotes}
              onChangeText={updateDiagnosisNotes}
              placeholder="Add diagnosis notes"
              placeholderTextColor="#8B9098"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.diagnosisNotesCount}>{diagnosisNotes.length}/500</Text>
          </View>

          <View style={styles.recommendedBlock}>
            <Text style={styles.recommendedTitle}>Recommended Services</Text>
            <Text style={styles.recommendedSubtitle}>AI-ready recommendations based on your findings</Text>
            {recommendedServices.map(service => (
              <RecommendedService key={service} label={service} />
            ))}
          </View>

          <TouchableOpacity style={styles.startInspectionBtn} activeOpacity={0.86} onPress={() => { setDiagnosisOpen(false); setEstimateOpen(true); onWorkflowChange?.({ stage: 'estimate' }); }}>
            <Text style={styles.startInspectionText}>Continue to Estimate</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (arrivedOpen) {
    const arrivedIndex = Math.max(0, JOB_STEPS.findIndex(step => step.key === 'arrived'));
    const serviceFlow = getServiceFlowSchema(job);
    const checklistItems = [
      { key: 'photos', title: 'Required Photos', subtitle: 'Add clear photos of the vehicle', icon: 'camera-outline', color: '#16A34A' },
      { key: 'notes', title: 'Arrival Notes', optional: true, subtitle: 'Add notes from arrival', icon: 'clipboard-outline', color: '#7C3AED' },
    ];
    const requiredPhotoItems = serviceFlow.requiredPhotos || getServiceFlowSchema({ service: { serviceType: 'mobile_mechanic' } }).requiredPhotos;
    const canContinueDiagnosis = arrivedChecklist.photos;
    const activeChecklistMeta = checklistItems.find(item => item.key === activeChecklistItem);
    const photosReady = requiredPhotoItems.every(item => !!requiredPhotos[item.key]?.uri);
    const customerComplaintItems = getCustomerComplaintItems(job, customerNote);
    const complaintReady = customerComplaintItems.length > 0 && customerComplaintItems.every(item => !!complaintConfirmations[item.key]);
    const canSaveChecklistItem = activeChecklistItem === 'photos' ? photosReady : true;
    const openChecklistItem = (key) => {
      pulseTabChange();
      setActiveChecklistItem(key);
      setChecklistDraft(arrivedChecklistData[key] || '');
    };
    const saveChecklistItem = () => {
      if (!activeChecklistItem || !canSaveChecklistItem) return;
      pulseTabChange();
      const nextValue = activeChecklistItem === 'photos'
        ? 'Required photos completed'
        : checklistDraft.trim() || 'No arrival notes added';
      const nextData = { ...arrivedChecklistData, [activeChecklistItem]: nextValue };
      const nextChecklist = { ...arrivedChecklist, [activeChecklistItem]: true };
      setArrivedChecklistData(nextData);
      setArrivedChecklist(nextChecklist);
      onWorkflowChange?.({ stage: 'arrived', arrivedChecklistData: nextData, arrivedChecklist: nextChecklist });
      setActiveChecklistItem(null);
      setChecklistDraft('');
    };
    const setComplaintDecision = (key, decision) => {
      pulseTabChange();
      const nextConfirmations = { ...complaintConfirmations, [key]: decision };
      setComplaintConfirmations(nextConfirmations);
      onWorkflowChange?.({ stage: 'arrived', complaintConfirmations: nextConfirmations });
    };
    const saveRequiredPhoto = (key) => {
      pulseTabChange();
      const nextPhotos = { ...requiredPhotos, [key]: { uri: `demo-${key}`, demo: true } };
      setRequiredPhotos(nextPhotos);
      onWorkflowChange?.({ stage: 'arrived', requiredPhotos: nextPhotos });
    };
    const takeRequiredPhoto = (key) => saveRequiredPhoto(key);
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setArrivedOpen(false); setRouteOpen(true); onWorkflowChange?.({ stage: 'route' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
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

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.arrivedContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
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

          <View style={styles.vehicleInfoCard}>
            <View style={styles.requestVehicleIcon}>
              <Ionicons name={job.service?.icon || job.icon || 'construct-outline'} size={22} color="#F04416" />
            </View>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceType} numberOfLines={2}>{job.service?.type || 'Service request'}</Text>
              <Text style={styles.serviceVehicle} numberOfLines={1}>Requested problem</Text>
              <View style={[styles.trustedLine, styles.vehicleTrustedLine]}>
                <Ionicons name="chatbox-outline" size={13} color="#F04416" />
                <Text style={styles.verifiedTrusted} numberOfLines={1}>{customerNote}</Text>
              </View>
            </View>
            <View style={styles.vehicleMetaBox}>
              <View style={styles.requestSpecRow}>
                <Text style={styles.requestSpecLabel}>Issue</Text>
                <Text style={styles.requestSpecValue} numberOfLines={1}>{job.service?.type || 'Service'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.arrivedStatusCard}>
            <View style={styles.arrivedStatusLeft}>
              <View style={styles.arrivedStatusDot} />
              <Text style={styles.arrivedStatusText}>Arrived</Text>
            </View>
            <Text style={styles.arrivedStatusTime}>10:35 AM</Text>
          </View>

          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={arrivedIndex} />
          </View>

          <View style={styles.arrivedSectionCard}>
            <Text style={styles.arrivedChecklistTitle}>Before we continue</Text>
            <Text style={styles.arrivedChecklistSubtitle}>Let's gather some basic information before diagnosis.</Text>
            <View style={styles.arrivedChecklistBox}>
              {checklistItems.map((item, index) => {
                const checked = arrivedChecklist[item.key];
                return (
              <TouchableOpacity key={item.key} style={[styles.arrivedNextRow, index > 0 && styles.arrivedNextRowBorder]} activeOpacity={0.84} onPress={() => openChecklistItem(item.key)}>
                {!item.optional && (
                  <View style={[styles.arrivedCheckCircle, checked && styles.arrivedCheckCircleDone]}>
                    {checked && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                  </View>
                )}
                <View style={styles.arrivedNextInfo}>
                  <View style={styles.arrivedNextTitleRow}>
                    <Text style={styles.arrivedNextTitle}>{item.title}</Text>
                    {item.optional && <Text style={styles.arrivedNextOptional}>(optional)</Text>}
                  </View>
                  <Text style={styles.arrivedNextSubtitle}>{item.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#8B9098" />
              </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity style={[styles.startInspectionBtn, !canContinueDiagnosis && styles.startInspectionBtnDisabled]} activeOpacity={canContinueDiagnosis ? 0.86 : 1} disabled={!canContinueDiagnosis} onPress={() => { setArrivedOpen(false); setDiagnosisOpen(true); onWorkflowChange?.({ stage: 'diagnosis' }); }}>
            <Text style={[styles.startInspectionText, !canContinueDiagnosis && styles.startInspectionTextDisabled]}>Continue to Diagnosis</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={!!activeChecklistItem} transparent animationType="fade" onRequestClose={() => setActiveChecklistItem(null)}>
          <KeyboardAvoidingView
            style={styles.checklistKeyboardAvoider}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            <View style={styles.checklistModalOverlay}>
              <TouchableOpacity style={styles.noteModalBackdrop} activeOpacity={1} onPress={() => setActiveChecklistItem(null)} />
              <View style={styles.checklistModalCard}>
                <View style={styles.noteModalHeader}>
                  <Text style={styles.noteModalTitle}>{activeChecklistMeta?.title || 'Checklist'}</Text>
                  <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={() => setActiveChecklistItem(null)}>
                    <Ionicons name="close" size={20} color="#17191D" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.checklistModalSubtitle}>{activeChecklistMeta?.subtitle}</Text>
                {activeChecklistItem === 'photos' ? (
                  <View style={styles.requiredPhotosList}>
                    {requiredPhotoItems.map(item => {
                      const photo = requiredPhotos[item.key];
                      const checked = !!photo?.uri;
                      return (
                        <View key={item.key} style={styles.requiredPhotoRow}>
                          <View style={styles.requiredPhotoInfo}>
                            <View style={[styles.requiredPhotoCheck, checked && styles.requiredPhotoCheckDone]}>
                              {checked ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
                            </View>
                            <View style={styles.requiredPhotoTextWrap}>
                              <Text style={styles.requiredPhotoLabel}>{item.label}</Text>
                              {!!item.hint && <Text style={styles.requiredPhotoHint}>{item.hint}</Text>}
                              {checked && <Text style={styles.requiredPhotoStateDone}>Photo added</Text>}
                            </View>
                          </View>
                          <View style={styles.requiredPhotoActions}>
                            <TouchableOpacity style={[styles.addPhotoIconBtn, checked && styles.addPhotoBtnDone]} activeOpacity={0.84} onPress={() => takeRequiredPhoto(item.key)}>
                              <Ionicons name="camera-outline" size={16} color={checked ? '#16A34A' : '#F04416'} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <TextInput
                    style={styles.checklistTextInput}
                    value={checklistDraft}
                    onChangeText={setChecklistDraft}
                    placeholder="Add optional arrival notes"
                    placeholderTextColor="#8B9098"
                    multiline
                    textAlignVertical="top"
                  />
                )}
                <TouchableOpacity style={[styles.checklistSaveBtn, !canSaveChecklistItem && styles.startInspectionBtnDisabled]} activeOpacity={canSaveChecklistItem ? 0.86 : 1} disabled={!canSaveChecklistItem} onPress={saveChecklistItem}>
                  <Text style={[styles.checklistSaveText, !canSaveChecklistItem && styles.startInspectionTextDisabled]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    );
  }

  if (routeOpen) {
    return (
      <View style={styles.requestDetailShell}>
        <View style={styles.requestDetailHeader}>
          <TouchableOpacity onPress={() => { setRouteOpen(false); onWorkflowChange?.({ stage: 'details' }); }} activeOpacity={0.8} style={styles.requestHeaderIconBtn}>
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

        <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobRouteContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
          <View style={styles.jobRouteMap}>
            <MapView
              provider={PROVIDER_GOOGLE}
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
          <TouchableOpacity style={styles.arrivedRouteBtn} activeOpacity={0.86} onPress={() => { setRouteOpen(false); setArrivedOpen(true); onWorkflowChange?.({ stage: 'arrived' }); }}>
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

      <ScrollView style={[styles.container, styles.requestDetailScroll]} contentContainerStyle={styles.jobPopupContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
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

        {isCompleted ? (
          <View style={styles.completedSummaryCard}>
            {!!jobDuration && (
              <View style={styles.completedSummaryRow}>
                <View style={[styles.completedSummaryIcon, { backgroundColor: '#2F80FF18' }]}>
                  <Ionicons name="time-outline" size={18} color="#2F80FF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.completedSummaryLabel}>Time on Job</Text>
                  <Text style={styles.completedSummaryValue}>{jobDuration}</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={[styles.completedSummaryRow, !!jobDuration && styles.completedSummaryRowBorder]} activeOpacity={0.84} onPress={() => { setInvoiceOpen(true); }}>
              <View style={[styles.completedSummaryIcon, { backgroundColor: '#7C3AED18' }]}>
                <Ionicons name="document-text-outline" size={18} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.completedSummaryLabel}>Invoice</Text>
                <Text style={styles.completedSummaryValue}>{workflow?.invoiceNumber || job.invoiceNumber || `INV-${job.number || '00000'}`}</Text>
              </View>
              <View style={styles.completedInvoicePaid}>
                <Text style={styles.completedInvoicePaidText}>PAID</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#C4C9D1" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mapPreview}>
            <MapView
              provider={PROVIDER_GOOGLE}
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
        )}

        {!isCompleted && (
          <View style={styles.jobProgressCard}>
            <JobStepper steps={JOB_STEPS} currentIndex={currentStepIndex} />
          </View>
        )}

        <View style={styles.requestBriefCard}>
          <Text style={styles.jobDetailHeading}>Job Details</Text>

          <RequestInfoRow icon="chatbox-outline" color="#2F80FF" label="Customer Note" value={customerNote} chevron onPress={() => setNoteOpen(true)} />

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

          {locationDetailRows.map(row => (
            <RequestInfoRow key={row.key} icon={row.icon} color={row.color} label={row.label} value={row.value} />
          ))}
        </View>

        {!isCompleted && (
          <TouchableOpacity style={styles.onTheWayBtn} activeOpacity={0.86} onPress={() => { setRouteOpen(true); onWorkflowChange?.({ stage: 'route' }); }}>
            <Text style={styles.onTheWayText}>On the way</Text>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
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

function DiagnosisOption({ label, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.diagnosisOption, selected && styles.diagnosisOptionSelected]} activeOpacity={0.84} onPress={onPress}>
      <View style={[styles.diagnosisRadio, selected && styles.diagnosisRadioSelected]}>
        {selected && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
      </View>
      <Text style={[styles.diagnosisOptionText, selected && styles.diagnosisOptionTextSelected]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

function RecommendedService({ label }) {
  return (
    <View style={styles.recommendedRow}>
      <View style={styles.recommendedLeft}>
        <Ionicons name="checkmark" size={16} color="#16A34A" />
        <Text style={styles.recommendedRowText}>{label}</Text>
      </View>
      <View style={styles.recommendedCheck}>
        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
      </View>
    </View>
  );
}

function EstimateSection({ title, icon, color, onAdd, optional, children }) {
  return (
    <View style={[styles.estimateCard, optional && styles.estimateCardOptional]}>
      <View style={styles.estimateSectionHeader}>
        <View style={styles.estimateSectionTitleGroup}>
          <View style={[styles.estimateSectionIcon, { backgroundColor: color + (optional ? '18' : '14') }, optional && styles.estimateSectionIconOptional]}>
            <Ionicons name={icon} size={17} color={color} />
          </View>
          <Text style={styles.estimateSectionTitle}>{title}</Text>
          {optional && <Text style={styles.estimateOptionalBadge}>Optional</Text>}
        </View>
        {!!onAdd && (
          <TouchableOpacity style={styles.estimateSectionAddBtn} activeOpacity={0.84} onPress={onAdd}>
            <Ionicons name="add" size={18} color="#16A34A" />
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

function EstimateLine({ label, hours, amount, strong, total, mutedLabel, onRemove, priceWarning }) {
  return (
    <View style={styles.estimateLine}>
      <Text style={[styles.estimateLineLabel, strong && styles.estimateLineStrong, mutedLabel && styles.estimateLineMuted]} numberOfLines={1}>{label}</Text>
      {!!priceWarning && <Ionicons name="alert-circle-outline" size={14} color="#F04416" />}
      {!!hours && <Text style={styles.estimateLineHours}>{hours}</Text>}
      <Text style={[styles.estimateLineAmount, strong && styles.estimateLineStrong, total && styles.estimateTotalAmount]}>{formatCurrency(amount)}</Text>
      {!!onRemove && (
        <TouchableOpacity style={styles.estimateRemoveBtn} activeOpacity={0.84} onPress={onRemove}>
          <Ionicons name="close" size={14} color="#F04416" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CustomerEstimatePreview({ job, estimate, onClose }) {
  const serviceMeta = getServiceMeta(job);
  const vehicle = getVehicleLabel(job);
  const optionalAvailable = estimate.optionalSubtotal > 0;

  return (
    <View style={styles.customerEstimateOverlay}>
      <TouchableOpacity style={styles.navChoiceBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.customerEstimateCard}>
        <View style={styles.customerEstimateHeader}>
          <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="chevron-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <View style={styles.customerEstimateTitleWrap}>
            <Text style={styles.customerEstimateTitle}>Estimate</Text>
            <Text style={styles.customerEstimateSubtitle}>Job #{job.number}</Text>
          </View>
          <TouchableOpacity style={styles.noteCloseBtn} activeOpacity={0.8} onPress={onClose}>
            <Ionicons name="close" size={20} color="#17191D" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.customerEstimateScroll} contentContainerStyle={styles.customerEstimateContent} showsVerticalScrollIndicator={false}>
          <View style={styles.customerEstimateHero}>
            <View style={styles.customerEstimateServiceIcon}>
              <Ionicons name={serviceMeta.icon} size={24} color="#F04416" />
            </View>
            <View style={styles.customerEstimateHeroInfo}>
              <Text style={styles.customerEstimateService} numberOfLines={1}>{serviceMeta.title}</Text>
              <Text style={styles.customerEstimateVehicle} numberOfLines={2}>{vehicle}</Text>
              <Text style={styles.customerEstimateLocation} numberOfLines={1}>{job.pickup?.address || 'Service location'}</Text>
            </View>
          </View>

          <View style={styles.customerEstimateNotice}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#16A34A" />
            <Text style={styles.customerEstimateNoticeText}>Required work is needed to complete this service. Recommended repairs are optional and need separate approval.</Text>
          </View>

          <CustomerPreviewSection title="Required Labor">
            {estimate.labor.map((item, index) => <CustomerPreviewLine key={`required-labor-${item.id}-${index}`} {...item} />)}
          </CustomerPreviewSection>

          <CustomerPreviewSection title="Required Parts">
            {estimate.parts.map((item, index) => <CustomerPreviewLine key={`required-part-${item.id}-${index}`} {...item} />)}
          </CustomerPreviewSection>

          <CustomerPreviewSection title="Fees">
            {estimate.fees.map((item, index) => <CustomerPreviewLine key={`fee-${item.label}-${index}`} {...item} />)}
          </CustomerPreviewSection>

          {optionalAvailable && (
            <>
              {estimate.optionalLabor.length > 0 && (
                <CustomerPreviewSection title="Recommended Labor" optional>
                  {estimate.optionalLabor.map((item, index) => <CustomerPreviewLine key={`optional-labor-${item.id}-${index}`} {...item} />)}
                </CustomerPreviewSection>
              )}
              {estimate.optionalParts.length > 0 && (
                <CustomerPreviewSection title="Recommended Parts" optional>
                  {estimate.optionalParts.map((item, index) => <CustomerPreviewLine key={`optional-part-${item.id}-${index}`} {...item} />)}
                </CustomerPreviewSection>
              )}
            </>
          )}

          <View style={styles.customerEstimateTotals}>
            <CustomerPreviewLine label="Required subtotal" amount={estimate.subtotal} strong />
            <CustomerPreviewLine label="Tax" amount={estimate.tax} />
            <CustomerPreviewLine label="Required total" amount={estimate.total} total />
            {optionalAvailable && (
              <>
                <View style={styles.customerEstimateDivider} />
                <CustomerPreviewLine label="Optional repairs" amount={estimate.optionalSubtotal} strong />
                <CustomerPreviewLine label="Optional tax" amount={estimate.optionalTax} />
                <CustomerPreviewLine label="Total with recommended repairs" amount={estimate.totalIfApproved} total />
              </>
            )}
          </View>

          <View style={styles.customerPreviewOnlyNote}>
            <Ionicons name="eye-outline" size={15} color="#8B9098" />
            <Text style={styles.customerPreviewOnlyText}>Preview only. Customer approval happens in the Auterio app.</Text>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function CustomerPreviewSection({ title, optional, children }) {
  return (
    <View style={[styles.customerPreviewSection, optional && styles.customerPreviewSectionOptional]}>
      <View style={styles.customerPreviewSectionHeader}>
        <Text style={styles.customerPreviewSectionTitle}>{title}</Text>
        {optional && <Text style={styles.customerPreviewOptionalPill}>Optional</Text>}
      </View>
      {children}
    </View>
  );
}

function CustomerPreviewLine({ label, hours, amount, strong, total }) {
  return (
    <View style={styles.customerPreviewLine}>
      <View style={styles.customerPreviewLineInfo}>
        <Text style={[styles.customerPreviewLineLabel, strong && styles.customerPreviewLineStrong]} numberOfLines={1}>{label}</Text>
        {!!hours && <Text style={styles.customerPreviewLineMeta}>{hours}</Text>}
      </View>
      <Text style={[styles.customerPreviewLineAmount, strong && styles.customerPreviewLineStrong, total && styles.customerPreviewTotalAmount]}>{formatCurrency(amount)}</Text>
    </View>
  );
}

function CompletionCheckRow({ done, title, detail }) {
  return (
    <View style={styles.completionCheckRow}>
      <View style={[styles.completionCheckIcon, done && styles.completionCheckIconDone]}>
        <Ionicons name={done ? 'checkmark' : 'alert'} size={13} color={done ? '#FFFFFF' : '#F04416'} />
      </View>
      <View style={styles.completionCheckInfo}>
        <Text style={styles.completionCheckTitle}>{title}</Text>
        <Text style={styles.completionCheckDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function Tab({ icon, label, active, badge }) {
  return (
    <View style={styles.tabItem} pointerEvents="none">
      <View>
        <Ionicons name={icon} size={24} color={active ? '#F04416' : '#17191D'} />
        {!!badge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

let _authToken = null;
let _refreshToken = null;
let _onAuthFailure = null;
let _refreshPromise = null;

async function tryRefreshToken() {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: _refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const data = await res.json();
      _authToken = data.token;
      _refreshToken = data.refreshToken;
      await SecureStore.setItemAsync('providerToken', data.token);
      await SecureStore.setItemAsync('providerRefreshToken', data.refreshToken);
      return true;
    } catch {
      _onAuthFailure?.();
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

function parseResponse(text, contentType, status) {
  if (!text) return null;
  if (!contentType.includes('application/json')) throw new Error(`Expected JSON, received ${contentType || 'unknown content type'}`);
  return JSON.parse(text);
}

async function fetchJson(url, options = {}) {
  const makeHeaders = () => ({
    ...(options.headers || {}),
    ...(_authToken && _authToken !== 'logged_in' ? { Authorization: `Bearer ${_authToken}` } : {}),
  });

  const response = await fetch(url, { ...options, headers: makeHeaders() });
  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';

  // Auto-refresh on 401
  if (response.status === 401 && _refreshToken) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retry = await fetch(url, { ...options, headers: makeHeaders() });
      const retryText = await retry.text();
      const retryCT = retry.headers.get('content-type') || '';
      if (!retry.ok) {
        const payload = retryText ? JSON.parse(retryText) : {};
        const e = new Error(payload.error || payload.message || `Request failed: ${retry.status}`);
        e.status = retry.status;
        throw e;
      }
      return parseResponse(retryText, retryCT, retry.status);
    }
    return null;
  }

  if (!response.ok) {
    let message = `Request failed: ${response.status}`;
    if (contentType.includes('application/json') && text) {
      const payload = JSON.parse(text);
      message = payload.error || payload.message || message;
    } else if (text) {
      message = `${message} ${text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`;
    }
    const e = new Error(message);
    e.status = response.status;
    throw e;
  }
  return parseResponse(text, contentType, response.status);
}


function DeclineBookingModal({ order, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  if (!order) return null;
  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
          <Text style={{ color: '#17191D', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>Decline Booking</Text>
          <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>Let the client know why you can't accept this booking request.</Text>
          <TextInput
            style={{ backgroundColor: '#F5F6F8', borderRadius: 12, padding: 14, fontSize: 14, color: '#17191D', minHeight: 90, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 20 }}
            placeholder="Reason for declining (optional)"
            placeholderTextColor="#9CA3AF"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
          <TouchableOpacity
            style={{ backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
            activeOpacity={0.84}
            onPress={() => { onConfirm(order, note.trim()); setNote(''); }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Decline Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => { setNote(''); onClose(); }}>
            <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const COUNTER_SLOTS = ['8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'];
const COUNTER_DAYS_AHEAD = 14;

function CounterOfferModal({ order, onClose, onConfirm }) {
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  if (!order) return null;

  const today = new Date(); today.setHours(0,0,0,0);
  const days = Array.from({ length: COUNTER_DAYS_AHEAD }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i + 1); return d;
  });
  const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const canSend = selectedDate && selectedSlot;

  return (
    <Modal visible={!!order} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '85%' }}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={{ color: '#17191D', fontSize: 18, fontWeight: '800', marginBottom: 6 }}>Suggest Another Time</Text>
            <Text style={{ color: '#6B7280', fontSize: 14, marginBottom: 20 }}>Pick a date and time that works for you.</Text>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => {
                const sel = selectedDate && d.toDateString() === selectedDate.toDateString();
                return (
                  <TouchableOpacity key={i} onPress={() => setSelectedDate(d)} activeOpacity={0.8}
                    style={{ width: 56, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: sel ? '#7C3AED' : '#ECEEF0', backgroundColor: sel ? '#F5F0FF' : '#F9FAFB', gap: 3 }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: sel ? '#7C3AED' : '#6B7280' }}>{DAY_NAMES[d.getDay()]}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: sel ? '#7C3AED' : '#17191D' }}>{d.getDate()}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: sel ? '#7C3AED' : '#9CA3AF' }}>{MONTH_NAMES[d.getMonth()]}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Select Time</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {COUNTER_SLOTS.map(slot => {
                const sel = selectedSlot === slot;
                return (
                  <TouchableOpacity key={slot} onPress={() => setSelectedSlot(slot)} activeOpacity={0.8}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: sel ? '#7C3AED' : '#ECEEF0', backgroundColor: sel ? '#F5F0FF' : '#F9FAFB' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#7C3AED' : '#5E646D' }}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ color: '#9CA3AF', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Message to Client (optional)</Text>
            <TextInput
              style={{ backgroundColor: '#F5F6F8', borderRadius: 12, padding: 14, fontSize: 14, color: '#17191D', minHeight: 72, textAlignVertical: 'top', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 20 }}
              placeholder="e.g. We're fully booked on your selected date, but can fit you in on this day!"
              placeholderTextColor="#9CA3AF"
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={300}
            />

            <TouchableOpacity
              style={{ backgroundColor: canSend ? '#7C3AED' : '#D1D5DB', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}
              activeOpacity={0.84}
              disabled={!canSend}
              onPress={() => {
                if (!canSend) return;
                onConfirm(order, selectedDate.toISOString(), selectedSlot, note.trim());
                setNote(''); setSelectedDate(null); setSelectedSlot(null);
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Send Suggestion</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => { setNote(''); setSelectedDate(null); setSelectedSlot(null); onClose(); }}>
              <Text style={{ color: '#6B7280', fontSize: 15, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CalendarPickerModal({ visible, onClose, onSelect }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [pickedDate, setPickedDate] = useState(null);
  const [pickedTime, setPickedTime] = useState(null);

  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    timeSlots.push(`${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`);
    if (h < 17) timeSlots.push(`${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`);
  }
  const timeRows = [];
  for (let i = 0; i < timeSlots.length; i += 4) timeRows.push(timeSlots.slice(i, 4 + i));
  const CHIP_W = Math.floor((Dimensions.get('window').width - 32 - 24) / 4);

  const firstDOW = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const calCells = [];
  for (let i = 0; i < firstDOW; i++) calCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calCells.push(d);
  while (calCells.length % 7 !== 0) calCells.push(null);
  const weeks = [];
  for (let i = 0; i < calCells.length; i += 7) weeks.push(calCells.slice(i, i + 7));

  const isPast = (d) => d && new Date(viewYear, viewMonth, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const isSelected = (d) => pickedDate && d === pickedDate.getDate() && viewYear === pickedDate.getFullYear() && viewMonth === pickedDate.getMonth();
  const isToday = (d) => d && viewYear === today.getFullYear() && viewMonth === today.getMonth() && d === today.getDate();

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <TouchableOpacity style={calStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={calStyles.sheet}>
          <View style={calStyles.handle} />
          <View style={calStyles.header}>
            <Text style={calStyles.title}>Pick Date & Time</Text>
            <TouchableOpacity style={calStyles.closeBtn} onPress={onClose} activeOpacity={0.8}>
              <Ionicons name="close" size={20} color="#5E646D" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={calStyles.content}>
            {/* Month nav */}
            <View style={calStyles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={20} color="#17191D" />
              </TouchableOpacity>
              <Text style={calStyles.monthLabel}>{monthName}</Text>
              <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={20} color="#17191D" />
              </TouchableOpacity>
            </View>

            {/* Weekday headers */}
            <View style={calStyles.weekRow}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <Text key={d} style={calStyles.weekDay}>{d}</Text>
              ))}
            </View>

            {/* Calendar grid */}
            {weeks.map((week, wi) => (
              <View key={wi} style={calStyles.weekRow}>
                {week.map((d, di) => {
                  const past = isPast(d);
                  const sel = isSelected(d);
                  const tod = isToday(d);
                  return (
                    <TouchableOpacity
                      key={di}
                      style={[calStyles.dayCell, sel && calStyles.dayCellSelected, tod && !sel && calStyles.dayCellToday]}
                      onPress={() => { if (d && !past) setPickedDate(new Date(viewYear, viewMonth, d)); }}
                      activeOpacity={d && !past ? 0.8 : 1}
                      disabled={!d || past}
                    >
                      <Text style={[calStyles.dayCellText, past && calStyles.dayCellPast, sel && calStyles.dayCellTextSelected, tod && !sel && calStyles.dayCellTextToday]}>
                        {d || ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            {/* Time picker — shows after date selected */}
            {!!pickedDate && (
              <>
                <Text style={calStyles.timeSectionLabel}>SELECT TIME</Text>
                <View style={calStyles.timesGrid}>
                  {timeRows.map((row, ri) => (
                    <View key={ri} style={calStyles.timeRow}>
                      {row.map(slot => (
                        <TouchableOpacity
                          key={slot}
                          style={[calStyles.timeChip, { width: CHIP_W }, pickedTime === slot && calStyles.timeChipActive]}
                          onPress={() => setPickedTime(slot)}
                          activeOpacity={0.8}
                        >
                          <Text style={[calStyles.timeChipText, pickedTime === slot && calStyles.timeChipTextActive]}>{slot}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              style={[calStyles.confirmBtn, (!pickedDate || !pickedTime) && calStyles.confirmBtnDisabled, { marginTop: 20 }]}
              activeOpacity={(pickedDate && pickedTime) ? 0.84 : 1}
              onPress={() => { if (pickedDate && pickedTime) { onSelect(pickedDate, pickedTime); onClose(); } }}
            >
              <Text style={calStyles.confirmBtnText}>
                {pickedDate && pickedTime
                  ? `Confirm · ${pickedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${pickedTime}`
                  : 'Select date & time'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.55)' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1E4E8', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  title: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  monthLabel: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', color: '#9CA3AF', fontSize: 11, fontWeight: '700', paddingBottom: 8 },
  dayCell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  dayCellSelected: { backgroundColor: '#2563EB' },
  dayCellToday: { borderWidth: 1, borderColor: '#2563EB' },
  dayCellText: { color: '#17191D', fontSize: 14, fontWeight: '600' },
  dayCellTextSelected: { color: '#FFF' },
  dayCellTextToday: { color: '#2563EB' },
  dayCellPast: { color: '#D1D5DB' },
  timeSectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 20, marginBottom: 12 },
  timesGrid: { gap: 8 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeChip: { height: 40, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  timeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timeChipText: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  timeChipTextActive: { color: '#FFF' },
  confirmBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  confirmBtnDisabled: { backgroundColor: '#C4C9D1' },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});

const QUICK_OPTIONS = [
  { icon: 'partly-sunny-outline', color: '#F97316', label: 'Tomorrow\nMorning', sub: '8:00 AM – 12:00 PM', day: 1, time: '8:00 AM' },
  { icon: 'sunny-outline',        color: '#F97316', label: 'Tomorrow\nAfternoon', sub: '12:00 PM – 5:00 PM', day: 1, time: '12:00 PM' },
  { icon: 'calendar-outline',     color: '#7C3AED', label: 'Pick Custom\nDate & Time', sub: 'Choose manually', day: null, time: null },
];

function AppointmentModal({ order, onClose, onConfirm }) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
  const timeSlots = [];
  for (let h = 8; h <= 17; h++) {
    timeSlots.push(`${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`);
    if (h < 17) timeSlots.push(`${h > 12 ? h - 12 : h}:30 ${h >= 12 ? 'PM' : 'AM'}`);
  }

  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedTime, setSelectedTime] = useState(null);
  const [message, setMessage] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [customDate, setCustomDate] = useState(null);

  useEffect(() => {
    if (!order) {
      setSelectedDay(1);
      setSelectedTime(null);
      setMessage('');
      setCalOpen(false);
      setCustomDate(null);
    }
  }, [order]);

  const timeRows = [];
  for (let i = 0; i < timeSlots.length; i += 4) timeRows.push(timeSlots.slice(i, 4 + i));
  const CHIP_W = Math.floor((Dimensions.get('window').width - 32 - 24) / 4);

  const customerRequestedTime = order?.scheduledSlotLabel || order?.scheduledSlot || 'Today • 2:00 PM';

  const getConfirmDate = () => customDate || days[selectedDay];

  const getSelectedLabel = () => {
    if (!selectedTime) return null;
    const d = getConfirmDate();
    const isToday2 = d.toDateString() === today.toDateString();
    const isTomorrow2 = d.toDateString() === new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toDateString();
    const dayStr = isToday2 ? 'Today' : isTomorrow2 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dayStr} at ${selectedTime}`;
  };

  return (
    <Modal visible={!!order} animationType="slide" transparent onRequestClose={onClose}>
      <View style={apptStyles.overlay}>
        <TouchableOpacity style={apptStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={apptStyles.sheet}>
          <View style={apptStyles.handle} />

          {/* Header */}
          <View style={apptStyles.header}>
            <View style={apptStyles.headerIcon}>
              <Ionicons name="calendar-outline" size={18} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={apptStyles.title}>Suggest New Time</Text>
              <Text style={apptStyles.sub}>Propose an alternative time for this job</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={apptStyles.closeBtn}>
              <Ionicons name="close" size={20} color="#5E646D" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={apptStyles.content}>

            {/* Customer requested banner */}
            <View style={apptStyles.requestedBanner}>
              <View style={apptStyles.requestedIconCircle}>
                <Ionicons name="time-outline" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={apptStyles.requestedLabel}>Customer requested</Text>
                <Text style={apptStyles.requestedTime}>{customerRequestedTime}</Text>
              </View>
            </View>
            <Text style={apptStyles.instructionText}>Choose a different time to propose to the customer.</Text>

            {/* Select day */}
            <Text style={apptStyles.sectionLabel}>SELECT DAY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={apptStyles.daysRow}>
              {days.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={[apptStyles.dayChip, !customDate && selectedDay === i && apptStyles.dayChipActive]}
                  onPress={() => { setSelectedDay(i); setCustomDate(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[apptStyles.dayChipLabel, !customDate && selectedDay === i && apptStyles.dayChipTextActive]}>
                    {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[apptStyles.dayChipDate, !customDate && selectedDay === i && apptStyles.dayChipTextActive]}>
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ))}
              {customDate ? (
                <TouchableOpacity style={[apptStyles.dayChip, apptStyles.dayChipActive]} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
                  <Text style={[apptStyles.dayChipLabel, apptStyles.dayChipTextActive]}>
                    {customDate.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[apptStyles.dayChipDate, apptStyles.dayChipTextActive]}>
                    {customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={apptStyles.dayChipMore} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
                  <Ionicons name="calendar-outline" size={14} color="#2563EB" />
                  <Text style={apptStyles.dayChipMoreText}>More</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Select time */}
            <Text style={[apptStyles.sectionLabel, { marginTop: 22 }]}>SELECT TIME</Text>
            <View style={apptStyles.timesGrid}>
              {timeRows.map((row, ri) => (
                <View key={ri} style={apptStyles.timeRow}>
                  {row.map(slot => (
                    <TouchableOpacity
                      key={slot}
                      style={[apptStyles.timeChip, { width: CHIP_W }, selectedTime === slot && apptStyles.timeChipActive]}
                      onPress={() => setSelectedTime(slot)}
                      activeOpacity={0.8}
                    >
                      <Text style={[apptStyles.timeChipText, selectedTime === slot && apptStyles.timeChipTextActive]}>{slot}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Message to customer */}
            <Text style={[apptStyles.sectionLabel, { marginTop: 22 }]}>MESSAGE TO CUSTOMER (OPTIONAL)</Text>
            <View style={apptStyles.messageBox}>
              <Ionicons name="chatbubble-outline" size={18} color="#9CA3AF" style={{ marginTop: 2 }} />
              <TextInput
                style={apptStyles.messageInput}
                placeholder="Add a note for the customer..."
                placeholderTextColor="#9CA3AF"
                multiline
                maxLength={200}
                value={message}
                onChangeText={setMessage}
              />
              <Text style={apptStyles.messageCount}>{message.length}/200</Text>
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={apptStyles.footer}>
            <TouchableOpacity
              style={[apptStyles.confirmBtn, !selectedTime && apptStyles.confirmBtnDisabled]}
              activeOpacity={selectedTime ? 0.84 : 1}
              onPress={() => {
                if (!selectedTime) return;
                const d = getConfirmDate();
                const appointmentTime = `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}, ${selectedTime}`;
                onConfirm(order, appointmentTime);
              }}
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <View style={{ alignItems: 'center' }}>
                <Text style={apptStyles.confirmBtnText}>Send Proposal</Text>
                {!!selectedTime && <Text style={apptStyles.confirmBtnSub}>{getSelectedLabel()}</Text>}
              </View>
            </TouchableOpacity>
            <View style={apptStyles.footerNote}>
              <Ionicons name="lock-closed-outline" size={12} color="#9CA3AF" />
              <Text style={apptStyles.footerNoteText}>The customer will be notified and can accept or decline.</Text>
            </View>
          </View>
        </View>
      </View>

      <CalendarPickerModal
        visible={calOpen}
        onClose={() => setCalOpen(false)}
        onSelect={(date, time) => {
          setCustomDate(date);
          setSelectedTime(time);
          setCalOpen(false);
        }}
      />
    </Modal>
  );
}

const apptStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(23,25,29,0.55)' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E1E4E8', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  headerIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  sub: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  requestedBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA', padding: 12, marginBottom: 12 },
  requestedIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  requestedLabel: { color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  requestedTime: { color: '#F97316', fontSize: 15, fontWeight: '800' },
  instructionText: { color: '#5E646D', fontSize: 13, lineHeight: 19, marginBottom: 18 },
  sectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 12 },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  quickCard: { flex: 1, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#ECEEF0', padding: 10, gap: 4 },
  quickLabel: { color: '#17191D', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  quickSub: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
  daysRow: { gap: 8, paddingRight: 4 },
  dayChip: { minWidth: 68, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  dayChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  dayChipLabel: { color: '#17191D', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  dayChipDate: { color: '#5E646D', fontSize: 10, fontWeight: '500' },
  dayChipTextActive: { color: '#FFFFFF' },
  dayChipMore: { minWidth: 56, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', alignItems: 'center', justifyContent: 'center', gap: 3 },
  dayChipMoreText: { color: '#2563EB', fontSize: 11, fontWeight: '700' },
  customDateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F9FAFB' },
  customDateIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  customDateLabel: { flex: 1, color: '#2563EB', fontSize: 13, fontWeight: '600' },
  timesGrid: { gap: 8 },
  timeRow: { flexDirection: 'row', gap: 8 },
  timeChip: { height: 42, borderRadius: 10, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center' },
  timeChipActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  timeChipText: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  timeChipTextActive: { color: '#FFFFFF' },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F9FAFB', padding: 12 },
  messageInput: { flex: 1, color: '#17191D', fontSize: 13, minHeight: 36, maxHeight: 72 },
  messageCount: { color: '#9CA3AF', fontSize: 10, alignSelf: 'flex-end' },
  footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderTopWidth: 1, borderTopColor: '#F0F1F3', gap: 10 },
  confirmBtn: { backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  confirmBtnDisabled: { backgroundColor: '#C4C9D1' },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  confirmBtnSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  footerNoteText: { color: '#9CA3AF', fontSize: 11 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020C1A' },
  homeSafe: { backgroundColor: '#FFFFFF' },
  screenSlot: { flex: 1 },
  screenVisible: { flex: 1 },
  screenHidden: { flex: 1, display: 'none' },
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
  onlineTextActive: { color: '#16A34A' },
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
  swipeTabsIndicator: { position: 'absolute', left: 3, top: 3, bottom: 3, borderRadius: 18, backgroundColor: '#17191D' },
  swipeTabLabelWrap: { alignItems: 'center', justifyContent: 'center' },
  swipeTabLabelSizer: { opacity: 0 },
  swipeTabLabelLayer: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  swipeTabMaskedText: { color: '#FFFFFF' },
  swipePager: { overflow: 'hidden' },
  swipePagerTrack: { flexDirection: 'row', alignItems: 'flex-start' },
  swipePagerPage: { flexShrink: 0 },
  requestsSwipePager: { minHeight: 520 },
  requestsSwipePage: { minHeight: 520 },
  requestList: { gap: 11 },
  requestCard: { minHeight: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  requestCardHit: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 10 },
  requestListIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  requestListInfo: { flex: 1, minWidth: 0 },
  requestListTime: { color: '#F04416', fontSize: 10, lineHeight: 12, fontWeight: '700', marginBottom: 1 },
  requestListTitle: { color: '#17191D', fontSize: 14, lineHeight: 17, fontWeight: '700' },
  requestListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '500' },
  requestListAddress: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '500' },
  requestListMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  requestListMeta: { color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600', flex: 1 },
  requestListAside: { width: 98, alignItems: 'flex-end' },
  requestListPrice: { color: '#F04416', fontSize: 17, lineHeight: 21, fontWeight: '800', marginBottom: 4 },
  requestListEtaPill: { minWidth: 62, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  requestListEtaText: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '500', textAlign: 'right' },
  requestEmptyState: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8 },
  requestEmptyText: { color: '#7A8BA8', fontSize: 13, fontWeight: '700' },
  requestModalOverlay: { flex: 1 },
  requestModalSheet: { flex: 1, backgroundColor: '#FFFFFF' },
  tabBarBackdrop: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 82, zIndex: 8 },
  tabBar: { position: 'absolute', left: 22, right: 22, bottom: 14, height: 68, borderRadius: 34, backgroundColor: '#ECEEF0', borderWidth: 1.2, borderColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: TAB_BAR_PADDING, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 16, zIndex: 9 },
  tabIndicator: { position: 'absolute', left: TAB_BAR_PADDING, top: 4, bottom: 4, borderRadius: 30, backgroundColor: '#DADDE1' },
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
  earningsContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  earningsHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  earningsTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  earningsChartCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 8, position: 'relative' },
  earningsChartTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 3 },
  earningsChartLabel: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  earningsChartValue: { color: '#17191D', fontSize: 21, lineHeight: 25, fontWeight: '800', marginTop: 0 },
  earningsTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  earningsTrendText: { color: '#16A34A', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  earningsPeriodBtn: { height: 29, borderRadius: 15, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9 },
  earningsPeriodText: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  earningsChartArea: { height: 82, justifyContent: 'space-between', marginTop: 1, paddingLeft: 1 },
  earningsChartGridRow: { height: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  earningsChartAxis: { width: 31, color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  earningsChartGridLine: { flex: 1, height: 1, backgroundColor: '#ECEEF0' },
  earningsBarsLayer: { position: 'absolute', left: 42, right: 0, bottom: 7, height: 61, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 7 },
  earningsBarColumn: { width: 20, alignItems: 'center', justifyContent: 'flex-end' },
  earningsBarFill: { width: 5, borderRadius: 4, backgroundColor: '#F04416' },
  earningsChartDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#F04416', marginTop: -4 },
  earningsDaysRow: { marginLeft: 42, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 1, marginTop: 3 },
  earningsDayText: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '700' },
  earningsDayActive: { color: '#F04416' },
  earningsPeakPill: { position: 'absolute', right: 14, top: 67, borderRadius: 5, backgroundColor: '#17191D', paddingHorizontal: 7, paddingVertical: 4 },
  earningsPeakText: { color: '#FFFFFF', fontSize: 9, lineHeight: 12, fontWeight: '900' },
  earningsMetricGrid: { flexDirection: 'row', gap: 8, marginBottom: 7 },
  earningsMetricCard: { flex: 1, minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 },
  earningsMetricIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsMetricText: { flex: 1, minWidth: 0 },
  earningsMetricTitle: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600' },
  earningsMetricValue: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800', marginTop: 0 },
  earningsMetricMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 0 },
  earningsKpiCard: { minHeight: 50, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, marginBottom: 8 },
  earningsKpiItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  earningsKpiDivider: { borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 9 },
  earningsKpiIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsKpiText: { flex: 1, minWidth: 0 },
  earningsKpiValue: { color: '#17191D', fontSize: 13, lineHeight: 16, fontWeight: '800' },
  earningsKpiLabel: { color: '#5E646D', fontSize: 8, lineHeight: 11, fontWeight: '600', marginTop: 1 },
  balanceCard: { minHeight: 68, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 10, marginBottom: 8 },
  balanceTextBlock: { flex: 1, minWidth: 0 },
  balanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceLabel: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  balanceAmount: { color: '#F04416', fontSize: 16, lineHeight: 20, fontWeight: '800', marginTop: 1 },
  balanceMeta: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '600', marginTop: 1 },
  balanceActionBlock: { width: 106, alignItems: 'stretch', gap: 4, flexShrink: 0 },
  withdrawBtn: { height: 30, borderRadius: 8, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  withdrawText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  nextPayoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  nextPayoutText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  earningsListCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingTop: 12, marginBottom: 10 },
  earningsListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5 },
  earningsListTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700' },
  earningsViewAll: { color: '#F04416', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  earningsTransactionRow: { minHeight: 58, borderTopWidth: 1, borderTopColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  earningsTransactionIcon: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  earningsTransactionInfo: { flex: 1, minWidth: 0 },
  earningsTransactionTitle: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  earningsTransactionMeta: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 2 },
  earningsTransactionAmount: { color: '#16A34A', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 0 },
  profileContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  profileHeader: { minHeight: 42, justifyContent: 'center', marginBottom: 14 },
  profileTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  profileHeroCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileAvatarText: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  profileHeroInfo: { flex: 1, minWidth: 0 },
  profileName: { color: '#17191D', fontSize: 18, lineHeight: 23, fontWeight: '700' },
  profileSub: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  profileRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  profileRatingText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  profileDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8CDD4' },
  profileStatusCard: { minHeight: 70, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, marginBottom: 10 },
  profileStatusTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  profileStatusMeta: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  profileStatusToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  profileStatusText: { color: '#8B9098', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  profileStatusTextOnline: { color: '#128A3A' },
  profileOnlineSwitch: { transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }], marginLeft: -3 },
  profileStatsPanel: { minHeight: 76, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, marginBottom: 10 },
  profileStatCard: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderLeftWidth: 1, borderLeftColor: '#E1E4E8' },
  profileStatCardFirst: { borderLeftWidth: 0 },
  profileStatIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  profileStatValue: { color: '#17191D', fontSize: 13, lineHeight: 16, fontWeight: '800', textAlign: 'center' },
  profileStatLabel: { color: '#5E646D', fontSize: 8, lineHeight: 10, fontWeight: '600', marginTop: 1, textAlign: 'center' },
  profileSection: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingTop: 12, marginBottom: 10 },
  profileSectionTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', marginBottom: 5 },
  profileRow: { minHeight: 60, borderTopWidth: 1, borderTopColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  profileRowIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileRowIconDone: { backgroundColor: 'rgba(22,163,74,0.10)' },
  profileRowInfo: { flex: 1, minWidth: 0 },
  profileRowTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  profileRowDetail: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
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
  activeListCard: { minHeight: 98, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, paddingLeft: 11, paddingRight: 9, overflow: 'hidden', position: 'relative' },
  neutralListCard: { paddingLeft: 10 },
  activeListAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  activeListIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  activeListInfo: { flex: 1, minWidth: 0 },
  activeListStatus: { fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  activeListTitle: { color: '#17191D', fontSize: 16, lineHeight: 19, fontWeight: '800' },
  activeListVehicle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1 },
  activeListAddress: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500', marginTop: 1 },
  activeListAside: { width: 98, maxWidth: 98, alignItems: 'flex-end', flexShrink: 0, overflow: 'hidden' },
  activeListPrice: { fontSize: 20, lineHeight: 24, fontWeight: '800', marginBottom: 6, maxWidth: 98, textAlign: 'right' },
  activeListEtaRow: { maxWidth: 98, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginBottom: 4, overflow: 'hidden' },
  activeListEtaIcon: { flexShrink: 0 },
  activeListEta: { fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, maxWidth: 82 },
  activeListDistance: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'right', maxWidth: 98 },
  neutralListStatus: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', marginBottom: 2 },
  neutralListPrice: { color: '#F04416', fontSize: 20, lineHeight: 24, fontWeight: '800', marginBottom: 6, maxWidth: 98, textAlign: 'right' },
  neutralListEta: { color: '#F04416', fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'right', flexShrink: 1, minWidth: 0, maxWidth: 82 },
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
  requestDetailHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 72, backgroundColor: '#FFFFFF' },
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
  jobCustomerCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  customerPopupAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  customerPopupInitials: { color: '#17191D', fontSize: 13, fontWeight: '800' },
  customerPopupInfo: { flex: 1, minWidth: 0 },
  customerNameRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 2 },
  customerPopupName: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '700', flexShrink: 1 },
  customerRatingPill: { height: 20, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, flexShrink: 0 },
  customerRatingText: { color: '#17191D', fontSize: 10, fontWeight: '800' },
  customerTrustedLine: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 16 },
  customerTrustedText: { color: '#F04416', fontSize: 10, lineHeight: 14, fontWeight: '700' },
  customerActionsDivider: { width: 1, height: 48, backgroundColor: '#E1E4E8', marginHorizontal: 1 },
  customerPopupActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerPopupActionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E1E4E8', alignItems: 'center', justifyContent: 'center' },
  vehicleInfoCard: { height: 84, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requestVehicleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center' },
  vehicleMetaBox: { width: 100, minHeight: 44, borderLeftWidth: 1, borderLeftColor: '#E1E4E8', paddingLeft: 8, justifyContent: 'center' },
  requestSpecRow: { alignItems: 'center', justifyContent: 'center', gap: 4 },
  requestSpecLabel: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  requestSpecValue: { color: '#17191D', fontSize: 11, lineHeight: 14, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  difficultyRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  difficultyDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFB000' },
  mapPreview: { height: 148, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  completedSummaryCard: { borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#ECEEF0', marginBottom: 8, overflow: 'hidden' },
  completedSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  completedSummaryRowBorder: { borderTopWidth: 1, borderTopColor: '#ECEEF0' },
  completedSummaryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  completedSummaryLabel: { color: '#8B9098', fontSize: 11, fontWeight: '600', marginBottom: 1 },
  completedSummaryValue: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  completedInvoicePaid: { backgroundColor: '#DCFCE7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  completedInvoicePaidText: { color: '#16A34A', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
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
  arrivedContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 32 },
  arrivedStatusCard: { height: 42, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(22,163,74,0.18)', backgroundColor: 'rgba(22,163,74,0.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 9 },
  arrivedStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  arrivedStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16A34A' },
  arrivedStatusText: { color: '#16A34A', fontSize: 12, lineHeight: 15, fontWeight: '800' },
  arrivedStatusTime: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  arrivedSectionCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 10 },
  arrivedSectionTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '800', marginBottom: 10 },
  diagnosisContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 32 },
  diagnosisHeader: { marginTop: 5, marginBottom: 2 },
  diagnosisCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  diagnosisGroupTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800', marginBottom: 12 },
  diagnosisMetricRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  diagnosisMetricLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  diagnosisItemTitle: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 1 },
  diagnosisVoltage: { color: '#16A34A', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  diagnosisVoltageInputWrap: { width: 86, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 9 },
  diagnosisVoltageInput: { flex: 1, minWidth: 0, color: '#16A34A', fontSize: 14, lineHeight: 18, fontWeight: '800', textAlign: 'right', padding: 0 },
  diagnosisVoltageUnit: { color: '#16A34A', fontSize: 13, lineHeight: 17, fontWeight: '800', marginLeft: 4 },
  diagnosisBlock: { borderTopWidth: 1, borderTopColor: '#E1E4E8', paddingTop: 12, marginTop: 2, marginBottom: 12 },
  diagnosisOptionRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 10 },
  diagnosisOption: { flex: 1, minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  diagnosisOptionSelected: { borderColor: 'rgba(22,163,74,0.34)', backgroundColor: 'rgba(22,163,74,0.08)' },
  diagnosisRadio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.4, borderColor: '#C5CBD3', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  diagnosisRadioSelected: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  diagnosisOptionText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
  diagnosisOptionTextSelected: { color: '#16A34A' },
  diagnosisNotesBlock: { marginBottom: 14 },
  diagnosisNotesLabel: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', marginBottom: 7 },
  diagnosisNotesInput: { minHeight: 86, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 12, lineHeight: 17, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10 },
  diagnosisNotesCount: { color: '#8B9098', fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'right', marginTop: 4 },
  recommendedBlock: { marginBottom: 14 },
  recommendedTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '800', marginBottom: 3 },
  recommendedSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginBottom: 9 },
  recommendedRow: { minHeight: 42, borderRadius: 8, backgroundColor: 'rgba(22,163,74,0.08)', borderWidth: 1, borderColor: 'rgba(22,163,74,0.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 8 },
  recommendedLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  recommendedRowText: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', flexShrink: 1 },
  recommendedCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  estimateContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 32 },
  estimateHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginTop: 5, marginBottom: 10 },
  estimateHeaderText: { flex: 1, minWidth: 0 },
  recommendedReminderCard: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240,68,22,0.18)', backgroundColor: 'rgba(240,68,22,0.07)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  recommendedReminderIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(240,68,22,0.16)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recommendedReminderText: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  estimateCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  estimateCardOptional: { borderColor: 'rgba(240,68,22,0.28)', backgroundColor: 'rgba(240,68,22,0.07)' },
  estimateSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  estimateSectionTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 },
  estimateSectionIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  estimateSectionIconOptional: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(240,68,22,0.18)' },
  estimateSectionTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800', flexShrink: 1 },
  estimateOptionalBadge: { color: '#F04416', fontSize: 9, lineHeight: 12, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, flexShrink: 0 },
  estimateSectionAddBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(22,163,74,0.24)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  estimateLine: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: '#E1E4E8' },
  estimateLineLabel: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  estimateLineMuted: { color: '#5E646D' },
  estimateLineHours: { width: 52, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'right' },
  estimateLineAmount: { width: 74, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  estimateLineStrong: { fontWeight: '900' },
  estimateRemoveBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionalEstimateWrap: { marginBottom: 10 },
  optionalEstimateTitle: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '900', marginBottom: 3 },
  optionalEstimateSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginBottom: 10 },
  estimateTotalCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 20 },
  estimateTotalAmount: { color: '#16A34A', fontSize: 15, lineHeight: 19 },
  previewEstimateBtn: { alignSelf: 'center', height: 40, borderRadius: 9, borderWidth: 1.2, borderColor: 'rgba(22,163,74,0.45)', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 16, marginBottom: 10 },
  previewEstimateText: { color: '#16A34A', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  estimateApprovalNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 },
  estimateApprovalText: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center' },
  callFeeToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 2, marginBottom: 6, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 10 },
  invoiceHeaderCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', padding: 14, marginBottom: 10 },
  invoiceHeaderTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  invoiceIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#F3EEFF', alignItems: 'center', justifyContent: 'center' },
  invoiceTitle: { color: '#17191D', fontSize: 16, fontWeight: '800' },
  invoiceMeta: { color: '#6B7280', fontSize: 12, marginTop: 2, fontWeight: '500' },
  invoiceStatusBadge: { backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FED7AA' },
  invoiceStatusText: { color: '#C2410C', fontSize: 11, fontWeight: '700' },
  invoicePartyCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 10 },
  invoicePartyRow: { paddingVertical: 12 },
  invoicePartyLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 4 },
  invoicePartyName: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  invoicePartySub: { color: '#6B7280', fontSize: 12, marginTop: 2, fontWeight: '500' },
  invoiceDivider: { height: 1, backgroundColor: '#F0F1F3' },
  invoiceSection: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 10 },
  invoiceSectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, paddingTop: 12, paddingBottom: 6 },
  invoiceLineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  invoiceLineRowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  invoiceLineName: { color: '#17191D', fontSize: 13, fontWeight: '600' },
  invoiceLineSub: { color: '#9CA3AF', fontSize: 11, marginTop: 2 },
  invoiceLineAmount: { color: '#17191D', fontSize: 13, fontWeight: '700', marginLeft: 12 },
  invoiceTotalsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 14, marginBottom: 10 },
  invoiceTotalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  invoiceTotalLabel: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  invoiceTotalValue: { color: '#17191D', fontSize: 14, fontWeight: '600' },
  invoiceTotalLabelBold: { color: '#17191D', fontSize: 15, fontWeight: '800' },
  invoiceTotalValueBold: { color: '#17191D', fontSize: 17, fontWeight: '800' },
  invoicePaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16, paddingHorizontal: 2 },
  invoicePaymentText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  collectPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16A34A', borderRadius: 16, paddingVertical: 17, marginBottom: 12 },
  collectPaymentText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  invoiceWarrantyRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 8 },
  invoiceWarrantyText: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  callFeeToggleInfo: { flex: 1, marginRight: 10 },
  callFeeToggleLabel: { color: '#17191D', fontSize: 13, fontWeight: '700' },
  callFeeToggleSub: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  estimatePickerOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  estimatePickerCard: { maxHeight: '82%', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  estimateSearchBox: { height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginBottom: 10 },
  estimateSearchInput: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '600', padding: 0 },
  estimateScopeControl: { height: 40, borderRadius: 8, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', flexDirection: 'row', padding: 3, marginBottom: 10 },
  estimateScopeBtn: { flex: 1, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  estimateScopeBtnActive: { backgroundColor: '#17191D' },
  estimateScopeText: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  estimateScopeTextActive: { color: '#FFFFFF' },
  customEstimateBox: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 10 },
  customEstimateTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800', marginBottom: 8 },
  customEstimateInput: { height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 0, marginBottom: 8 },
  customEstimateRow: { flexDirection: 'row', gap: 8 },
  customEstimateSmallInput: { flex: 1, minWidth: 0 },
  priceWarningBox: { minHeight: 30, borderRadius: 8, backgroundColor: 'rgba(240,68,22,0.08)', borderWidth: 1, borderColor: 'rgba(240,68,22,0.18)', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, marginBottom: 8 },
  priceWarningText: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800', flex: 1 },
  customEstimateAddBtn: { height: 40, borderRadius: 8, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  customEstimateAddText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  estimatePickerList: { maxHeight: 360 },
  estimatePickerRow: { minHeight: 58, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 9, marginBottom: 8 },
  estimatePickerRowInfo: { flex: 1, minWidth: 0 },
  estimatePickerRowTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  estimatePickerRowMeta: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 2 },
  estimatePickerPrice: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '900' },
  estimatePickerEmpty: { minHeight: 110, alignItems: 'center', justifyContent: 'center' },
  customerEstimateOverlay: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  customerEstimateCard: { height: '92%', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  customerEstimateHeader: { height: 58, borderBottomWidth: 1, borderBottomColor: '#ECEEF0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  customerEstimateTitleWrap: { flex: 1, minWidth: 0, alignItems: 'center' },
  customerEstimateTitle: { color: '#17191D', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  customerEstimateSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginTop: 1 },
  customerEstimateScroll: { flex: 1, backgroundColor: '#FFFFFF' },
  customerEstimateContent: { padding: 14, paddingBottom: 22 },
  customerEstimateHero: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, marginBottom: 10 },
  customerEstimateServiceIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E6E8EB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  customerEstimateHeroInfo: { flex: 1, minWidth: 0 },
  customerEstimateService: { color: '#17191D', fontSize: 17, lineHeight: 21, fontWeight: '900' },
  customerEstimateVehicle: { color: '#5E646D', fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 2 },
  customerEstimateLocation: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 3 },
  customerEstimateNotice: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(22,163,74,0.18)', backgroundColor: 'rgba(22,163,74,0.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 10 },
  customerEstimateNoticeText: { flex: 1, minWidth: 0, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  customerPreviewSection: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  customerPreviewSectionOptional: { borderColor: 'rgba(240,68,22,0.28)', backgroundColor: 'rgba(240,68,22,0.07)' },
  customerPreviewSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  customerPreviewSectionTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '900' },
  customerPreviewOptionalPill: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  customerPreviewLine: { minHeight: 34, borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 10 },
  customerPreviewLineInfo: { flex: 1, minWidth: 0 },
  customerPreviewLineLabel: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  customerPreviewLineMeta: { color: '#8B9098', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  customerPreviewLineAmount: { width: 86, color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  customerPreviewLineStrong: { fontWeight: '900' },
  customerPreviewTotalAmount: { color: '#16A34A', fontSize: 15, lineHeight: 19 },
  customerEstimateTotals: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  customerEstimateDivider: { height: 1, backgroundColor: '#E1E4E8', marginVertical: 6 },
  customerPreviewOnlyNote: { minHeight: 42, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  customerPreviewOnlyText: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  approvedEstimateCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(22,163,74,0.22)', backgroundColor: 'rgba(22,163,74,0.06)', padding: 12, marginBottom: 10 },
  approvedEstimateLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  approvedEstimateIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center' },
  approvedEstimateTitle: { color: '#17191D', fontSize: 13, fontWeight: '800' },
  approvedEstimateAmount: { color: '#16A34A', fontSize: 15, fontWeight: '900', marginTop: 1 },
  approvedEstimateRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  approvedEstimateBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9, backgroundColor: '#16A34A' },
  approvedEstimateBadgePartial: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#16A34A' },
  approvedEstimateBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  approvedEstimateBadgeTextPartial: { color: '#16A34A' },
  workSummaryApprovalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  workSummaryApprovalLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workSummaryApprovalLabel: { color: '#16A34A', fontSize: 12, fontWeight: '800' },
  workSummaryApprovalBadge: { borderRadius: 20, paddingVertical: 3, paddingHorizontal: 9, backgroundColor: '#16A34A' },
  workSummaryApprovalBadgePartial: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#16A34A' },
  workSummaryApprovalBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  workSummaryApprovalBadgeTextPartial: { color: '#16A34A' },
  workSummaryOptionalNote: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  workSummaryOptionalNoteText: { color: '#8B9098', fontSize: 11, fontWeight: '600' },
  workSummaryDivider: { height: 1, backgroundColor: '#E1E4E8', marginBottom: 8 },
  approvalConfirmedCard: { borderRadius: 10, borderWidth: 1, borderColor: 'rgba(22,163,74,0.22)', backgroundColor: 'rgba(22,163,74,0.06)', padding: 12, marginBottom: 10 },
  approvalConfirmedTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  approvalConfirmedIconWrap: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(22,163,74,0.12)', alignItems: 'center', justifyContent: 'center' },
  approvalConfirmedTitle: { color: '#17191D', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  approvalConfirmedTime: { color: '#8B9098', fontSize: 11, fontWeight: '600', marginTop: 1 },
  approvalConfirmedBadge: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10, backgroundColor: '#16A34A' },
  approvalConfirmedBadgePartial: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#16A34A' },
  approvalConfirmedBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  approvalConfirmedBadgeTextPartial: { color: '#16A34A' },
  approvalConfirmedAmountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(22,163,74,0.15)', paddingTop: 10 },
  approvalConfirmedAmountLabel: { color: '#5E646D', fontSize: 12, fontWeight: '600' },
  approvalConfirmedAmount: { color: '#16A34A', fontSize: 18, fontWeight: '900' },
  approvalConfirmedNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(22,163,74,0.15)' },
  approvalConfirmedNoteText: { flex: 1, color: '#8B9098', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  declinedNoticeCard: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16, marginBottom: 12 },
  declinedNoticeIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(220,38,38,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  declinedNoticeTitle: { color: '#17191D', fontSize: 20, lineHeight: 25, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  declinedNoticeSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  declinedReasonCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 14, marginBottom: 10 },
  declinedReasonLabel: { color: '#8B9098', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  declinedReasonValue: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  declinedFeeCard: { borderRadius: 10, borderWidth: 1, borderColor: 'rgba(22,163,74,0.2)', backgroundColor: 'rgba(22,163,74,0.06)', padding: 14, marginBottom: 20 },
  declinedFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  declinedFeeLabel: { flex: 1, color: '#17191D', fontSize: 14, fontWeight: '700' },
  declinedFeeAmount: { color: '#16A34A', fontSize: 16, fontWeight: '900' },
  declinedFeeNote: { color: '#5E646D', fontSize: 12, lineHeight: 17 },
  declinedActionsTitle: { color: '#5E646D', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  declinedReviseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#FF6B00', borderRadius: 12, paddingVertical: 15, marginBottom: 10 },
  declinedReviseBtnText: { color: '#FF6B00', fontSize: 15, fontWeight: '700' },
  declinedCloseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E1E4E8', borderRadius: 12, paddingVertical: 15, marginBottom: 24 },
  declinedCloseBtnText: { color: '#5E646D', fontSize: 15, fontWeight: '600' },
  approvalContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 34 },
  approvalHero: { alignItems: 'center', paddingTop: 8, paddingBottom: 16 },
  approvalClock: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#EAB308', borderWidth: 8, borderColor: 'rgba(234,179,8,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  approvalTitle: { color: '#17191D', fontSize: 20, lineHeight: 25, fontWeight: '900', textAlign: 'center' },
  approvalSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  approvalEstimateCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 10, marginBottom: 12 },
  approvalEstimateTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  approvalCardLabel: { color: '#17191D', fontSize: 12, lineHeight: 15, fontWeight: '700', marginBottom: 5 },
  approvalAmount: { color: '#17191D', fontSize: 24, lineHeight: 29, fontWeight: '800' },
  approvalSentTime: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', marginTop: 1 },
  approvalViewRow: { borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, marginTop: 9 },
  approvalViewText: { color: '#5E646D', fontSize: 12, lineHeight: 15, fontWeight: '700' },
  approvalNextCard: { marginBottom: 20 },
  approvalNextTitle: { color: '#17191D', fontSize: 17, lineHeight: 22, fontWeight: '900', marginBottom: 12 },
  approvalNextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginBottom: 10 },
  approvalNextText: { flex: 1, minWidth: 0, color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '700' },
  approvalActions: { flexDirection: 'row', gap: 10 },
  approvalEditBtn: { flex: 1, height: 54, borderRadius: 10, borderWidth: 1.3, borderColor: 'rgba(47,128,255,0.45)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  approvalEditText: { color: '#2F80FF', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  approvalCallBtn: { flex: 1, height: 54, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  approvalCallText: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  approvalDemoBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  approvalDemoText: { color: '#C4C9D1', fontSize: 11, fontWeight: '500' },
  workContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 34 },
  repairProgressCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 13, marginBottom: 12 },
  repairProgressHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  repairProgressTitle: { color: '#17191D', fontSize: 18, lineHeight: 23, fontWeight: '900', marginBottom: 12 },
  repairProgressMeta: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '700', marginBottom: 3 },
  repairTimer: { color: '#17191D', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 1.5 },
  repairLivePill: { height: 28, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(22,163,74,0.24)', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9 },
  repairLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#16A34A' },
  repairLiveText: { color: '#16A34A', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  repairFieldBlock: { marginBottom: 13 },
  repairFieldLabel: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '900', marginBottom: 6 },
  repairFieldText: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  repairPhotosRow: { gap: 8, paddingRight: 2 },
  repairPhotoTile: { width: 84, height: 76, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 7, gap: 5 },
  repairPhotoText: { color: '#5E646D', fontSize: 9, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  repairAddPhotoTile: { width: 84, height: 76, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 4 },
  repairAddPhotoText: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '900', textAlign: 'center' },
  repairNoteCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  repairSummaryInput: { minHeight: 78, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', color: '#17191D', fontSize: 12, lineHeight: 17, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 9, textAlignVertical: 'top' },
  repairCustomerNoteInput: { minHeight: 54, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', color: '#17191D', fontSize: 12, lineHeight: 17, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 9, textAlignVertical: 'top' },
  workContactCard: { minHeight: 68, borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginBottom: 12 },
  workContactInfo: { flex: 1, minWidth: 0 },
  workContactName: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '800' },
  workContactMeta: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 2 },
  workContactActions: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 },
  workContactBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  workSummaryCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  additionalApprovalCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  additionalApprovalSubtitle: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: -4, marginBottom: 11 },
  additionalActionRow: { flexDirection: 'row', gap: 9, marginBottom: 12 },
  additionalRequiredBtn: { flex: 1, minHeight: 48, borderRadius: 9, backgroundColor: '#F04416', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 10 },
  additionalRequiredText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  additionalEmptyBox: { minHeight: 74, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 5 },
  additionalEmptyText: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '700' },
  crCard: { borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(240,68,22,0.28)', backgroundColor: '#FFFFFF', padding: 14, gap: 10 },
  crCardApproved: { borderColor: 'rgba(22,163,74,0.25)', backgroundColor: 'rgba(22,163,74,0.04)' },
  crCardDeclined: { borderColor: 'rgba(220,38,38,0.2)', backgroundColor: 'rgba(220,38,38,0.03)' },
  crHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  crIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(240,68,22,0.1)', alignItems: 'center', justifyContent: 'center' },
  crIconWrapApproved: { backgroundColor: 'rgba(22,163,74,0.1)' },
  crIconWrapDeclined: { backgroundColor: 'rgba(220,38,38,0.08)' },
  crHeaderText: { flex: 1, minWidth: 0 },
  crTitle: { color: '#17191D', fontSize: 13, fontWeight: '800' },
  crSubtitle: { color: '#5E646D', fontSize: 11, fontWeight: '600', marginTop: 1 },
  crAmount: { color: '#F04416', fontSize: 16, fontWeight: '900' },
  crAmountApproved: { color: '#16A34A' },
  crAmountDeclined: { color: '#DC2626' },
  crFieldLabel: { color: '#8B9098', fontSize: 9, lineHeight: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 3 },
  crDesc: { color: '#17191D', fontSize: 12, lineHeight: 17, fontWeight: '500' },
  crEvidenceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  crEvidenceText: { flex: 1, color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '500' },
  crStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  crStatusPending: { backgroundColor: 'rgba(139,144,152,0.08)' },
  crStatusApproved: { backgroundColor: 'rgba(22,163,74,0.08)' },
  crStatusDeclined: { backgroundColor: 'rgba(220,38,38,0.06)' },
  crStatusText: { fontSize: 12, fontWeight: '700', color: '#8B9098' },
  crStatusTextApproved: { color: '#16A34A' },
  crStatusTextDeclined: { color: '#DC2626' },
  additionalItem: { borderRadius: 8, borderWidth: 1, padding: 11, marginBottom: 9 },
  additionalItemRequired: { borderColor: 'rgba(240,68,22,0.28)', backgroundColor: 'rgba(240,68,22,0.07)' },
  additionalItemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  additionalItemInfo: { flex: 1, minWidth: 0 },
  additionalItemKind: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6 },
  additionalItemFieldLabel: { color: '#8B9098', fontSize: 9, lineHeight: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8, marginBottom: 2 },
  additionalItemTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700' },
  additionalItemDescription: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '500' },
  additionalEvidenceLabel: { color: '#8B9098', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  additionalEvidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  additionalEvidenceText: { flex: 1, minWidth: 0, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  additionalItemAmount: { color: '#17191D', fontSize: 15, lineHeight: 19, fontWeight: '900', flexShrink: 0 },
  additionalItemBottom: { borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 9, marginTop: 10 },
  additionalStatusPill: { minHeight: 26, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(234,179,8,0.26)', backgroundColor: '#FFFFFF', justifyContent: 'center', paddingHorizontal: 9, flex: 1 },
  additionalStatusApproved: { borderColor: 'rgba(22,163,74,0.24)', backgroundColor: 'rgba(22,163,74,0.08)' },
  additionalStatusDeclined: { borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF' },
  additionalStatusText: { color: '#A16207', fontSize: 10, lineHeight: 13, fontWeight: '900' },
  additionalStatusTextApproved: { color: '#16A34A' },
  additionalStatusTextDeclined: { color: '#F04416' },
  additionalDemoActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  additionalApproveMini: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  additionalDeclineMini: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(240,68,22,0.28)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  completeWorkBtn: { height: 54, borderRadius: 10, backgroundColor: '#16A34A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2, marginBottom: 10 },
  completeWorkText: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '900' },
  completeContent: { paddingHorizontal: 15, paddingTop: 10, paddingBottom: 34 },
  completeHeroCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, marginBottom: 12 },
  completeHeroIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  completeHeroInfo: { flex: 1, minWidth: 0 },
  completeHeroTitle: { color: '#17191D', fontSize: 18, lineHeight: 23, fontWeight: '900' },
  completeHeroSubtitle: { color: '#5E646D', fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3 },
  completeChecklistCard: { borderRadius: 10, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', padding: 12, marginBottom: 12 },
  completionCheckRow: { minHeight: 54, borderTopWidth: 1, borderTopColor: '#E1E4E8', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  completionCheckIcon: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  completionCheckIconDone: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  completionCheckInfo: { flex: 1, minWidth: 0 },
  completionCheckTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  completionCheckDetail: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 2 },
  completeSummaryText: { color: '#5E646D', fontSize: 12, lineHeight: 18, fontWeight: '700' },
  completePhotosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  completePhotoTile: { width: '31.5%', minHeight: 74, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', padding: 7, gap: 5 },
  completeBlockedCard: { minHeight: 48, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240,68,22,0.22)', backgroundColor: 'rgba(240,68,22,0.07)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, paddingVertical: 9, marginBottom: 12 },
  completeBlockedText: { flex: 1, minWidth: 0, color: '#F04416', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  completeSubmitBtn: { height: 56, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  completeSubmitText: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '900' },
  changeRequestOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  changeRequestCard: { borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  changeRequestHeaderText: { flex: 1, minWidth: 0 },
  changeRequestSubtitle: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 2 },
  changeRequestLabel: { color: '#17191D', fontSize: 12, lineHeight: 16, fontWeight: '900', marginBottom: 6 },
  changeRequestInput: { height: 42, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', paddingHorizontal: 11, paddingVertical: 0, marginBottom: 11 },
  changeRequestTextArea: { minHeight: 92, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '700', paddingHorizontal: 11, paddingVertical: 9, textAlignVertical: 'top', marginBottom: 11 },
  changeRequestEvidenceBox: { minHeight: 64, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240,68,22,0.24)', backgroundColor: 'rgba(240,68,22,0.06)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, paddingVertical: 10, marginBottom: 13 },
  changeRequestEvidenceTextWrap: { flex: 1, minWidth: 0 },
  changeRequestEvidenceTitle: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '900' },
  changeRequestEvidenceHint: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 2 },
  arrivedChecklistTitle: { color: '#17191D', fontSize: 22, lineHeight: 27, fontWeight: '800', marginBottom: 8 },
  arrivedChecklistSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 14 },
  arrivedChecklistBox: { overflow: 'hidden' },
  arrivedNextRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  arrivedNextRowBorder: { borderTopWidth: 1, borderTopColor: '#ECEEF0' },
  arrivedNextInfo: { flex: 1, minWidth: 0 },
  arrivedNextTitleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' },
  arrivedNextTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800' },
  arrivedNextOptional: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600' },
  arrivedNextSubtitle: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  arrivedCheckCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  arrivedCheckCircleDone: { borderColor: '#16A34A', backgroundColor: '#16A34A' },
  quickActionGrid: { flexDirection: 'row', gap: 8 },
  quickActionTile: { flex: 1, minHeight: 82, borderRadius: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5, gap: 7 },
  quickActionIcon: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  quickActionText: { color: '#17191D', fontSize: 10, lineHeight: 13, fontWeight: '800', textAlign: 'center' },
  startInspectionBtn: { height: 58, borderRadius: 10, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  startInspectionText: { color: '#FFFFFF', fontSize: 17, lineHeight: 21, fontWeight: '800' },
  startInspectionBtnDisabled: { backgroundColor: '#E6E8EB' },
  startInspectionTextDisabled: { color: '#8B9098' },
  checklistKeyboardAvoider: { flex: 1 },
  checklistModalOverlay: { flex: 1, justifyContent: 'flex-end', padding: 15 },
  checklistModalCard: { maxHeight: '86%', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#FFFFFF', padding: 14, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  checklistModalSubtitle: { color: '#5E646D', fontSize: 13, lineHeight: 18, fontWeight: '600', marginBottom: 12 },
  checklistTextInput: { minHeight: 132, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', color: '#17191D', fontSize: 13, lineHeight: 18, fontWeight: '600', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  photoUploadBox: { minHeight: 132, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12, padding: 12 },
  photoUploadTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '800', textAlign: 'center' },
  photoUploadHint: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  requiredPhotosList: { marginBottom: 12 },
  requiredPhotoRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9, paddingVertical: 4 },
  requiredPhotoInfo: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9 },
  requiredPhotoCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  requiredPhotoCheckDone: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  requiredPhotoTextWrap: { flex: 1, minWidth: 0 },
  requiredPhotoLabel: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '700', flexShrink: 1 },
  requiredPhotoHint: { color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600', marginTop: 1 },
  requiredPhotoStateDone: { color: '#16A34A', fontSize: 10, lineHeight: 13, fontWeight: '700', marginTop: 1 },
  requiredPhotoActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  addPhotoBtn: { height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240,68,22,0.28)', backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, flexShrink: 0 },
  addPhotoIconBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(240,68,22,0.28)', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  addPhotoBtnDone: { borderColor: 'rgba(22,163,74,0.26)', backgroundColor: 'rgba(22,163,74,0.08)' },
  addPhotoText: { color: '#F04416', fontSize: 10, lineHeight: 13, fontWeight: '800' },
  addPhotoTextDone: { color: '#16A34A' },
  complaintConfirmBox: { borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#F3F4F5', paddingHorizontal: 12, marginBottom: 12 },
  complaintConfirmRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  complaintConfirmRowBorder: { borderTopWidth: 1, borderTopColor: '#E1E4E8' },
  complaintConfirmTextWrap: { flex: 1, minWidth: 0 },
  complaintConfirmLabel: { color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '800' },
  complaintConfirmValue: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  complaintDecisionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  complaintDecisionBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#E1E4E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  complaintDecisionConfirmed: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  complaintDecisionDenied: { backgroundColor: '#F04416', borderColor: '#F04416' },
  checklistSaveBtn: { height: 50, borderRadius: 9, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center' },
  checklistSaveText: { color: '#FFFFFF', fontSize: 15, lineHeight: 19, fontWeight: '800' },
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
  jobDetailSectionRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  jobDetailSectionLabel: { flex: 1, color: '#5E646D', fontSize: 10, lineHeight: 13, fontWeight: '600' },
  diagnosticIndent: { paddingLeft: 34 },
  diagnosticRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 7, paddingRight: 22, borderBottomWidth: 1, borderBottomColor: '#E1E4E8' },
  diagnosticDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#C4C9D1', marginTop: 4 },
  diagnosticLabel: { flex: 2, color: '#5E646D', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  diagnosticValue: { flex: 1, color: '#17191D', fontSize: 11, lineHeight: 15, fontWeight: '600', textAlign: 'right' },
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

