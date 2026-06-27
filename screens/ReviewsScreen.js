import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const RATING_DATA = {
  average: 4.9,
  total: 128,
  label: 'Excellent',
  distribution: [
    { stars: 5, count: 112 },
    { stars: 4, count: 12 },
    { stars: 3, count: 3 },
    { stars: 2, count: 1 },
    { stars: 1, count: 0 },
  ],
};

const RECENT_REVIEWS = [
  {
    id: 1,
    name: 'Sarah M.',
    date: 'May 8, 2024',
    rating: 5,
    text: 'Excellent service! Very professional and arrived on time. Highly recommend.',
    initials: 'SM',
    avatarColor: '#6B7280',
  },
  {
    id: 2,
    name: 'John D.',
    date: 'May 5, 2024',
    rating: 5,
    text: 'Great communication and quality work. Will use again.',
    initials: 'JD',
    avatarColor: '#374151',
  },
  {
    id: 3,
    name: 'Mike R.',
    date: 'May 3, 2024',
    rating: 5,
    text: 'Fast response and fixed the issue perfectly.',
    initials: 'MR',
    avatarColor: '#4B5563',
  },
];

export default function ReviewsScreen({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reviews</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Text style={styles.ratingBig}>{RATING_DATA.average}</Text>
              <Ionicons name="star" size={30} color="#F5B301" style={styles.ratingBigStar} />
            </View>
            <View style={styles.summaryMeta}>
              <Text style={styles.ratingLabel}>{RATING_DATA.label}</Text>
              <Text style={styles.ratingTotal}>{RATING_DATA.total} reviews</Text>
            </View>
            <View style={styles.barsSection}>
              {RATING_DATA.distribution.map(({ stars, count }) => (
                <View key={stars} style={styles.barRow}>
                  <Text style={styles.barStar}>{stars}</Text>
                  <Ionicons name="star" size={12} color="#F5B301" />
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { flex: count || 0.01 }]} />
                    <View style={{ flex: RATING_DATA.total - count }} />
                  </View>
                  <Text style={styles.barCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Reviews</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reviewsCard}>
            {RECENT_REVIEWS.map((review, index) => (
              <View key={review.id} style={[styles.reviewItem, index > 0 && styles.reviewItemBorder]}>
                <View style={styles.reviewTop}>
                  <View style={[styles.avatar, { backgroundColor: review.avatarColor }]}>
                    <Text style={styles.avatarText}>{review.initials}</Text>
                  </View>
                  <View style={styles.reviewMeta}>
                    <Text style={styles.reviewName}>{review.name}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Ionicons key={i} name="star" size={14} color="#F5B301" />
                    ))}
                  </View>
                </View>
                <Text style={styles.reviewText}>{review.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', padding: 18, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  ratingBig: { fontSize: 48, fontWeight: '800', color: '#17191D', lineHeight: 56 },
  ratingBigStar: { marginLeft: 8, marginTop: 6 },
  summaryMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  ratingLabel: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  ratingTotal: { color: '#6B7280', fontSize: 13, fontWeight: '500' },
  barsSection: { gap: 10 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  barStar: { color: '#17191D', fontSize: 13, fontWeight: '600', width: 12, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#F0F1F3', flexDirection: 'row', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#16A34A', borderRadius: 4 },
  barCount: { color: '#6B7280', fontSize: 13, fontWeight: '500', width: 24, textAlign: 'right' },
  recentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  recentTitle: { color: '#17191D', fontSize: 16, fontWeight: '700' },
  seeAll: { color: '#7C3AED', fontSize: 13, fontWeight: '700' },
  reviewsCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16 },
  reviewItem: { paddingVertical: 16 },
  reviewItemBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  reviewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 10, flexShrink: 0 },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  reviewMeta: { flex: 1 },
  reviewName: { color: '#17191D', fontSize: 14, fontWeight: '700' },
  reviewDate: { color: '#6B7280', fontSize: 12, fontWeight: '500', marginTop: 2 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewText: { color: '#374151', fontSize: 14, lineHeight: 21, fontWeight: '400' },
});
