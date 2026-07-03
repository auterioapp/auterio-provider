import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ServicesScreen from './ServicesScreen';
import ServiceRadiusScreen from './ServiceRadiusScreen';
import PricingScreen from './PricingScreen';

const STEPS = [
  {
    key: 'services',
    icon: 'construct-outline',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    title: 'Services',
    desc: 'Add the services you offer so customers can find you.',
    cta: 'Configure Services',
  },
  {
    key: 'zone',
    icon: 'location-outline',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.08)',
    title: 'Service Area',
    desc: 'Set your service radius. Orders outside it won\'t be shown to you.',
    cta: 'Set Service Area',
  },
  {
    key: 'pricing',
    icon: 'cash-outline',
    color: '#F04416',
    bg: 'rgba(240,68,22,0.08)',
    title: 'Pricing',
    desc: 'Define your rates. You can change these anytime.',
    cta: 'Configure Pricing',
  },
];

export default function ProviderSetupScreen({ onComplete }) {
  const [done, setDone] = useState({ services: false, zone: false, pricing: false });
  const [servicesOpen, setServicesOpen] = useState(false);
  const [zoneOpen, setZoneOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);

  const allDone = STEPS.every(s => done[s.key]);
  const doneCount = STEPS.filter(s => done[s.key]).length;

  const openStep = (key) => {
    if (key === 'services') setServicesOpen(true);
    else if (key === 'zone') setZoneOpen(true);
    else if (key === 'pricing') setPricingOpen(true);
  };

  const closeStep = (key) => {
    setDone(d => ({ ...d, [key]: true }));
    if (key === 'services') setServicesOpen(false);
    else if (key === 'zone') setZoneOpen(false);
    else if (key === 'pricing') setPricingOpen(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={styles.logoWrap}>
            <Ionicons name="briefcase-outline" size={28} color="#FF6B00" />
          </View>
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>Complete these steps before you can start receiving orders.</Text>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(doneCount / STEPS.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{doneCount} of {STEPS.length} completed</Text>
        </View>

        <View style={styles.stepList}>
          {STEPS.map((step, i) => {
            const isDone = done[step.key];
            return (
              <TouchableOpacity
                key={step.key}
                style={[styles.stepCard, isDone && styles.stepCardDone]}
                activeOpacity={0.86}
                onPress={() => openStep(step.key)}
              >
                <View style={[styles.stepIconWrap, { backgroundColor: isDone ? 'rgba(22,163,74,0.1)' : step.bg }]}>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : step.icon}
                    size={22}
                    color={isDone ? '#16A34A' : step.color}
                  />
                </View>
                <View style={styles.stepInfo}>
                  <View style={styles.stepTitleRow}>
                    <Text style={[styles.stepTitle, isDone && styles.stepTitleDone]}>{step.title}</Text>
                    {isDone && <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>Done</Text></View>}
                  </View>
                  <Text style={styles.stepDesc} numberOfLines={2}>{step.desc}</Text>
                </View>
                <Ionicons
                  name={isDone ? 'checkmark' : 'chevron-forward'}
                  size={18}
                  color={isDone ? '#16A34A' : '#C4C9D1'}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.verificationNote}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#8B9098" />
          <Text style={styles.verificationText}>
            After setup, upload your documents in Profile to start accepting orders.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.startBtn, !allDone && styles.startBtnDisabled]}
          onPress={() => allDone && onComplete()}
          activeOpacity={0.88}
          disabled={!allDone}
        >
          <Text style={styles.startBtnText}>
            {allDone ? 'Go to Dashboard →' : `Complete all ${STEPS.length} steps to continue`}
          </Text>
        </TouchableOpacity>
      </View>

      <ServicesScreen visible={servicesOpen} onClose={() => closeStep('services')} />
      <ServiceRadiusScreen visible={zoneOpen} onClose={() => closeStep('zone')} onSave={() => {}} />
      <PricingScreen visible={pricingOpen} onClose={() => closeStep('pricing')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { padding: 20, paddingBottom: 32 },

  topSection: { alignItems: 'center', paddingVertical: 28 },
  logoWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,107,0,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20, textAlign: 'center', marginBottom: 20 },
  progressBar: { width: '100%', height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: 6, backgroundColor: '#FF6B00', borderRadius: 3 },
  progressText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  stepList: { gap: 10, marginBottom: 20 },
  stepCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  stepCardDone: { borderColor: 'rgba(22,163,74,0.25)', backgroundColor: 'rgba(22,163,74,0.03)' },
  stepIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepInfo: { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  stepTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  stepTitleDone: { color: '#16A34A' },
  doneBadge: { backgroundColor: 'rgba(22,163,74,0.1)', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: '#16A34A' },
  stepDesc: { fontSize: 12, color: '#6B7280', lineHeight: 16 },

  verificationNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  verificationText: { flex: 1, fontSize: 12, color: '#6B7280', lineHeight: 17 },

  footer: { padding: 20, backgroundColor: '#F4F5F7', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  startBtn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  startBtnDisabled: { backgroundColor: '#D1D5DB' },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
