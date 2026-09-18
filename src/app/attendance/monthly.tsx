import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, Card, EmptyState, SectionTitle, StatCard } from '@/components/ui';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import {
  currentMonth,
  fetchMonthlyAttendanceRows,
  fetchWorkers,
  monthLabel,
  shiftMonth,
} from '@/lib/api';
import type { Worker } from '@/lib/types';

interface WorkerSummary {
  worker: Worker;
  shift1: number;
  shift2: number;
  total: number;
  presentDays: number;
}

export default function MonthlyAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchMonthlyAttendanceRows>>>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [wk, att] = await Promise.all([
      fetchWorkers(false).catch(() => [] as Worker[]),
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

  const summary = useMemo(() => {
    const byWorker = new Map<string, WorkerSummary>();
    for (const w of workers) {
      byWorker.set(w.id, { worker: w, shift1: 0, shift2: 0, total: 0, presentDays: 0 });
    }
    let shift1 = 0;
    let shift2 = 0;
    const presentDates = new Set<string>();
    for (const r of rows) {
      if (r.shift?.shift_code === 'SHIFT_1') shift1 += 1;
      else if (r.shift?.shift_code === 'SHIFT_2') shift2 += 1;
      presentDates.add(r.attendance_date);
      const entry = byWorker.get(r.worker_id);
      if (entry) {
        if (r.shift?.shift_code === 'SHIFT_1') entry.shift1 += 1;
        else if (r.shift?.shift_code === 'SHIFT_2') entry.shift2 += 1;
        entry.total += 1;
      }
    }
    // present days per worker
    const perWorkerDates = new Map<string, Set<string>>();
    for (const r of rows) {
      const set = perWorkerDates.get(r.worker_id) ?? new Set<string>();
      set.add(r.attendance_date);
      perWorkerDates.set(r.worker_id, set);
    }
    for (const [wid, dates] of perWorkerDates) {
      const entry = byWorker.get(wid);
      if (entry) entry.presentDays = dates.size;
    }
    const list = Array.from(byWorker.values()).sort((a, b) =>
      a.worker.worker_id.localeCompare(b.worker.worker_id)
    );
    return { shift1, shift2, presentTally: presentDates.size, list };
  }, [rows, workers]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
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
        <StatCard label="Workers" value={`${workers.length}`} icon="people" color={Colors.primary} background={Colors.primaryLight} />
        <StatCard label="Shift 1" value={`${summary.shift1}`} icon="sunny" color={Colors.warning} background={Colors.warningLight} />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Shift 2" value={`${summary.shift2}`} icon="moon" color={Colors.primary} background={Colors.primaryLight} />
        <StatCard label="Total" value={`${summary.shift1 + summary.shift2}`} icon="checkmark-done" color={Colors.success} background={Colors.successLight} />
      </View>

      <AppButton
        title="Generate Monthly PDF Report"
        icon="download"
        style={{ marginTop: Spacing.lg }}
        onPress={() => router.push('/(tabs)/reports')}
      />

      <SectionTitle title="Worker-wise attendance" />
      {loading ? (
        <Card>
          <Text style={styles.muted}>Loading…</Text>
        </Card>
      ) : summary.list.length === 0 ? (
        <Card>
          <EmptyState icon="people-outline" title="No workers" message="Add workers to see monthly attendance." />
        </Card>
      ) : (
        <Card style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.colId, styles.headText]}>ID</Text>
            <Text style={[styles.colName, styles.headText]}>Name</Text>
            <Text style={[styles.colNum, styles.headText]}>S1</Text>
            <Text style={[styles.colNum, styles.headText]}>S2</Text>
            <Text style={[styles.colNum, styles.headText]}>Days</Text>
          </View>
          {summary.list.map((s) => (
            <View key={s.worker.id} style={styles.tableRow}>
              <Text style={[styles.colId, styles.monoText]}>{s.worker.worker_id}</Text>
              <Text style={styles.colName} numberOfLines={1}>
                {s.worker.name}
              </Text>
              <Text style={styles.colNum}>{s.shift1}</Text>
              <Text style={styles.colNum}>{s.shift2}</Text>
              <Text style={[styles.colNum, styles.totalCell]}>{s.presentDays}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tableHead: {
    backgroundColor: Colors.background,
  },
  headText: {
    fontWeight: '700',
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    textTransform: 'uppercase',
  },
  colId: {
    width: 64,
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
    width: 36,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontVariant: ['tabular-nums'],
  },
  totalCell: {
    fontWeight: '700',
    color: Colors.primary,
  },
});