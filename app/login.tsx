
import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (loading) return;

    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setError('Please enter both your email and password.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error: authError } = await signIn(
        trimmedEmail,
        password
      );

      if (authError) {
        const message = authError.message.toLowerCase();

        if (
          message.includes('invalid login credentials') ||
          message.includes('invalid credentials')
        ) {
          setError(
            'Incorrect email or password. Please check your details and try again.'
          );
        } else if (
          message.includes('email not confirmed')
        ) {
          setError(
            'Your email has not been confirmed. Please contact your administrator.'
          );
        } else if (
          message.includes('too many requests')
        ) {
          setError(
            'Too many login attempts. Please wait a moment before trying again.'
          );
        } else {
          setError(authError.message);
        }

        return;
      }

      const profile = data.user
        ? await getProfile(data.user.id)
        : null;

      router.replace(
        profile?.role === 'admin'
          ? '/(tabs)/admin'
          : '/(tabs)'
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '';

      if (
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch')
      ) {
        setError(
          'Unable to connect. Please check your internet connection and try again.'
        );
      } else {
        setError(
          'Something went wrong while signing in. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 24) + 24 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Ionicons
                  name="qr-code-outline"
                  size={38}
                  color={COLORS.primary}
                />
              </View>

              <Header title="QR Attendance" />

              <Text style={styles.brandSubtitle}>
                SMART ATTENDANCE SYSTEM
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>
                Welcome Back
              </Text>

              <Text style={styles.subtitle}>
                Sign in to your account to record and manage
                your attendance.
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>
                  Email Address
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError(null);
                    }}
                    placeholder="your.email@school.edu"
                    placeholderTextColor={COLORS.textSecondary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    editable={!loading}
                    returnKeyType="next"
                    accessibilityLabel="Email address"
                  />
                </View>

                <Text style={styles.label}>
                  Password
                </Text>

                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={COLORS.textSecondary}
                    style={styles.inputIcon}
                  />

                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      if (error) setError(null);
                    }}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textSecondary}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    autoComplete="current-password"
                    editable={!loading}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                    accessibilityLabel="Password"
                  />

                  <TouchableOpacity
                    style={styles.passwordToggle}
                    onPress={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel={
                      showPassword
                        ? 'Hide password'
                        : 'Show password'
                    }
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? 'eye-off-outline'
                          : 'eye-outline'
                      }
                      size={21}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {error ? (
                  <View
                    style={styles.errorContainer}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                  >
                    <Ionicons
                      name="alert-circle-outline"
                      size={20}
                      color={COLORS.danger}
                    />

                    <Text style={styles.error}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.buttonContainer}>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator
                        size="small"
                        color={COLORS.primary}
                      />
                      <Text style={styles.loadingText}>
                        Signing you in...
                      </Text>
                    </View>
                  ) : (
                    <AppButton
                      theme="primary"
                      title="Sign In"
                      icon="log-in-outline"
                      onPress={handleLogin}
                    />
                  )}
                </View>
              </View>

              <View style={styles.signupContainer}>
                <Text style={styles.signupText}>
                  Don't have an account?{' '}
                </Text>

                <Link href="/register" asChild>
                  <Text style={styles.signupLink}>
                    Sign Up
                  </Text>
                </Link>
              </View>
            </View>

            <Text style={styles.footer}>
              QR Attendance · Smart and convenient attendance
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  title: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
    marginTop: 14,
  },
  inputContainer: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 13,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  passwordToggle: {
    padding: 7,
    marginLeft: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
    gap: 9,
  },
  error: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.danger,
  },
  buttonContainer: {
    marginTop: 24,
  },
  loadingContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  signupContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  signupText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    paddingVertical: 4,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
  },
});
