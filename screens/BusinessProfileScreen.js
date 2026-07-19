import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPES = [
  { key: 'mobile', icon: 'car-outline', title: 'Mobile Provider', sub: 'You drive to the customer\'s location', color: '#F04416', bg: 'rgba(240,68,22,0.08)' },
  { key: 'shop', icon: 'business-outline', title: 'Shop / Service Center', sub: 'Customers bring their vehicle to you', color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  { key: 'both', icon: 'git-merge-outline', title: 'Mobile + Shop', sub: 'You offer both on-site and in-shop service', color: '#16A34A', bg: 'rgba(22,163,74,0.08)' },
];

export default function BusinessProfileScreen({ visible, providerType, onClose, onSave }) {
  const [type, setType] = useState(providerType || 'mobile');
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(visible);
  const slideAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current;

  useEffect(() => {
    if (visible) {
      setType(providerType || 'mobile');
    }
  }, [visible, providerType]);

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

  const selectType = async (key) => {
    if (key === type || saving) return;
    setType(key);
    setSaving(true);
    await onSave({ type: key });
    setSaving(false);
  };

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Business Type</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.typeList}>
            {TYPES.map((t, i) => {
              const selected = type === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, i > 0 && styles.typeCardBorder, selected && { backgroundColor: t.bg }]}
                  activeOpacity={0.84}
                  onPress={() => selectType(t.key)}
                >
                  <View style={[styles.typeIcon, { backgroundColor: selected ? t.bg : '#F3F4F5' }]}>
                    <Ionicons name={t.icon} size={20} color={selected ? t.color : '#5E646D'} />
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
        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slideContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 72, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#17191D' },

  content: { padding: 20, paddingBottom: 32 },

  typeList: { borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden', backgroundColor: '#fff' },
  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 14 },
  typeCardBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  typeIcon: { width: 42, height: 42, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeInfo: { flex: 1 },
  typeTitle: { color: '#17191D', fontSize: 14, fontWeight: '700', marginBottom: 2 },
  typeSub: { color: '#5E646D', fontSize: 12, lineHeight: 16 },
  typeRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeRadioFill: { width: 10, height: 10, borderRadius: 5 },
});
