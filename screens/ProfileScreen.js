import { useEffect, useState } from 'react';
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

const PROVIDER = {
  id: 'provider-demo-001',
  name: 'Alex',
  company: 'Auterio Provider',
  initials: 'AP',
  phone: '+15551234567',
  rating: 4.9,
  eta: '18-25 min',
};

const BASE_MENU_ITEMS = [
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
    subtitle: 'Manage your services and pricing',
    icon: 'construct-outline',
    iconBg: '#EFF6FF',
    iconColor: '#2563EB',
    value: '6',
    valueSub: 'Active',
  },
  {
    id: 'radius',
    title: 'Service Radius',
    subtitle: 'Set your service area',
    icon: 'location-outline',
    iconBg: '#ECFDF5',
    iconColor: '#16A34A',
    value: null,
    valueSub: 'Current radius',
    valueColor: '#16A34A',
  },
  {
    id: 'hours',
    title: 'Working Hours',
    subtitle: 'Mon–Fri 8:00 AM – 6:00 PM',
    icon: 'time-outline',
    iconBg: '#FFF3E8',
    iconColor: '#F97316',
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

export default function ProfileScreen({ online, setOnline, refreshControl, scrollSignal }) {
  const scrollRef = useScrollToTop(scrollSignal);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [radiusOpen, setRadiusOpen] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursSummary, setHoursSummary] = useState('Mon–Fri 8:00 AM – 6:00 PM');
  const [savedRadius, setSavedRadius] = useState(18);

  useEffect(() => {
    AsyncStorage.getItem('@service_radius').then(val => {
      if (val) setSavedRadius(parseInt(val, 10));
    });
  }, []);

  const menuItems = BASE_MENU_ITEMS.map(item => {
    if (item.id === 'radius') return { ...item, value: `${savedRadius} mi` };
    if (item.id === 'hours') return { ...item, subtitle: hoursSummary };
    return item;
  });

  return (
    <View style={styles.container}>
    <ScrollView ref={scrollRef} style={styles.flex1} contentContainerStyle={styles.profileContent} showsVerticalScrollIndicator={false} refreshControl={refreshControl}>
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
          <Text style={styles.profileSub}>Mobile Service Provider</Text>
          <View style={styles.profileRatingRow}>
            <Ionicons name="star" size={13} color="#F5B301" />
            <Text style={styles.profileRatingText}>{PROVIDER.rating} rating</Text>
            <View style={styles.profileDot} />
            <Text style={styles.profileRatingText}>128 reviews</Text>
          </View>
        </View>
      </View>

      <View style={styles.profileStatusCard}>
        <View>
          <Text style={styles.profileStatusTitle}>Availability</Text>
          <Text style={styles.profileStatusMeta}>{online ? 'You are visible for new requests' : 'You are not receiving requests'}</Text>
        </View>
        <View style={styles.profileStatusToggle}>
          <Text style={[styles.profileStatusText, online && styles.profileStatusTextOnline]}>{online ? 'Online' : 'Offline'}</Text>
          <Switch value={online} onValueChange={setOnline} trackColor={{ false: '#E6E8EB', true: '#D9DDE2' }} thumbColor={online ? '#128A3A' : '#8B9098'} style={styles.profileOnlineSwitch} />
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
              undefined
            }
          />
        ))}
      </View>

    </ScrollView>
      <ReviewsScreen visible={reviewsOpen} onClose={() => setReviewsOpen(false)} />
      <ServicesScreen visible={servicesOpen} onClose={() => setServicesOpen(false)} />
      <TrustComplianceScreen visible={trustOpen} onClose={() => setTrustOpen(false)} />
      <PricingScreen visible={pricingOpen} onClose={() => setPricingOpen(false)} />
      <WorkingHoursScreen
        visible={hoursOpen}
        onClose={() => setHoursOpen(false)}
        onSave={days => setHoursSummary(getHoursSummary(days))}
      />
      <AppSettingsScreen visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
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
      style={[styles.menuItem, item.highlight && styles.menuItemHighlight]}
      activeOpacity={0.84}
      onPress={onPress || (() => Alert.alert(item.title, 'This feature is coming soon.'))}
    >
      <View style={[styles.menuIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={19} color={item.iconColor} />
      </View>
      <View style={styles.menuInfo}>
        <Text style={styles.menuTitle}>{item.title}</Text>
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
      <Ionicons name="chevron-forward" size={16} color="#C8CDD4" style={{ marginLeft: 6 }} />
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
  profileRatingText: { color: '#5E646D', fontSize: 11, lineHeight: 14, fontWeight: '600' },
  profileDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#C8CDD4' },
  profileStatusCard: { minHeight: 70, borderRadius: 8, borderWidth: 1, borderColor: '#ECEEF0', backgroundColor: '#F3F4F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, marginBottom: 10 },
  profileStatusTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  profileStatusMeta: { color: '#5E646D', fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 2 },
  profileStatusToggle: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  profileStatusText: { color: '#8B9098', fontSize: 13, lineHeight: 16, fontWeight: '700' },
  profileStatusTextOnline: { color: '#128A3A' },
  profileOnlineSwitch: { transform: [{ scaleX: 0.72 }, { scaleY: 0.72 }], marginLeft: -3 },
  menuList: { gap: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  menuItemHighlight: { borderColor: '#7C3AED', borderWidth: 1.5 },
  menuIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  menuInfo: { flex: 1, minWidth: 0 },
  menuTitle: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  menuSubtitle: { color: '#6B7280', fontSize: 12, lineHeight: 16, fontWeight: '500', marginTop: 2 },
  menuRight: { alignItems: 'flex-end', flexShrink: 0 },
  menuValueRow: { flexDirection: 'row', alignItems: 'center' },
  menuValue: { color: '#17191D', fontSize: 14, lineHeight: 18, fontWeight: '700' },
  menuValueSub: { color: '#6B7280', fontSize: 11, lineHeight: 14, fontWeight: '500', marginTop: 1 },
});
