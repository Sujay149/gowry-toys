import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  AttendanceRow,
  Badge,
  Card,
  EmptyState,
  FadeInView,
  FilterChip,
  IconButton,
  ProgressBar,
  Screen,
  SectionTitle,
  Skeleton,
  StatCard,
} from '@/components/ui';

import {
  Colors,
  FontSizes,
  FontWeights,
  LineHeights,
  Radius,
  Spacing,
} from '@/constants/theme';

import {
  fetchAttendanceForDate,
  fetchShifts,
  fetchWorkers,
  summarizeToday,
  todayString,
} from '@/lib/api';

import type { AttendanceRecord, Shift, Worker } from '@/lib/types';

export default function AttendanceScreen() {
  const [date, setDate] = useState<string>(todayString());
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [att, sh, wk] = await Promise.all([
        fetchAttendanceForDate(date),
        fetchShifts(),
        fetchWorkers(false).catch(() => [] as Worker[]),
      ]);

      setRecords(att);
      setShifts(sh);
      setWorkers(wk);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const departments = useMemo(() => {
    const set = new Set<string>();

    workers.forEach((w) => {
      if (w.department) {
        set.add(w.department);
      }
    });

    return ['all', ...Array.from(set).sort()];
  }, [workers]);

  const filtered = useMemo(() => {
    let list = records;

    if (shiftFilter !== 'all') {
      list = list.filter((r) => r.shift_id === shiftFilter);
    }

    if (deptFilter !== 'all') {
      list = list.filter((r) => r.worker?.department === deptFilter);
    }

    const q = query.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (r) =>
          (r.worker?.worker_id ?? '').toLowerCase().includes(q) ||
          (r.worker?.name ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [records, shiftFilter, deptFilter, query]);

  const summary = summarizeToday(filtered);

  const attendancePercentage =
    workers.length > 0
      ? Math.min(100, Math.round((summary.present / workers.length) * 100))
      : 0;

  const shiftDate = (dir: 1 | -1) => {
    const [y, m, d] = date.split('-').map(Number);
    const next = new Date(y, m - 1, d + dir);

    setDate(next.toISOString().slice(0, 10));
  };

  const prettyDate = useMemo(() => {
    const [y, m, d] = date.split('-').map(Number);

    return new Date(y, m - 1, d).toLocaleDateString([], {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [date]);

  const isToday = date === todayString();

  return (
    <Screen
      header={
        <AppHeader
          title="Today's Attendance"
          subtitle={prettyDate}
          large
        />
      }
    >
      <FadeInView>
        {/* ───────────────── DATE CARD ───────────────── */}
        <Card style={styles.dateCard}>
          <View style={styles.dateNavigation}>
            <IconButton
              icon="chevron-back"
              variant="surface"
              onPress={() => shiftDate(-1)}
              accessibilityLabel="Previous day"
            />

            <View style={styles.dateCenter}>
              <View style={styles.calendarIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={17}
                  color={Colors.primary}
                />
              </View>

              <View style={styles.dateInfo}>
                <Text style={styles.dateText}>
                  {prettyDate}
                </Text>

                {isToday ? (
                  <View style={styles.todayPill}>
                    <View style={styles.todayDot} />
                    <Text style={styles.todayText}>Today</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setDate(todayString())}
                    hitSlop={8}
                  >
                    <Text style={styles.jumpToday}>
                      Back to today
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>

            <IconButton
              icon="chevron-forward"
              variant="surface"
              onPress={() => shiftDate(1)}
              accessibilityLabel="Next day"
            />
          </View>
        </Card>
      </FadeInView>

      {/* ───────────────── ATTENDANCE OVERVIEW ───────────────── */}
      <FadeInView delay={80}>
        <Card style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <View>
              <Text style={styles.overviewEyebrow}>
                ATTENDANCE OVERVIEW
              </Text>

              <Text style={styles.overviewTitle}>
                {summary.present}
                <Text style={styles.overviewTotal}>
                  {workers.length > 0
                    ? ` / ${workers.length}`
                    : ''}
                </Text>
              </Text>

              <Text style={styles.overviewSubtitle}>
                workers present today
              </Text>
            </View>

            <View style={styles.percentageCircle}>
              <Text style={styles.percentageValue}>
                {attendancePercentage}%
              </Text>
              <Text style={styles.percentageLabel}>
                present
              </Text>
            </View>
          </View>

          <View style={styles.overviewProgress}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>
                Attendance progress
              </Text>

              <Text style={styles.progressPercent}>
                {attendancePercentage}%
              </Text>
            </View>

            <ProgressBar
              value={summary.present}
              max={workers.length || summary.present || 1}
              color={Colors.success}
            />
          </View>
        </Card>
      </FadeInView>

      {/* ───────────────── QUICK STATS ───────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          label="Present"
          value={`${summary.present}`}
          icon="checkmark-done"
          color={Colors.successDark}
          background={Colors.successLight}
        />

        <StatCard
          label="Shift 1"
          value={`${summary.shift1}`}
          icon="sunny"
          color={Colors.warning}
          background={Colors.warningLight}
        />

        <StatCard
          label="Shift 2"
          value={`${summary.shift2}`}
          icon="moon"
          color={Colors.primary}
          background={Colors.primaryLight}
        />
      </View>

      {/* ───────────────── SEARCH ───────────────── */}
      <FadeInView delay={120}>
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color={Colors.textMuted}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search worker name or ID"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {query.length > 0 && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              style={styles.clearSearch}
            >
              <Ionicons
                name="close-circle"
                size={19}
                color={Colors.textMuted}
              />
            </Pressable>
          )}
        </View>
      </FadeInView>

      {/* ───────────────── FILTERS ───────────────── */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Shift</Text>

          {shiftFilter !== 'all' && (
            <Pressable
              onPress={() => setShiftFilter('all')}
              hitSlop={8}
            >
              <Text style={styles.clearFilter}>Clear</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalFilters}
        >
          <FilterChip
            label="All shifts"
            active={shiftFilter === 'all'}
            onPress={() => setShiftFilter('all')}
          />

          {shifts.map((shift) => (
            <FilterChip
              key={shift.id}
              label={shift.name}
              active={shiftFilter === shift.id}
              onPress={() => setShiftFilter(shift.id)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Department</Text>

          {deptFilter !== 'all' && (
            <Pressable
              onPress={() => setDeptFilter('all')}
              hitSlop={8}
            >
              <Text style={styles.clearFilter}>Clear</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalFilters}
        >
          {departments.map((department) => (
            <FilterChip
              key={department}
              label={
                department === 'all'
                  ? 'All departments'
                  : department
              }
              active={deptFilter === department}
              onPress={() => setDeptFilter(department)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ───────────────── RECORDS HEADER ───────────────── */}
      <View style={styles.recordsHeader}>
        <View>
          <Text style={styles.recordsTitle}>
            Attendance records
          </Text>

          <Text style={styles.recordsSubtitle}>
            {filtered.length}{' '}
            {filtered.length === 1 ? 'record' : 'records'} found
          </Text>
        </View>

        {(shiftFilter !== 'all' ||
          deptFilter !== 'all' ||
          query.length > 0) && (
          <View style={styles.filteredBadge}>
            <Ionicons
              name="filter"
              size={13}
              color={Colors.primary}
            />
            <Text style={styles.filteredBadgeText}>
              Filtered
            </Text>
          </View>
        )}
      </View>

      {/* ───────────────── RECORDS ───────────────── */}
      {loading ? (
        <Card
          padded={false}
          style={styles.listCard}
        >
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonRow,
                i < 3 && styles.skeletonDivider,
              ]}
            >
              <Skeleton
                width={44}
                height={44}
                radius={22}
              />

              <View style={styles.skeletonContent}>
                <Skeleton
                  width="55%"
                  height={13}
                />

                <Skeleton
                  width="38%"
                  height={11}
                />
              </View>

              <View style={styles.skeletonRight}>
                <Skeleton
                  width={50}
                  height={11}
                />

                <Skeleton
                  width={58}
                  height={20}
                  radius={10}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : filtered.length === 0 ? (
        <Card style={styles.emptyCard}>
          <EmptyState
            icon="calendar-outline"
            title="No attendance records"
            message="No attendance records match the selected filters for this date."
          />

          {(query ||
            shiftFilter !== 'all' ||
            deptFilter !== 'all') && (
            <AppButton
              title="Clear filters"
              icon="close-circle-outline"
              variant="outline"
              onPress={() => {
                setQuery('');
                setShiftFilter('all');
                setDeptFilter('all');
              }}
              style={styles.clearAllButton}
            />
          )}
        </Card>
      ) : (
        <FadeInView>
          <Card
            padded={false}
            style={styles.listCard}
          >
            {filtered.map((record, index) => (
              <AttendanceRecordItem
                key={record.id}
                record={record}
                divider={index < filtered.length - 1}
              />
            ))}
          </Card>
        </FadeInView>
      )}

      {/* ───────────────── EXPLORE ───────────────── */}
      <View style={styles.exploreHeader}>
        <View>
          <Text style={styles.recordsTitle}>
            Explore attendance
          </Text>

          <Text style={styles.recordsSubtitle}>
            View detailed attendance history
          </Text>
        </View>
      </View>

      <View style={styles.links}>
        <Pressable
          style={styles.exploreCard}
          onPress={() =>
            router.push('/attendance/monthly')
          }
        >
          <View
            style={[
              styles.exploreIcon,
              {
                backgroundColor:
                  Colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={Colors.primary}
            />
          </View>

          <View style={styles.exploreContent}>
            <Text style={styles.exploreTitle}>
              Monthly
            </Text>

            <Text style={styles.exploreSubtitle}>
              Monthly attendance report
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={Colors.textMuted}
          />
        </Pressable>

        <Pressable
          style={styles.exploreCard}
          onPress={() =>
            router.push('/attendance/history')
          }
        >
          <View
            style={[
              styles.exploreIcon,
              {
                backgroundColor:
                  Colors.successLight,
              },
            ]}
          >
            <Ionicons
              name="person-outline"
              size={22}
              color={Colors.successDark}
            />
          </View>

          <View style={styles.exploreContent}>
            <Text style={styles.exploreTitle}>
              Worker history
            </Text>

            <Text style={styles.exploreSubtitle}>
              View individual attendance
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={19}
            color={Colors.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

/* ─────────────────────────────────────────────
   ATTENDANCE RECORD
───────────────────────────────────────────── */

function AttendanceRecordItem({
  record,
  divider,
}: {
  record: AttendanceRecord;
  divider: boolean;
}) {
  const name = record.worker?.name ?? 'Unknown worker';
  const workerId = record.worker?.worker_id ?? '—';
  const department = record.worker?.department ?? 'No department';

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const time = new Date(
    record.marked_at
  ).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View
      style={[
        styles.recordRow,
        divider && styles.recordDivider,
      ]}
    >
      {/* Avatar */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {initials || '?'}
        </Text>
      </View>

      {/* Worker details */}
      <View style={styles.recordMain}>
        <Text
          style={styles.workerName}
          numberOfLines={1}
        >
          {name}
        </Text>

        <View style={styles.workerMeta}>
          <Text style={styles.workerId}>
            {workerId}
          </Text>

          <View style={styles.metaDot} />

          <Text
            style={styles.department}
            numberOfLines={1}
          >
            {department}
          </Text>
        </View>
      </View>

      {/* Time + shift */}
      <View style={styles.recordRight}>
        <Text style={styles.recordTime}>
          {time}
        </Text>

        <View style={styles.shiftBadge}>
          <Ionicons
            name={
              record.shift?.name
                ?.toLowerCase()
                .includes('2')
                ? 'moon-outline'
                : 'sunny-outline'
            }
            size={11}
            color={Colors.primary}
          />

          <Text
            style={styles.shiftBadgeText}
            numberOfLines={1}
          >
            {record.shift?.name ?? 'Shift'}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* Date */

  dateCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },

  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },

  calendarIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateInfo: {
    alignItems: 'flex-start',
    maxWidth: '72%',
  },

  dateText: {
    fontSize: FontSizes.md,
    lineHeight: LineHeights.md,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: Colors.successLight,
  },

  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },

  todayText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successDark,
  },

  jumpToday: {
    marginTop: 3,
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },

  /* Overview */

  overviewCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },

  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  overviewEyebrow: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 3,
  },

  overviewTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: Colors.text,
  },

  overviewTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textMuted,
  },

  overviewSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  percentageCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 5,
    borderColor: Colors.card,
    shadowColor: Colors.primary,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  percentageValue: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: Colors.successDark,
  },

  percentageLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.successDark,
    opacity: 0.75,
  },

  overviewProgress: {
    marginTop: Spacing.lg,
  },

  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  progressLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },

  progressPercent: {
    fontSize: FontSizes.xs,
    color: Colors.successDark,
    fontWeight: '800',
  },

  /* Stats */

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  /* Search */

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    minHeight: 52,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 0,
    marginLeft: Spacing.sm,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },

  clearSearch: {
    paddingLeft: Spacing.sm,
  },

  /* Filters */

  filterSection: {
    marginTop: Spacing.lg,
  },

  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },

  filterTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.text,
  },

  clearFilter: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.primary,
  },

  horizontalFilters: {
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },

  /* Records */

  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  recordsTitle: {
    fontSize: FontSizes.lg,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.text,
  },

  recordsSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 3,
  },

  filteredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },

  filteredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.primary,
  },

  listCard: {
    overflow: 'hidden',
    padding: 0,
  },

  recordRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },

  recordDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },

  avatarText: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.primary,
  },

  recordMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.sm,
  },

  workerName: {
    fontSize: FontSizes.sm,
    lineHeight: 19,
    fontWeight: '700',
    color: Colors.text,
  },

  workerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minWidth: 0,
  },

  workerId: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 5,
  },

  department: {
    flexShrink: 1,
    fontSize: 10,
    color: Colors.textMuted,
  },

  recordRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
  },

  recordTime: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  shiftBadge: {
    maxWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
  },

  shiftBadgeText: {
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '700',
    color: Colors.primary,
  },

  /* Loading */

  skeletonRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },

  skeletonDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  skeletonContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    gap: 8,
  },

  skeletonRight: {
    alignItems: 'flex-end',
    gap: 7,
  },

  /* Empty */

  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },

  clearAllButton: {
    marginTop: Spacing.sm,
  },

  /* Explore */

  exploreHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },

  links: {
    gap: Spacing.sm,
  },

  exploreCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
  },

  exploreIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  exploreContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  exploreTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '800',
    color: Colors.text,
  },

  exploreSubtitle: {
    marginTop: 3,
    fontSize: 10,
    color: Colors.textMuted,
  },

  bottomSpace: {
    height: Spacing.xl,
  },
});