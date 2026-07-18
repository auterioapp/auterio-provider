import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DEMO_DOCUMENTS = [
  { id: 'license',    title: 'Driver License',    icon: 'document-text-outline',    status: 'Verified',   meta: 'Expires Sep 18, 2026' },
  { id: 'insurance',  title: 'Insurance',          icon: 'shield-checkmark-outline', status: 'Verified',   meta: 'Expires Sep 18, 2026' },
  { id: 'business',   title: 'Business License',   icon: 'reader-outline',           status: 'Verified',   meta: 'Expires Dec 31, 2025' },
  { id: 'background', title: 'Background Check',   icon: 'shield-checkmark-outline', status: 'Approved',   meta: 'Expires Sep 18, 2026' },
  { id: 'w9',         title: 'W9 Form',            icon: 'document-text-outline',    status: 'Submitted',  meta: 'Updated Jan 15, 2025' },
];

const REAL_DOCUMENTS = [
  { id: 'license',    title: 'Driver License',    icon: 'document-text-outline' },
  { id: 'insurance',  title: 'Insurance',          icon: 'shield-checkmark-outline' },
  { id: 'business',   title: 'Business License',   icon: 'reader-outline' },
  { id: 'background', title: 'Background Check',   icon: 'shield-checkmark-outline' },
  { id: 'w9',         title: 'W9 Form',            icon: 'document-text-outline' },
];

const STATUS_COLOR = { Verified: '#16A34A', Approved: '#16A34A', Submitted: '#16A34A', 'Under Review': '#D97706', 'Not Submitted': '#9CA3AF', Expired: '#DC2626' };

export default function TrustComplianceScreen({ visible, onClose, verificationStatus }) {
  const isVerified = verificationStatus === 'verified';
  const isPending = verificationStatus === 'pending_review';
  const docStatus = isVerified ? 'Verified' : isPending ? 'Under Review' : 'Not Submitted';
  const docMeta = isPending ? 'Under review by our team' : isVerified ? '' : 'Upload required';
  const documents = isVerified ? DEMO_DOCUMENTS : REAL_DOCUMENTS.map(d => ({ ...d, status: docStatus, meta: docMeta }));
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: Dimensions.get('window').width, duration: 250, useNativeDriver: true }).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trust & Compliance</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {!isVerified && (
            <View style={[styles.statusBanner, isPending ? styles.statusBannerPending : styles.statusBannerUnverified]}>
              <Ionicons name={isPending ? 'time-outline' : 'alert-circle-outline'} size={18} color={isPending ? '#D97706' : '#9CA3AF'} />
              <Text style={[styles.statusBannerText, isPending && styles.statusBannerTextPending]}>
                {isPending ? 'Your documents are under review. We\'ll notify you once verified.' : 'Upload your documents to activate your account and start receiving orders.'}
              </Text>
            </View>
          )}

          <View style={styles.card}>
            {documents.map((doc, index) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.row, index > 0 && styles.rowBorder]}
                activeOpacity={0.84}
                onPress={() => Alert.alert(doc.title, `Status: ${doc.status}${doc.meta ? '\n' + doc.meta : ''}`)}
              >
                <View style={styles.iconBox}>
                  <Ionicons name={doc.icon} size={22} color="#17191D" />
                </View>
                <View style={styles.info}>
                  <Text style={styles.docTitle}>{doc.title}</Text>
                  <Text style={[styles.docStatus, { color: STATUS_COLOR[doc.status] || '#6B7280' }]}>
                    {doc.status}
                  </Text>
                </View>
                {!!doc.meta && <Text style={styles.docMeta}>{doc.meta}</Text>}
                <Ionicons name="chevron-forward" size={16} color="#C8CDD4" style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footerNote}>
            Make sure your documents are up to date to avoid service interruptions.
          </Text>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  statusBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 12 },
  statusBannerUnverified: { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' },
  statusBannerPending: { backgroundColor: 'rgba(217,119,6,0.06)', borderColor: 'rgba(217,119,6,0.2)' },
  statusBannerText: { flex: 1, color: '#6B7280', fontSize: 13, lineHeight: 18 },
  statusBannerTextPending: { color: '#92400E' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#ECEEF0', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  info: { flex: 1 },
  docTitle: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  docStatus: { fontSize: 13, fontWeight: '700' },
  docMeta: { color: '#6B7280', fontSize: 12, fontWeight: '500', flexShrink: 0, textAlign: 'right', maxWidth: 120 },
  chevron: { marginLeft: 6, flexShrink: 0 },
  footerNote: { color: '#6B7280', fontSize: 13, lineHeight: 20, marginTop: 20, paddingHorizontal: 4 },
});
