import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Modal, PanResponder, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, GOOGLE_API_KEY, PROVIDER } from '../constants';

const MIN = 5;
const MAX = 50;
const DEFAULT_RADIUS = 18;
const STORAGE_KEY = '@service_radius';

const FALLBACK_CENTER = { latitude: 37.7756, longitude: -122.4475 };

function milesToMeters(miles) {
  return miles * 1609.34;
}

export default function ServiceRadiusScreen({ visible, onClose, onSave }) {
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [saved, setSaved] = useState(false);
  const [center, setCenter] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const addressRef = useRef('');
  const debounceRef = useRef(null);

  const onAddressChange = (text) => {
    setAddress(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&key=${GOOGLE_API_KEY}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.predictions) setSuggestions(json.predictions);
      } catch {}
    }, 350);
  };

  const selectSuggestion = (prediction) => {
    setAddress(prediction.description);
    addressRef.current = prediction.description;
    setSuggestions([]);
  };

  useEffect(() => {
    if (!visible) return;
    fetch(`${API_URL}/profiles/${PROVIDER.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.address) { setAddress(data.address); addressRef.current = data.address; } })
      .catch(() => {});
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      const parsed = val ? parseInt(val, 10) : DEFAULT_RADIUS;
      const clamped = Math.max(MIN, Math.min(MAX, parsed));
      setRadius(clamped);
      radiusRef.current = clamped;
      if (trackWidthRef.current) {
        thumbX.setValue(((clamped - MIN) / (MAX - MIN)) * trackWidthRef.current);
      }
    });
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        setCenter(FALLBACK_CENTER);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCenter({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        setCenter(FALLBACK_CENTER);
      }
    })();
  }, [visible]);

  const trackWidthRef = useRef(0);
  const startXRef = useRef(0);
  const radiusRef = useRef(DEFAULT_RADIUS);
  const thumbX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startXRef.current = ((radiusRef.current - MIN) / (MAX - MIN)) * trackWidthRef.current;
      },
      onPanResponderMove: (_, gs) => {
        const tw = trackWidthRef.current;
        if (!tw) return;
        const newX = Math.max(0, Math.min(tw, startXRef.current + gs.dx));
        thumbX.setValue(newX);
        const newRadius = Math.round(MIN + (newX / tw) * (MAX - MIN));
        if (newRadius !== radiusRef.current) {
          radiusRef.current = newRadius;
          setRadius(newRadius);
        }
      },
    })
  ).current;

  const onTrackLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    trackWidthRef.current = w;
    thumbX.setValue(((radiusRef.current - MIN) / (MAX - MIN)) * w);
  };

  const handleSave = async () => {
    await AsyncStorage.setItem(STORAGE_KEY, String(radiusRef.current));
    const addr = addressRef.current.trim();
    if (addr) {
      try {
        await fetch(`${API_URL}/profiles/${PROVIDER.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: addr }),
        });
      } catch {
        Alert.alert('Error', 'Could not save address');
      }
    }
    onSave?.(radiusRef.current);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setCenter(null);
      onClose();
    }, 900);
  };

  const handleClose = () => {
    setCenter(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Radius</Text>
          <View style={styles.headerRight} />
        </View>

        <Text style={styles.subtitle}>Set the area where you want to receive service requests.</Text>

        <View style={styles.addressCard}>
          <Ionicons name="location-outline" size={18} color="#6B7280" />
          <TextInput
            style={styles.addressInput}
            placeholder="Enter your shop / base address"
            placeholderTextColor="#9CA3AF"
            value={address}
            onChangeText={onAddressChange}
            returnKeyType="done"
            onSubmitEditing={() => setSuggestions([])}
          />
        </View>
        {suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((p, i) => (
              <TouchableOpacity
                key={p.place_id}
                style={[styles.suggestionRow, i > 0 && styles.suggestionBorder]}
                onPress={() => selectSuggestion(p)}
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={14} color="#9CA3AF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {p.structured_formatting?.main_text || p.description}
                  </Text>
                  <Text style={styles.suggestionSub} numberOfLines={1}>
                    {p.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.sliderCard}>
          <View style={styles.sliderTop}>
            <Text style={styles.sliderLabel}>Radius</Text>
            <Text style={styles.sliderValue}>{radius} miles</Text>
          </View>
          <View style={styles.sliderRow}>
            <Text style={styles.rangeLabel}>5 mi</Text>
            <View style={styles.trackWrapper} onLayout={onTrackLayout}>
              <View style={styles.trackBg} />
              <Animated.View style={[styles.trackFill, { width: thumbX }]} />
              <Animated.View
                style={[styles.thumb, { transform: [{ translateX: Animated.subtract(thumbX, 12) }] }]}
                {...panResponder.panHandlers}
              />
            </View>
            <Text style={styles.rangeLabel}>50 mi</Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          {!center ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#7C3AED" />
              <Text style={styles.mapLoadingText}>Getting your location…</Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              region={{
                latitude: center.latitude,
                longitude: center.longitude,
                latitudeDelta: Math.min((radius * 4) / 69, 10),
                longitudeDelta: Math.min((radius * 4) / 69, 10),
              }}
              scrollEnabled={true}
              zoomEnabled={true}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Circle
                center={center}
                radius={milesToMeters(radius)}
                fillColor="rgba(124,58,237,0.15)"
                strokeColor="#7C3AED"
                strokeWidth={1.5}
              />
              <Marker coordinate={center} anchor={{ x: 0.5, y: 1 }}>
                <Ionicons name="location" size={36} color="#7C3AED" />
              </Marker>
            </MapView>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.statusCard}>
            <View style={styles.statusIcon}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Service area set</Text>
              <Text style={styles.statusDesc}>You'll receive requests within {radius} miles of the center point.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.88} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{saved ? 'Saved!' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 10, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  subtitle: { color: '#6B7280', fontSize: 14, lineHeight: 20, fontWeight: '400', paddingHorizontal: 16, marginBottom: 10 },
  addressCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  addressInput: { flex: 1, color: '#17191D', fontSize: 15 },
  suggestionsBox: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#ECEEF0', marginHorizontal: 16, marginBottom: 8, overflow: 'hidden' },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 14 },
  suggestionBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  suggestionMain: { color: '#17191D', fontSize: 14, fontWeight: '500' },
  suggestionSub: { color: '#9CA3AF', fontSize: 12, marginTop: 1 },
  sliderCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', marginHorizontal: 16, padding: 16, marginTop: 6, marginBottom: 14 },
  sliderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sliderLabel: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  sliderValue: { color: '#16A34A', fontSize: 15, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rangeLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500', width: 34 },
  trackWrapper: { flex: 1, height: 28, justifyContent: 'center' },
  trackBg: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
  trackFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: '#7C3AED' },
  thumb: { position: 'absolute', top: 2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#7C3AED', shadowColor: '#7C3AED', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  mapContainer: { flex: 1, marginHorizontal: 0, overflow: 'hidden' },
  map: { flex: 1 },
  mapLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#F0F1F3' },
  mapLoadingText: { color: '#6B7280', fontSize: 14, fontWeight: '500' },
  footer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#ECEEF0', gap: 12 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#16A34A', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusInfo: { flex: 1 },
  statusTitle: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  statusDesc: { color: '#6B7280', fontSize: 13, lineHeight: 18, marginTop: 2 },
  saveBtn: { height: 54, borderRadius: 14, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
