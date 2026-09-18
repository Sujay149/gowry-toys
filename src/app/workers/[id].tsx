import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Badge, Card, EmptyState, Screen, SectionTitle, StatCard } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { currentMonth, fetchAttendanceForMonth, fetchWorkerByWorkerId, updateWorker, monthLabel } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Worker } from '@/lib/types';

export default function WorkerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [worker, setWorker] = useState<Worker | null>(null);
  const [shift1, setShift1] = useState(0);
  const [shift2, setShift2] = useState(0);
  const [presentDays, setPresentDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);

  const month = currentMonth();

  const load = useCallback(async () => {
    try {
      const w = await fetchWorkerByWorkerId(id ?? '');
      if (!w) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setWorker(w);
      const records = await fetchAttendanceForMonth(month);
      const mine = records.filter((r) => r.worker_id === w.id);
      const s1 = mine.filter((r) => r.shift?.shift_code === 'SHIFT_1').length;
      const s2 = mine.filter((r) => r.shift?.shift_code === 'SHIFT_2').length;
      setShift1(s1);
      setShift2(s2);
      setPresentDays(new Set(mine.map((r) => r.attendance_date)).size);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, month]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleActive = () => {
    if (!worker) return;
    Alert.alert(
      worker.active ? 'Deactivate worker?' : 'Activate worker?',
      worker.active
        ? 'Deactivated workers cannot receive new attendance records.'
        : 'The worker can receive attendance again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: worker.active ? 'Deactivate' : 'Activate',
          style: worker.active ? 'destructive' : 'default',
          onPress: async () => {
            setUpdating(true);
            try {
              await updateWorker(worker.id, { active: !worker.active });
              load();
            } catch {
              Alert.alert('Error', 'Could not update the worker.');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading…</Text>
      </Screen>
    );
  }

  if (notFound || !worker) {
    return (
      <Screen>
        <EmptyState icon="person-outline" title="Worker not found" message="This Worker ID does not exist in the system." />
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.profileCard}>
        <Text style={styles.workerId}>{worker.worker_id}</Text>
        <Text style={styles.name}>{worker.name}</Text>
        <View style={styles.badges}>
          <Badge label={worker.active ? 'Active' : 'Inactive'} color={worker.active ? Colors.success : Colors.textMuted} background={worker.active ? Colors.successLight : Colors.background} />
          {worker.department ? <Badge label={worker.department} /> : null}
        </View>
      </Card>

      <SectionTitle title={`Attendance · ${monthLabel(month)}`} />
      <View style={styles.statsRow}>
        <StatCard label="Shift 1" value={`${shift1}`} icon="sunny" color={Colors.warning} background={Colors.warningLight} />
        <StatCard label="Shift 2" value={`${shift2}`} icon="moon" color={Colors.primary} background={Colors.primaryLight} />
        <StatCard label="Days Present" value={`${presentDays}`} icon="calendar" color={Colors.success} background={Colors.successLight} />
      </View>

      <SectionTitle title="Details" />
      <Card style={styles.detailCard}>
        {detailRow('Worker ID', worker.worker_id)}
        {detailRow('Department', worker.department ?? '—')}
        {detailRow('Designation', worker.designation ?? '—')}
        {detailRow('Phone', worker.phone ?? '—')}
        {detailRow('Joining Date', worker.joining_date ?? '—')}
      </Card>

      {isAdmin ? (
        <>
          <SectionTitle title="Actions" />
          <View style={styles.actions}>
            <AppButton title="QR Code" icon="qr-code" style={{ flex: 1 }} onPress={() => router.push(`/workers/${worker.worker_id}/qr`)} />
            <AppButton title="Edit" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => router.push(`/workers/${worker.worker_id}/edit`)} />
          </View>
          <AppButton
            title={worker.active ? 'Deactivate Worker' : 'Activate Worker'}
            icon={worker.active ? 'ban' : 'checkmark-circle'}
            variant={worker.active ? 'danger' : 'secondary'}
            onPress={toggleActive}
            loading={updating}
            style={{ marginTop: Spacing.md }}
          />
        </>
      ) : null}
    </Screen>
  );
}

function detailRow(label: string, value: string) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: Spacing.xxl,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  workerId: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 999,
    overflow: 'hidden',
  },
  name: {
    fontSize: FontSizes.xxl,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailCard: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
});