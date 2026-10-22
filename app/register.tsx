
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
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (loading) return;

    setError(null);

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('Please complete all fields before registering.');
      return;
    }

    if (fullName.trim().length < 2) {
      setError('Please enter your complete name.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Your password must contain at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match. Please check and try again.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error: authError } = await signUp(
        email.trim(),
        password,
        {
          full_name: fullName.trim(),
          role,
        }
      );

      if (authError) {
        const message = authError.message.toLowerCase();

        if (message.includes('already registered')) {
          setError(
            'This email is already registered. Please sign in instead.'
          );
        } else if (message.includes('password')) {
          setError(authError.message);
        } else if (
          message.includes('network') ||
          message.includes('fetch')
        ) {
          setError(
            'Unable to connect. Check your internet connection and try again.'
          );
        } else {
          setError(authError.message);
        }

        return;
      }

      if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setError(
        'Something went wrong while creating your account. Please try again.'
      );
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
              {
                paddingBottom: Math.max(insets.bottom, 24) + 24,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Branding */}
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

            {/* Registration Card */}
            {success ? (
              <View style={styles.card}>
                <View style={styles.successIconContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={36}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.title}>
                  Check Your Email
                </Text>

                <Text style={styles.subtitle}>
                  Your account registration was submitted successfully.
                  Follow the confirmation instructions sent to your email
                  address.
                </Text>

                <View style={styles.emailNotice}>
                  <Ionicons
                    name="mail"
                    size={20}
                    color={COLORS.primary}
                  />
                  <Text style={styles.emailNoticeText}>
                    {email.trim()}
                  </Text>
                </View>

                <Text style={styles.successText}>
                  Once your email is confirmed, return here to sign in
                  to your account.
                </Text>

                <Link href="/login" asChild>
                  <Pressable style={styles.secondaryButton}>
                    <Ionicons
                      name="arrow-back-outline"
                      size={18}
                      color={COLORS.primary}
                    />
                    <Text style={styles.secondaryButtonText}>
                      Back to Sign In
                    </Text>
                  </Pressable>
                </Link>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.title}>
                  Create Account
                </Text>

                <Text style={styles.subtitle}>
                  Register to start recording and managing your attendance.
                </Text>

                <View style={styles.form}>
                  {/* Full Name */}
                  <Text style={styles.label}>Full Name</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={(value) => {
                        setFullName(value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your full name"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading}
                      returnKeyType="next"
                      textContentType="name"
                      accessibilityLabel="Full name"
                    />
                  </View>

                  {/* Role */}
                  <Text style={styles.label}>I am a...</Text>

                  <View style={styles.roleRow}>
                    <TouchableOpacity
                      style={[
                        styles.roleChip,
                        role === 'student' && styles.roleChipActive,
                      ]}
                      onPress={() => setRole('student')}
                      disabled={loading}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: role === 'student',
                      }}
                    >
                      <Ionicons
                        name="school-outline"
                        size={22}
                        color={
                          role === 'student'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />

                      <Text
                        style={[
                          styles.roleChipText,
                          role === 'student' &&
                            styles.roleChipTextActive,
                        ]}
                      >
                        Student
                      </Text>

                      {role === 'student' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.roleChip,
                        role === 'teacher' && styles.roleChipActive,
                      ]}
                      onPress={() => setRole('teacher')}
                      disabled={loading}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: role === 'teacher',
                      }}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={22}
                        color={
                          role === 'teacher'
                            ? COLORS.primary
                            : COLORS.textSecondary
                        }
                      />

                      <Text
                        style={[
                          styles.roleChipText,
                          role === 'teacher' &&
                            styles.roleChipTextActive,
                        ]}
                      >
                        Teacher
                      </Text>

                      {role === 'teacher' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={17}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Email */}
                  <Text style={styles.label}>Email Address</Text>

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

                  {/* Password */}
                  <Text style={styles.label}>Password</Text>

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
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      editable={!loading}
                      returnKeyType="next"
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
                        showPassword ? 'Hide password' : 'Show password'
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

                  {/* Confirm Password */}
                  <Text style={styles.label}>Confirm Password</Text>

                  <View style={styles.inputContainer}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={COLORS.textSecondary}
                      style={styles.inputIcon}
                    />

                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={(value) => {
                        setConfirmPassword(value);
                        if (error) setError(null);
                      }}
                      placeholder="Re-enter your password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      textContentType="newPassword"
                      autoComplete="new-password"
                      editable={!loading}
                      returnKeyType="go"
                      onSubmitEditing={handleRegister}
                      accessibilityLabel="Confirm password"
                    />

                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() =>
                        setShowConfirmPassword((previous) => !previous)
                      }
                      disabled={loading}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showConfirmPassword
                          ? 'Hide confirm password'
                          : 'Show confirm password'
                      }
                    >
                      <Ionicons
                        name={
                          showConfirmPassword
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

                      <Text style={styles.error}>{error}</Text>
                    </View>
                  ) : null}

                  {/* Submit */}
                  <View style={styles.buttonContainer}>
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={COLORS.primary}
                        />
                        <Text style={styles.loadingText}>
                          Creating your account...
                        </Text>
                      </View>
                    ) : (
                      <AppButton
                        theme="primary"
                        title="Create Account"
                        icon="person-add-outline"
                        onPress={handleRegister}
                      />
                    )}
                  </View>
                </View>

                {/* Sign In Link */}
                <View style={styles.signinContainer}>
                  <Text style={styles.signinText}>
                    Already have an account?{' '}
                  </Text>

                  <Link href="/login" asChild>
                    <Text style={styles.signinLink}>Sign In</Text>
                  </Link>
                </View>
              </View>
            )}

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
    marginBottom: 20,
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
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  roleChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '14',
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleChipTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
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
  signinContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26,
  },
  signinText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  signinLink: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    paddingVertical: 4,
  },
  successIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  emailNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 16,
  },
  emailNoticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  secondaryButton: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
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
