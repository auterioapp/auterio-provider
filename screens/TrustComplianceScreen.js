import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DOCUMENTS = [
  { id: 'license',    title: 'Driver License',    icon: 'document-text-outline', status: 'Verified',   meta: 'Expires Sep 18, 2026' },
  { id: 'insurance',  title: 'Insurance',          icon: 'shield-checkmark-outline', status: 'Verified', meta: 'Expires Sep 18, 2026' },
  { id: 'business',   title: 'Business License',   icon: 'reader-outline',        status: 'Verified',   meta: 'Expires Dec 31, 2025' },
  { id: 'background', title: 'Background Check',   icon: 'shield-checkmark-outline', status: 'Approved', meta: 'Expires Sep 18, 2026' },
  { id: 'w9',         title: 'W9 Form',            icon: 'document-text-outline', status: 'Submitted',  meta: 'Updated Jan 15, 2025' },
];

const STATUS_COLOR = { Verified: '#16A34A', Approved: '#16A34A', Submitted: '#16A34A', Pending: '#D97706', Expired: '#DC2626' };

export default function TrustComplianceScreen({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trust & Compliance</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {DOCUMENTS.map((doc, index) => (
              <TouchableOpacity
                key={doc.id}
                style={[styles.row, index > 0 && styles.rowBorder]}
                activeOpacity={0.84}
                onPress={() => Alert.alert(doc.title, `Status: ${doc.status}\n${doc.meta}`)}
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
                <Text style={styles.docMeta}>{doc.meta}</Text>
                <Ionicons name="chevron-forward" size={16} color="#C8CDD4" style={styles.chevron} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.footerNote}>
            Make sure your documents are up to date to avoid service interruptions.
          </Text>
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
