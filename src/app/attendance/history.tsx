import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar, Badge, Card, EmptyState, SectionTitle, StatCard, TextField } from '@/components/ui';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import {
  currentMonth,
  fetchWorkerMonthAttendance,
  fetchWorkers,
  monthLabel,
  shiftMonth,
} from '@/lib/api';
import type { Worker } from '@/lib/types';

interface DayCell {
  date: string;
  day: number;
  s1: boolean;
  s2: boolean;
}

export default function AttendanceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [month, setMonth] = useState(currentMonth());
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [query, setQuery] = useState('');
  const [records, setRecords] = useState<{ attendance_date: string; shift?: { shift_code?: string | null } | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkers(false).then(setWorkers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!worker) return;
    setLoading(true);
    fetchWorkerMonthAttendance(worker.id, month)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [month, worker]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const list = workers.filter(
      (w) => w.name.toLowerCase().includes(q) || w.worker_id.toLowerCase().includes(q)
    );
    return list.slice(0, 20);
  }, [workers, query]);

  const days = useMemo<DayCell[]>(() => {
    const [y, m] = month.split('-').map(Number);
    const count = new Date(y, m, 0).getDate();
    const byDate = new Map<string, { s1: boolean; s2: boolean }>();
    for (const r of records) {
      const key = r.attendance_date;
      const entry = byDate.get(key) ?? { s1: false, s2: false };
      if (r.shift?.shift_code === 'SHIFT_1') entry.s1 = true;
      if (r.shift?.shift_code === 'SHIFT_2') entry.s2 = true;
      byDate.set(key, entry);
    }
    const out: DayCell[] = [];
    for (let d = 1; d <= count; d++) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const entry = byDate.get(date);
      out.push({
        date,
        day: d,
        s1: entry?.s1 ?? false,
        s2: entry?.s2 ?? false,
      });
    }
    return out;
  }, [month, records]);

  const totals = useMemo(() => {
    let s1 = 0;
    let s2 = 0;
    const presentDates = new Set<string>();
    for (const d of days) {
      if (d.s1) {
        s1 += 1;
        presentDates.add(d.date);
      }
      if (d.s2) {
        s2 += 1;
        presentDates.add(d.date);
      }
    }
    return { s1, s2, presentDays: presentDates.size };
  }, [days]);

  const weekday = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString([], { weekday: 'short' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      {!worker ? (
        <>
          <Card>
            <Text style={styles.prompt}>Select a worker to view their attendance history.</Text>
          </Card>
          <SectionTitle title="Search worker" />
          <TextField
            label="Name or Worker ID"
            icon="search"
            value={query}
            onChangeText={setQuery}
            placeholder="e.g. WRK001 or Ravi Kumar"
          />
          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((w) => (
                <Pressable
                  key={w.id}
                  style={({ pressed }) => [styles.result, pressed && { opacity: 0.8 }]}
                  onPress={() => {
                    setWorker(w);
                    setQuery('');
                  }}>
                  <Avatar name={w.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultName}>{w.name}</Text>
                    <Text style={styles.resultId}>{w.worker_id}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : query.trim() ? (
            <Card>
              <EmptyState icon="search-outline" title="No matches" message="Try a different name or Worker ID." />
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <View style={styles.monthRow}>
            <Pressable onPress={() => setMonth(shiftMonth(month, -1))} style={styles.chevron}>
              <Ionicons name="chevron-back" size={22} color={Colors.primary} />
            </Pressable>
            <Text style={styles.monthText}>{monthLabel(month)}</Text>
            <Pressable onPress={() => setMonth(shiftMonth(month, 1))} style={styles.chevron}>
              <Ionicons name="chevron-forward" size={22} color={Colors.primary} />
            </Pressable>
          </View>

          <Card style={styles.workerCard}>
            <Avatar name={worker.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.workerName}>{worker.name}</Text>
              <Text style={styles.workerMeta}>
                {worker.worker_id}
                {worker.department ? ` · ${worker.department}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setWorker(null)}>
              <Badge label="Change" icon="swap-horizontal" />
            </Pressable>
          </Card>

          <View style={styles.statsRow}>
            <StatCard label="Shift 1" value={`${totals.s1}`} icon="sunny" color={Colors.warning} background={Colors.warningLight} />
            <StatCard label="Shift 2" value={`${totals.s2}`} icon="moon" color={Colors.primary} background={Colors.primaryLight} />
            <StatCard label="Days" value={`${totals.presentDays}`} icon="calendar" color={Colors.success} background={Colors.successLight} />
          </View>

          <SectionTitle title="Daily record" />
          {loading ? (
            <Card>
              <Text style={styles.muted}>Loading…</Text>
            </Card>
          ) : (
            <Card style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.colDate, styles.headText]}>Date</Text>
                <Text style={[styles.colShift, styles.headText]}>Shift 1</Text>
                <Text style={[styles.colShift, styles.headText]}>Shift 2</Text>
              </View>
              {days.map((d) => (
                <View key={d.date} style={styles.tableRow}>
                  <Text style={styles.colDate}>
                    {String(d.day).padStart(2, '0')} <Text style={styles.dayWk}>{weekday(d.date)}</Text>
                  </Text>
                  <Text style={[styles.colShift, d.s1 ? styles.present : styles.absent]}>
                    {d.s1 ? 'P' : '—'}
                  </Text>
                  <Text style={[styles.colShift, d.s2 ? styles.present : styles.absent]}>
                    {d.s2 ? 'P' : '—'}
                  </Text>
                </View>
              ))}
            </Card>
          )}
        </>
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
  prompt: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    padding: Spacing.md,
  },
  results: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  resultName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  resultId: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
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
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  workerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  workerMeta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
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
  colDate: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  dayWk: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  colShift: {
    width: 80,
    textAlign: 'center',
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  present: {
    color: Colors.success,
  },
  absent: {
    color: Colors.textMuted,
  },
});