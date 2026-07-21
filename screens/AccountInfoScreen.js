import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authorizedFetch } from '../apiClient';
import { API_URL } from '../constants';
import { useProvider } from '../ProviderContext';

function formatPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length !== 10) return raw || '';
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function AccountInfoScreen({ visible, onClose, isDemoAccount }) {
  const { provider } = useProvider();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [shortId, setShortId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  const [memberSince, setMemberSince] = useState('');
  const [description, setDescription] = useState('');
  const [editingDescription, setEditingDescription] = useState(false);
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

  useEffect(() => {
    if (!visible) return;
    Promise.all([
      isDemoAccount ? Promise.resolve(null) : authorizedFetch(`${API_URL}/profiles/${provider.id}`).then(response => response.ok ? response.json() : null).catch(() => null),
      AsyncStorage.getItem('providerUser'),
      AsyncStorage.getItem('@pricing_store'),
    ]).then(([profile, userRaw, pricingRaw]) => {
      const user = userRaw ? JSON.parse(userRaw) : {};
      const pricing = pricingRaw ? JSON.parse(pricingRaw) : {};
      const serverBusinessName = (profile?.businessName || profile?.name || '').trim();
      setName(profile?.contactName || user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setCompanyName(serverBusinessName || pricing.businessName || '');
      setShortId(profile?.shortId || '');
      setVerificationStatus(profile?.verificationStatus || 'unverified');
      setMemberSince(user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '');
      setDescription(profile?.description || '');
    }).catch(() => {});
  }, [visible]);

  const saveDescription = (value) => {
    if (isDemoAccount) return;
    authorizedFetch(`${API_URL}/profiles/${provider.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: value.trim() }),
    }).catch(() => {});
  };

  const handleSave = () => {
    saveDescription(description);
    onClose();
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            Alert.alert('Account Deletion Requested', 'Our team will process your request within 7 business days.'),
        },
      ]
    );
  };

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.slideContainer, { transform: [{ translateX: slideAnim }] }]}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#17191D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Info</Text>
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.7} disabled={isDemoAccount}>
            <Text style={[styles.saveBtnText, isDemoAccount && { color: '#C4C9D1' }]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          <View style={styles.heroRow}>
            <TouchableOpacity
              style={styles.heroAvatar}
              activeOpacity={0.8}
              onPress={() => Alert.alert('Profile Photo', 'This feature is coming soon.')}
            >
              <Ionicons name="camera-outline" size={26} color="#5E646D" />
            </TouchableOpacity>
            <View style={styles.heroInfo}>
              <View style={styles.heroNameRow}>
                <Text style={styles.heroName} numberOfLines={1}>{companyName || provider.company}</Text>
              </View>
              <View style={[
                styles.verifBadge,
                verificationStatus === 'verified' && styles.verifBadgeVerified,
                verificationStatus === 'pending_review' && styles.verifBadgePending,
              ]}>
                <Ionicons
                  name={verificationStatus === 'verified' ? 'shield-checkmark' : verificationStatus === 'pending_review' ? 'time-outline' : 'shield-outline'}
                  size={11}
                  color={verificationStatus === 'verified' ? '#16A34A' : verificationStatus === 'pending_review' ? '#D97706' : '#9CA3AF'}
                />
                <Text style={[
                  styles.verifBadgeText,
                  verificationStatus === 'verified' && styles.verifBadgeTextVerified,
                  verificationStatus === 'pending_review' && styles.verifBadgeTextPending,
                ]}>
                  {verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'pending_review' ? 'Under Review' : 'Unverified'}
                </Text>
              </View>
              {!!memberSince && <Text style={styles.heroMemberSince} numberOfLines={1}>Member since {memberSince}</Text>}
            </View>
          </View>

          <Text style={styles.sectionLabel}>Personal Information</Text>
          <View style={styles.fieldGroup}>
            <FieldRow icon="person-outline" label="Full Name" value={name || provider.name} right={<Ionicons name="lock-closed-outline" size={16} color="#C4C9D1" />} />
            <View style={styles.sep} />
            <FieldRow icon="mail-outline" label="Email" value={email} right={<Ionicons name="lock-closed-outline" size={16} color="#C4C9D1" />} />
            <View style={styles.sep} />
            <FieldRow icon="call-outline" label="Phone" value={formatPhone(phone || provider.phone)} right={<Ionicons name="lock-closed-outline" size={16} color="#C4C9D1" />} />
          </View>
          <Text style={styles.fieldHint}>Name, email and phone can only be changed through Support for security reasons.</Text>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Business Information</Text>
          <View style={styles.fieldGroup}>
            <FieldRow
              icon="briefcase-outline"
              label="Business Name"
              value={companyName}
              hint="This name is shown to customers when they search for providers."
              right={<Ionicons name="lock-closed-outline" size={16} color="#C4C9D1" />}
              iconMid
            />
            <View style={styles.sep} />
            {editingDescription ? (
              <View style={[styles.fieldRow, styles.fieldIconTopRow]}>
                <View style={[styles.fieldIcon, styles.fieldIconTop]}>
                  <Ionicons name="document-text-outline" size={18} color="#5E646D" />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>Business Description (Optional)</Text>
                  <TextInput
                    style={styles.descInput}
                    placeholder="e.g. Mobile mechanic specializing in Toyota and Honda"
                    placeholderTextColor="#C4C9D1"
                    value={description}
                    onChangeText={setDescription}
                    editable={!isDemoAccount}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    autoFocus
                  />
                </View>
                <TouchableOpacity
                  style={styles.doneBtn}
                  activeOpacity={0.7}
                  onPress={() => { saveDescription(description); setEditingDescription(false); }}
                >
                  <Ionicons name="checkmark" size={18} color="#16A34A" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.fieldRow}
                activeOpacity={0.7}
                onPress={() => !isDemoAccount && setEditingDescription(true)}
              >
                <View style={styles.fieldIcon}>
                  <Ionicons name="document-text-outline" size={18} color="#5E646D" />
                </View>
                <View style={styles.fieldContent}>
                  <Text style={styles.fieldLabel}>Business Description (Optional)</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>{description || 'Add a description'}</Text>
                </View>
                {!isDemoAccount && <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />}
              </TouchableOpacity>
            )}
            <View style={styles.sep} />
            <FieldRow
              icon="finger-print-outline"
              label="Provider ID"
              value={isDemoAccount ? provider.id : shortId}
              hint="Use this ID when contacting support."
              mono
            />
          </View>

          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Security</Text>
          <View style={styles.fieldGroup}>
            <TouchableOpacity
              style={styles.fieldRow}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Change Password', 'This feature is coming soon.')}
            >
              <View style={styles.fieldIcon}>
                <Ionicons name="lock-closed-outline" size={18} color="#5E646D" />
              </View>
              <Text style={styles.navRowLabel}>Change Password</Text>
              <Ionicons name="chevron-forward" size={16} color="#C4C9D1" />
            </TouchableOpacity>
          </View>

          {!isDemoAccount && (
            <TouchableOpacity style={styles.deleteCard} activeOpacity={0.84} onPress={handleDeleteAccount}>
              <Ionicons name="trash-outline" size={20} color="#DC2626" />
              <Text style={styles.deleteText}>Delete Account</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function FieldRow({ icon, label, value, mono, hint, right, iconTop, iconMid }) {
  return (
    <View>
      <View style={[styles.fieldRow, !!hint && styles.fieldRowNoBottomPad]}>
        <View style={[styles.fieldIcon, iconTop && styles.fieldIconTop, iconMid && styles.fieldIconMid]}>
          <Ionicons name={icon} size={18} color="#5E646D" />
        </View>
        <View style={styles.fieldContent}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={[styles.fieldValue, mono && styles.fieldValueMono]} numberOfLines={1}>{value || '—'}</Text>
        </View>
        {right}
      </View>
      {!!hint && <Text style={styles.fieldRowHintFull}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  slideContainer: { flex: 1, backgroundColor: '#F5F6F8' },
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 72, paddingBottom: 14, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#17191D' },
  saveBtn: { paddingHorizontal: 4, minWidth: 36, alignItems: 'flex-end' },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#2563EB' },

  content: { padding: 20, paddingBottom: 40 },

  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 28 },
  heroAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#E9EBF0', alignItems: 'center', justifyContent: 'center',
  },
  heroInfo: { flex: 1, minWidth: 0 },
  heroNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  heroName: { fontSize: 19, fontWeight: '700', color: '#17191D', flexShrink: 1 },
  heroMemberSince: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },

  verifBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#F3F4F5', borderWidth: 1, borderColor: '#E5E7EB' },
  verifBadgeVerified: { backgroundColor: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.2)' },
  verifBadgePending: { backgroundColor: 'rgba(217,119,6,0.08)', borderColor: 'rgba(217,119,6,0.2)' },
  verifBadgeText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF' },
  verifBadgeTextVerified: { color: '#16A34A' },
  verifBadgeTextPending: { color: '#D97706' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#5E646D', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  fieldHint: { fontSize: 12, color: '#9CA3AF', marginTop: 6, marginBottom: 4, lineHeight: 16 },

  fieldGroup: {
    backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECEEF0', overflow: 'hidden',
    shadowColor: '#17191D', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sep: { height: 1, backgroundColor: '#F0F1F3', marginLeft: 52 },

  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  fieldRowNoBottomPad: { paddingBottom: 4 },
  fieldIconTopRow: { alignItems: 'flex-start' },
  fieldIcon: { width: 22, alignItems: 'center' },
  fieldIconTop: { alignSelf: 'flex-start', marginTop: 2 },
  fieldIconMid: { alignSelf: 'flex-start', marginTop: 10 },
  fieldContent: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 12, lineHeight: 16, fontWeight: '500', color: '#5E646D', marginBottom: 2 },
  fieldValue: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#17191D' },
  fieldValueMono: { fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', letterSpacing: 0.5 },
  fieldRowHintFull: { fontSize: 11, color: '#9CA3AF', lineHeight: 14, paddingHorizontal: 16, paddingBottom: 14 },
  navRowLabel: { flex: 1, fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#17191D' },

  descInput: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: '#17191D', padding: 0, marginTop: 2, minHeight: 44 },
  doneBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 2 },

  deleteCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: 16, paddingVertical: 16, marginTop: 28,
  },
  deleteText: { color: '#DC2626', fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
