import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Dimensions, Linking, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authorizedFetch } from '../apiClient';
import { API_URL } from '../constants';
import { useProvider } from '../ProviderContext';

export default function PayoutsScreen({ visible, onClose, isDemo }) {
  const { provider } = useProvider();
  const [account, setAccount] = useState(null); // { connected, payoutsEnabled, bankAccount }
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const appState = useRef(AppState.currentState);
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

  const fetchAccount = useCallback(async () => {
    if (isDemo) return;
    try {
      const res = await authorizedFetch(`${API_URL}/stripe/connect/account/${provider.id}`);
      const data = await res.json();
      setAccount(data);
    } catch {}
  }, [isDemo, provider.id]);

  useEffect(() => {
    if (visible) fetchAccount();
  }, [visible, fetchAccount]);

  // Refresh when user comes back from browser (Stripe onboarding)
  useEffect(() => {
    if (!visible || isDemo) return;
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        fetchAccount();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [visible, isDemo, fetchAccount]);

  const handleAddAccount = async () => {
    setConnecting(true);
    try {
      const res = await authorizedFetch(`${API_URL}/stripe/connect/create-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      });
      const data = await res.json();
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        Alert.alert('Error', data.error || 'Could not start setup');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not connect to server');
    } finally {
      setConnecting(false);
    }
  };

  const handleManageDashboard = async () => {
    setLoading(true);
    try {
      const res = await authorizedFetch(`${API_URL}/stripe/connect/dashboard-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId: provider.id }),
      });
      const data = await res.json();
      if (data.url) await Linking.openURL(data.url);
    } catch {}
    setLoading(false);
  };

  const demoBank = isDemo ? { bankName: 'Chase', last4: '4821' } : null;
  const realBank = account?.bankAccount ?? null;
  const bank = isDemo ? demoBank : realBank;
  const isConnected = isDemo || account?.connected;

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payout & Banking</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Payout destination */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Payout destination</Text>

            {bank ? (
              <View style={styles.accountCard}>
                <View style={styles.accountIconWrap}>
                  <Ionicons name="card-outline" size={20} color="#2563EB" />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{bank.bankName} Checking</Text>
                  <Text style={styles.accountNumber}>•••• •••• •••• {bank.last4}</Text>
                </View>
                <View style={styles.accountRight}>
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Default</Text>
                  </View>
                  {!isDemo && (
                    <TouchableOpacity activeOpacity={0.7} onPress={handleManageDashboard} style={styles.editBtn}>
                      {loading
                        ? <ActivityIndicator size="small" color="#F04416" />
                        : <Text style={styles.editBtnText}>Edit</Text>
                      }
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyAccountCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="card-outline" size={24} color="#9CA3AF" />
                </View>
                <Text style={styles.emptyAccountTitle}>No bank account linked</Text>
                <Text style={styles.emptyAccountSub}>Add a bank account to receive payouts</Text>
              </View>
            )}

            {!isDemo && (
              <TouchableOpacity
                style={[styles.addAccountBtn, connecting && styles.addAccountBtnDisabled]}
                activeOpacity={0.8}
                onPress={handleAddAccount}
                disabled={connecting}
              >
                {connecting
                  ? <ActivityIndicator size="small" color="#F04416" />
                  : <Ionicons name="add-circle-outline" size={17} color="#F04416" />
                }
                <Text style={styles.addAccountText}>
                  {connecting ? 'Opening setup...' : bank ? 'Add another account' : 'Add bank account'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Transfer speed */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Transfer speed</Text>
            <View style={styles.card}>

              <View style={[styles.optionRow, styles.optionRowDisabled]}>
                <View style={[styles.optionIcon, styles.optionIconDisabled]}>
                  <Ionicons name="flash" size={19} color="#B9BFC8" />
                </View>
                <View style={styles.optionInfo}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, styles.optionTitleDisabled]}>Instant Transfer</Text>
                    <View style={styles.feeChip}>
                      <Text style={styles.feeChipText}>1.5% fee</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>Arrives in minutes</Text>
                </View>
                <Text style={styles.comingSoonTag}>Coming soon</Text>
              </View>

              <View style={styles.rowDivider} />

              <View style={[styles.optionRow, styles.optionRowDisabled]}>
                <View style={[styles.optionIcon, styles.optionIconDisabled]}>
                  <Ionicons name="calendar-outline" size={19} color="#B9BFC8" />
                </View>
                <View style={styles.optionInfo}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, styles.optionTitleDisabled]}>Standard Transfer</Text>
                    <View style={styles.freeChip}>
                      <Text style={styles.freeChipText}>Free</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>1–3 business days</Text>
                </View>
                <Text style={styles.comingSoonTag}>Coming soon</Text>
              </View>

            </View>
          </View>

          {/* Account status */}
          {!isDemo && account?.connected && !account?.payoutsEnabled && (
            <View style={styles.warningCard}>
              <Ionicons name="time-outline" size={20} color="#D97706" />
              <View style={styles.warningInfo}>
                <Text style={styles.warningTitle}>Verification in progress</Text>
                <Text style={styles.warningSub}>Stripe is reviewing your account. Payouts will be enabled shortly.</Text>
              </View>
            </View>
          )}

          {/* Security */}
          <View style={styles.securityCard}>
            <View style={styles.securityIconWrap}>
              <Ionicons name="shield-checkmark" size={20} color="#2563EB" />
            </View>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Your earnings are protected</Text>
              <Text style={styles.securitySub}>All transfers are encrypted with bank-level security.</Text>
            </View>
          </View>

        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 72, paddingBottom: 14, backgroundColor: '#F5F6F8',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#17191D', fontSize: 17, fontWeight: '700' },
  headerRight: { width: 36 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 24 },

  section: { gap: 10 },
  sectionLabel: { color: '#5E646D', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginLeft: 2 },

  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  accountIconWrap: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  accountInfo: { flex: 1 },
  accountName: { color: '#17191D', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  accountNumber: { color: '#5E646D', fontSize: 13, fontWeight: '500', letterSpacing: 1 },
  accountRight: { alignItems: 'flex-end', gap: 8 },
  defaultBadge: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  defaultBadgeText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  editBtn: { paddingVertical: 2, minWidth: 28, alignItems: 'center' },
  editBtnText: { color: '#F04416', fontSize: 13, fontWeight: '700' },

  emptyAccountCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0',
    paddingVertical: 32, alignItems: 'center', gap: 8,
  },
  emptyIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#F5F6F8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyAccountTitle: { color: '#374151', fontSize: 15, fontWeight: '700' },
  emptyAccountSub: { color: '#9CA3AF', fontSize: 13, fontWeight: '400' },

  addAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#FFF7F0', borderRadius: 12, borderWidth: 1, borderColor: '#FDCBA6',
    paddingVertical: 13,
  },
  addAccountBtnDisabled: { opacity: 0.6 },
  addAccountText: { color: '#F04416', fontSize: 14, fontWeight: '600' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden' },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 14 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  optionInfo: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  optionTitle: { color: '#17191D', fontSize: 15, fontWeight: '700' },
  feeChip: { backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  feeChipText: { color: '#D97706', fontSize: 11, fontWeight: '700' },
  freeChip: { backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  freeChipText: { color: '#16A34A', fontSize: 11, fontWeight: '700' },
  optionSub: { color: '#5E646D', fontSize: 13, fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: '#F0F1F3', marginHorizontal: 16 },
  optionRowDisabled: { opacity: 0.55 },
  optionIconDisabled: { backgroundColor: '#F3F4F5' },
  optionTitleDisabled: { color: '#5E646D' },
  comingSoonTag: { color: '#9CA3AF', fontSize: 11, fontWeight: '700' },

  warningCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFFBEB', borderRadius: 14, borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  warningInfo: { flex: 1 },
  warningTitle: { color: '#92400E', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  warningSub: { color: '#5E646D', fontSize: 13, lineHeight: 18 },

  securityCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF', borderRadius: 14, borderWidth: 1, borderColor: '#DBEAFE',
    paddingHorizontal: 16, paddingVertical: 16,
  },
  securityIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#DBEAFE',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  securityInfo: { flex: 1 },
  securityTitle: { color: '#1D4ED8', fontSize: 14, fontWeight: '700', marginBottom: 3 },
  securitySub: { color: '#5E646D', fontSize: 13, lineHeight: 18 },
});
