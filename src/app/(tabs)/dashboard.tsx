import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
  AttendanceRow,
  Badge,
  Card,
  FadeInView,
  ProgressBar,
  Screen,
  SectionTitle,
  ShiftCard,
  Skeleton,
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
  fetchCompanySettings,
  fetchWorkers,
  summarizeToday,
  todayString,
} from '@/lib/api';

import { useAuth } from '@/lib/auth';
import type {
  AttendanceRecord,
  Worker,
} from '@/lib/types';

export default function DashboardScreen() {
  const { profile } = useAuth();

  const isAdmin = profile?.role === 'admin';

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [workerCount, setWorkerCount] = useState<number>(0);
  const [companyName, setCompanyName] =
    useState('Gowri Toys');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* LOAD DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(async () => {
    try {
      const [
        attendance,
        workers,
        settings,
      ] = await Promise.all([
        fetchAttendanceForDate(
          todayString()
        ),

        fetchWorkers(false).catch(
          () => [] as Worker[]
        ),

        fetchCompanySettings(),
      ]);

      setRecords(attendance);

      setWorkerCount(workers.length);

      if (settings?.company_name) {
        setCompanyName(
          settings.company_name
        );
      }
    } catch (error) {
      console.error(
        'Dashboard load error:',
        error
      );
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* INITIAL LOAD                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    setLoading(true);

    load().finally(() => {
      setLoading(false);
    });
  }, [load]);

  /* ---------------------------------------------------------------------- */
  /* REFRESH                                                                */
  /* ---------------------------------------------------------------------- */

  const onRefresh = async () => {
    setRefreshing(true);

    await load();

    setRefreshing(false);
  };

  /* ---------------------------------------------------------------------- */
  /* SUMMARY                                                                */
  /* ---------------------------------------------------------------------- */

  const summary = useMemo(
    () => summarizeToday(records),
    [records]
  );

  /* ---------------------------------------------------------------------- */
  /* GREETING                                                               */
  /* ---------------------------------------------------------------------- */

  const greeting = useMemo(() => {
    const hour = new Date().getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }, []);

  /* ---------------------------------------------------------------------- */
  /* DATE                                                                    */
  /* ---------------------------------------------------------------------- */

  const formattedDate = useMemo(() => {
    const date = new Date();

    return date.toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* STATS                                                                   */
  /* ---------------------------------------------------------------------- */

  const percentage =
    workerCount > 0
      ? Math.round(
          (summary.present /
            workerCount) *
            100
        )
      : 0;

  const pending = Math.max(
    workerCount -
      summary.present,
    0
  );

  /* ---------------------------------------------------------------------- */
  /* DISPLAY NAME                                                            */
  /* ---------------------------------------------------------------------- */

  const displayName =
    profile?.full_name ??
    (isAdmin ? 'Admin' : 'Supervisor');

  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (name) =>
        name.charAt(0).toUpperCase()
    )
    .join('');

  /* ---------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
      header={
        <FadeInView>
          <View style={styles.header}>
            {/* ---------------------------------------------------------- */}
            {/* LEFT                                                        */}
            {/* ---------------------------------------------------------- */}

            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {greeting}
              </Text>

              <Text
                style={styles.headerName}
                numberOfLines={1}
              >
                {displayName}
              </Text>

              <View
                style={styles.headerMeta}
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={Colors.textMuted}
                />

                <Text
                  style={
                    styles.headerMetaText
                  }
                  numberOfLines={1}
                >
                  {formattedDate}
                </Text>
              </View>
            </View>

            {/* ---------------------------------------------------------- */}
            {/* RIGHT                                                        */}
            {/* ---------------------------------------------------------- */}

            <View
              style={styles.headerRight}
            >
              <Pressable
                style={
                  styles.notificationButton
                }
                hitSlop={8}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={Colors.text}
                />

                <View
                  style={styles.notificationDot}
                />
              </Pressable>

              <Pressable
                style={styles.avatar}
                onPress={() =>
                  router.push(
                    '/(tabs)/profile'
                  )
                }
              >
                <Text
                  style={
                    styles.avatarText
                  }
                >
                  {initials || 'U'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ------------------------------------------------------------ */}
          {/* ROLE BADGE                                                     */}
          {/* ------------------------------------------------------------ */}

          <View
            style={styles.roleContainer}
          >
            <Badge
              label={
                isAdmin
                  ? 'Admin'
                  : 'Supervisor'
              }
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
        </FadeInView>
      }
    >
      {/* ================================================================== */}
      {/* TODAY'S SUMMARY                                                   */}
      {/* ================================================================== */}

      <FadeInView>
        <Card
          style={styles.heroCard}
          elevated
        >
          <View
            style={styles.heroHeader}
          >
            <View>
              <Text
                style={styles.heroLabel}
              >
                Today's attendance
              </Text>

              <View
                style={styles.heroNumberRow}
              >
                <Text
                  style={styles.heroValue}
                >
                  {summary.present}
                </Text>

                <Text
                  style={styles.heroTotal}
                >
                  / {workerCount}
                </Text>
              </View>
            </View>

            <View
              style={styles.percentageCircle}
            >
              <Text
                style={
                  styles.percentageText
                }
              >
                {percentage}%
              </Text>
              <Text
                style={
                  styles.percentageLabel
                }
              >
                present
              </Text>
            </View>
          </View>

          <ProgressBar
            value={summary.present}
            max={workerCount}
            style={styles.heroProgress}
          />

          <View
            style={styles.heroFooter}
          >
            <View
              style={styles.statusIndicator}
            >
              <View
                style={
                  styles.statusDot
                }
              />

              <Text
                style={
                  styles.heroFootnote
                }
              >
                {pending > 0
                  ? `${pending} worker${
                      pending === 1
                        ? ''
                        : 's'
                    } not marked yet`
                  : 'All active workers marked'}
              </Text>
            </View>

            <Ionicons
              name="people-outline"
              size={16}
              color={Colors.textMuted}
            />
          </View>
        </Card>
      </FadeInView>

      {/* ================================================================== */}
      {/* SHIFTS                                                             */}
      {/* ================================================================== */}

      <SectionTitle
        title="Today's shifts"
        subtitle="Attendance by shift"
      />

      <View style={styles.statsRow}>
        <ShiftCard
          name="Shift 1"
          icon="sunny"
          present={summary.shift1}
          total={workerCount}
          accent={Colors.warning}
          accentSoft={Colors.warningLight}
          style={styles.shiftCard}
        />

        <ShiftCard
          name="Shift 2"
          icon="moon"
          present={summary.shift2}
          total={workerCount}
          accent={Colors.primary}
          accentSoft={Colors.primaryLight}
          style={styles.shiftCard}
        />
      </View>

      {/* ================================================================== */}
      {/* MAIN ACTIONS                                                       */}
      {/* ================================================================== */}

      <FadeInView delay={100}>
        <View style={styles.actions}>
          <AppButton
            title="Scan Attendance"
            icon="qr-code"
            size="lg"
            style={
              isAdmin
                ? styles.scanButtonAdmin
                : styles.scanButton
            }
            onPress={() =>
              router.push(
                '/(tabs)/scan'
              )
            }
          />

          {isAdmin ? (
            <AppButton
              title="Add Worker"
              icon="person-add"
              variant="outline"
              size="lg"
              style={styles.addWorkerButton}
              onPress={() =>
                router.push(
                  '/workers/add'
                )
              }
            />
          ) : null}
        </View>
      </FadeInView>

      {/* ================================================================== */}
      {/* QUICK INFO                                                         */}
      {/* ================================================================== */}

      <FadeInView delay={150}>
        <View
          style={styles.quickInfo}
        >
          <View
            style={styles.quickInfoIcon}
          >
            <Ionicons
              name="scan-outline"
              size={18}
              color={Colors.primary}
            />
          </View>

          <View
            style={styles.quickInfoContent}
          >
            <Text
              style={
                styles.quickInfoTitle
              }
            >
              Ready to record attendance
            </Text>

            <Text
              style={
                styles.quickInfoText
              }
            >
              Select a shift and scan the
              worker's QR code.
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={18}
            color={Colors.textMuted}
          />
        </View>
      </FadeInView>

      {/* ================================================================== */}
      {/* RECENT ATTENDANCE                                                  */}
      {/* ================================================================== */}

      <SectionTitle
        title="Recent attendance"
        action={
          <Pressable
            onPress={() =>
              router.push(
                '/(tabs)/attendance'
              )
            }
            hitSlop={8}
          >
            <Text
              style={styles.linkText}
            >
              View all
            </Text>
          </Pressable>
        }
      />

      {/* ================================================================== */}
      {/* LOADING                                                            */}
      {/* ================================================================== */}

      {loading ? (
        <Card style={styles.listCard}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[
                styles.skeletonRow,
                i === 3 &&
                  styles.lastSkeletonRow,
              ]}
            >
              <Skeleton
                width={42}
                height={42}
                radius={21}
              />

              <View
                style={
                  styles.skeletonContent
                }
              >
                <Skeleton
                  width="52%"
                  height={13}
                />

                <Skeleton
                  width="36%"
                  height={10}
                />
              </View>

              <Skeleton
                width={42}
                height={10}
              />
            </View>
          ))}
        </Card>
      ) : records.length === 0 ? (
        /* ================================================================ */
        /* EMPTY STATE                                                      */
        /* ================================================================ */

        <FadeInView>
          <Card
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="qr-code-outline"
                size={28}
                color={Colors.primary}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No attendance yet
            </Text>

            <Text
              style={styles.emptyMessage}
            >
              Start scanning worker QR codes
              to record today's attendance.
            </Text>

            <AppButton
              title="Start scanning"
              icon="scan"
              variant="secondary"
              style={
                styles.emptyButton
              }
              onPress={() =>
                router.push(
                  '/(tabs)/scan'
                )
              }
            />
          </Card>
        </FadeInView>
      ) : (
        /* ================================================================ */
        /* ATTENDANCE LIST                                                  */
        /* ================================================================ */

        <FadeInView>
          <Card
            padded={false}
            style={styles.listCard}
          >
            {records
              .slice(-6)
              .reverse()
              .map(
                (
                  record,
                  index,
                  array
                ) => (
                  <AttendanceRow
                    key={record.id}
                    name={
                      record.worker
                        ?.name ??
                      'Unknown'
                    }
                    subtitle={[
                      record.worker
                        ?.worker_id,
                      record.worker
                        ?.department,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    time={new Date(
                      record.marked_at
                    ).toLocaleTimeString(
                      [],
                      {
                        hour: '2-digit',
                        minute:
                          '2-digit',
                      }
                    )}
                    badge={{
                      label:
                        record.shift
                          ?.name ??
                        'Shift',
                    }}
                    divider={
                      index <
                      array.length - 1
                    }
                  />
                )
              )}
          </Card>
        </FadeInView>
      )}
    </Screen>
  );
}

/* ========================================================================== */
/*                                   STYLES                                   */
/* ========================================================================== */

const styles = StyleSheet.create({
  /* ---------------------------------------------------------------------- */
  /* HEADER                                                                 */
  /* ---------------------------------------------------------------------- */

  header: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal:
      Spacing.lg,

    paddingTop: Spacing.md,

    paddingBottom: Spacing.xs,
  },

  headerLeft: {
    flex: 1,

    paddingRight: Spacing.md,
  },

  greeting: {
    fontSize: 12,

    color: Colors.textSecondary,

    fontWeight:
      FontWeights.medium,

    letterSpacing: 0.1,
  },

  headerName: {
    fontSize: 23,

    lineHeight: 29,

    fontWeight:
      FontWeights.heavy,

    color: Colors.text,

    letterSpacing: -0.6,

    marginTop: 1,
  },

  headerMeta: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    marginTop: 5,
  },

  headerMetaText: {
    flexShrink: 1,

    fontSize: 11,

    color: Colors.textMuted,
  },

  headerRight: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 10,
  },

  notificationButton: {
    width: 38,

    height: 38,

    borderRadius: 19,

    backgroundColor:
      Colors.surfaceSecondary,

    alignItems: 'center',

    justifyContent: 'center',

    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',

    width: 6,

    height: 6,

    borderRadius: 3,

    backgroundColor:
      Colors.danger,

    top: 8,

    right: 8,

    borderWidth: 1.5,

    borderColor:
      Colors.surfaceSecondary,
  },

  avatar: {
    width: 42,

    height: 42,

    borderRadius: 21,

    backgroundColor:
      Colors.primaryLight,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D4E9E0',
  },

  avatarText: {
    fontSize: 13,

    fontWeight:
      FontWeights.bold,

    color: Colors.primary,
  },

  roleContainer: {
    paddingHorizontal:
      Spacing.lg,

    paddingBottom: Spacing.md,
  },

  /* ---------------------------------------------------------------------- */
  /* HERO                                                                   */
  /* ---------------------------------------------------------------------- */

  heroCard: {
    padding: Spacing.xl,

    borderRadius: 20,
  },

  heroHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  heroLabel: {
    fontSize: 11,

    color: Colors.textSecondary,

    fontWeight:
      FontWeights.semibold,

    textTransform: 'uppercase',

    letterSpacing: 0.7,
  },

  heroNumberRow: {
    flexDirection: 'row',

    alignItems: 'baseline',

    marginTop: 4,
  },

  heroValue: {
    fontSize: 38,

    lineHeight: 44,

    fontWeight:
      FontWeights.heavy,

    color: Colors.text,

    letterSpacing: -1.5,
  },

  heroTotal: {
    fontSize: 17,

    fontWeight:
      FontWeights.semibold,

    color: Colors.textMuted,

    marginLeft: 3,
  },

  percentageCircle: {
    width: 68,

    height: 68,

    borderRadius: 34,

    backgroundColor:
      Colors.primaryLight,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D4E9E0',
  },

  percentageText: {
    fontSize: 17,

    lineHeight: 20,

    fontWeight:
      FontWeights.heavy,

    color: Colors.primary,
  },

  percentageLabel: {
    fontSize: 8,

    color: Colors.textSecondary,

    marginTop: 1,
  },

  heroProgress: {
    marginTop: Spacing.lg,
  },

  heroFooter: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: Spacing.md,
  },

  statusIndicator: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 7,
  },

  statusDot: {
    width: 7,

    height: 7,

    borderRadius: 4,

    backgroundColor:
      Colors.success,
  },

  heroFootnote: {
    fontSize: 11,

    color: Colors.textMuted,
  },

  /* ---------------------------------------------------------------------- */
  /* SHIFTS                                                                 */
  /* ---------------------------------------------------------------------- */

  statsRow: {
    flexDirection: 'row',

    gap: Spacing.md,
  },

  shiftCard: {
    flex: 1,
  },

  /* ---------------------------------------------------------------------- */
  /* ACTIONS                                                                */
  /* ---------------------------------------------------------------------- */

  actions: {
    flexDirection: 'row',

    gap: Spacing.md,

    marginTop: Spacing.xl,
  },

  scanButton: {
    flex: 1,
  },

  scanButtonAdmin: {
    flex: 1.45,
  },

  addWorkerButton: {
    flex: 1,
  },

  /* ---------------------------------------------------------------------- */
  /* QUICK INFO                                                             */
  /* ---------------------------------------------------------------------- */

  quickInfo: {
    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor:
      '#F0F7F3',

    borderWidth: 1,

    borderColor: '#DDECE4',

    borderRadius: 16,

    padding: 14,

    marginTop: Spacing.md,
  },

  quickInfoIcon: {
    width: 38,

    height: 38,

    borderRadius: 12,

    backgroundColor:
      '#E0F1E9',

    alignItems: 'center',

    justifyContent: 'center',
  },

  quickInfoContent: {
    flex: 1,

    marginHorizontal: 11,
  },

  quickInfoTitle: {
    fontSize: 12,

    fontWeight:
      FontWeights.semibold,

    color: Colors.text,
  },

  quickInfoText: {
    fontSize: 10,

    lineHeight: 15,

    color: Colors.textMuted,

    marginTop: 2,
  },

  /* ---------------------------------------------------------------------- */
  /* LINKS                                                                  */
  /* ---------------------------------------------------------------------- */

  linkText: {
    fontSize: 12,

    fontWeight:
      FontWeights.semibold,

    color: Colors.primary,
  },

  /* ---------------------------------------------------------------------- */
  /* LIST                                                                   */
  /* ---------------------------------------------------------------------- */

  listCard: {
    paddingHorizontal:
      Spacing.lg,

    borderRadius: 18,
  },

  /* ---------------------------------------------------------------------- */
  /* SKELETON                                                               */
  /* ---------------------------------------------------------------------- */

  skeletonRow: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: Spacing.md,

    paddingVertical:
      Spacing.md,

    borderBottomWidth: 1,

    borderBottomColor:
      Colors.border,
  },

  lastSkeletonRow: {
    borderBottomWidth: 0,
  },

  skeletonContent: {
    flex: 1,

    gap: 7,
  },

  /* ---------------------------------------------------------------------- */
  /* EMPTY                                                                  */
  /* ---------------------------------------------------------------------- */

  emptyCard: {
    alignItems: 'center',

    paddingVertical:
      Spacing.xxl,

    paddingHorizontal:
      Spacing.xl,

    borderRadius: 18,
  },

  emptyIcon: {
    width: 64,

    height: 64,

    borderRadius: 32,

    backgroundColor:
      Colors.primaryLight,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

    borderColor: '#D8EAE2',
  },

  emptyTitle: {
    fontSize: 16,

    fontWeight:
      FontWeights.bold,

    color: Colors.text,

    marginTop: Spacing.lg,
  },

  emptyMessage: {
    fontSize: 12,

    lineHeight:
      LineHeights.relaxed,

    color: Colors.textMuted,

    textAlign: 'center',

    marginTop: Spacing.xs,

    maxWidth: 280,
  },

  emptyButton: {
    marginTop: Spacing.lg,

    alignSelf: 'stretch',
  },
});