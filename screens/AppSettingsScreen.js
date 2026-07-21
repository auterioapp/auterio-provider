import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AppSettingsScreen({ visible, onClose }) {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
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
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Notifications */}
          <Text style={styles.sectionLabel}>Notifications</Text>
          <View style={styles.card}>
            <ToggleRow label="Push Notifications" value={pushEnabled} onChange={setPushEnabled} />
            <ToggleRow label="Sound Alerts" value={soundEnabled} onChange={setSoundEnabled} border />
            <ToggleRow label="Vibration" value={vibrationEnabled} onChange={setVibrationEnabled} border />
          </View>

          {/* Navigation */}
          <Text style={styles.sectionLabel}>Navigation</Text>
          <View style={styles.card}>
            <SelectRow
              label="Navigation App"
              value="Google Maps"
              onPress={() => Alert.alert('Navigation App', 'This feature is coming soon.')}
            />
          </View>

          {/* Appearance */}
          <Text style={styles.sectionLabel}>Appearance</Text>
          <View style={styles.card}>
            <SelectRow
              label="Dark Mode"
              value="Follow System"
              onPress={() => Alert.alert('Dark Mode', 'This feature is coming soon.')}
            />
          </View>

          {/* Language */}
          <Text style={styles.sectionLabel}>Language</Text>
          <View style={styles.card}>
            <SelectRow
              label="Language"
              value="English"
              onPress={() => Alert.alert('Language', 'This feature is coming soon.')}
            />
          </View>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function ToggleRow({ label, sublabel, value, onChange, border }) {
  return (
    <View style={[styles.row, border && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {!!sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#E6E8EB', true: '#16A34A' }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function SelectRow({ label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.84} onPress={onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.selectRight}>
        <Text style={styles.selectValue}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color="#C8CDD4" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 48 },
  sectionLabel: { color: '#17191D', fontSize: 15, fontWeight: '800', marginBottom: 8, marginTop: 20 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', paddingHorizontal: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  rowBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  rowLabel: { color: '#17191D', fontSize: 15, fontWeight: '600' },
  rowSublabel: { color: '#5E646D', fontSize: 12, marginTop: 2 },
  selectRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectValue: { color: '#5E646D', fontSize: 14, fontWeight: '500' },
});
