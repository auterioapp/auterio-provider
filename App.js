import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Easing, Linking, Modal, PanResponder, Platform, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import WelcomeScreen from './screens/WelcomeScreen';
import AuthScreen from './screens/AuthScreen';
import BusinessInfoScreen from './screens/BusinessInfoScreen';
import ProviderSetupScreen from './screens/ProviderSetupScreen';
import SetupSuccessScreen from './screens/SetupSuccessScreen';
import HomeScreen from './screens/HomeScreen';
import EarningsScreen from './screens/EarningsScreen';
import ProfileScreen from './screens/ProfileScreen';
import RequestsScreen from './screens/RequestsScreen';
import RequestDetailScreen from './screens/RequestDetailScreen';
import ShopRequestDetailScreen from './screens/ShopRequestDetailScreen';
import { getServiceMode } from './utils/serviceUtils';
import JobsScreen from './screens/JobsScreen';
import JobDetailScreen from './screens/JobDetailScreen';
import { getJobProgressIndex } from './utils/jobUtils';
import { API_URL, TAB_BAR_PADDING, TAB_INDICATOR_EXTRA_WIDTH, TAB_INDICATOR_DROP_SCALE, TABS, ACTIVE_SHOP_STATUSES } from './constants';

import { getServiceMeta, getRequestLocation, getBackendStatusFromWorkflowStage } from './utils/serviceUtils';
import { loadPricing, savePricing, DEFAULT_PRICING } from './utils/pricingStore';
import { setAuthFailureHandler as setApiAuthFailureHandler } from './apiClient';
import { ProviderContextProvider, useProvider } from './ProviderContext';
import styles from './appStyles';
import { pulseTabChange } from './utils/haptics';
import { fetchJson, setAuthToken, setRefreshToken, setOnAuthFailure } from './jobApiClient';
import JobPopupScreen from './screens/JobPopupScreen';
import Tab from './components/Tab';
import DeclineBookingModal from './components/modals/DeclineBookingModal';
import CounterOfferModal from './components/modals/CounterOfferModal';
import AppointmentModal from './components/modals/AppointmentModal';

const DEMO_EMAIL = 'auterioapp@gmail.com';

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pushToken }),
    });
  } catch (e) {
    console.log('Push token registration failed:', e.message);
  }
}


// order.shopStatus only ever exists locally (set by updateShopStep while the app is
// open) — it is never persisted to the backend. Whenever a job is (re)built from a
// fresh server response (initial load, polling), shopStatus is missing and must be
// derived from the real order.status, otherwise ShopRequestDetailScreen falls back
// to 'scheduled' and shows stale step buttons even though work has already started.
const SHOP_STATUS_FROM_ORDER_STATUS = {
  arrived: 'checked_in',
  inspection: 'inspection',
  estimate_sent: 'waiting_approval',
  estimate_approved: 'in_progress',
  in_progress: 'in_progress',
  completed: 'completed',
};

// jobWorkflows[job.id].stage only ever exists locally (set while the app is open,
// via onWorkflowChange) — it is pure in-memory state, never persisted. If it's
// missing (app reload, or the customer advanced the order while this screen wasn't
// open), JobPopupScreen falls back to its default "Accepted" view even though the
// real order.status has already moved past that. Derive a fallback stage from the
// real status so the correct step screen opens instead.
const MOBILE_STAGE_FROM_STATUS = {
  en_route: 'route',
  arrived: 'arrived',
  inspection: 'diagnosis',
  estimate_sent: 'approval',
  in_progress: 'working',
};


function normalizeOrderToJob(order) {
  const serviceMeta = getServiceMeta(order);
  const requestId = order.id || order._id || `local-${Date.now()}`;
  const number = order.number || String(requestId).replace(/\D/g, '').slice(-5) || '12345';
  const customerName = order.customer?.name || order.contactInfo?.name || 'Customer';
  const initials = customerName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'CU';
  const total = Number(order.payment?.total || order.payment?.totalHeld || order.payment?.priceMax || order.price || order.total || 0);
  const shopStatus = order.shopStatus || (getServiceMode(order) === 'shop' ? SHOP_STATUS_FROM_ORDER_STATUS[order.status] : undefined);
  // approvedTotal/approveOptional/estimateApprovedAt/additionalApprovals live under
  // orderContext on the backend but are read as top-level job fields in the provider
  // UI — same fallback pattern as shopStatus, otherwise they vanish on every poll.
  const approvedTotal = order.approvedTotal ?? order.orderContext?.approvedTotal ?? null;
  const approveOptional = order.approveOptional ?? order.orderContext?.approveOptional ?? null;
  const estimateApprovedAt = order.estimateApprovedAt || order.orderContext?.estimateApprovedAt || null;
  const additionalApprovals = order.additionalApprovals || order.orderContext?.additionalApprovals || [];

  return {
    ...order,
    id: requestId,
    number,
    status: order.status && order.status !== 'pending' ? order.status : 'accepted',
    shopStatus,
    approvedTotal,
    approveOptional,
    estimateApprovedAt,
    additionalApprovals,
    eta: order.tracking?.eta || order.eta || '20-30 min',
    accent: order.accent || '#F04416',
    icon: order.icon || serviceMeta.icon,
    customer: {
      id: order.customer?.id || null,
      name: customerName,
      initials,
      phone: order.customer?.phone || order.contactInfo?.phone || '',
      email: order.customer?.email || order.contactInfo?.email || '',
      phoneVerified: !!order.customer?.phoneVerified,
    },
    service: {
      ...(order.service || {}),
      type: order.service?.type || serviceMeta.title,
      icon: order.service?.icon || serviceMeta.icon,
    },
    vehicle: {
      make: order.vehicle?.make || '',
      model: order.vehicle?.model || '',
      year: order.vehicle?.year || '',
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

function isBookingOrder(order) {
  return !!order && (
    order.status === 'scheduled_pending' ||
    order.status === 'scheduled' ||
    order.status === 'confirmed' ||
    order.isScheduledRequest ||
    !!order.scheduledAt
  );
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

function AppInner() {
  const { provider, updateProvider, resetProvider, applyProviderUser } = useProvider();
  const [authState, setAuthState] = useState('loading');
  const pendingBusinessType = useRef('mobile');
  const pendingCredentials = useRef(null);
  const [businessInfoLoading, setBusinessInfoLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [providerLiveCoord, setProviderLiveCoord] = useState(null);
  const [activeScreen, setActiveScreen] = useState('home');
  const [activeTab, setActiveTab] = useState('home');
  const [previewTab, setPreviewTab] = useState('home');
  const [screenResetNonce, setScreenResetNonce] = useState(0);
  const [tabBarWidth, setTabBarWidth] = useState(0);
  const [jobsInitialTab, setJobsInitialTab] = useState(null);
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
  const getJobWorkflowFor = (job) => {
    const existing = jobWorkflows[job?.id];
    if (existing?.stage) return existing;
    const fallbackStage = MOBILE_STAGE_FROM_STATUS[job?.status];
    return fallbackStage ? { ...existing, stage: fallbackStage } : (existing || {});
  };
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
  const appStateRef = useRef(AppState.currentState);

  const [isDemo, setIsDemo] = useState(false);
  const [completedOrders, setCompletedOrders] = useState([]);

  const dashboardRequests = requests;
  const providerJobs = useMemo(() => isDemo ? [...DEMO_JOBS, ...acceptedJobs] : [...acceptedJobs, ...completedOrders], [acceptedJobs, completedOrders, isDemo]);
  const activeJobs = useMemo(() => providerJobs.filter(job =>
    ACTIVE_SHOP_STATUSES.includes(job.shopStatus) ||
    (job.status !== 'completed' && job.status !== 'scheduled' && job.status !== 'confirmed' && job.status !== 'proposed' && job.status !== 'cancelled' && job.status !== 'declined')
  ).length, [providerJobs]);
  const pendingCount = dashboardRequests.length;
  const todayScheduledJobs = useMemo(() => {
    if (isDemo) return [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    return acceptedJobs
      .filter(job => ['scheduled', 'confirmed', 'proposed'].includes(job.status) && job.scheduledAt)
      .filter(job => { const d = new Date(job.scheduledAt); return d >= start && d < end; })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  }, [acceptedJobs, isDemo]);
  const tabWidth = tabBarWidth ? (tabBarWidth - TAB_BAR_PADDING * 2) / TABS.length : 0;
  const isLightVisible = !!selectedRequest || (!selectedRequest && (activeScreen === 'home' || activeScreen === 'requests' || activeScreen === 'jobs' || activeScreen === 'earnings' || activeScreen === 'profile'));
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
        ['accepted', 'confirmed', 'scheduled', 'en_route', 'arrived', 'inspection', 'estimate_sent', 'estimate_approved', 'in_progress'].includes(o.status)
      );
      const done = data.filter(o => o.status === 'completed');
      setAcceptedJobs(active.map(o => normalizeOrderToJob(o)));
      setAcceptedRequestIds(active.map(o => String(o.id || o._id)));
      setCompletedOrders(done.map(o => normalizeOrderToJob(o)));
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
        setAuthToken(token);
        setRefreshToken(refreshTok || null);
        setOnAuthFailure(handleLogout);
        applyProviderUser(user);
        const demo = (user?.email || '').toLowerCase() === DEMO_EMAIL;
        const providerId = demo ? 'provider-demo-001' : (user?._id || 'provider-demo-001');
        setIsDemo(demo);
        setVerificationStatus(demo ? 'verified' : savedStatus);
        let serverSetupDone = false;
        let needsBusinessInfo = false;
        if (!demo) {
          try {
            const profile = await fetchJson(`${API_URL}/profiles/${providerId}`);
            const businessName = (profile?.businessName || profile?.name || '').trim();
            if (businessName) {
              updateProvider({ company: businessName, initials: businessName.slice(0, 2).toUpperCase() });
            }
            if (profile?.contactName) updateProvider({ name: profile.contactName });
            serverSetupDone = profile?.setupCompleted === true;
            needsBusinessInfo = !businessName || !String(profile?.contactName || '').trim();
          } catch {}
          loadProviderJobsFromBackend(providerId);
          registerPushToken(providerId);
        }
        if (needsBusinessInfo) setAuthState('business-info-existing');
        else setAuthState(demo || setupDone || serverSetupDone ? 'app' : 'setup');
      } else {
        setAuthState('welcome');
      }
    });
  }, []);

  const handleLogin = async (token, refreshTok, user, isRegister) => {
    const normalizedToken = token || 'logged_in';
    setAuthToken(normalizedToken);
    setRefreshToken(refreshTok || null);
    setOnAuthFailure(handleLogout);
    await SecureStore.setItemAsync('providerToken', normalizedToken);
    if (refreshTok) await SecureStore.setItemAsync('providerRefreshToken', refreshTok);
    if (user) await AsyncStorage.setItem('providerUser', JSON.stringify(user));
    if (isRegister) {
      // Fresh account — wipe all previous user's local data before applying new user
      resetProvider();
      setProfileComplete(false);
      profileCompleteRef.current = false;
      setAcceptedJobs([]);
      setCompletedOrders([]);
      setAcceptedRequestIds([]);
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
    const demo = (user?.email || '').toLowerCase() === DEMO_EMAIL;
    const providerId = demo ? 'provider-demo-001' : (user?._id || 'provider-demo-001');
    setIsDemo(demo);
    setVerificationStatus(demo ? 'verified' : 'unverified');
    if (!demo) {
      loadProviderJobsFromBackend(providerId);
      registerPushToken(providerId);
      // Ensure provider profile exists in DB (creates it if new), then sync name
      const profileName = (user?.companyName || user?.name || '').trim();
      fetchJson(`${API_URL}/profiles/${providerId}`, {
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
      let needsBusinessInfo = false;
      try {
        const profile = await fetchJson(`${API_URL}/profiles/${providerId}`);
        serverSetupDone = profile?.setupCompleted === true;
        needsBusinessInfo = !String(profile?.businessName || profile?.name || '').trim()
          || !String(profile?.contactName || '').trim();
      } catch {}
      if (!isRegister && needsBusinessInfo) setAuthState('business-info-existing');
      else setAuthState(isRegister || (setupDone !== 'true' && !serverSetupDone) ? 'setup' : 'app');
    }
  };

  const handleLogout = async () => {
    setAuthToken(null);
    setRefreshToken(null);
    setOnAuthFailure(null);
    setIsDemo(false);
    setVerificationStatus('unverified');
    setCompletedOrders([]);
    setAcceptedJobs([]);
    setAcceptedRequestIds([]);
    setProfileComplete(false);
    profileCompleteRef.current = false;
    resetProvider();
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

  const completeExistingBusinessInfo = async ({ kind, businessName, name }) => {
    setBusinessInfoLoading(true);
    try {
      const displayBusinessName = kind === 'individual' ? name : businessName;
      await fetchJson(`${API_URL}/profiles/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: displayBusinessName,
          businessName: displayBusinessName,
          contactName: name,
          businessKind: kind,
          initials: displayBusinessName.slice(0, 2).toUpperCase(),
        }),
      });
      updateProvider({ company: displayBusinessName, name, initials: displayBusinessName.slice(0, 2).toUpperCase() });
      const storedUserRaw = await AsyncStorage.getItem('providerUser');
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};
      await AsyncStorage.setItem('providerUser', JSON.stringify({
        ...storedUser,
        name,
        companyName: displayBusinessName,
        businessKind: kind,
      }));
      const pricing = await loadPricing();
      await savePricing({ ...pricing, businessName: displayBusinessName });
      setAuthState('setup');
    } catch (error) {
      Alert.alert('Could not save business information', error.message || 'Please try again.');
    } finally {
      setBusinessInfoLoading(false);
    }
  };

  useEffect(() => {
    setApiAuthFailureHandler(handleLogout);
    return () => setApiAuthFailureHandler(null);
  }, []);

  // Pulls fresh business name/contact/verification status/type from the backend —
  // the app never polls this on its own, so without an explicit call the UI can sit
  // on a stale verificationStatus indefinitely (e.g. after an admin approves the
  // account elsewhere) until the app is fully restarted.
  const syncProviderProfile = useCallback(async () => {
    const pricing = await loadPricing();
    let pt = pricing.providerType || 'mobile';
    if (!isDemo) {
      try {
        const data = await fetchJson(`${API_URL}/profiles/${provider.id}`);
        const businessName = (data?.businessName || data?.name || '').trim();
        if (businessName) updateProvider({ company: businessName, initials: businessName.slice(0, 2).toUpperCase() });
        if (data?.contactName) updateProvider({ name: data.contactName });
        if (data?.verificationStatus) {
          setVerificationStatus(data.verificationStatus);
          AsyncStorage.setItem('@provider_verification_status', data.verificationStatus);
        }
        // Server is the source of truth for business type — local cache drifts after logout/login.
        if (data?.type && data.type !== pt) {
          pt = data.type;
          await savePricing({ ...pricing, providerType: pt, ...(businessName ? { businessName } : {}) });
        } else if (businessName) {
          await savePricing({ ...pricing, businessName });
        }
      } catch {}
    }
    setProviderType(pt);
    providerTypeRef.current = pt;
    const scheduling = pt === 'shop' ? true : pt === 'mobile' ? false : (pricing.allowScheduling ?? false);
    setAllowScheduling(scheduling);
  }, [isDemo, provider.id, updateProvider]);

  useEffect(() => {
    if (authState !== 'app') return;
    syncProviderProfile().then(loadRequests);
  }, [authState, syncProviderProfile]);

  useEffect(() => {
    if (authState !== 'app') return;
    const sub = AppState.addEventListener('change', next => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        syncProviderProfile();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [authState, syncProviderProfile]);

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
        isMobile ? fetchJson(`${API_URL}/orders/provider/available?providerId=${provider.id}`) : Promise.resolve([]),
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
            String(o.provider?.id) === String(provider.id) &&
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
  }, [online, acceptedRequestIds, verificationStatus, provider.id]);

  useEffect(() => {
    if (isDemo || !provider.id) return;
    const timer = setInterval(() => loadProviderJobsFromBackend(provider.id), 10000);
    return () => clearInterval(timer);
  }, [isDemo, provider.id]);

  // While online and doing mobile work, periodically share the provider's live position so
  // customer search can prefer it over the static geocoded business address. Foreground only —
  // stops as soon as the provider goes offline or the app is backgrounded.
  useEffect(() => {
    if (isDemo || !online || providerType === 'shop' || !provider.id) return undefined;
    let cancelled = false;
    const pingLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || cancelled) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setProviderLiveCoord({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        await fetchJson(`${API_URL}/profiles/${provider.id}/location`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lat: position.coords.latitude, lng: position.coords.longitude }),
        });
      } catch (error) {
        console.log('Location ping error:', error.message);
      }
    };
    pingLocation();
    const timer = setInterval(pingLocation, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [isDemo, online, providerType, provider.id]);

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
    } else if (newShopStatus === 'inspection' && isReal) {
      fetchJson(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inspection' }),
      }).catch(e => console.log('Inspection sync error:', e.message));
    } else if (newShopStatus === 'waiting_approval' && extra?.estimate) {
      if (isReal) {
        fetchJson(`${API_URL}/orders/${orderId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'estimate_sent',
            estimate: extra.estimate,
          }),
        }).then(() => {
          showToast('Estimate sent to customer');
        }).catch(e => {
          console.log('Estimate sync error:', e.message);
          showToast('Could not send estimate — check your connection and try again');
        });
      } else {
        showToast('Estimate sent to customer');
      }
    } else if (newShopStatus === 'completed') {
      showToast('Job completed!');
    }
  };

  const cancelShopJob = async (order) => {
    const orderId = order.id || order._id;
    const isReal = orderId && !String(orderId).startsWith('demo');
    if (isReal) {
      try {
        await fetchJson(`${API_URL}/orders/${orderId}/cancel`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'Cancelled by provider' }),
        });
      } catch (e) {
        console.log('Cancel job error:', e.message);
      }
    }
    setAcceptedJobs(current => current.filter(job => String(job.id) !== String(orderId)));
    setAcceptedRequestIds(current => current.filter(id => String(id) !== String(orderId)));
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
            id: provider.id, name: provider.company,
            type: order.provider?.type || 'Mobile Service Provider',
            phone: provider.phone, initials: provider.initials,
            rating: provider.rating, eta: provider.eta, color: '#FF6B00',
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
            id: provider.id, name: provider.company,
            type: order.provider?.type || 'Auto Repair Shop',
            phone: provider.phone, initials: provider.initials,
            rating: provider.rating, eta: provider.eta, color: '#FF6B00',
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
        body: JSON.stringify({ providerId: provider.id }),
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
            id: provider.id, name: provider.company,
            type: order.provider?.type || 'Mobile Service Provider',
            phone: provider.phone, initials: provider.initials,
            rating: provider.rating, eta: provider.eta, color: '#FF6B00',
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
    if (patch?.providerLocation) body.providerLocation = patch.providerLocation;

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
      showToast('Could not save — check your connection and try again');
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
      await Promise.all([loadRequests(), syncProviderProfile()]);
      if (isDemo) {
        setAcceptedJobs(current => current.map(job => {
          if (job.status === 'proposed') return { ...job, status: 'scheduled' };
          if (job.shopStatus === 'waiting_approval') return { ...job, shopStatus: 'in_progress' };
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

  if (authState === 'loading') {
    return (
      <View style={styles.authLoadingScreen}>
        <ActivityIndicator size="large" color="#F04416" />
      </View>
    );
  }

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
          onSwitchToRegister={() => setAuthState('register')}
          onBack={() => setAuthState('welcome')}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'business-info' || authState === 'business-info-existing') {
    return (
      <SafeAreaProvider>
        <BusinessInfoScreen
          loading={businessInfoLoading}
          onBack={() => authState === 'business-info-existing' ? handleLogout() : setAuthState('register')}
          onContinue={authState === 'business-info-existing' ? completeExistingBusinessInfo : completeProviderRegistration}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'setup') {
    return (
      <SafeAreaProvider>
        <ProviderSetupScreen
          onComplete={async () => {
            const profile = await fetchJson(`${API_URL}/profiles/${provider.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profileCompletion: 100,
                setupCompleted: true,
                verificationStatus: 'pending_review',
                lastActivityAt: new Date().toISOString(),
              }),
            });
            const nextStatus = profile?.verificationStatus || 'pending_review';
            await AsyncStorage.setItem('@setup_completed_v1', 'true');
            await AsyncStorage.setItem('@provider_verification_status', nextStatus);
            setVerificationStatus(nextStatus);
            setAuthState('setup-success');
          }}
        />
      </SafeAreaProvider>
    );
  }

  if (authState === 'setup-success') {
    return (
      <SafeAreaProvider>
        <SetupSuccessScreen onContinue={() => setAuthState('app')} />
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
              completedOrders={completedOrders}
              scheduledJobs={todayScheduledJobs}
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
              onGoToEarnings={() => selectTabAt(TABS.findIndex(t => t.key === 'earnings'))}
              onGoToJobs={(tab) => { setJobsInitialTab({ tab, nonce: Date.now() }); selectTabAt(TABS.findIndex(t => t.key === 'jobs')); }}
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
            <JobsScreen jobs={providerJobs} jobWorkflows={jobWorkflows} onOpen={setSelectedJob} refreshControl={refreshControl} scrollSignal={screenResetNonce} providerType={providerType} isDemo={isDemo} initialTabSignal={jobsInitialTab} />
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
              {!!selectedRequest && (isBookingOrder(selectedRequest) || getServiceMode(selectedRequest) === 'shop') ? (
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
              {!!selectedJob && (selectedJob.status === 'proposed' || getServiceMode(selectedJob) === 'shop' || !!selectedJob.shopStatus) ? (
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
                  onCancel={async (o) => {
                    setSelectedJob(null);
                    await cancelShopJob(o);
                  }}
                />
              ) : !!selectedJob && (
                <JobPopupScreen
                  job={selectedJob}
                  workflow={getJobWorkflowFor(selectedJob)}
                  onWorkflowChange={(patch) => updateJobWorkflow(selectedJob.id, patch)}
                  onBack={() => setSelectedJob(null)}
                  onCancel={async (o) => {
                    setSelectedJob(null);
                    await cancelShopJob(o);
                  }}
                  refreshControl={refreshControl}
                  providerLiveCoord={providerLiveCoord}
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

export default function App() {
  return (
    <ProviderContextProvider>
      <AppInner />
    </ProviderContextProvider>
  );
}

const toastStyles = StyleSheet.create({
  toast: { position: 'absolute', bottom: 90, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#17191D', borderRadius: 28, paddingVertical: 16, paddingHorizontal: 22, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  text: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});

