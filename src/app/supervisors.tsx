import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, AppHeader, Avatar, Badge, Card, EmptyState, Screen } from '@/components/ui';
import { Colors, FontSizes, FontWeights, Radius, Spacing } from '@/constants/theme';
import { fetchSupervisorProfiles, updateProfile } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Profile } from '@/lib/types';

export default function SupervisorsScreen() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [supervisors, setSupervisors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchSupervisorProfiles();
      setSupervisors(data);
      setError(null);
    } catch {
      setError('Could not load supervisors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!isAdmin) {
    return (
      <Screen header={<AppHeader title="Supervisors" onBack={() => router.back()} />}>
        <EmptyState icon="shield-outline" title="Admins only" message="Only administrators can manage supervisor accounts." />
      </Screen>
    );
  }

  const toggleActive = async (s: Profile) => {
    setError(null);
    setBusyId(s.id);
    try {
      await updateProfile(s.id, { active: !s.active });
      await load();
    } catch {
      setError('Could not update this supervisor.');
    } finally {
      setBusyId(null);
    }
  };

  const promote = async (s: Profile) => {
    setError(null);
    setBusyId(s.id);
    try {
      await updateProfile(s.id, { role: 'admin' });
      await load();
    } catch {
      setError('Could not change the role.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen header={<AppHeader title="Supervisors" subtitle="Manage supervisor accounts and access" onBack={() => router.back()} />}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <Card>
          <Text style={styles.muted}>Loading supervisors…</Text>
        </Card>
      ) : supervisors.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="No supervisors"
          message="Supervisor accounts created by the system will appear here."
        />
      ) : (
        supervisors.map((s) => (
          <Card key={s.id} style={styles.row} padded={false}>
            <Avatar name={s.full_name || 'Supervisor'} size={44} />
            <View style={styles.rowBody}>
              <Text style={styles.rowName} numberOfLines={1}>
                {s.full_name || 'Supervisor'}
              </Text>
              <Text style={styles.rowEmail} numberOfLines={1}>
                {s.email ?? '—'}
              </Text>
              <View style={styles.badgeRow}>
                <Badge
                  label={s.active ? 'Active' : 'Inactive'}
                  color={s.active ? Colors.success : Colors.textMuted}
                  background={s.active ? Colors.successLight : Colors.background}
                />
              </View>
            </View>
            <View style={styles.rowActions}>
              <AppButton
                title={s.active ? 'Deactivate' : 'Activate'}
                icon={s.active ? 'ban' : 'checkmark-circle'}
                variant={s.active ? 'danger' : 'secondary'}
                loading={busyId === s.id}
                onPress={() => toggleActive(s)}
              />
              <AppButton
                title="Make admin"
                icon="shield-checkmark"
                variant="outline"
                loading={busyId === s.id}
                onPress={() => promote(s)}
                style={{ marginTop: Spacing.sm }}
              />
            </View>
          </Card>
        ))
      )}

      <Text style={styles.hint}>
        Supervisors can manage workers and mark attendance. The account itself is created by the
        system administrator.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    color: Colors.danger,
    fontSize: FontSizes.sm,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: Colors.text,
  },
  rowEmail: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  rowActions: {
    width: 118,
  },
  hint: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: Spacing.lg,
  },
});