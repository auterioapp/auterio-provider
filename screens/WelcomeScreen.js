import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WelcomeScreen({ onSignIn, onSignUp }) {
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <View style={styles.logoWrap}>
            <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
            <Text style={styles.logoText}>Auterio</Text>
          </View>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroLabel}>FOR PROVIDERS</Text>
          <Text style={styles.heroTitle}>Grow your auto{'\n'}service business</Text>
          <Text style={styles.heroTitleOrange}>with Auterio.</Text>
          <Text style={styles.heroSub}>Accept jobs, manage bookings, and get{'\n'}paid — all in one place.</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.bottom}>
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons name="people-outline" size={26} color="#F04416" />
              <Text style={styles.trustTitle}>More Clients</Text>
              <Text style={styles.trustSub}>Reach customers{'\n'}in your area</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="calendar-outline" size={26} color="#4CAF50" />
              <Text style={styles.trustTitle}>Easy Scheduling</Text>
              <Text style={styles.trustSub}>Manage your{'\n'}appointments</Text>
            </View>
            <View style={styles.trustDivider} />
            <View style={styles.trustItem}>
              <Ionicons name="cash-outline" size={26} color="#2563EB" />
              <Text style={styles.trustTitle}>Fast Payouts</Text>
              <Text style={styles.trustSub}>Get paid{'\n'}instantly</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.createBtn} onPress={onSignUp}>
            <Ionicons name="person-add-outline" size={20} color="#fff" />
            <Text style={styles.createBtnText}>Create Account</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.signInBtn} onPress={onSignIn}>
            <Ionicons name="log-in-outline" size={20} color="#fff" />
            <Text style={styles.signInText}>I already have an account</Text>
          </TouchableOpacity>

          <View style={styles.securityRow}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#4CAF50" />
            <View style={{ flex: 1 }}>
              <Text style={styles.securityTitle}>Verified provider network</Text>
              <Text style={styles.securitySub}>Background checked • Insured • 24/7 support</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001427' },
  scroll: { flexGrow: 1, minHeight: '100%' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 54 },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 36, height: 36, borderRadius: 8 },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroContent: { padding: 20, paddingTop: 48, paddingBottom: 40 },
  heroLabel: { color: '#F04416', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 36, fontWeight: '800', lineHeight: 42, marginBottom: 2 },
  heroTitleOrange: { color: '#F04416', fontSize: 36, fontWeight: '800', marginBottom: 16 },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 22 },
  spacer: { flex: 1, minHeight: 40 },
  bottom: { padding: 20, paddingBottom: 48 },
  trustRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 20 },
  trustItem: { flex: 1, alignItems: 'center', gap: 6 },
  trustDivider: { width: 1, height: 56, backgroundColor: 'rgba(255,255,255,0.1)' },
  trustTitle: { color: '#fff', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  trustSub: { color: 'rgba(255,255,255,0.45)', fontSize: 10, textAlign: 'center', lineHeight: 14 },
  createBtn: { backgroundColor: '#F04416', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  signInBtn: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 },
  signInText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  securityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(76,175,80,0.08)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(76,175,80,0.15)' },
  securityTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  securitySub: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 2 },
});
