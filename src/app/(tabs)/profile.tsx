import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import {
  AppButton,
  Avatar,
  Badge,
  Card,
  DetailRow,
  FadeInView,
  Screen,
} from '@/components/ui';

import {
  Colors,
  FontSizes,
  FontWeights,
  LineHeights,
  Radius,
  Spacing,
} from '@/constants/theme';

import { fetchCompanySettings } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();

  const [companyName, setCompanyName] =
    useState('Gowri Toys');

  const [signingOut, setSigningOut] =
    useState(false);

  useEffect(() => {
    fetchCompanySettings().then((settings) => {
      if (settings?.company_name) {
        setCompanyName(settings.company_name);
      }
    });
  }, []);

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out?',
      'You will need to sign in again to use the app.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
          },
        },
      ]
    );
  };

  const isAdmin = profile?.role === 'admin';
  const isActive = profile?.active !== false;

  const roleLabel = isAdmin
    ? 'Administrator'
    : 'Supervisor';

  const roleShortLabel = isAdmin
    ? 'Admin'
    : 'Supervisor';

  const initials =
    profile?.full_name
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <Screen>
      {/* ───────────────── HEADER ───────────────── */}

      <FadeInView>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.eyebrow}>
              ACCOUNT
            </Text>

            <Text style={styles.pageTitle}>
              Profile
            </Text>

            <Text style={styles.pageSubtitle}>
              Account and company details
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="person-outline"
              size={23}
              color={Colors.primary}
            />
          </View>
        </View>
      </FadeInView>

      {/* ───────────────── PROFILE HERO ───────────────── */}

      <FadeInView delay={60}>
        <Card style={styles.heroCard}>
          <View style={styles.heroTop}>
            {/* Avatar */}

            <View style={styles.avatarWrapper}>
              <Avatar
                name={profile?.full_name ?? 'User'}
                size={78}
              />

              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: isActive
                      ? Colors.success
                      : Colors.danger,
                  },
                ]}
              />
            </View>

            {/* Identity */}

            <View style={styles.identity}>
              <Text
                style={styles.name}
                numberOfLines={2}
              >
                {profile?.full_name ?? 'User'}
              </Text>

              <Text
                style={styles.email}
                numberOfLines={2}
              >
                {profile?.email ?? '—'}
              </Text>

              <Badge
                label={roleLabel}
                icon={
                  isAdmin
                    ? 'shield-checkmark'
                    : 'scan'
                }
                size="md"
                color={
                  isAdmin
                    ? Colors.primary
                    : Colors.successDark
                }
                background={
                  isAdmin
                    ? Colors.primaryLight
                    : Colors.successLight
                }
              />
            </View>
          </View>

          {/* Company strip */}

          <View style={styles.companyStrip}>
            <View style={styles.companyIcon}>
              <Ionicons
                name="business-outline"
                size={18}
                color={Colors.primary}
              />
            </View>

            <View style={styles.companyContent}>
              <Text style={styles.companyLabel}>
                COMPANY
              </Text>

              <Text style={styles.companyName}>
                {companyName}
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={17}
              color={Colors.textMuted}
            />
          </View>
        </Card>
      </FadeInView>

      {/* ───────────────── ACCOUNT ───────────────── */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Account
          </Text>

          <Text style={styles.sectionSubtitle}>
            Your account information
          </Text>
        </View>
      </View>

      <FadeInView delay={120}>
        <Card
          style={styles.detailCard}
          padded={false}
        >
          <View style={styles.detailInner}>
            <DetailRow
              icon="shield-outline"
              label="Role"
              value={roleShortLabel}
            />

            <DetailRow
              icon="business-outline"
              label="Company"
              value={companyName}
            />

            <DetailRow
              icon="mail-outline"
              label="Email"
              value={profile?.email ?? '—'}
            />

            <DetailRow
              icon={
                isActive
                  ? 'checkmark-circle-outline'
                  : 'close-circle-outline'
              }
              label="Status"
              value={
                isActive
                  ? 'Active'
                  : 'Inactive'
              }
              dot={
                isActive
                  ? Colors.success
                  : Colors.danger
              }
              valueColor={
                isActive
                  ? Colors.successDark
                  : Colors.danger
              }
              last
            />
          </View>
        </Card>
      </FadeInView>

      {/* ───────────────── ROLE INFO ───────────────── */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            {isAdmin
              ? 'Administrator'
              : 'Supervisor'}
          </Text>

          <Text style={styles.sectionSubtitle}>
            Quick reference for your role
          </Text>
        </View>

        <View style={styles.roleIcon}>
          <Ionicons
            name={
              isAdmin
                ? 'shield-checkmark-outline'
                : 'scan-outline'
            }
            size={18}
            color={Colors.primary}
          />
        </View>
      </View>

      <FadeInView delay={180}>
        <Card style={styles.tipsCard} padded={false}>
          <TipRow
            icon="people-outline"
            title="Manage workers"
            text="Add, update, deactivate, or delete workers."
            onPress={() => router.push('/(tabs)/workers')}
          />

          {isAdmin ? (
            <TipRow
              icon="person-outline"
              title="Manage supervisors"
              text="Control supervisor accounts and access."
              onPress={() => router.push('/supervisors')}
            />
          ) : null}

          <TipRow
            icon="qr-code-outline"
            title="Scan attendance"
            text="Select a shift and scan worker QR codes."
            onPress={() => router.push('/(tabs)/scan')}
          />

          <TipRow
            icon="document-text-outline"
            title="Attendance reports"
            text="Generate and access monthly attendance reports."
            onPress={() => router.push('/(tabs)/reports')}
            last
          />
        </Card>
      </FadeInView>

      {/* ───────────────── SECURITY ───────────────── */}

      <View style={styles.securityCard}>
        <View style={styles.securityIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={17}
            color={Colors.successDark}
          />
        </View>

        <View style={styles.securityContent}>
          <Text style={styles.securityTitle}>
            Account secured
          </Text>

          <Text style={styles.securityText}>
            Your account access is protected and
            managed through the company system.
          </Text>
        </View>
      </View>

      {/* ───────────────── SIGN OUT ───────────────── */}

      <AppButton
        title="Sign Out"
        variant="outline"
        icon="log-out-outline"
        size="lg"
        onPress={confirmSignOut}
        loading={signingOut}
        style={styles.signOutButton}
      />

      <Text style={styles.versionText}>
        Gowri Toys Attendance
      </Text>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

/* ─────────────────────────────────────────────
   TIP ROW
───────────────────────────────────────────── */

function TipRow({
  icon,
  title,
  text,
  last = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  last?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.tipRow,
        !last && styles.tipDivider,
        onPress && styles.tipPressable,
        pressed && onPress && { opacity: 0.75 },
      ]}
    >
      <View style={styles.tipIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>

      <View style={styles.tipContent}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>

      {onPress ? (
        <Ionicons name="chevron-forward" size={17} color={Colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* Header */

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 3,
  },

  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.text,
  },

  pageSubtitle: {
    marginTop: 3,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Hero */

  heroCard: {
    padding: Spacing.lg,
    overflow: 'hidden',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrapper: {
    position: 'relative',
  },

  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: Colors.card,
  },

  identity: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  name: {
    fontSize: FontSizes.xl,
    lineHeight: 26,
    fontWeight: FontWeights.heavy,
    color: Colors.text,
  },

  email: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 3,
    marginBottom: Spacing.sm,
  },

  companyStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  companyIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  companyContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },

  companyLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    fontWeight: '800',
    color: Colors.textMuted,
  },

  companyName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },

  /* Sections */

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: FontSizes.lg,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  /* Account */

  detailCard: {
    overflow: 'hidden',
  },

  detailInner: {
    paddingHorizontal: Spacing.lg,
  },

  /* Role */

  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipsCard: {
    overflow: 'hidden',
  },

  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },

  tipPressable: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },

  tipDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  tipIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tipContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  tipTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
  },

  tipText: {
    marginTop: 3,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Colors.textSecondary,
  },

  /* Security */

  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.successLight,
    borderWidth: 1,
    borderColor: Colors.successLight,
  },

  securityIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  securityContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },

  securityTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.successDark,
  },

  securityText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.successDark,
    opacity: 0.8,
  },

  /* Sign out */

  signOutButton: {
    marginTop: Spacing.xl,
  },

  versionText: {
    textAlign: 'center',
    marginTop: Spacing.md,
    fontSize: 10,
    color: Colors.textMuted,
  },

  bottomSpace: {
    height: Spacing.xl,
  },
});