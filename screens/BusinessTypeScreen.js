import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const TYPES = [
  {
    key: 'mobile',
    icon: 'car-outline',
    title: 'Mobile Provider',
    sub: 'You drive to the customer\'s location',
    accent: '#FF6B00',
    iconBg: '#FFF3E8',
  },
  {
    key: 'shop',
    icon: 'business-outline',
    title: 'Shop / Service Center',
    sub: 'Customers bring their vehicle to you',
    accent: '#2563EB',
    iconBg: '#EFF6FF',
  },
  {
    key: 'both',
    icon: 'git-merge-outline',
    title: 'Mobile + Shop',
    sub: 'You offer both on-site and in-shop service',
    accent: '#16A34A',
    iconBg: '#ECFDF5',
  },
];

export default function BusinessTypeScreen({ onSelect, onBack }) {
  return (
    <View style={styles.container}>
      {/* Dark header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <Image source={require('../assets/icon.png')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.logoText}>Auterio Provider</Text>
      </View>

      {/* Light form sheet */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.stepLabel}>STEP 1 OF 2</Text>
        <Text style={styles.title}>What type of business do you run?</Text>
        <Text style={styles.subtitle}>Choose the option that best describes how you work with customers.</Text>

        <View style={styles.typeList}>
          {TYPES.map((type, i) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeCard, i > 0 && styles.typeCardBorder]}
              activeOpacity={0.84}
              onPress={() => onSelect(type.key)}
            >
              <View style={[styles.typeIcon, { backgroundColor: type.iconBg }]}>
                <Ionicons name={type.icon} size={22} color={type.accent} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeTitle}>{type.title}</Text>
                <Text style={styles.typeSub}>{type.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C8CDD4" />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>You can change this later in Settings.</Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#001427' },
  header: { alignItems: 'center', paddingTop: 54, paddingBottom: 24 },
  backBtn: { position: 'absolute', top: 54, left: 20 },
  logo: { width: 52, height: 52, borderRadius: 12, marginBottom: 10 },
  logoText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sheet: { flex: 1, backgroundColor: '#F4F5F7', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { padding: 28, paddingBottom: 48 },
  stepLabel: { color: '#F04416', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#5E646D', marginBottom: 28, lineHeight: 20 },
  typeList: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  typeCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
  typeCardBorder: { borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  typeIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  typeInfo: { flex: 1 },
  typeTitle: { color: '#111827', fontSize: 15, fontWeight: '700', marginBottom: 3 },
  typeSub: { color: '#5E646D', fontSize: 13, lineHeight: 18 },
  hint: { color: '#9CA3AF', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
