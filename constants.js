export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://auterio-backend-production.up.railway.app/api';
export const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

export const ACCEPT_BLUE = '#276EF1';
export const TAB_BAR_PADDING = 8;
export const TAB_INDICATOR_EXTRA_WIDTH = 8;
export const TAB_INDICATOR_DROP_SCALE = 1.14;

export const TABS = [
  { key: 'home', screen: 'home', icon: 'home', label: 'Home' },
  { key: 'requests', screen: 'requests', icon: 'chatbox-outline', label: 'Requests' },
  { key: 'jobs', screen: 'jobs', icon: 'briefcase-outline', label: 'Jobs' },
  { key: 'earnings', screen: 'earnings', icon: 'cash-outline', label: 'Earnings' },
  { key: 'profile', screen: 'profile', icon: 'person-outline', label: 'Profile' },
];

export const REQUEST_ROUTE = [
  { latitude: 37.7694, longitude: -122.4862 },
  { latitude: 37.7608, longitude: -122.4350 },
  { latitude: 37.7912, longitude: -122.4098 },
];

export const REQUEST_MAP_REGION = {
  latitude: 37.7756,
  longitude: -122.4475,
  latitudeDelta: 0.075,
  longitudeDelta: 0.085,
};

export const JOB_STEPS = [
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On the way', icon: 'car-sport-outline' },
  { key: 'arrived', label: 'Arrived', icon: 'car-outline' },
  { key: 'inspection', label: 'Working', icon: 'construct-outline' },
  { key: 'completed', label: 'Complete', icon: 'checkmark-done-outline' },
];

export const SHOP_JOB_STEPS = [
  { key: 'scheduled',   label: 'Scheduled' },
  { key: 'checked_in',  label: 'Checked In' },
  { key: 'inspection',  label: 'Inspection' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed',   label: 'Completed' },
];

export const ACTIVE_SHOP_STATUSES = ['checked_in', 'inspection', 'estimate', 'waiting_approval', 'in_progress'];
