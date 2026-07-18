import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants';

export default function AuthScreen({ mode = 'login', onLogin, onRegisterCredentials, onSwitchToRegister, onBack }) {
  const isLogin = mode !== 'register';
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [forgotStep, setForgotStep] = useState(null); // null | 'phone' | 'verify'
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPwd, setForgotNewPwd] = useState('');
  const [forgotConfirmPwd, setForgotConfirmPwd] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotDevCode, setForgotDevCode] = useState(null);

  const handleSubmit = async () => {
    if (!loginValue || !password) { alert('Please fill in all fields'); return; }
    if (!isLogin && password.length < 8) { alert('Password must be at least 8 characters'); return; }
    if (!isLogin && password !== confirmPassword) { alert('Passwords do not match'); return; }

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

  const sendResetCode = async () => {
    if (!forgotPhone) { setForgotError('Please enter your phone number'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send code');
      setForgotDevCode(data.devCode || null);
      setForgotStep('verify');
    } catch (e) {
      setForgotError(e.message || 'Could not send code');
    }
    setForgotLoading(false);
  };

  const confirmReset = async () => {
    if (forgotCode.length !== 6) { setForgotError('Enter the 6-digit code'); return; }
    if (!forgotNewPwd || forgotNewPwd.length < 8) { setForgotError('Password must be at least 8 characters'); return; }
    if (forgotNewPwd !== forgotConfirmPwd) { setForgotError('Passwords do not match'); return; }
    setForgotLoading(true);
    setForgotError('');
    try {
      const res = await fetch(`${API_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: forgotPhone, code: forgotCode, newPassword: forgotNewPwd }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setForgotStep(null);
      setForgotPhone(''); setForgotCode(''); setForgotNewPwd(''); setForgotConfirmPwd(''); setForgotDevCode(null);
      alert('Password reset successfully. Please sign in with your new password.');
    } catch (e) {
      setForgotError(e.message || 'Something went wrong');
    }
    setForgotLoading(false);
  };

  if (forgotStep) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => forgotStep === 'verify' ? setForgotStep('phone') : setForgotStep(null)} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color="#17191D" />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>{forgotStep === 'phone' ? 'Reset password' : 'New password'}</Text>
            <Text style={styles.subtitle}>
              {forgotStep === 'phone'
                ? 'Enter your phone number to receive a verification code.'
                : `Enter the code sent to ${forgotPhone} and choose a new password.`}
            </Text>
          </View>

          {forgotStep === 'phone' ? (
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              placeholderTextColor="#9CA3AF"
              value={forgotPhone}
              onChangeText={setForgotPhone}
              keyboardType="phone-pad"
            />
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor="#9CA3AF"
                value={forgotCode}
                onChangeText={v => setForgotCode(v.replace(/[^\d]/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
              />
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="New password"
                  placeholderTextColor="#9CA3AF"
                  value={forgotNewPwd}
                  onChangeText={setForgotNewPwd}
                  secureTextEntry
                />
              </View>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  placeholderTextColor="#9CA3AF"
                  value={forgotConfirmPwd}
                  onChangeText={setForgotConfirmPwd}
                  secureTextEntry
                />
              </View>
            </>
          )}

          {forgotError ? <Text style={styles.errorText}>{forgotError}</Text> : null}
          {__DEV__ && forgotDevCode ? <Text style={styles.devHint}>Dev code: {forgotDevCode}</Text> : null}

          <TouchableOpacity style={[styles.btn, forgotLoading && { opacity: 0.6 }]} onPress={forgotStep === 'phone' ? sendResetCode : confirmReset} activeOpacity={0.88} disabled={forgotLoading}>
            <Text style={styles.btnText}>{forgotLoading ? 'Please wait...' : forgotStep === 'phone' ? 'Send Code' : 'Reset Password'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setForgotStep(null)} style={styles.switchWrap}>
            <Text style={styles.switchText}>Back to <Text style={styles.switchLink}>Sign In</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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


        <TextInput
          style={styles.input}
          placeholder="Email or phone"
          placeholderTextColor="#9CA3AF"
          value={loginValue}
          onChangeText={setLoginValue}
          keyboardType="default"
          autoCapitalize="none"
        />

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

        {!isLogin && (
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm password"
              placeholderTextColor="#9CA3AF"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeBtn} activeOpacity={0.7}>
              <Ionicons name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'} size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.88} disabled={loading}>
          <Text style={styles.btnText}>
            {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Continue'}
          </Text>
        </TouchableOpacity>

        {isLogin && (
          <>
            <TouchableOpacity onPress={() => setForgotStep('phone')} style={{ alignItems: 'flex-end', marginTop: -10, marginBottom: 16 }}>
              <Text style={styles.switchLink}>Forgot password?</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSwitchToRegister} style={styles.switchWrap}>
              <Text style={styles.switchText}>
                {"Don't have an account? "}
                <Text style={styles.switchLink}>Sign Up</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

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
  subtitle: { fontSize: 15, color: '#6B7280', lineHeight: 22 },

  input: { backgroundColor: '#fff', borderRadius: 14, padding: 16, fontSize: 15, color: '#111827', marginBottom: 12, borderWidth: 1.5, borderColor: '#E5E7EB' },

  passwordWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 20, paddingRight: 12 },
  passwordInput: { flex: 1, padding: 16, fontSize: 15, color: '#111827' },
  passwordHint: { color: '#8B9098', fontSize: 12, marginTop: -12, marginBottom: 18, marginLeft: 2 },
  eyeBtn: { padding: 4 },

  btn: { backgroundColor: '#FF6B00', borderRadius: 14, paddingVertical: 17, alignItems: 'center', marginBottom: 20 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  switchWrap: { alignItems: 'center', marginBottom: 24 },
  switchText: { fontSize: 14, color: '#6B7280' },
  switchLink: { color: '#FF6B00', fontWeight: '700', fontSize: 14 },

  errorText: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  devHint: { color: '#2563EB', fontSize: 12, marginBottom: 12 },

  terms: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
  termsLink: { color: '#2563EB', fontWeight: '600' },
});
