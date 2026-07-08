import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorizedFetch } from '../apiClient';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import useScrollToTop from '../hooks/useScrollToTop';
import ReviewsScreen from './ReviewsScreen';
import ServicesScreen from './ServicesScreen';
import ServiceRadiusScreen from './ServiceRadiusScreen';
import TrustComplianceScreen from './TrustComplianceScreen';
import AppSettingsScreen from './AppSettingsScreen';
import PricingScreen from './PricingScreen';
import WorkingHoursScreen, { getHoursSummary } from './WorkingHoursScreen';
import BusinessProfileScreen from './BusinessProfileScreen';
import AccountInfoScreen from './AccountInfoScreen';
import CalendarScreen from './CalendarScreen';
import PayoutsScreen from './PayoutsScreen';
import { API_URL, PROVIDER } from '../constants';
import { loadPricing, savePricing } from '../utils/pricingStore';

export default function ProfileScreen({ online, setOnline, refreshControl, scrollSignal, onLogout, verificationStatus, setVerificationStatus, onProfileComplete }) {
  const scrollRef = useScrollToTop(scrollSignal);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursSummary, setHoursSummary] = useState(null);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [payoutsOpen, setPayoutsOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [savedRadius, setSavedRadius] = useState(18);

  const [profileData, setProfileData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [providerType, setProviderType] = useState('mobile');
  const [isDemoAccount, setIsDemoAccount] = useState(PROVIDER.id === 'provider-demo-001');
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);

  const loadProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, scheduleRes, pricing, radius, storedUser] = await Promise.all([
        authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        authorizedFetch(`${API_URL}/schedules/${PROVIDER.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        loadPricing(),
        AsyncStorage.getItem('@service_radius'),
        AsyncStorage.getItem('providerUser'),
      ]);
      setNetworkError(!profileRes && !scheduleRes);
      if (profileRes) {
        setProfileData(profileRes);
        const serverBusinessName = (profileRes.businessName || profileRes.name || '').trim();
        if (serverBusinessName) {
          setBusinessName(serverBusinessName);
          PROVIDER.company = serverBusinessName;
          PROVIDER.initials = serverBusinessName.slice(0, 2).toUpperCase();
          savePricing({ ...pricing, businessName: serverBusinessName });
        }
        if (profileRes.contactName) PROVIDER.name = profileRes.contactName;
        if (profileRes.verificationStatus) {
          setVerificationStatus?.(profileRes.verificationStatus);
          AsyncStorage.setItem('@provider_verification_status', profileRes.verificationStatus);
        }
      }
      if (scheduleRes) {
        setScheduleData(scheduleRes);
        const apiDays = scheduleRes.days || {};
        const enabledDays = Object.keys(apiDays).filter(k => apiDays[k]?.enabled);
        if (enabledDays.length) setHoursSummary(`${enabledDays.length} day${enabledDays.length !== 1 ? 's' : ''} active`);
      }
      if (pricing?.providerType) setProviderType(pricing.providerType);
      if (!profileRes?.businessName && !profileRes?.name && pricing?.businessName) setBusinessName(pricing.businessName);
      if (PROVIDER.id === 'provider-demo-001') setVerificationStatus?.('verified');
      if (radius) setSavedRadius(parseInt(radius, 10));
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setIsDemoAccount((user.email || '').toLowerCase() === 'auterioapp@gmail.com');
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const servicesCount = profileData?.services?.length || 0;
  const hasServices = isDemoAccount || servicesCount > 0;
  const hasHours = isDemoAccount || (scheduleData?.days && Object.values(scheduleData.days).some(day => day?.enabled));
  const needsAddress = !isDemoAccount && (providerType === 'shop' || providerType === 'both');
  const hasAddress = !needsAddress || !!profileData?.address;
  const hasBusinessIdentity = isDemoAccount || !!(profileData?.businessName || profileData?.name) && !!profileData?.contactName;
  const profileComplete = isDemoAccount || (hasBusinessIdentity && hasServices && hasHours && hasAddress);

  useEffect(() => {
    onProfileComplete?.(profileComplete);
  }, [profileComplete]);

  useEffect(() => {
    if (!profileData) return;
    if (profileComplete && verificationStatus === 'unverified' && !isDemoAccount) {
      authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'pending_review' }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.verificationStatus) {
            setVerificationStatus?.(data.verificationStatus);
            AsyncStorage.setItem('@provider_verification_status', data.verificationStatus);
          }
        })
        .catch(() => {});
    }
  }, [profileComplete, verificationStatus, isDemoAccount, profileData]);

  const handleSetOnline = (val) => {
    if (val && !profileComplete) {
      Alert.alert(
        'Profile incomplete',
        'Complete your profile setup before going online to receive orders.',
        [{ text: 'OK' }]
      );
      return;
    }
    setOnline(val);
  };

  const menuSections = [
    {
      title: 'Business',
      items: [
        {
          id: 'services',
          title: 'Services',
          subtitle: hasServices ? 'Manage your services and pricing' : 'Add the services you offer',
          icon: 'construct-outline',
          iconBg: hasServices ? '#EFF6FF' : '#FFF7ED',
          iconColor: hasServices ? '#2563EB' : '#F97316',
          value: hasServices ? String(isDemoAccount ? 6 : servicesCount) : null,
          valueSub: hasServices ? 'Active' : null,
          required: !hasServices,
        },
        {
          id: 'hours',
          title: 'Working Hours',
          subtitle: hoursSummary || 'Set your working schedule',
          icon: 'time-outline',
          iconBg: hasHours ? '#FFF3E8' : '#FFF7ED',
          iconColor: '#F97316',
          required: !hasHours,
        },
        {
          id: 'calendar',
          title: 'Calendar',
          subtitle: 'View and manage appointments',
          icon: 'calendar-outline',
          iconBg: '#F3EEFF',
          iconColor: '#7C3AED',
        },
        {
          id: 'radius',
          title: 'Location',
          subtitle: providerType === 'shop' || providerType === 'both'
            ? (profileData?.address || 'Shop address not set')
            : 'Set your address and service area',
          icon: 'location-outline',
          iconBg: '#ECFDF5',
          iconColor: '#16A34A',
          value: providerType === 'shop' ? null : `${savedRadius} mi`,
          valueColor: '#16A34A',
        },
        {
          id: 'business',
          title: 'Business Information',
          subtitle: businessName || (providerType === 'mobile' ? 'Mobile Service Provider' : providerType === 'shop' ? 'Service Shop' : 'Mobile & Shop'),
          icon: 'briefcase-outline',
          iconBg: '#F0F4FF',
          iconColor: '#2563EB',
        },
        {
          id: 'pricing',
          title: 'Pricing',
          subtitle: 'Set your rates and service fees',
          icon: 'pricetag-outline',
          iconBg: '#FFF7ED',
          iconColor: '#F97316',
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          id: 'trust',
          title: 'Trust & Compliance',
          subtitle: 'View your verification status',
          icon: 'shield-checkmark-outline',
          iconBg: verificationStatus === 'verified' ? '#ECFDF5' : '#F5F6F7',
          iconColor: verificationStatus === 'verified' ? '#16A34A' : '#8B9098',
          value: verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'pending_review' ? 'Under Review' : null,
          valueColor: verificationStatus === 'verified' ? '#16A34A' : '#D97706',
        },
        {
          id: 'payouts',
          title: 'Payout & Banking',
          subtitle: 'Manage your bank account and withdrawals',
          icon: 'wallet-outline',
          iconBg: '#ECFDF5',
          iconColor: '#16A34A',
        },
        {
          id: 'performance',
          title: 'Performance',
          subtitle: 'View your performance insights',
          icon: 'trending-up-outline',
          iconBg: '#F3EEFF',
          iconColor: '#7C3AED',
          value: isDemoAccount ? '98%' : null,
          valueColor: '#16A34A',
        },
        {
          id: 'reviews',
          title: 'Reviews',
          subtitle: 'See what your customers say',
          icon: 'chatbubble-outline',
          iconBg: '#FFF3E8',
          iconColor: '#F97316',
          value: isDemoAccount ? '4.9' : null,
          valueSub: isDemoAccount ? '128 reviews' : null,
          valueStar: isDemoAccount,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'support',
          title: 'Support',
          subtitle: 'Help center and contact support',
          icon: 'headset-outline',
          iconBg: '#F5F6F7',
          iconColor: '#374151',
        },
        {
          id: 'settings',
          title: 'App Settings',
          subtitle: 'Notifications, language and more',
          icon: 'settings-outline',
          iconBg: '#F5F6F7',
          iconColor: '#374151',
        },
        {
          id: 'privacy',
          title: 'Privacy Policy',
          subtitle: 'How we handle your data',
          icon: 'lock-closed-outline',
          iconBg: '#F5F6F7',
          iconColor: '#374151',
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          subtitle: 'Rules and conditions of use',
          icon: 'document-text-outline',
          iconBg: '#F5F6F7',
          iconColor: '#374151',
        },
      ],
    },
  ];

  const completionSteps = [
    { label: 'Add at least one service', done: hasServices, action: () => setServicesOpen(true) },
    { label: 'Set your working hours', done: !!hasHours, action: () => setHoursOpen(true) },
    ...(needsAddress ? [{ label: 'Add your shop address', done: hasAddress, action: () => setRadiusOpen(true) }] : []),
  ];
  const doneCount = completionSteps.filter(s => s.done).length;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex1}
        contentContainerStyle={styles.profileContent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
      >
        <View style={styles.profileHeader}>
          <Text style={styles.profileTitle}>Profile</Text>
        </View>

        {networkError && (
          <TouchableOpacity style={styles.networkErrorBanner} activeOpacity={0.8} onPress={loadProfileData}>
            <Ionicons name="cloud-offline-outline" size={15} color="#B45309" />
            <Text style={styles.networkErrorText}>Could not connect to server. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        <View style={styles.profileHeroCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {businessName ? businessName.trim().slice(0, 2).toUpperCase() : PROVIDER.initials}
            </Text>
          </View>
          <View style={styles.profileHeroInfo}>
            {loading
              ? <View style={styles.skeletonName} />
              : <Text style={styles.profileName}>{businessName || PROVIDER.company}</Text>
            }
            {loading
              ? <View style={styles.skeletonSub} />
              : <Text style={styles.profileSub}>
                  {providerType === 'mobile' ? 'Mobile Service Provider' : providerType === 'shop' ? 'Service Shop' : 'Mobile & Shop'}
                </Text>
            }
            {isDemoAccount && (
              <View style={styles.profileRatingRow}>
                <Ionicons name="star" size={13} color="#F5B301" />
                <Text style={styles.profileRatingText}>{PROVIDER.rating} rating</Text>
                <View style={styles.profileDot} />
                <Text style={styles.profileRatingText}>128 reviews</Text>
              </View>
            )}
            {!isDemoAccount && profileData?.reviews > 0 && (
              <View style={styles.profileRatingRow}>
                <Ionicons name="star" size={13} color="#F5B301" />
                <Text style={styles.profileRatingText}>{profileData.rating?.toFixed(1)} rating</Text>
                <View style={styles.profileDot} />
                <Text style={styles.profileRatingText}>{profileData.reviews} {profileData.reviews === 1 ? 'review' : 'reviews'}</Text>
              </View>
            )}
            <View style={[
              styles.verifBadge,
              verificationStatus === 'verified' && styles.verifBadgeVerified,
              verificationStatus === 'pending_review' && styles.verifBadgePending,
            ]}>
              <Ionicons
                name={verificationStatus === 'verified' ? 'shield-checkmark' : verificationStatus === 'pending_review' ? 'time-outline' : 'shield-outline'}
                size={11}
                color={verificationStatus === 'verified' ? '#16A34A' : verificationStatus === 'pending_review' ? '#D97706' : '#9CA3AF'}
              />
              <Text style={[
                styles.verifBadgeText,
                verificationStatus === 'verified' && styles.verifBadgeTextVerified,
                verificationStatus === 'pending_review' && styles.verifBadgeTextPending,
              ]}>
                {verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'pending_review' ? 'Under Review' : 'Unverified'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.heroEditBtn} activeOpacity={0.7} onPress={() => setAccountInfoOpen(true)}>
            <Ionicons name="pencil-outline" size={16} color="#5E646D" />
          </TouchableOpacity>
        </View>

        {/* Completion banner */}
        {!profileComplete && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <Ionicons name="alert-circle-outline" size={20} color="#D97706" />
              <Text style={styles.completionTitle}>Complete your profile</Text>
              <Text style={styles.completionCount}>{doneCount}/{completionSteps.length}</Text>
            </View>
            <Text style={styles.completionSub}>
              Finish the steps below to start receiving orders.
            </Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${(doneCount / completionSteps.length) * 100}%` }]} />
            </View>
            {completionSteps.map((step, i) => (
              <TouchableOpacity key={i} style={styles.completionStep} onPress={step.action} activeOpacity={0.8}>
                <Ionicons
                  name={step.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={step.done ? '#16A34A' : '#D97706'}
                />
                <Text style={[styles.completionStepText, step.done && styles.completionStepDone]}>
                  {step.label}
                </Text>
                {!step.done && <Ionicons name="chevron-forward" size={14} color="#D97706" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Availability toggle */}
        <View style={[styles.profileStatusCard, !profileComplete && styles.profileStatusCardDisabled]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileStatusTitle}>Availability</Text>
            <Text style={styles.profileStatusMeta}>
              {!profileComplete
                ? 'Complete your profile to go online'
                : online ? 'You are visible for new requests' : 'You are not receiving requests'}
            </Text>
          </View>
          <View style={styles.profileStatusToggle}>
            <Text style={[styles.profileStatusText, online && profileComplete && styles.profileStatusTextOnline]}>
              {online && profileComplete ? 'Online' : 'Offline'}
            </Text>
            <Switch
              value={online && profileComplete}
              onValueChange={handleSetOnline}
              disabled={!profileComplete}
              trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
              thumbColor={online && profileComplete ? '#FFFFFF' : '#8B9098'}
              style={styles.profileOnlineSwitch}
            />
          </View>
        </View>

        {menuSections.map(section => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            <View style={styles.menuList}>
              {section.items.map(item => (
                <MenuItem
                  key={item.id}
                  item={item}
                  onPress={
                    item.id === 'reviews'     ? () => setReviewsOpen(true) :
                    item.id === 'services'    ? () => setServicesOpen(true) :
                    item.id === 'radius'      ? () => setRadiusOpen(true) :
                    item.id === 'trust'       ? () => setTrustOpen(true) :
                    item.id === 'hours'       ? () => setHoursOpen(true) :
                    item.id === 'business'    ? () => setBusinessOpen(true) :
                    item.id === 'payouts'     ? () => setPayoutsOpen(true) :
                    item.id === 'settings'    ? () => setSettingsOpen(true) :
                    item.id === 'pricing'     ? () => setPricingOpen(true) :
                    item.id === 'calendar'    ? () => setCalendarOpen(true) :
                    item.id === 'privacy'     ? () => Linking.openURL('https://auterio.com/privacy') :
                    item.id === 'terms'       ? () => Linking.openURL('https://auterio.com/terms') :
                    undefined
                  }
                />
              ))}
            </View>
          </View>
        ))}

        {/* Version */}
        <Text style={styles.versionText}>AuterioPro v{Constants.expoConfig?.version || '1.0.0'}</Text>


      </ScrollView>

      <AccountInfoScreen
        visible={accountInfoOpen}
        onClose={() => setAccountInfoOpen(false)}
        isDemoAccount={isDemoAccount}
        onSaved={(name) => { setBusinessName(name); loadProfileData(); }}
      />
      <BusinessProfileScreen
        visible={businessOpen}
        providerType={providerType}
        businessName={businessName}
        onClose={() => setBusinessOpen(false)}
        onSave={async ({ type, name }) => {
          if (!isDemoAccount && name.trim()) {
            try {
              const res = await authorizedFetch(`${API_URL}/profiles/${PROVIDER.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: name.trim(),
                  businessName: name.trim(),
                  initials: name.trim().slice(0, 2).toUpperCase(),
                  type,
                }),
              });
              if (!res.ok) throw new Error('Server error');
            } catch {
              Alert.alert('Error', 'Could not save business name. Check your connection.');
              return;
            }
          }
          const current = await loadPricing();
          await savePricing({ ...current, providerType: type, businessName: name });
          setProviderType(type);
          setBusinessName(name);
          PROVIDER.company = name || PROVIDER.company;
          PROVIDER.initials = (name || PROVIDER.company).slice(0, 2).toUpperCase();
          setBusinessOpen(false);
        }}
      />
      <CalendarScreen visible={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <ReviewsScreen visible={reviewsOpen} onClose={() => setReviewsOpen(false)} isDemo={isDemoAccount} />
      <PayoutsScreen visible={payoutsOpen} onClose={() => setPayoutsOpen(false)} isDemo={isDemoAccount} />
      <ServicesScreen visible={servicesOpen} onClose={() => { setServicesOpen(false); loadProfileData(); }} />
      <TrustComplianceScreen visible={trustOpen} onClose={() => setTrustOpen(false)} verificationStatus={verificationStatus} />
      <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} />
      <WorkingHoursScreen
        visible={hoursOpen}
        onClose={() => { setHoursOpen(false); loadProfileData(); }}
        onSave={days => setHoursSummary(getHoursSummary(days))}
      />
      <AppSettingsScreen
        visible={settingsOpen}
        onClose={() => { setSettingsOpen(false); loadProfileData(); }}
        onLogout={onLogout}
      />
      <ServiceRadiusScreen
        visible={radiusOpen}
        onClose={() => { setRadiusOpen(false); loadProfileData(); }}
        onSave={r => setSavedRadius(r)}
      />
    </View>
  );
}

function MenuItem({ item, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, item.required && styles.menuItemRequired]}
      activeOpacity={0.84}
      onPress={onPress || (() => Alert.alert(item.title, 'This feature is coming soon.'))}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={19} color={item.iconColor} />
      </View>
      <View style={styles.menuInfo}>
        <View style={styles.menuTitleRow}>
          <Text style={styles.menuTitle}>{item.title}</Text>
          {item.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>Required</Text>
            </View>
          )}
        </View>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      {item.value ? (
        <View style={styles.menuRight}>
          <View style={styles.menuValueRow}>
            <Text style={[styles.menuValue, item.valueColor && { color: item.valueColor }]}>{item.value}</Text>
            {item.valueStar && <Ionicons name="star" size={12} color="#F5B301" style={{ marginLeft: 3, marginTop: 1 }} />}
          </View>
          {item.valueSub && <Text style={styles.menuValueSub}>{item.valueSub}</Text>}
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={item.required ? '#D97706' : '#C8CDD4'} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex1: { flex: 1 },
  profileContent: { paddingHorizontal: 15, paddingTop: 18, paddingBottom: 112, backgroundColor: '#FFFFFF' },
  profileHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  profileTitle: { color: '#17191D', fontSize: 27, lineHeight: 32, fontWeight: '700' },
  profileHeroCard: { borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 10 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#17191D', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileAvatarText: { color: '#FFFFFF', fontSize: 18, lineHeight: 22, fontWeight: '900' },
  profileHeroInfo: { flex: 1, minWidth: 0 },
  heroEditBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  profileName: { color: '#17191D', fontSize: 18, lineHeight: 23, fontWeight: '700' },
  profileSub: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
  networkErrorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFBEB', borderRadius: 10, borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  networkErrorText: { color: '#B45309', fontSize: 12, fontWeight: '600', flex: 1 },
  skeletonName: { height: 18, width: 140, borderRadius: 6, backgroundColor: '#E4E6EA', marginBottom: 6 },
  skeletonSub: { height: 12, width: 100, borderRadius: 4, backgroundColor: '#ECEEF0' },
  profileRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7 },
  verifBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#E5E7EB' },
  verifBadgeVerified: { backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)' },
  verifBadgePending: { backgroundColor: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.2)' },
  verifBadgeText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  verifBadgeTextVerified: { color: '#16A34A' },
  verifBadgeTextPending: { color: '#D97706' },
  profileRatingText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  profileDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8CDD4' },

  completionCard: { backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', padding: 14, marginBottom: 10 },
  completionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  completionTitle: { color: '#92400E', fontSize: 14, fontWeight: '700', flex: 1 },
  completionCount: { color: '#D97706', fontSize: 13, fontWeight: '700' },
  completionSub: { color: '#78350F', fontSize: 12, marginBottom: 10 },
  progressBarBg: { height: 4, backgroundColor: '#FDE68A', borderRadius: 2, marginBottom: 12 },
  progressBarFill: { height: 4, backgroundColor: '#D97706', borderRadius: 2 },
  completionStep: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDE68A' },
  completionStepText: { color: '#92400E', fontSize: 13, fontWeight: '500', flex: 1 },
  completionStepDone: { color: '#16A34A', textDecorationLine: 'line-through' },

  profileStatusCard: { minHeight: 70, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, marginBottom: 10 },
  profileStatusCardDisabled: { opacity: 0.7 },
  profileStatusTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  profileStatusMeta: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  profileStatusToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  profileStatusText: { color: '#8B9098', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  profileStatusTextOnline: { color: '#128A3A' },
  profileOnlineSwitch: { transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }], marginLeft: -3 },

  menuSection: { marginBottom: 6, marginTop: 18 },
  menuSectionTitle: { color: '#8B9098', fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 2 },
  menuList: { gap: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  menuItemRequired: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuInfo: { flex: 1, minWidth: 0 },
  menuTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  menuSubtitle: { color: '#6B7280', fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 2 },
  menuRight: { alignItems: 'flex-end', flexShrink: 0 },
  menuValueRow: { flexDirection: 'row', alignItems: 'center' },
  menuValue: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  menuValueSub: { color: '#6B7280', fontSize: 11, lineHeight: 14, fontWeight: '500', marginTop: 1 },
  requiredBadge: { backgroundColor: '#FEF3C7', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  requiredBadgeText: { color: '#D97706', fontSize: 10, fontWeight: '700' },
  versionText: { color: '#C4C9D4', fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 16, marginBottom: 4 },
});
