import { Platform } from 'react-native';
import { PROVIDER_GOOGLE } from 'react-native-maps';

// Google Maps on Android; Apple Maps (the default, undefined) on iOS. Google Maps
// on iOS needs the native Google Maps SDK, which Expo Go doesn't include — set
// this to PROVIDER_GOOGLE for both platforms only in a dev/production build.
export const MAP_PROVIDER = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;
