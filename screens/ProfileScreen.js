import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { API_URL, PROVIDER } from '../constants';
import { loadPricing, savePricing } from '../utils/pricingStore';

export default function ProfileScreen({ online, setOnline, refreshControl, scrollSignal, onLogout }) {
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
  const [businessName, setBusinessName] = useState('');
  const [savedRadius, setSavedRadius] = useState(18);

  const [profileData, setProfileData] = useState(null);
  const [scheduleData, setScheduleData] = useState(null);
  const [providerType, setProviderType] = useState('mobile');
  const [isDemoAccount, setIsDemoAccount] = useState(PROVIDER.id === 'provider-demo-001');
  const [verificationStatus, setVerificationStatus] = useState('unverified');

  const loadProfileData = useCallback(async () => {
    try {
      const [profileRes, scheduleRes, pricing, radius, storedUser] = await Promise.all([
        fetch(`${API_URL}/profiles/${PROVIDER.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API_URL}/schedules/${PROVIDER.id}`).then(r => r.ok ? r.json() : null).catch(() => null),
        loadPricing(),
        AsyncStorage.getItem('@service_radius'),
        AsyncStorage.getItem('providerUser'),
      ]);
      if (profileRes) setProfileData(profileRes);
      if (scheduleRes) {
        setScheduleData(scheduleRes);
        const summary = getHoursSummary(scheduleRes);
        if (summary) setHoursSummary(summary);
      }
      if (pricing?.providerType) setProviderType(pricing.providerType);
      if (pricing?.businessName) setBusinessName(pricing.businessName);
      const savedStatus = await AsyncStorage.getItem('@provider_verification_status');
      if (savedStatus) setVerificationStatus(savedStatus);
      else if (PROVIDER.id === 'provider-demo-001') setVerificationStatus('verified');
      if (radius) setSavedRadius(parseInt(radius, 10));
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setIsDemoAccount((user.email || '').toLowerCase() === 'auterioapp@gmail.com');
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const servicesCount = profileData?.services?.length || 0;
  const hasServices = isDemoAccount || servicesCount > 0;
  const hasHours = isDemoAccount || (scheduleData && Object.values(scheduleData).some(day => day?.enabled));
  const needsAddress = !isDemoAccount && (providerType === 'shop' || providerType === 'both');
  const hasAddress = !needsAddress || !!profileData?.address;
  const profileComplete = isDemoAccount || (hasServices && hasHours && hasAddress);

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

  const menuItems = [
    {
      id: 'performance',
      title: 'Performance',
      subtitle: 'View your performance insights',
      icon: 'trending-up-outline',
      iconBg: '#F3EEFF',
      iconColor: '#7C3AED',
      value: '98%',
      valueColor: '#16A34A',
    },
    {
      id: 'reviews',
      title: 'Reviews',
      subtitle: 'See what your customers say',
      icon: 'chatbubble-outline',
      iconBg: '#FFF3E8',
      iconColor: '#F97316',
      value: '4.9',
      valueSub: '128 reviews',
      valueStar: true,
    },
    {
      id: 'services',
      title: 'Services',
      subtitle: hasServices ? 'Manage your services and pricing' : 'Add the services you offer',
      icon: 'construct-outline',
      iconBg: hasServices ? '#EFF6FF' : '#FFF7ED',
      iconColor: hasServices ? '#2563EB' : '#F97316',
      value: hasServices ? String(servicesCount) : null,
      valueSub: hasServices ? 'Active' : null,
      required: !hasServices,
    },
    {
      id: 'radius',
      title: 'Location',
      subtitle: 'Set your address and service area',
      icon: 'location-outline',
      iconBg: '#ECFDF5',
      iconColor: '#16A34A',
      value: `${savedRadius} mi`,
      valueColor: '#16A34A',
    },
    {
      id: 'hours',
      title: 'Working Hours',
      subtitle: hoursSummary || 'Set your working schedule',
      icon: 'time-outline',
      iconBg: hasHours ? '#FFF3E8' : '#FFF7ED',
      iconColor: hasHours ? '#F97316' : '#F97316',
      required: !hasHours,
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
      id: 'trust',
      title: 'Trust & Compliance',
      subtitle: 'View your verification status',
      icon: 'shield-checkmark-outline',
      iconBg: '#ECFDF5',
      iconColor: '#16A34A',
      value: 'All Verified',
      valueColor: '#16A34A',
    },
    {
      id: 'support',
      title: 'Support',
      subtitle: 'Help center and contact support',
      icon: 'headset-outline',
      iconBg: '#F5F6F7',
      iconColor: '#374151',
    },
  ];

  const completionSteps = [
    { label: 'Add at least one service', done: hasServices, action: () => setServicesOpen(true) },
    { label: 'Set your working hours', done: !!hasHours, action: () => setHoursOpen(true) },
    ...(needsAddress ? [{ label: 'Add your shop address', done: hasAddress, action: () => setSettingsOpen(true) }] : []),
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
          <TouchableOpacity onPress={() => setSettingsOpen(true)} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color="#17191D" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileHeroCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{PROVIDER.initials}</Text>
          </View>
          <View style={styles.profileHeroInfo}>
            <Text style={styles.profileName}>{PROVIDER.company}</Text>
            <Text style={styles.profileSub}>
              {providerType === 'mobile' ? 'Mobile Service Provider' : providerType === 'shop' ? 'Service Shop' : 'Mobile & Shop'}
            </Text>
            <View style={styles.profileRatingRow}>
              <Ionicons name="star" size={13} color="#F5B301" />
              <Text style={styles.profileRatingText}>{PROVIDER.rating} rating</Text>
              <View style={styles.profileDot} />
              <Text style={styles.profileRatingText}>128 reviews</Text>
            </View>
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
              trackColor={{ false: '#E6E8EB', true: '#D9DDE2' }}
              thumbColor={online && profileComplete ? '#128A3A' : '#8B9098'}
              style={styles.profileOnlineSwitch}
            />
          </View>
        </View>

        <View style={styles.menuList}>
          {menuItems.map(item => (
            <MenuItem
              key={item.id}
              item={item}
              onPress={
                item.id === 'reviews' ? () => setReviewsOpen(true) :
                item.id === 'services' ? () => setServicesOpen(true) :
                item.id === 'radius' ? () => setRadiusOpen(true) :
                item.id === 'trust' ? () => setTrustOpen(true) :
                item.id === 'pricing' ? () => setPricingOpen(true) :
                item.id === 'hours' ? () => setHoursOpen(true) :
                item.id === 'business' ? () => setBusinessOpen(true) :
                undefined
              }
            />
          ))}
        </View>
      </ScrollView>

      <BusinessProfileScreen
        visible={businessOpen}
        providerType={providerType}
        businessName={businessName}
        onClose={() => setBusinessOpen(false)}
        onSave={async ({ type, name }) => {
          const current = await loadPricing();
          await savePricing({ ...current, providerType: type, businessName: name });
          setProviderType(type);
          setBusinessName(name);
          PROVIDER.company = name || PROVIDER.company;
          PROVIDER.initials = (name || PROVIDER.company).slice(0, 2).toUpperCase();
          setBusinessOpen(false);
        }}
      />
      <ReviewsScreen visible={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <ServicesScreen visible={servicesOpen} onClose={() => { setServicesOpen(false); loadProfileData(); }} />
      <TrustComplianceScreen visible={trustOpen} onClose={() => setTrustOpen(false)} />
      <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} />
      <WorkingHoursScreen
        visible={hoursOpen}
        onClose={() => setHoursOpen(false)}
        onSave={days => { setHoursSummary(getHoursSummary(days)); loadProfileData(); }}
      />
      <AppSettingsScreen
        visible={settingsOpen}
        onClose={() => { setSettingsOpen(false); loadProfileData(); }}
        onLogout={onLogout}
      />
      <ServiceRadiusScreen
        visible={radiusOpen}
        onClose={() => setRadiusOpen(false)}
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
  profileName: { color: '#17191D', fontSize: 18, lineHeight: 23, fontWeight: '700' },
  profileSub: { color: '#5E646D', fontSize: 12, lineHeight: 16, fontWeight: '600', marginTop: 2 },
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

  menuList: { gap: 10 },
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
});
