import { router, Redirect } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  AppButton,
  BrandMark,
  FadeInView,
  TextField,
} from '@/components/ui';

import {
  Colors,
  FontSizes,
  FontWeights,
  Radius,
  Spacing,
} from '@/constants/theme';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

/* -------------------------------------------------------------------------- */
/*                              DEMO ACCOUNTS                                 */
/* -------------------------------------------------------------------------- */

const TEST_ACCOUNTS = [
  {
    role: 'Admin',
    email: 'admin@gowritoys.com',
  },
  {
    role: 'Supervisor',
    email: 'supervisor@gowritoys.com',
  },
];

const DEMO_PASSWORD = 'password123';

/* -------------------------------------------------------------------------- */
/*                              LOGIN SCREEN                                  */
/* -------------------------------------------------------------------------- */

export default function LoginScreen() {
  const { session, initializing, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------------------ */
  /*                              AUTH CHECK                                  */
  /* ------------------------------------------------------------------------ */

  if (initializing) {
    return null;
  }

  if (session) {
    return <Redirect href="/(tabs)/dashboard" />;
  }

  /* ------------------------------------------------------------------------ */
  /*                              LOGIN                                       */
  /* ------------------------------------------------------------------------ */

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: signInError } = await signIn(
      email.trim(),
      password
    );

    if (signInError) {
      setError(signInError);
      setLoading(false);
      return;
    }

    router.replace('/(tabs)/dashboard');
  };

  /* ------------------------------------------------------------------------ */
  /*                           FORGOT PASSWORD                                */
  /* ------------------------------------------------------------------------ */

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email to reset your password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim()
      );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    Alert.alert(
      'Reset link sent',
      `Check your inbox at ${email.trim()}.`
    );
  };

  /* ------------------------------------------------------------------------ */
  /*                           DEMO ACCOUNT                                   */
  /* ------------------------------------------------------------------------ */

  const handleDemoAccount = (account: {
    role: string;
    email: string;
  }) => {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  };

  /* ------------------------------------------------------------------------ */
  /*                                UI                                        */
  /* ------------------------------------------------------------------------ */

  return (
    <SafeAreaView style={styles.container}>
      {/* ------------------------------------------------------------------ */}
      {/* BACKGROUND DECORATION                                              */}
      {/* ------------------------------------------------------------------ */}

      <View
        pointerEvents="none"
        style={styles.backgroundShapeOne}
      />

      <View
        pointerEvents="none"
        style={styles.backgroundShapeTwo}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {/* ============================================================ */}
          {/* BRAND                                                         */}
          {/* ============================================================ */}

          <FadeInView style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <BrandMark size={92} />
            </View>

            <Text style={styles.brandName}>
              Gowri Toys
            </Text>

            <Text style={styles.brandTagline}>
              Attendance Management
            </Text>

            <View style={styles.brandLine}>
              <View style={styles.brandLineActive} />
              <View style={styles.brandLineInactive} />
            </View>
          </FadeInView>

          {/* ============================================================ */}
          {/* LOGIN FORM                                                    */}
          {/* ============================================================ */}

          <FadeInView
            delay={100}
            style={styles.formSection}
          >
            <Text style={styles.title}>
              Welcome Back
            </Text>

            <Text style={styles.description}>
              Sign in to your supervisor or admin account
            </Text>

            {/* ---------------------------------------------------------- */}
            {/* ERROR                                                       */}
            {/* ---------------------------------------------------------- */}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={19}
                  color={Colors.danger}
                />

                <Text style={styles.errorText}>
                  {error}
                </Text>

                <Pressable
                  onPress={() => setError(null)}
                  hitSlop={8}
                >
                  <Ionicons
                    name="close"
                    size={18}
                    color={Colors.danger}
                  />
                </Pressable>
              </View>
            ) : null}

            {/* ---------------------------------------------------------- */}
            {/* EMAIL                                                       */}
            {/* ---------------------------------------------------------- */}

            <TextField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={(value) => {
                setEmail(value);

                if (error) {
                  setError(null);
                }
              }}
              placeholder="admin@gowritoys.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!loading}
            />

            {/* ---------------------------------------------------------- */}
            {/* PASSWORD                                                    */}
            {/* ---------------------------------------------------------- */}

            <TextField
              label="Password"
              icon="lock-closed-outline"
              value={password}
              onChangeText={(value) => {
                setPassword(value);

                if (error) {
                  setError(null);
                }
              }}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              editable={!loading}
              onSubmitEditing={handleLogin}
            />

            {/* ---------------------------------------------------------- */}
            {/* REMEMBER ME / FORGOT PASSWORD                              */}
            {/* ---------------------------------------------------------- */}

            <View style={styles.optionsRow}>
              <Pressable
                onPress={() =>
                  setRememberMe(!rememberMe)
                }
                disabled={loading}
                style={styles.rememberContainer}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.checkbox,
                    rememberMe &&
                      styles.checkboxActive,
                  ]}
                >
                  {rememberMe ? (
                    <Ionicons
                      name="checkmark"
                      size={13}
                      color="#FFFFFF"
                    />
                  ) : null}
                </View>

                <Text style={styles.rememberText}>
                  Remember me
                </Text>
              </Pressable>

              <Pressable
                onPress={handleForgotPassword}
                disabled={loading}
                hitSlop={8}
              >
                <Text style={styles.forgotText}>
                  Forgot password?
                </Text>
              </Pressable>
            </View>

            {/* ---------------------------------------------------------- */}
            {/* LOGIN BUTTON                                                */}
            {/* ---------------------------------------------------------- */}

            <AppButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              size="lg"
              arrow
            />
          </FadeInView>

          {/* ============================================================ */}
          {/* DEMO ACCOUNTS                                                 */}
          {/* ============================================================ */}

          <FadeInView
            delay={180}
            style={styles.demo}
          >
            <View style={styles.demoHeader}>
              <View style={styles.demoIcon}>
                <Ionicons
                  name="flask-outline"
                  size={15}
                  color="#087F5B"
                />
              </View>

              <Text style={styles.demoTitle}>
                Demo Accounts
              </Text>
            </View>

            <View style={styles.demoRow}>
              {TEST_ACCOUNTS.map((account) => (
                <Pressable
                  key={account.role}
                  onPress={() =>
                    handleDemoAccount(account)
                  }
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.demoChip,
                    pressed &&
                      styles.demoChipPressed,
                  ]}
                >
                  <View style={styles.demoRoleRow}>
                    <View
                      style={[
                        styles.roleDot,
                        account.role ===
                          'Admin'
                          ? styles.adminDot
                          : styles.supervisorDot,
                      ]}
                    />

                    <Text style={styles.demoChipRole}>
                      {account.role}
                    </Text>
                  </View>

                  <Text
                    style={styles.demoChipEmail}
                    numberOfLines={1}
                  >
                    {account.email}
                  </Text>

                  <View style={styles.passwordRow}>
                    <Ionicons
                      name="key-outline"
                      size={11}
                      color="#9AA09C"
                    />

                    <Text
                      style={
                        styles.demoChipPassword
                      }
                    >
                      {DEMO_PASSWORD}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <Text style={styles.demoHint}>
              Tap an account to autofill credentials
            </Text>
          </FadeInView>

          {/* ============================================================ */}
          {/* FOOTER                                                        */}
          {/* ============================================================ */}

          <FadeInView
            delay={240}
            style={styles.footer}
          >
            <View style={styles.securityRow}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#9AA09C"
              />

              <Text style={styles.footerText}>
                Secure attendance management
              </Text>
            </View>

            <View style={styles.footerDivider} />

            <Text style={styles.footerPowered}>
              Powered by Gowri Toys
            </Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ========================================================================== */
/*                                   STYLES                                   */
/* ========================================================================== */

const styles = StyleSheet.create({
  /* ---------------------------------------------------------------------- */
  /* BASE                                                                   */
  /* ---------------------------------------------------------------------- */

  flex: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: '#F7F7F5',
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 28,
  },

  /* ---------------------------------------------------------------------- */
  /* BACKGROUND                                                             */
  /* ---------------------------------------------------------------------- */

  backgroundShapeOne: {
    position: 'absolute',

    width: 390,
    height: 270,

    borderRadius: 180,

    backgroundColor: '#EEF4F0',

    top: -130,
    left: -120,

    transform: [
      {
        rotate: '-12deg',
      },
    ],
  },

  backgroundShapeTwo: {
    position: 'absolute',

    width: 320,
    height: 220,

    borderRadius: 180,

    backgroundColor: '#EDF3EF',

    bottom: -100,
    right: -150,

    transform: [
      {
        rotate: '18deg',
      },
    ],
  },

  /* ---------------------------------------------------------------------- */
  /* BRAND                                                                  */
  /* ---------------------------------------------------------------------- */

  brandSection: {
    alignItems: 'center',

    marginTop: 10,
    marginBottom: 40,
  },

  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 8,
  },

  brandName: {
    fontSize: 29,
    lineHeight: 35,

    fontWeight: FontWeights.heavy,

    color: '#151716',

    letterSpacing: -0.8,
  },

  brandTagline: {
    marginTop: 5,

    fontSize: 11,

    fontWeight: FontWeights.medium,

    color: '#68706B',

    letterSpacing: 1.1,

    textTransform: 'uppercase',
  },

  brandLine: {
    flexDirection: 'row',

    alignItems: 'center',

    marginTop: 17,

    height: 4,
  },

  brandLineActive: {
    width: 30,
    height: 4,

    borderRadius: 4,

    backgroundColor: '#087F5B',
  },

  brandLineInactive: {
    width: 18,
    height: 4,

    borderRadius: 4,

    backgroundColor: '#C8DDD4',

    marginLeft: 4,
  },

  /* ---------------------------------------------------------------------- */
  /* FORM                                                                   */
  /* ---------------------------------------------------------------------- */

  formSection: {
    width: '100%',
  },

  title: {
    fontSize: 30,
    lineHeight: 36,

    fontWeight: FontWeights.heavy,

    color: '#151716',

    letterSpacing: -0.8,
  },

  description: {
    fontSize: 14,
    lineHeight: 21,

    color: '#707772',

    marginTop: 7,
    marginBottom: 25,
  },

  /* ---------------------------------------------------------------------- */
  /* ERROR                                                                  */
  /* ---------------------------------------------------------------------- */

  errorContainer: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: '#FDEBEC',

    borderWidth: 1,
    borderColor: '#F6D2D4',

    borderRadius: 12,

    paddingHorizontal: 13,
    paddingVertical: 11,

    marginBottom: 18,
  },

  errorText: {
    flex: 1,

    marginLeft: 8,
    marginRight: 8,

    color: Colors.danger,

    fontSize: 13,
    lineHeight: 18,

    fontWeight: FontWeights.medium,
  },

  /* ---------------------------------------------------------------------- */
  /* OPTIONS                                                                */
  /* ---------------------------------------------------------------------- */

  optionsRow: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',

    marginTop: 2,
    marginBottom: 24,
  },

  rememberContainer: {
    flexDirection: 'row',

    alignItems: 'center',
  },

  checkbox: {
    width: 19,
    height: 19,

    borderRadius: 5,

    borderWidth: 1.5,
    borderColor: '#CBD1CD',

    backgroundColor: '#FFFFFF',

    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxActive: {
    backgroundColor: '#087F5B',

    borderColor: '#087F5B',
  },

  rememberText: {
    marginLeft: 8,

    fontSize: 13,

    color: '#69706C',

    fontWeight: FontWeights.medium,
  },

  forgotText: {
    fontSize: 13,

    color: '#087F5B',

    fontWeight: FontWeights.semibold,
  },

  /* ---------------------------------------------------------------------- */
  /* DEMO ACCOUNTS                                                          */
  /* ---------------------------------------------------------------------- */

  demo: {
    marginTop: 25,

    paddingTop: 18,

    borderTopWidth: 1,

    borderTopColor: '#E3E7E4',
  },

  demoHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 6,

    marginBottom: 12,
  },

  demoIcon: {
    width: 25,
    height: 25,

    borderRadius: 8,

    backgroundColor: '#EAF5F0',

    alignItems: 'center',
    justifyContent: 'center',
  },

  demoTitle: {
    fontSize: 12,

    fontWeight: FontWeights.semibold,

    color: '#68706B',

    letterSpacing: 0.4,
  },

  demoRow: {
    flexDirection: 'row',

    gap: 10,
  },

  demoChip: {
    flex: 1,

    backgroundColor: '#FFFFFF',

    borderWidth: 1,

    borderColor: '#E1E6E2',

    borderRadius: 14,

    paddingVertical: 13,

    paddingHorizontal: 10,

    alignItems: 'center',
  },

  demoChipPressed: {
    backgroundColor: '#EAF5F0',

    borderColor: '#087F5B',

    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  demoRoleRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 6,
  },

  roleDot: {
    width: 7,
    height: 7,

    borderRadius: 7,
  },

  adminDot: {
    backgroundColor: '#087F5B',
  },

  supervisorDot: {
    backgroundColor: '#3B82F6',
  },

  demoChipRole: {
    fontSize: 13,

    fontWeight: FontWeights.bold,

    color: '#087F5B',
  },

  demoChipEmail: {
    maxWidth: '100%',

    fontSize: 9,

    color: '#747B77',

    marginTop: 6,
  },

  passwordRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 4,

    marginTop: 4,
  },

  demoChipPassword: {
    fontSize: 10,

    color: '#9AA09C',
  },

  demoHint: {
    textAlign: 'center',

    fontSize: 10,

    color: '#A0A6A2',

    marginTop: 10,
  },

  /* ---------------------------------------------------------------------- */
  /* FOOTER                                                                 */
  /* ---------------------------------------------------------------------- */

  footer: {
    flex: 1,

    justifyContent: 'flex-end',

    alignItems: 'center',

    paddingTop: 38,
  },

  securityRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,
  },

  footerText: {
    fontSize: 11,

    color: '#9AA09C',

    letterSpacing: 0.2,
  },

  footerDivider: {
    width: 4,
    height: 4,

    borderRadius: 4,

    backgroundColor: '#B9C7C0',

    marginVertical: 9,
  },

  footerPowered: {
    fontSize: 11,

    color: '#89918C',

    fontWeight: FontWeights.medium,
  },
});