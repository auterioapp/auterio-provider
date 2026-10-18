import { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { fetchJson } from '../apiClient';
import { API_URL } from '../constants';

// Photos the customer attached to an order (GET /orders/:id/photos). The
// server only returns them to the order's own provider, so an open request
// shows nothing until it's accepted. Images need the auth header, so the token
// is passed to <Image> directly.
const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

// bare: just the thumbnails (the caller shows the title); onCount gets how many there are.
// kind 'work': the provider's photos of the finished work, under their own title.
export default function OrderPhotos({ orderId, bare = false, onCount, kind, title = 'Customer photos' }) {
  const [photos, setPhotos] = useState([]);
  const [token, setToken] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);
  const { width } = useWindowDimensions();

  useEffect(() => {
    if (!orderId) return undefined;
    let active = true;
    (async () => {
      try {
        const [list, savedToken] = await Promise.all([
          fetchJson(`${API_URL}/orders/${orderId}/photos${kind ? `?kind=${kind}` : ''}`),
          SecureStore.getItemAsync('providerToken'),
        ]);
        if (!active) return;
        setToken(savedToken);
        setPhotos(Array.isArray(list) ? list : []);
        onCount?.(Array.isArray(list) ? list.length : 0);
      } catch {
        if (active) setPhotos([]);
      }
    })();
    return () => { active = false; };
  }, [orderId, kind]);

  if (!photos.length || !token) return null;

  const sourceOf = (photo) => ({ uri: `${SERVER_URL}${photo.url}`, headers: { Authorization: `Bearer ${token}` } });

  return (
    <View style={bare ? styles.bareWrap : styles.wrap}>
      {!bare && (
        <View style={styles.titleRow}>
          <View style={styles.icon}>
            <Ionicons name="images-outline" size={16} color="#F04416" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
      )}
      <View style={styles.row}>
        {photos.map((photo, index) => (
          <TouchableOpacity key={photo.id} onPress={() => setOpenIndex(index)} activeOpacity={0.85} accessibilityRole="imagebutton" accessibilityLabel={`Customer photo ${index + 1}`}>
            <Image source={sourceOf(photo)} style={styles.thumb} />
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={openIndex != null} transparent animationType="fade" onRequestClose={() => setOpenIndex(null)}>
        <View style={styles.viewer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (openIndex || 0) * width, y: 0 }}
          >
            {photos.map(photo => (
              <Image key={photo.id} source={sourceOf(photo)} style={[styles.full, { width }]} resizeMode="contain" />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.close} onPress={() => setOpenIndex(null)} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  bareWrap: { marginTop: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  icon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F0441618', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: '#17191D', fontSize: 13, lineHeight: 17, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: '#F3F4F5' }, // same as the customer's (IssueDetailsScreen photoThumb)
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center' },
  full: { height: '80%' },
  close: { position: 'absolute', top: 56, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
});
