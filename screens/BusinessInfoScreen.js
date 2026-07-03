import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function BusinessInfoScreen({ onContinue, onBack, loading }) {
  const [kind, setKind] = useState('company');
  const [businessName, setBusinessName] = useState('');
  const [yourName, setYourName] = useState('');

  const canContinue = yourName.trim().length > 0 && (kind === 'individual' || businessName.trim().length > 0);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title}>Tell us about your business</Text>
          <Text style={styles.subtitle}>This helps us personalize your experience.</Text>
        </View>

        {/* Toggle */}
        <View style={styles.toggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, kind === 'company' && styles.toggleBtnActive]}
            onPress={() => setKind('company')}
            activeOpacity={0.84}
          >
            <Text style={[styles.toggleText, kind === 'company' && styles.toggleTextActive]}>Company</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, kind === 'individual' && styles.toggleBtnActive]}
            onPress={() => setKind('individual')}
            activeOpacity={0.84}
          >
            <Text style={[styles.toggleText, kind === 'individual' && styles.toggleTextActive]}>Individual</Text>
          </TouchableOpacity>
        </View>

        {kind === 'company' && (
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Business Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Auterio Auto Services LLC"
              placeholderTextColor="#9CA3AF"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
            />
          </View>
        )}

        <View style={styles.fieldWrap}>
          <Text style={styles.fieldLabel}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Alex Johnson"
            placeholderTextColor="#9CA3AF"
            value={yourName}
            onChangeText={setYourName}
            autoCapitalize="words"
          />
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.btn, (!canContinue || loading) && styles.btnDisabled]}
          onPress={() => canContinue && !loading && onContinue({ kind, businessName: businessName.trim(), name: yourName.trim() })}
          activeOpacity={0.88}
          disabled={!canContinue || loading}
        >
          <Text style={styles.btnText}>{loading ? 'Creating account...' : 'Continue'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },

  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  titleWrap: { marginBottom: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },

  toggle: { flexDirection: 'row', backgroundColor: '#F3F4F5', borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: '#E5E7EB' },
  toggleBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 9 },
  toggleBtnActive: { backgroundColor: '#111827', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  toggleTextActive: { color: '#fff' },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 7 },
  input: { backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15, color: '#111827', borderWidth: 1.5, borderColor: '#E5E7EB' },

  spacer: { flex: 1, minHeight: 32 },

  btn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 17, alignItems: 'center' },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
