import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPES = [
  { key: 'mobile', icon: 'car-outline', title: 'Mobile Provider', sub: 'You drive to the customer\'s location', color: '#F04416', bg: 'rgba(240,68,22,0.08)' },
  { key: 'shop', icon: 'business-outline', title: 'Shop / Service Center', sub: 'Customers bring their vehicle to you', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  { key: 'both', icon: 'git-merge-outline', title: 'Mobile + Shop', sub: 'You offer both on-site and in-shop service', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
];

export default function BusinessProfileScreen({ visible, providerType, businessName, onClose, onSave }) {
  const [type, setType] = useState(providerType || 'mobile');
  const [name, setName] = useState(businessName || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(providerType || 'mobile');
      setName(businessName || '');
    }
  }, [visible, providerType, businessName]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await onSave({ type, name: name.trim() });
    setSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Information</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.sectionLabel}>Business Type</Text>
          <View style={styles.typeList}>
            {TYPES.map((t, i) => {
              const selected = type === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, i > 0 && styles.typeCardBorder, selected && { backgroundColor: t.bg }]}
                  activeOpacity={0.84}
                  onPress={() => setType(t.key)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: selected ? t.bg : '#F3F4F5' }]}>
                    <Ionicons name={t.icon} size={20} color={selected ? t.color : '#8B9098'} />
                  </View>
                  <View style={styles.typeInfo}>
                    <Text style={[styles.typeTitle, selected && { color: t.color }]}>{t.title}</Text>
                    <Text style={styles.typeSub}>{t.sub}</Text>
                  </View>
                  <View style={[styles.typeRadio, selected && { borderColor: t.color }]}>
                    {selected && <View style={[styles.typeRadioFill, { backgroundColor: t.color }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Company Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Auterio Auto Services LLC"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
          <Text style={styles.inputHint}>This name will be shown to customers.</Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || !name.trim()) && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.88}
            disabled={saving || !name.trim()}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F5', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#17191D' },

  content: { padding: 20, paddingBottom: 32 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#8B9098', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  typeList: { borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#fff' },
  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  typeCardBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  typeIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeInfo: { flex: 1 },
  typeTitle: { color: '#17191D', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  typeSub: { color: '#8B9098', fontSize: 12, lineHeight: 16 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeRadioFill: { width: 10, height: 10, borderRadius: 5 },

  input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 15, color: '#17191D', borderWidth: 1.5, borderColor: '#E5E7EB' },
  inputHint: { color: '#9CA3AF', fontSize: 12, marginTop: 6 },

  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  saveBtn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
