import { Ionicons } from '@expo/vector-icons';
import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
  AppHeader,
  EmptyState,
  Screen,
  SectionTitle,
} from '@/components/ui';

import {
  Colors,
  FontSizes,
  Spacing,
} from '@/constants/theme';

import {
  currentMonth,
  deleteWorker,
  fetchWorkerByWorkerId,
  fetchWorkerMonthAttendance,
  monthLabel,
  shiftMonth,
  updateWorker,
} from '@/lib/api';

import { useAuth } from '@/lib/auth';
import type { Worker } from '@/lib/types';

type ShiftFilter =
  | 'all'
  | 'SHIFT_1'
  | 'SHIFT_2';

export default function WorkerDetailScreen() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const { profile } = useAuth();

  const canManage =
    profile?.role === 'admin' ||
    profile?.role === 'supervisor';

  const [worker, setWorker] =
    useState<Worker | null>(null);

  const [month, setMonth] =
    useState(currentMonth());

  const [shiftFilter, setShiftFilter] =
    useState<ShiftFilter>('all');

  const [records, setRecords] = useState<
    Awaited<
      ReturnType<
        typeof fetchWorkerMonthAttendance
      >
    >
  >([]);

  /*
   * Initial worker loading only.
   *
   * This is intentionally NOT set back to true
   * whenever the screen gets focus.
   */
  const [loadingWorker, setLoadingWorker] =
    useState(true);

  /*
   * Attendance has its own loading state.
   *
   * This means changing the month doesn't
   * blank the entire screen.
   */
  const [loadingAttendance, setLoadingAttendance] =
    useState(false);

  const [notFound, setNotFound] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [updateError, setUpdateError] =
    useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  const [deleting, setDeleting] =
    useState(false);

  /*
   * =========================================================
   * LOAD WORKER
   * =========================================================
   *
   * Worker data is loaded independently.
   *
   * We do NOT show the full-screen loader again
   * when the screen comes back into focus.
   */

  const loadWorker = useCallback(
    async () => {
      if (!id) {
        setNotFound(true);
        setLoadingWorker(false);
        return null;
      }

      try {
        const result =
          await fetchWorkerByWorkerId(
            id,
          );

        if (!result) {
          setNotFound(true);
          setWorker(null);
          return null;
        }

        setNotFound(false);
        setWorker(result);

        return result;
      } catch (error) {
        console.error(
          'Failed to load worker:',
          error,
        );

        if (!worker) {
          setNotFound(true);
        }

        return null;
      } finally {
        setLoadingWorker(false);
      }
    },
    [id],
  );

  /*
   * =========================================================
   * LOAD ATTENDANCE
   * =========================================================
   */

  const loadAttendance = useCallback(
    async (
      currentWorker: Worker,
      currentMonthValue: string,
      showLoader = true,
    ) => {
      if (showLoader) {
        setLoadingAttendance(true);
      }

      try {
        const attendance =
          await fetchWorkerMonthAttendance(
            currentWorker.id,
            currentMonthValue,
          );

        setRecords(attendance);
      } catch (error) {
        console.error(
          'Failed to load attendance:',
          error,
        );

        setRecords([]);
      } finally {
        if (showLoader) {
          setLoadingAttendance(false);
        }
      }
    },
    [],
  );

  /*
   * =========================================================
   * INITIAL / FOCUS LOAD
   * =========================================================
   *
   * If worker already exists, don't show the full-screen
   * loading screen again.
   */

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refresh = async () => {
        /*
         * If worker doesn't exist yet,
         * load it first.
         */
        if (!worker) {
          const loadedWorker =
            await loadWorker();

          if (
            active &&
            loadedWorker
          ) {
            await loadAttendance(
              loadedWorker,
              month,
              true,
            );
          }

          return;
        }

        /*
         * Worker is already visible.
         *
         * Refresh silently when returning
         * to this screen.
         */
        const refreshedWorker =
          await loadWorker();

        if (
          active &&
          refreshedWorker
        ) {
          await loadAttendance(
            refreshedWorker,
            month,
            false,
          );
        }
      };

      refresh();

      return () => {
        active = false;
      };
    }, [
      worker,
      loadWorker,
      loadAttendance,
      month,
    ]),
  );

  /*
   * =========================================================
   * MONTH CHANGE
   * =========================================================
   *
   * Only attendance is reloaded.
   *
   * Worker details remain on screen.
   */

  const changeMonth = useCallback(
    async (
      nextMonth: string,
    ) => {
      setMonth(nextMonth);

      if (!worker) return;

      await loadAttendance(
        worker,
        nextMonth,
        true,
      );
    },
    [
      worker,
      loadAttendance,
    ],
  );

  /*
   * =========================================================
   * FILTER ATTENDANCE LOCALLY
   * =========================================================
   *
   * No API call happens here.
   *
   * Therefore Shift 1 / Shift 2 switching
   * is immediate.
   */

  const dayRows = useMemo(() => {
    const byDate = new Map<
      string,
      string[]
    >();

    for (const record of records) {
      const shiftCode =
        record.shift?.shift_code;

      if (
        shiftFilter !== 'all' &&
        shiftCode !== shiftFilter
      ) {
        continue;
      }

      const shift =
        shiftCode ?? 'UNKNOWN';

      const existing =
        byDate.get(
          record.attendance_date,
        ) ?? [];

      if (!existing.includes(shift)) {
        existing.push(shift);
      }

      byDate.set(
        record.attendance_date,
        existing,
      );
    }

    return Array.from(
      byDate.entries(),
    )
      .map(([date, shifts]) => ({
        date,
        shifts: shifts.sort(),
      }))
      .sort((a, b) =>
        b.date.localeCompare(a.date),
      );
  }, [records, shiftFilter]);

  /*
   * =========================================================
   * DATE FORMAT
   * =========================================================
   */

  const prettyDate = (
    date: string,
  ) => {
    return new Date(
      `${date}T00:00:00`,
    ).toLocaleDateString([], {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  };

  /*
   * =========================================================
   * INITIALS
   * =========================================================
   */

  const getInitials = (
    name: string,
  ) => {
    const parts =
      name.trim().split(/\s+/);

    if (parts.length === 1) {
      return parts[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return `${parts[0][0]}${
      parts[parts.length - 1][0]
    }`.toUpperCase();
  };

  /*
   * =========================================================
   * ACTIVATE / DEACTIVATE
   * =========================================================
   */

  const toggleActive = async () => {
    if (!worker) return;

    setUpdateError(null);
    setUpdating(true);

    try {
      const updated =
        await updateWorker(
          worker.id,
          {
            active:
              !worker.active,
          },
        );

      /*
       * If updateWorker returns the updated
       * worker, use it.
       *
       * Otherwise update local state manually.
       */
      if (updated) {
        setWorker(
          updated as Worker,
        );
      } else {
        setWorker(
          (current) =>
            current
              ? {
                  ...current,
                  active:
                    !current.active,
                }
              : current,
        );
      }
    } catch (error) {
      console.error(
        'Failed to update worker:',
        error,
      );

      setUpdateError(
        'Could not update the worker.',
      );
    } finally {
      setUpdating(false);
    }
  };

  /*
   * =========================================================
   * DELETE WORKER
   * =========================================================
   */

  const handleDelete = async () => {
    if (!worker) return;

    if (!confirmDelete) {
      setConfirmDelete(true);

      setTimeout(() => {
        setConfirmDelete(false);
      }, 5000);

      return;
    }

    setDeleting(true);
    setUpdateError(null);

    try {
      await deleteWorker(
        worker.id,
      );

      router.replace(
        '/(tabs)/workers',
      );
    } catch (error) {
      console.error(
        'Failed to delete worker:',
        error,
      );

      setConfirmDelete(false);

      setUpdateError(
        'Could not delete the worker.',
      );
    } finally {
      setDeleting(false);
    }
  };

  /*
   * =========================================================
   * INITIAL LOADING ONLY
   * =========================================================
   */

  if (
    loadingWorker &&
    !worker
  ) {
    return (
      <Screen
        header={
          <AppHeader
            title="Worker Details"
            onBack={() =>
              router.back()
            }
          />
        }
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={
              styles.loadingTitle
            }
          >
            Loading worker
          </Text>

          <Text
            style={
              styles.loadingText
            }
          >
            Fetching worker details…
          </Text>
        </View>
      </Screen>
    );
  }

  /*
   * =========================================================
   * NOT FOUND
   * =========================================================
   */

  if (
    notFound ||
    !worker
  ) {
    return (
      <Screen
        header={
          <AppHeader
            title="Worker Details"
            onBack={() =>
              router.back()
            }
          />
        }
      >
        <View
          style={
            styles.emptyWrapper
          }
        >
          <EmptyState
            icon="person-outline"
            title="Worker not found"
            message="This Worker ID does not exist in the system."
          />

          <AppButton
            title="Go Back"
            icon="arrow-back-outline"
            variant="outline"
            onPress={() =>
              router.back()
            }
            style={
              styles.emptyButton
            }
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      header={
        <AppHeader
          title="Worker Details"
          onBack={() =>
            router.back()
          }
        />
      }
    >
      {/* =====================================================
          WORKER DETAILS
      ====================================================== */}

      <View
        style={styles.profileCard}
      >
        {/* HEADER */}

        <View
          style={styles.profileTop}
        >
          <View
            style={styles.avatar}
          >
            <Text
              style={
                styles.avatarText
              }
            >
              {getInitials(
                worker.name,
              )}
            </Text>
          </View>

          <View
            style={
              styles.profileIdentity
            }
          >
            <Text
              style={styles.name}
              numberOfLines={1}
            >
              {worker.name}
            </Text>

            <Text
              style={
                styles.workerId
              }
            >
              {worker.worker_id}
            </Text>
          </View>

          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  worker.active
                    ? Colors.success
                    : Colors.textMuted,
              },
            ]}
          />
        </View>

        {/* DIVIDER */}

        <View
          style={
            styles.profileDivider
          }
        />

        {/* DETAILS */}

        <View
          style={
            styles.workerDetailsGrid
          }
        >
          <View
            style={
              styles.workerDetail
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              DEPARTMENT
            </Text>

            <Text
              style={
                styles.detailValue
              }
              numberOfLines={1}
            >
              {worker.department ??
                '—'}
            </Text>
          </View>

          <View
            style={
              styles.workerDetail
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              DESIGNATION
            </Text>

            <Text
              style={
                styles.detailValue
              }
              numberOfLines={1}
            >
              {worker.designation ??
                '—'}
            </Text>
          </View>

          <View
            style={
              styles.workerDetail
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              PHONE
            </Text>

            <Text
              style={
                styles.detailValue
              }
              numberOfLines={1}
            >
              {worker.phone ??
                '—'}
            </Text>
          </View>

          <View
            style={
              styles.workerDetail
            }
          >
            <Text
              style={
                styles.detailLabel
              }
            >
              JOINING DATE
            </Text>

            <Text
              style={
                styles.detailValue
              }
              numberOfLines={1}
            >
              {worker.joining_date ??
                '—'}
            </Text>
          </View>
        </View>

        {/* STATUS + EDIT */}

        <View
          style={
            styles.profileBottom
          }
        >
          <View
            style={[
              styles.statusBadge,
              worker.active
                ? styles.activeStatus
                : styles.inactiveStatus,
            ]}
          >
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor:
                    worker.active
                      ? Colors.success
                      : Colors.textMuted,
                },
              ]}
            />

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    worker.active
                      ? Colors.success
                      : Colors.textMuted,
                },
              ]}
            >
              {worker.active
                ? 'Active worker'
                : 'Inactive worker'}
            </Text>
          </View>

          {canManage ? (
            <Pressable
              onPress={() =>
                router.push(
                  `/workers/${worker.worker_id}/edit`,
                )
              }
              style={
                styles.editButton
              }
              hitSlop={8}
            >
              <Ionicons
                name="create-outline"
                size={15}
                color={
                  Colors.primary
                }
              />

              <Text
                style={
                  styles.editButtonText
                }
              >
                Edit
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* =====================================================
          ATTENDANCE HISTORY
      ====================================================== */}

      <View
        style={
          styles.historySectionHeader
        }
      >
        <View
          style={
            styles.historyHeading
          }
        >
          <Text
            style={
              styles.historyTitle
            }
          >
            Attendance History
          </Text>

          <Text
            style={
              styles.historySubtitle
            }
          >
            View attendance by month
            and shift
          </Text>
        </View>

        <Pressable
          onPress={() =>
            router.push(
              `/attendance/history?worker=${worker.worker_id}`,
            )
          }
          style={
            styles.fullHistoryButton
          }
          hitSlop={8}
        >
          <Text
            style={
              styles.fullHistoryButtonText
            }
          >
            View all
          </Text>

          <Ionicons
            name="chevron-forward"
            size={15}
            color={
              Colors.primary
            }
          />
        </Pressable>
      </View>

      {/* PERIOD */}

      <View
        style={
          styles.periodRow
        }
      >
        <View>
          <Text
            style={
              styles.periodLabel
            }
          >
            ATTENDANCE PERIOD
          </Text>

          <Text
            style={
              styles.periodValue
            }
          >
            {monthLabel(month)}
          </Text>
        </View>

        <View
          style={
            styles.monthControls
          }
        >
          <Pressable
            onPress={() =>
              changeMonth(
                shiftMonth(
                  month,
                  -1,
                ),
              )
            }
            style={
              styles.monthButton
            }
            hitSlop={8}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={
                Colors.text
              }
            />
          </Pressable>

          <Pressable
            onPress={() =>
              changeMonth(
                shiftMonth(
                  month,
                  1,
                ),
              )
            }
            style={
              styles.monthButton
            }
            hitSlop={8}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                Colors.text
              }
            />
          </Pressable>
        </View>
      </View>

      {/* FILTERS */}

      <View
        style={
          styles.filterContainer
        }
      >
        {(
          [
            'all',
            'SHIFT_1',
            'SHIFT_2',
          ] as ShiftFilter[]
        ).map((filter) => {
          const active =
            shiftFilter === filter;

          return (
            <Pressable
              key={filter}
              onPress={() =>
                setShiftFilter(
                  filter,
                )
              }
              style={[
                styles.filterPill,
                active &&
                  styles.filterPillActive,
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  active &&
                    styles.filterLabelActive,
                ]}
              >
                {filter === 'all'
                  ? 'All shifts'
                  : filter ===
                      'SHIFT_1'
                    ? 'Shift 1'
                    : 'Shift 2'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* SMALL ATTENDANCE LOADER */}

      {loadingAttendance ? (
        <View
          style={
            styles.attendanceLoading
          }
        >
          <Text
            style={
              styles.attendanceLoadingText
            }
          >
            Loading attendance…
          </Text>
        </View>
      ) : dayRows.length === 0 ? (
        <View
          style={
            styles.emptyAttendanceCard
          }
        >
          <EmptyState
            icon="calendar-outline"
            title="No attendance"
            message={`No ${
              shiftFilter ===
              'all'
                ? ''
                : 'matching '
            }attendance recorded in ${monthLabel(
              month,
            )}.`}
          />
        </View>
      ) : (
        <View
          style={
            styles.attCard
          }
        >
          {dayRows.map(
            (
              day,
              index,
            ) => (
              <View
                key={
                  day.date
                }
                style={[
                  styles.attRow,
                  index > 0 &&
                    styles.attRowBorder,
                ]}
              >
                <View
                  style={
                    styles.dateBlock
                  }
                >
                  <View
                    style={
                      styles.dateBox
                    }
                  >
                    <Text
                      style={
                        styles.dateNumber
                      }
                    >
                      {new Date(
                        `${day.date}T00:00:00`,
                      ).getDate()}
                    </Text>

                    <Text
                      style={
                        styles.dateMonth
                      }
                    >
                      {new Date(
                        `${day.date}T00:00:00`,
                      ).toLocaleDateString(
                        [],
                        {
                          month:
                            'short',
                        },
                      )}
                    </Text>
                  </View>

                  <View
                    style={
                      styles.attTextBlock
                    }
                  >
                    <Text
                      style={
                        styles.attDate
                      }
                      numberOfLines={
                        1
                      }
                    >
                      {prettyDate(
                        day.date,
                      )}
                    </Text>

                    <Text
                      style={
                        styles.attSubtext
                      }
                    >
                      Attendance
                      recorded
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.attBadges
                  }
                >
                  {day.shifts.map(
                    (shift) => {
                      const shiftOne =
                        shift ===
                        'SHIFT_1';

                      return (
                        <View
                          key={
                            shift
                          }
                          style={[
                            styles.shiftBadge,
                            shiftOne
                              ? styles.shiftOneBadge
                              : styles.shiftTwoBadge,
                          ]}
                        >
                          <Text
                            style={[
                              styles.shiftBadgeText,
                              {
                                color:
                                  shiftOne
                                    ? Colors.warning
                                    : Colors.primary,
                              },
                            ]}
                          >
                            {shiftOne
                              ? 'Shift 1'
                              : 'Shift 2'}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </View>
              </View>
            ),
          )}
        </View>
      )}

      {/* =====================================================
          MANAGEMENT
      ====================================================== */}

      {canManage ? (
        <>
          <SectionTitle
            title="Management"
            subtitle="Worker account controls"
          />

          <View
            style={
              styles.actionCard
            }
          >
            <View
              style={
                styles.actionHeader
              }
            >
              <Text
                style={
                  styles.actionTitle
                }
              >
                Quick actions
              </Text>

              <Text
                style={
                  styles.actionSubtitle
                }
              >
                Manage worker access and
                identification.
              </Text>
            </View>

            <AppButton
              title="QR Code"
              icon="qr-code"
              onPress={() =>
                router.push(
                  `/workers/${worker.worker_id}/qr`,
                )
              }
            />

            {updateError ? (
              <View
                style={
                  styles.errorBox
                }
              >
                <Text
                  style={
                    styles.updateError
                  }
                >
                  {updateError}
                </Text>
              </View>
            ) : null}

            <View
              style={
                styles.managementDivider
              }
            />

            <AppButton
              title={
                worker.active
                  ? 'Deactivate Worker'
                  : 'Activate Worker'
              }
              icon={
                worker.active
                  ? 'ban'
                  : 'checkmark-circle'
              }
              variant={
                worker.active
                  ? 'danger'
                  : 'secondary'
              }
              onPress={
                toggleActive
              }
              loading={
                updating
              }
            />
          </View>

          {/* =================================================
              DANGER ZONE
          ================================================== */}

          <View
            style={
              styles.dangerZone
            }
          >
            <Text
              style={
                styles.dangerTitle
              }
            >
              Danger zone
            </Text>

            <Text
              style={
                styles.dangerDescription
              }
            >
              Removing a worker
              cannot be easily undone.
            </Text>

            <AppButton
              title={
                confirmDelete
                  ? 'Tap again to confirm delete'
                  : 'Delete Worker'
              }
              icon={
                confirmDelete
                  ? 'warning'
                  : 'trash-outline'
              }
              variant="danger"
              onPress={
                handleDelete
              }
              loading={
                deleting
              }
              style={
                styles.deleteButton
              }
            />

            <Text
              style={
                styles.deleteHint
              }
            >
              Deleting a worker hides
              them everywhere, but
              their past attendance
              records are kept.
            </Text>
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  /*
   * LOADING
   */

  loadingContainer: {
    alignItems: 'center',
    paddingTop:
      Spacing.xxl * 2,
    paddingHorizontal:
      Spacing.xl,
  },

  loadingTitle: {
    fontSize:
      FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 5,
  },

  loadingText: {
    color:
      Colors.textMuted,
    fontSize:
      FontSizes.sm,
    textAlign: 'center',
  },

  /*
   * EMPTY
   */

  emptyWrapper: {
    paddingTop:
      Spacing.xl,
  },

  emptyButton: {
    marginTop:
      Spacing.md,
  },

  /*
   * WORKER DETAILS
   */

  profileCard: {
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 18,
    padding:
      Spacing.lg,
    marginBottom:
      Spacing.xl,
  },

  profileTop: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor:
      Colors.primary,
    alignItems:
      'center',
    justifyContent:
      'center',
    marginRight:
      Spacing.md,
  },

  avatarText: {
    color:
      Colors.white,
    fontSize: 21,
    fontWeight:
      '800',
  },

  profileIdentity: {
    flex: 1,
  },

  name: {
    fontSize:
      FontSizes.xl,
    fontWeight:
      '800',
    color:
      Colors.text,
    marginBottom: 5,
  },

  workerId: {
    fontSize:
      FontSizes.sm,
    fontWeight:
      '600',
    color:
      Colors.textMuted,
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  profileDivider: {
    height: 1,
    backgroundColor:
      Colors.border,
    marginVertical:
      Spacing.lg,
  },

  workerDetailsGrid: {
    flexDirection:
      'row',
    flexWrap:
      'wrap',
    rowGap:
      Spacing.lg,
  },

  workerDetail: {
    width: '50%',
    paddingRight:
      Spacing.md,
  },

  detailLabel: {
    fontSize: 10,
    fontWeight:
      '800',
    letterSpacing:
      0.8,
    color:
      Colors.textMuted,
    marginBottom: 4,
  },

  detailValue: {
    fontSize:
      FontSizes.sm,
    fontWeight:
      '700',
    color:
      Colors.text,
  },

  /*
   * PROFILE BOTTOM
   */

  profileBottom: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginTop:
      Spacing.lg,
  },

  statusBadge: {
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    gap: 7,
  },

  activeStatus: {
    backgroundColor:
      Colors.successLight,
  },

  inactiveStatus: {
    backgroundColor:
      Colors.background,
  },

  statusIndicator: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },

  statusText: {
    fontSize:
      FontSizes.xs,
    fontWeight:
      '700',
  },

  editButton: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor:
      Colors.primaryLight,
  },

  editButtonText: {
    fontSize:
      FontSizes.xs,
    fontWeight:
      '800',
    color:
      Colors.primary,
  },

  /*
   * ATTENDANCE HEADER
   */

  historySectionHeader: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    marginBottom:
      Spacing.md,
  },

  historyHeading: {
    flex: 1,
    paddingRight:
      Spacing.md,
  },

  historyTitle: {
    fontSize:
      FontSizes.lg,
    fontWeight:
      '800',
    color:
      Colors.text,
  },

  historySubtitle: {
    fontSize:
      FontSizes.xs,
    color:
      Colors.textMuted,
    marginTop: 3,
  },

  fullHistoryButton: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap: 3,
    paddingVertical: 6,
    paddingLeft: 8,
  },

  fullHistoryButtonText: {
    fontSize:
      FontSizes.xs,
    fontWeight:
      '700',
    color:
      Colors.primary,
  },

  /*
   * PERIOD
   */

  periodRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 14,
    paddingHorizontal:
      Spacing.md,
    paddingVertical: 12,
    marginBottom:
      Spacing.sm,
  },

  periodLabel: {
    fontSize: 9,
    fontWeight:
      '800',
    letterSpacing:
      0.9,
    color:
      Colors.textMuted,
    marginBottom: 3,
  },

  periodValue: {
    fontSize:
      FontSizes.md,
    fontWeight:
      '800',
    color:
      Colors.text,
  },

  monthControls: {
    flexDirection:
      'row',
    gap:
      Spacing.xs,
  },

  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor:
      Colors.background,
    borderWidth: 1,
    borderColor:
      Colors.border,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  /*
   * FILTERS
   */

  filterContainer: {
    flexDirection:
      'row',
    gap:
      Spacing.sm,
    marginBottom:
      Spacing.md,
  },

  filterPill: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
  },

  filterPillActive: {
    backgroundColor:
      Colors.primary,
    borderColor:
      Colors.primary,
  },

  filterLabel: {
    fontSize:
      FontSizes.xs,
    fontWeight:
      '700',
    color:
      Colors.textSecondary,
  },

  filterLabelActive: {
    color:
      Colors.white,
  },

  /*
   * ATTENDANCE LOADING
   */

  attendanceLoading: {
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 16,
    paddingVertical:
      Spacing.xl,
    alignItems:
      'center',
  },

  attendanceLoadingText: {
    fontSize:
      FontSizes.sm,
    color:
      Colors.textMuted,
    fontWeight:
      '600',
  },

  /*
   * ATTENDANCE RECORDS
   */

  emptyAttendanceCard: {
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 16,
    paddingVertical:
      Spacing.md,
  },

  attCard: {
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 16,
    paddingHorizontal:
      Spacing.md,
    paddingVertical: 2,
  },

  attRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    paddingVertical: 13,
  },

  attRowBorder: {
    borderTopWidth: 1,
    borderTopColor:
      Colors.border,
  },

  dateBlock: {
    flexDirection:
      'row',
    alignItems:
      'center',
    flex: 1,
    gap:
      Spacing.sm,
  },

  dateBox: {
    width: 43,
    height: 45,
    borderRadius: 12,
    backgroundColor:
      Colors.background,
    alignItems:
      'center',
    justifyContent:
      'center',
    borderWidth: 1,
    borderColor:
      Colors.border,
  },

  dateNumber: {
    fontSize: 16,
    fontWeight:
      '800',
    color:
      Colors.text,
    lineHeight: 18,
  },

  dateMonth: {
    fontSize: 9,
    fontWeight:
      '800',
    color:
      Colors.primary,
    textTransform:
      'uppercase',
  },

  attTextBlock: {
    flex: 1,
  },

  attDate: {
    fontSize:
      FontSizes.sm,
    fontWeight:
      '700',
    color:
      Colors.text,
    marginBottom: 3,
  },

  attSubtext: {
    fontSize: 10,
    color:
      Colors.textMuted,
  },

  attBadges: {
    flexDirection:
      'row',
    gap: 5,
    marginLeft:
      Spacing.sm,
  },

  shiftBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
  },

  shiftOneBadge: {
    backgroundColor:
      Colors.warningLight,
  },

  shiftTwoBadge: {
    backgroundColor:
      Colors.primaryLight,
  },

  shiftBadgeText: {
    fontSize: 10,
    fontWeight:
      '800',
  },

  /*
   * MANAGEMENT
   */

  actionCard: {
    backgroundColor:
      Colors.card,
    borderWidth: 1,
    borderColor:
      Colors.border,
    borderRadius: 16,
    padding:
      Spacing.md,
    marginBottom:
      Spacing.md,
  },

  actionHeader: {
    marginBottom:
      Spacing.md,
  },

  actionTitle: {
    fontSize:
      FontSizes.md,
    fontWeight:
      '800',
    color:
      Colors.text,
  },

  actionSubtitle: {
    fontSize:
      FontSizes.xs,
    color:
      Colors.textMuted,
    marginTop: 3,
  },

  managementDivider: {
    height: 1,
    backgroundColor:
      Colors.border,
    marginVertical:
      Spacing.md,
  },

  errorBox: {
    backgroundColor:
      Colors.dangerLight,
    borderRadius: 11,
    padding: 11,
    marginTop:
      Spacing.md,
  },

  updateError: {
    color:
      Colors.danger,
    fontSize:
      FontSizes.xs,
    fontWeight:
      '600',
  },

  /*
   * DANGER ZONE
   */

  dangerZone: {
    borderWidth: 1,
    borderColor:
      Colors.dangerLight,
    backgroundColor:
      Colors.dangerLight,
    borderRadius: 16,
    padding:
      Spacing.md,
    marginBottom:
      Spacing.xl,
  },

  dangerTitle: {
    color:
      Colors.danger,
    fontSize:
      FontSizes.md,
    fontWeight:
      '800',
  },

  dangerDescription: {
    color:
      Colors.textMuted,
    fontSize:
      FontSizes.xs,
    marginTop: 3,
  },

  deleteButton: {
    marginTop:
      Spacing.md,
  },

  deleteHint: {
    color:
      Colors.textMuted,
    fontSize:
      FontSizes.xs,
    lineHeight: 17,
    textAlign:
      'center',
    marginTop:
      Spacing.sm,
    paddingHorizontal:
      Spacing.sm,
  },
});