import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants';

export default function AuthScreen({ mode = 'login', onLogin, onRegisterCredentials, onBack }) {
  const [isLogin, setIsLogin] = useState(mode !== 'register');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!loginValue || !password) { alert('Please fill in all fields'); return; }
    if (!isLogin && password.length < 8) { alert('Password must be at least 8 characters'); return; }

    setLoading(true);
    try {
      if (!isLogin && onRegisterCredentials) {
        await onRegisterCredentials({ loginValue: loginValue.trim(), password });
        return;
      }
      const endpoint = isLogin ? '/auth/login' : '/auth/register-provider';
      const isEmail = loginValue.includes('@');
      const body = isLogin
        ? { login: loginValue, password }
        : {
            email: isEmail ? loginValue : undefined,
            phone: isEmail ? undefined : loginValue,
            password,
          };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Something went wrong');
      onLogin(data.token, data.refreshToken || null, data.user);
    } catch (error) {
      alert(error.message || 'Something went wrong');
    }
    setLoading(false);
  };

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
        {/* Back button */}
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>
        )}

        {/* Title */}
        <View style={styles.titleWrap}>
          {!isLogin && <Text style={styles.progressLabel}>STEP 1 OF 7 | ACCOUNT</Text>}
          <Text style={styles.title}>
            {isLogin ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={styles.subtitle}>
            {isLogin
              ? 'Sign in to your Auterio Provider account.'
              : 'Sign up to start your journey\nwith Auterio Provider.'}
          </Text>
        </View>
        {/* Social buttons — register only */}
        {!isLogin && (
          <>
            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.84}
              onPress={() => alert('Coming soon')}
            >
              <Ionicons name="logo-apple" size={20} color="#000" />
              <Text style={styles.socialBtnText}>Continue with Apple</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialBtn}
              activeOpacity={0.84}
              onPress={() => alert('Coming soon')}
            >
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.socialBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>
          </>
        )}

        {/* Email / phone */}
        <TextInput
          style={styles.input}
          placeholder="Email or phone"
          placeholderTextColor="#9CA3AF"
          value={loginValue}
          onChangeText={setLoginValue}
          keyboardType="default"
          autoCapitalize="none"
        />

        {/* Password */}
        <View style={styles.passwordWrap}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn} activeOpacity={0.7}>
            <Ionicons name={showPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        {!isLogin && <Text style={styles.passwordHint}>Use at least 8 characters</Text>}

        {/* Submit */}
        <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.88} disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {/* Switch to register — login screen only */}
        {isLogin && (
          <TouchableOpacity onPress={() => setIsLogin(false)} style={styles.switchWrap}>
            <Text style={styles.switchText}>
              {"Don't have an account? "}
              <Text style={styles.switchLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        )}

        {/* Footer */}
        {!isLogin && (
          <Text style={styles.terms}>
            By continuing, you agree to our{'\n'}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy.</Text>
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 48 },

  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  titleWrap: { marginBottom: 28 },
  progressLabel: { color: '#FF6B00', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: '#111827', marginBottom: 10, lineHeight: 34 },
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22, textAlign: 'center' },

  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, paddingVertical: 14, marginBottom: 12, backgroundColor: '#fff' },
  socialBtnText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  googleG: { fontSize: 17, fontWeight: '800', color: '#4285F4' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, marginTop: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },

  input: { backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15, color: '#111827', marginBottom: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },

  passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 20, paddingRight: 12 },
  passwordInput: { flex: 1, padding: 16, fontSize: 15, color: '#111827' },
  passwordHint: { color: '#8B9098', fontSize: 12, marginTop: -12, marginBottom: 18, marginLeft: 2 },
  eyeBtn: { padding: 4 },

  btn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  switchWrap: { alignItems: 'center', marginBottom: 24 },
  switchText: { fontSize: 14, color: '#6B7280' },
  switchLink: { color: '#FF6B00', fontWeight: '700' },

  terms: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#2563EB', fontWeight: '600' },
});
