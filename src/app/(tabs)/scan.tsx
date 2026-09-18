import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  Card,
  FadeInView,
  Screen,
  ShiftOption,
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
  fetchShifts,
  summarizeToday,
  todayString,
} from '@/lib/api';

import type { Shift } from '@/lib/types';

export default function ScanScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] =
    useState<Shift | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [todayCounts, setTodayCounts] =
    useState({
      shift1: 0,
      shift2: 0,
      present: 0,
    });

  /* ---------------------------------------------------------------------- */
  /* LOAD DATA                                                              */
  /* ---------------------------------------------------------------------- */

  const load = useCallback(async () => {
    try {
      const [
        shiftData,
        attendance,
      ] = await Promise.all([
        fetchShifts(),

        fetchAttendanceForDate(
          todayString()
        ).catch(() => []),
      ]);

      setShifts(shiftData);

      setTodayCounts(
        summarizeToday(attendance)
      );
    } catch (error) {
      console.error(
        'Scan screen load error:',
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* REFRESH WHEN SCREEN GETS FOCUS                                         */
  /* ---------------------------------------------------------------------- */

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  /* ---------------------------------------------------------------------- */
  /* OPEN SCANNER                                                           */
  /* ---------------------------------------------------------------------- */

  const openScanner = () => {
    if (!selectedShift) {
      return;
    }

    router.push({
      pathname: '/scanner',
      params: {
        shiftId: selectedShift.id,
        shiftName: selectedShift.name,
      },
    });
  };

  /* ---------------------------------------------------------------------- */
  /* STATS                                                                   */
  /* ---------------------------------------------------------------------- */

  const totalPresent =
    todayCounts.shift1 +
    todayCounts.shift2;

  /* ---------------------------------------------------------------------- */
  /* DATE                                                                    */
  /* ---------------------------------------------------------------------- */

  const formattedDate =
    new Date().toLocaleDateString(
      'en-US',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }
    );

  /* ---------------------------------------------------------------------- */
  /* UI                                                                      */
  /* ---------------------------------------------------------------------- */

  return (
    <Screen
      header={
        <FadeInView>
          <AppHeader
            title="Select Shift"
            subtitle="Choose the shift for marking attendance"
            large
          />
        </FadeInView>
      }

      footer={
        <View style={styles.footerContainer}>
          {selectedShift ? (
            <View style={styles.selectedFooterInfo}>
              <View
                style={
                  styles.selectedFooterIcon
                }
              >
                <Ionicons
                  name={
                    selectedShift.shift_code ===
                    'SHIFT_1'
                      ? 'sunny'
                      : 'moon'
                  }
                  size={16}
                  color={
                    selectedShift.shift_code ===
                    'SHIFT_1'
                      ? Colors.warning
                      : Colors.primary
                  }
                />
              </View>

              <View
                style={
                  styles.selectedFooterText
                }
              >
                <Text
                  style={
                    styles.selectedFooterLabel
                  }
                >
                  Selected shift
                </Text>

                <Text
                  style={
                    styles.selectedFooterName
                  }
                  numberOfLines={1}
                >
                  {selectedShift.name}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setSelectedShift(null)
                }
                hitSlop={8}
              >
                <Text
                  style={
                    styles.changeText
                  }
                >
                  Change
                </Text>
              </Pressable>
            </View>
          ) : null}

          <AppButton
            title={
              selectedShift
                ? 'Continue to Scanner'
                : 'Select a Shift'
            }
            size="lg"
            arrow
            onPress={openScanner}
            disabled={
              !selectedShift ||
              loading
            }
          />
        </View>
      }
    >
      {/* ================================================================== */}
      {/* DATE                                                               */}
      {/* ================================================================== */}

      <FadeInView>
        <View style={styles.dateRow}>
          <View style={styles.dateIcon}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={Colors.primary}
            />
          </View>

          <View>
            <Text style={styles.dateLabel}>
              TODAY
            </Text>

            <Text style={styles.dateText}>
              {formattedDate}
            </Text>
          </View>
        </View>
      </FadeInView>

      {/* ================================================================== */}
      {/* TODAY SUMMARY                                                      */}
      {/* ================================================================== */}

      <FadeInView delay={60}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <View>
              <Text
                style={styles.summaryTitle}
              >
                Today's progress
              </Text>

              <Text
                style={styles.summarySubtitle}
              >
                Attendance recorded so far
              </Text>
            </View>

            <View style={styles.totalBadge}>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={Colors.primary}
              />

              <Text
                style={styles.totalBadgeText}
              >
                {totalPresent}
              </Text>
            </View>
          </View>

          <View style={styles.summaryStats}>
            {/* SHIFT 1 */}
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      Colors.warningLight,
                  },
                ]}
              >
                <Ionicons
                  name="sunny"
                  size={17}
                  color={Colors.warning}
                />
              </View>

              <View
                style={styles.summaryItemText}
              >
                <Text
                  style={
                    styles.summaryItemValue
                  }
                >
                  {todayCounts.shift1}
                </Text>

                <Text
                  style={
                    styles.summaryItemLabel
                  }
                >
                  Shift 1
                </Text>
              </View>
            </View>

            <View
              style={styles.summaryDivider}
            />

            {/* SHIFT 2 */}
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      Colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name="moon"
                  size={17}
                  color={Colors.primary}
                />
              </View>

              <View
                style={styles.summaryItemText}
              >
                <Text
                  style={
                    styles.summaryItemValue
                  }
                >
                  {todayCounts.shift2}
                </Text>

                <Text
                  style={
                    styles.summaryItemLabel
                  }
                >
                  Shift 2
                </Text>
              </View>
            </View>

            <View
              style={styles.summaryDivider}
            />

            {/* TOTAL */}
            <View style={styles.summaryItem}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      Colors.successLight,
                  },
                ]}
              >
                <Ionicons
                  name="people-outline"
                  size={17}
                  color={
                    Colors.successDark
                  }
                />
              </View>

              <View
                style={styles.summaryItemText}
              >
                <Text
                  style={[
                    styles.summaryItemValue,
                    {
                      color:
                        Colors.primary,
                    },
                  ]}
                >
                  {totalPresent}
                </Text>

                <Text
                  style={
                    styles.summaryItemLabel
                  }
                >
                  Total
                </Text>
              </View>
            </View>
          </View>
        </View>
      </FadeInView>

      {/* ================================================================== */}
      {/* SHIFT SECTION                                                       */}
      {/* ================================================================== */}

      <View style={styles.sectionHeader}>
        <View>
          <Text
            style={styles.sectionTitle}
          >
            Available shifts
          </Text>

          <Text
            style={styles.sectionSubtitle}
          >
            Select one to start scanning
          </Text>
        </View>

        <View style={styles.requiredBadge}>
          <Text
            style={styles.requiredText}
          >
            Required
          </Text>
        </View>
      </View>

      {/* ================================================================== */}
      {/* LOADING                                                            */}
      {/* ================================================================== */}

      {loading ? (
        <View style={styles.loadingContainer}>
          {[0, 1].map((index) => (
            <Card
              key={index}
              style={styles.skeletonCard}
            >
              <View
                style={
                  styles.skeletonTop
                }
              >
                <Skeleton
                  width={52}
                  height={52}
                  radius={16}
                />

                <View
                  style={
                    styles.skeletonContent
                  }
                >
                  <Skeleton
                    width="42%"
                    height={14}
                  />

                  <Skeleton
                    width="28%"
                    height={10}
                  />

                  <Skeleton
                    width="70%"
                    height={8}
                  />
                </View>

                <Skeleton
                  width={24}
                  height={24}
                  radius={12}
                />
              </View>

              <Skeleton
                height={6}
                radius={3}
                style={
                  styles.skeletonProgress
                }
              />
            </Card>
          ))}
        </View>
      ) : shifts.length === 0 ? (
        /* ================================================================ */
        /* EMPTY                                                            */
        /* ================================================================ */

        <FadeInView>
          <Card
            style={styles.emptyCard}
          >
            <View
              style={styles.emptyIcon}
            >
              <Ionicons
                name="time-outline"
                size={28}
                color={Colors.textMuted}
              />
            </View>

            <Text
              style={styles.emptyTitle}
            >
              No shifts configured
            </Text>

            <Text
              style={styles.emptyMessage}
            >
              Ask the admin to configure the
              shifts before scanning attendance.
            </Text>
          </Card>
        </FadeInView>
      ) : (
        /* ================================================================ */
        /* SHIFT OPTIONS                                                    */
        /* ================================================================ */

        <FadeInView delay={100}>
          <View style={styles.shiftList}>
            {shifts.map((shift) => {
              const isFirst =
                shift.shift_code ===
                'SHIFT_1';

              const isSelected =
                selectedShift?.id ===
                shift.id;

              const present =
                isFirst
                  ? todayCounts.shift1
                  : todayCounts.shift2;

              return (
                <Pressable
                  key={shift.id}
                  onPress={() =>
                    setSelectedShift(
                      shift
                    )
                  }
                  style={({ pressed }) => [
                    styles.shiftWrapper,

                    isSelected &&
                      styles.shiftWrapperSelected,

                    pressed &&
                      styles.shiftWrapperPressed,
                  ]}
                >
                  <ShiftOption
                    name={shift.name}
                    icon={
                      isFirst
                        ? 'sunny'
                        : 'moon'
                    }
                    present={present}
                    total={
                      // Keep existing data behavior.
                      // ShiftOption receives today's
                      // combined attendance total.
                      totalPresent
                    }
                    selected={
                      isSelected
                    }
                    onPress={() =>
                      setSelectedShift(
                        shift
                      )
                    }
                    accent={
                      isFirst
                        ? Colors.warning
                        : Colors.primary
                    }
                    accentSoft={
                      isFirst
                        ? Colors.warningLight
                        : Colors.primaryLight
                    }
                  />

                  {/* SELECTED CHECK */}
                  {isSelected ? (
                    <View
                      style={
                        styles.selectedCheck
                      }
                    >
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color="#FFFFFF"
                      />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </FadeInView>
      )}

      {/* ================================================================== */}
      {/* INFORMATION CARD                                                    */}
      {/* ================================================================== */}

      <FadeInView delay={160}>
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons
              name="qr-code-outline"
              size={18}
              color={Colors.primary}
            />
          </View>

          <View
            style={styles.infoContent}
          >
            <Text
              style={styles.infoTitle}
            >
              How attendance works
            </Text>

            <Text
              style={styles.infoText}
            >
              Select a shift, scan the worker's
              QR code, confirm their details,
              and mark attendance.
            </Text>
          </View>
        </View>
      </FadeInView>
    </Screen>
  );
}

/* ========================================================================== */
/*                                   STYLES                                   */
/* ========================================================================== */

const styles = StyleSheet.create({
  /* ---------------------------------------------------------------------- */
  /* FOOTER                                                                 */
  /* ---------------------------------------------------------------------- */

  footerContainer: {
    paddingTop: Spacing.sm,
  },

  selectedFooterInfo: {
    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor:
      Colors.primaryLight,

    borderWidth: 1,
    borderColor: '#D6EAE2',

    borderRadius: 14,

    paddingHorizontal: 12,
    paddingVertical: 10,

    marginBottom: 10,
  },

  selectedFooterIcon: {
    width: 34,
    height: 34,

    borderRadius: 11,

    backgroundColor:
      Colors.surface,

    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedFooterText: {
    flex: 1,

    marginLeft: 10,
  },

  selectedFooterLabel: {
    fontSize: 9,

    color: Colors.textMuted,

    textTransform: 'uppercase',

    letterSpacing: 0.5,

    fontWeight:
      FontWeights.semibold,
  },

  selectedFooterName: {
    fontSize: 13,

    color: Colors.text,

    fontWeight:
      FontWeights.bold,

    marginTop: 1,
  },

  changeText: {
    fontSize: 11,

    color: Colors.primary,

    fontWeight:
      FontWeights.semibold,
  },

  /* ---------------------------------------------------------------------- */
  /* DATE                                                                   */
  /* ---------------------------------------------------------------------- */

  dateRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginBottom: Spacing.lg,
  },

  dateIcon: {
    width: 38,
    height: 38,

    borderRadius: 12,

    backgroundColor:
      Colors.primaryLight,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 10,
  },

  dateLabel: {
    fontSize: 9,

    color: Colors.textMuted,

    letterSpacing: 0.8,

    fontWeight:
      FontWeights.bold,
  },

  dateText: {
    fontSize: 12,

    color: Colors.text,

    fontWeight:
      FontWeights.semibold,

    marginTop: 2,
  },

  /* ---------------------------------------------------------------------- */
  /* SUMMARY                                                                */
  /* ---------------------------------------------------------------------- */

  summaryContainer: {
    backgroundColor:
      Colors.surface,

    borderRadius: 18,

    borderWidth: 1,

    borderColor:
      Colors.border,

    padding: 16,
  },

  summaryHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginBottom: 15,
  },

  summaryTitle: {
    fontSize: 14,

    fontWeight:
      FontWeights.bold,

    color: Colors.text,
  },

  summarySubtitle: {
    fontSize: 10,

    color: Colors.textMuted,

    marginTop: 3,
  },

  totalBadge: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: 5,

    backgroundColor:
      Colors.primaryLight,

    paddingHorizontal: 9,

    paddingVertical: 6,

    borderRadius: 20,
  },

  totalBadgeText: {
    fontSize: 12,

    color: Colors.primary,

    fontWeight:
      FontWeights.bold,
  },

  summaryStats: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',
  },

  summaryItem: {
    flex: 1,

    flexDirection: 'row',

    alignItems: 'center',
  },

  summaryIcon: {
    width: 34,
    height: 34,

    borderRadius: 10,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 8,
  },

  summaryItemText: {
    flex: 1,
  },

  summaryItemValue: {
    fontSize: 17,

    fontWeight:
      FontWeights.heavy,

    color: Colors.text,

    letterSpacing: -0.3,
  },

  summaryItemLabel: {
    fontSize: 9,

    color: Colors.textMuted,

    marginTop: 1,
  },

  summaryDivider: {
    width: 1,

    height: 30,

    backgroundColor:
      Colors.border,

    marginHorizontal: 5,
  },

  /* ---------------------------------------------------------------------- */
  /* SECTION                                                                */
  /* ---------------------------------------------------------------------- */

  sectionHeader: {
    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    marginTop: Spacing.xxl,

    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: 17,

    fontWeight:
      FontWeights.bold,

    color: Colors.text,

    letterSpacing: -0.2,
  },

  sectionSubtitle: {
    fontSize: 11,

    color: Colors.textMuted,

    marginTop: 3,
  },

  requiredBadge: {
    backgroundColor:
      Colors.surfaceSecondary,

    borderRadius: 20,

    paddingHorizontal: 9,

    paddingVertical: 5,
  },

  requiredText: {
    fontSize: 9,

    color: Colors.textMuted,

    fontWeight:
      FontWeights.semibold,
  },

  /* ---------------------------------------------------------------------- */
  /* SHIFTS                                                                 */
  /* ---------------------------------------------------------------------- */

  shiftList: {
    gap: 12,
  },

  shiftWrapper: {
    position: 'relative',

    borderRadius: 17,
  },

  shiftWrapperSelected: {
    // Gives the selected ShiftOption a soft surrounding
    // emphasis without adding heavy shadows.
    backgroundColor:
      Colors.primaryLight,

    padding: 2,

    margin: -2,
  },

  shiftWrapperPressed: {
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  selectedCheck: {
    position: 'absolute',

    top: 13,

    right: 13,

    width: 25,

    height: 25,

    borderRadius: 13,

    backgroundColor:
      Colors.primary,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 2,

    borderColor:
      Colors.surface,
  },

  /* ---------------------------------------------------------------------- */
  /* LOADING                                                                */
  /* ---------------------------------------------------------------------- */

  loadingContainer: {
    gap: Spacing.md,
  },

  skeletonCard: {
    padding: Spacing.lg,

    borderRadius: 17,
  },

  skeletonTop: {
    flexDirection: 'row',

    alignItems: 'center',

    gap: Spacing.md,
  },

  skeletonContent: {
    flex: 1,

    gap: 6,
  },

  skeletonProgress: {
    marginTop: Spacing.lg,
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
    width: 62,

    height: 62,

    borderRadius: 31,

    backgroundColor:
      Colors.surfaceSecondary,

    alignItems: 'center',

    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 16,

    fontWeight:
      FontWeights.bold,

    color: Colors.text,

    marginTop: Spacing.md,
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

  /* ---------------------------------------------------------------------- */
  /* INFO                                                                   */
  /* ---------------------------------------------------------------------- */

  infoCard: {
    flexDirection: 'row',

    alignItems: 'flex-start',

    backgroundColor:
      '#F0F7F3',

    borderWidth: 1,

    borderColor:
      '#DCEBE4',

    borderRadius: 16,

    padding: 14,

    marginTop: Spacing.xl,

    marginBottom: Spacing.md,
  },

  infoIcon: {
    width: 36,

    height: 36,

    borderRadius: 11,

    backgroundColor:
      '#E2F1EA',

    alignItems: 'center',

    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,

    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 12,

    fontWeight:
      FontWeights.bold,

    color: Colors.text,
  },

  infoText: {
    fontSize: 10.5,

    lineHeight: 16,

    color: Colors.textSecondary,

    marginTop: 3,
  },
});