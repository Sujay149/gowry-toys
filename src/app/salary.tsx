import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  AppHeader,
  Card,
  EmptyState,
  Screen,
  SectionTitle,
  StatCard,
} from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import {
  currentMonth,
  fetchMonthlyAttendanceRows,
  fetchWorkers,
  monthLabel,
  shiftMonth,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatRupees, getMonthlyPayrollSummary } from '@/lib/salary';
import type { Worker } from '@/lib/types';

export default function PayrollScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [month, setMonth] = useState(currentMonth());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchMonthlyAttendanceRows>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/(tabs)/dashboard');
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    const [wk, att] = await Promise.all([
      fetchWorkers(true).catch(() => [] as Worker[]),
      fetchMonthlyAttendanceRows(month),
    ]);
    setWorkers(wk);
    setRows(att);
    setLoading(false);
  }, [month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const summary = useMemo(
    () => getMonthlyPayrollSummary(month, workers, rows),
    [month, workers, rows]
  );

  if (!isAdmin) {
    return null;
  }

  return (
    <Screen
      padded={false}
      header={<AppHeader title="Payroll" onBack={() => router.back()} />}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.monthRow}>
        <Pressable onPress={() => setMonth(shiftMonth(month, -1))} style={styles.chevron}>
          <Ionicons name="chevron-back" size={22} color={Colors.primary} />
        </Pressable>
        <Text style={styles.monthText}>{monthLabel(month)}</Text>
        <Pressable onPress={() => setMonth(shiftMonth(month, 1))} style={styles.chevron}>
          <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          label="Working days"
          value={`${summary.workingDays}`}
          icon="calendar"
          color={Colors.primary}
          background={Colors.primaryLight}
        />
        <StatCard
          label="Total payroll"
          value={formatRupees(summary.totalPayroll)}
          icon="cash"
          color={Colors.successDark}
          background={Colors.successLight}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Full days"
          value={`${summary.totalFullDays}`}
          icon="checkmark-done"
          color={Colors.warning}
          background={Colors.warningLight}
        />
        <StatCard
          label="Half days"
          value={`${summary.totalHalfDays}`}
          icon="remove"
          color={Colors.primary}
          background={Colors.primaryLight}
        />
      </View>

      {summary.unconfigured > 0 ? (
        <Card style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={Colors.warning} />
          <Text style={styles.noticeText}>
            {summary.unconfigured} worker{summary.unconfigured === 1 ? '' : 's'} without a configured salary{' '}
            {summary.unconfigured === 1 ? 'is' : 'are'} excluded from the total.
          </Text>
        </Card>
      ) : null}

      <AppButton
        title="Generate Monthly PDF Report"
        icon="document-text"
        style={{ marginTop: Spacing.lg }}
        onPress={() => router.push('/(tabs)/reports')}
      />

      <SectionTitle title="Worker-wise payroll" subtitle="Full day = both shifts · Half day = one shift" />

      {loading ? (
        <Card>
          <Text style={styles.muted}>Loading…</Text>
        </Card>
      ) : summary.workers.length === 0 ? (
        <Card>
          <EmptyState
            icon="people-outline"
            title="No workers"
            message="Add workers and record attendance to calculate payroll."
          />
        </Card>
      ) : (
        <Card style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.colId, styles.headText]}>ID</Text>
            <Text style={[styles.colName, styles.headText]}>Name</Text>
            <Text style={[styles.colNum, styles.headText]}>Full</Text>
            <Text style={[styles.colNum, styles.headText]}>Half</Text>
            <Text style={[styles.colNum, styles.headText]}>Abs</Text>
            <Text style={[styles.colEarned, styles.headText]}>Earned</Text>
          </View>
          {summary.workers.map((item) => (
            <Pressable
              key={item.worker.id}
              onPress={() => router.push(`/workers/${item.worker.worker_id}`)}
              style={({ pressed }) => [styles.tableRow, pressed && styles.tableRowPressed]}>
              <Text style={[styles.colId, styles.monoText]}>{item.worker.worker_id}</Text>
              <Text style={styles.colName} numberOfLines={1}>
                {item.worker.name}
              </Text>
              <Text style={styles.colNum}>{item.fullDays}</Text>
              <Text style={styles.colNum}>{item.halfDays}</Text>
              <Text style={[styles.colNum, item.absentDays === 0 && styles.zeroAbsent]}>
                {item.absentDays}
              </Text>
              <Text
                style={[
                  styles.colEarned,
                  item.earned == null ? styles.earnedMissing : styles.earnedValue,
                ]}>
                {item.earned == null ? '—' : formatRupees(item.earned)}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.tableRow, styles.tableTotal]}>
            <Text style={[styles.colId, styles.totalText]}>Total</Text>
            <Text style={[styles.colName, styles.totalText]}>—</Text>
            <Text style={styles.colNum} />
            <Text style={styles.colNum} />
            <Text style={styles.colNum} />
            <Text style={[styles.colEarned, styles.totalText]}>{formatRupees(summary.totalPayroll)}</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  chevron: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.warningLight,
    borderColor: Colors.warningLight,
    paddingVertical: Spacing.sm,
  },
  noticeText: {
    flex: 1,
    fontSize: FontSizes.xs,
    lineHeight: 16,
    color: Colors.text,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    padding: Spacing.md,
  },
  table: {
    gap: 0,
    padding: 0,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  tableRowPressed: {
    backgroundColor: Colors.primaryLight,
  },
  tableHead: {
    backgroundColor: Colors.background,
  },
  tableTotal: {
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  headText: {
    fontWeight: '700',
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
  },
  totalText: {
    fontWeight: '800',
    color: Colors.primary,
  },
  colId: {
    width: 58,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  monoText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  colName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  colNum: {
    width: 30,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  zeroAbsent: {
    color: Colors.successDark,
    fontWeight: '700',
  },
  colEarned: {
    width: 72,
    textAlign: 'right',
    fontSize: FontSizes.xs,
    fontVariant: ['tabular-nums'],
  },
  earnedValue: {
    color: Colors.text,
    fontWeight: '700',
  },
  earnedMissing: {
    color: Colors.textMuted,
  },
});