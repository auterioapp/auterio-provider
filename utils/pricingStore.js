import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@provider_pricing_v1';

export const DEFAULT_PRICING = {
  providerType: 'mobile',
  serviceCallFee: '49.00',
  applyToInvoice: true,
  laborRate: '120.00',
  minJobFee: '79.00',
  diagFee: '79.00',
  travelFee: '15.00',
  freeTravelRadius: '10',
  extraMileRate: '2.00',
  hookUpFee: '95.00',
  towMileage: '4.50',
  freeTowMiles: '5',
  afterHoursFee: '35.00',
  afterHoursEnabled: true,
  weekendFee: '25.00',
  weekendEnabled: true,
  heavyDutyFee: '50.00',
  heavyDutyEnabled: true,
};

let _cached = { ...DEFAULT_PRICING };

export async function loadPricing() {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) _cached = { ...DEFAULT_PRICING, ...JSON.parse(stored) };
  } catch {}
  return _cached;
}

export async function savePricing(pricing) {
  _cached = { ...pricing };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(pricing));
  } catch {}
}

export function getPricing() {
  return _cached;
}
