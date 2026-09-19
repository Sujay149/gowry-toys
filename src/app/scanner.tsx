import { Ionicons } from '@expo/vector-icons';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppButton,
  Avatar,
  Badge,
  Card,
  DetailRow,
  IconButton,
  StatusHero,
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
  fetchWorkerByWorkerId,
  markAttendance,
  todayString,
} from '@/lib/api';

import { decodeWorkerQr } from '@/lib/qr';
import type {
  Shift,
  Worker,
} from '@/lib/types';

type Stage =
  | 'scanning'
  | 'confirming'
  | 'success'
  | 'duplicate'
  | 'error';

interface ErrorInfo {
  code: string;
  message: string;
}

/* ========================================================================== */
/* SCAN FRAME                                                                 */
/* ========================================================================== */

function ScanFrame({
  color,
}: {
  color: string;
}) {
  const breathe = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(
            Easing.ease
          ),
          useNativeDriver: true,
        }),

        Animated.timing(breathe, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(
            Easing.ease
          ),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    return () => loop.stop();
  }, [breathe]);

  const scale = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.025],
  });

  const opacity = breathe.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1],
  });

  return (
    <View
      style={styles.frameArea}
      pointerEvents="none"
    >
      <Animated.View
        style={[
          styles.frameBox,
          {
            transform: [{ scale }],
            opacity,
          },
        ]}
      >
        <View
          style={[
            styles.frameGlow,
            {
              borderColor: color,
            },
          ]}
        />

        <View
          style={[
            styles.corner,
            styles.cornerTL,
            { borderColor: color },
          ]}
        />

        <View
          style={[
            styles.corner,
            styles.cornerTR,
            { borderColor: color },
          ]}
        />

        <View
          style={[
            styles.corner,
            styles.cornerBL,
            { borderColor: color },
          ]}
        />

        <View
          style={[
            styles.corner,
            styles.cornerBR,
            { borderColor: color },
          ]}
        />

        <View style={styles.qrCenter}>
          <Ionicons
            name="qr-code-outline"
            size={76}
            color="rgba(255,255,255,0.18)"
          />
        </View>

        <Animated.View
          style={[
            styles.scanLine,
            {
              backgroundColor: color,
              opacity,
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

/* ========================================================================== */
/* STATUS COLOR                                                               */
/* ========================================================================== */

function statusColor(stage: Stage) {
  if (stage === 'success') {
    return Colors.success;
  }

  if (
    stage === 'duplicate' ||
    stage === 'error'
  ) {
    return Colors.danger;
  }

  return Colors.primary;
}

/* ========================================================================== */
/* SCANNER SCREEN                                                             */
/* ========================================================================== */

export default function ScannerScreen() {
  const params =
    useLocalSearchParams<{
      shiftId: string;
      shiftName?: string;
    }>();

  /* ---------------------------------------------------------------------- */
  /* SHIFT STATE                                                             */
  /* ---------------------------------------------------------------------- */

  const [shifts, setShifts] = useState<Shift[]>([]);

  const [activeShift, setActiveShift] =
    useState<Shift | null>(null);

  const [shiftPickerOpen, setShiftPickerOpen] =
    useState(false);

  const [shiftLoading, setShiftLoading] =
    useState(true);

  /* ---------------------------------------------------------------------- */
  /* CAMERA                                                                  */
  /* ---------------------------------------------------------------------- */

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [torch, setTorch] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* ATTENDANCE                                                              */
  /* ---------------------------------------------------------------------- */

  const [stage, setStage] =
    useState<Stage>('scanning');

  const [worker, setWorker] =
    useState<Worker | null>(null);

  const [errorInfo, setErrorInfo] =
    useState<ErrorInfo | null>(null);

  const [markedAt, setMarkedAt] =
    useState(
      new Date().toISOString()
    );

  const [submitting, setSubmitting] =
    useState(false);

  const [presentCount, setPresentCount] =
    useState<number | null>(null);

  const stageRef =
    useRef<Stage>('scanning');

  const busyRef =
    useRef(false);

  const resetTimerRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  /* ---------------------------------------------------------------------- */
  /* LOAD SHIFTS                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    let mounted = true;

    const loadShifts = async () => {
      try {
        const data =
          await fetchShifts();

        if (!mounted) {
          return;
        }

        setShifts(data);

        const initial =
          data.find(
            (shift) =>
              shift.id === params.shiftId
          ) ??
          data.find(
            (shift) =>
              shift.name ===
              params.shiftName
          ) ??
          data[0] ??
          null;

        setActiveShift(initial);
      } catch (error) {
        console.error(
          'Scanner shift load error:',
          error
        );
      } finally {
        if (mounted) {
          setShiftLoading(false);
        }
      }
    };

    loadShifts();

    return () => {
      mounted = false;
    };
  }, [
    params.shiftId,
    params.shiftName,
  ]);

  /* ---------------------------------------------------------------------- */
  /* CURRENT SHIFT VALUES                                                    */
  /* ---------------------------------------------------------------------- */

  const shiftId =
    activeShift?.id ??
    params.shiftId;

  const shiftName =
    activeShift?.name ??
    params.shiftName ??
    'Selected Shift';

  /* ---------------------------------------------------------------------- */
  /* CHANGE SHIFT                                                            */
  /* ---------------------------------------------------------------------- */

  const changeShift = useCallback(
    (shift: Shift) => {
      if (
        activeShift?.id === shift.id
      ) {
        setShiftPickerOpen(false);
        return;
      }

      setActiveShift(shift);

      /*
       * Important:
       * Changing shift should return the scanner
       * to a clean scanning state.
       */
      if (resetTimerRef.current) {
        clearTimeout(
          resetTimerRef.current
        );
      }

      setWorker(null);
      setErrorInfo(null);
      setSubmitting(false);

      stageRef.current = 'scanning';
      setStage('scanning');

      busyRef.current = false;

      setShiftPickerOpen(false);
    },
    [activeShift?.id]
  );

  /* ---------------------------------------------------------------------- */
  /* STAGE                                                                   */
  /* ---------------------------------------------------------------------- */

  const goTo = useCallback(
    (next: Stage) => {
      stageRef.current = next;
      setStage(next);
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* RESET                                                                    */
  /* ---------------------------------------------------------------------- */

  const resetToScanning =
    useCallback(() => {
      if (resetTimerRef.current) {
        clearTimeout(
          resetTimerRef.current
        );
      }

      setWorker(null);
      setErrorInfo(null);

      busyRef.current = false;

      goTo('scanning');
    }, [goTo]);

  /* ---------------------------------------------------------------------- */
  /* CLEANUP                                                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(
          resetTimerRef.current
        );
      }
    };
  }, []);

  /* ---------------------------------------------------------------------- */
  /* PRESENT COUNT                                                           */
  /* ---------------------------------------------------------------------- */

  const loadPresentCount =
    useCallback(async () => {
      if (!shiftId) {
        return;
      }

      try {
        const records =
          await fetchAttendanceForDate(
            todayString()
          );

        setPresentCount(
          records.filter(
            (record) =>
              record.shift_id ===
              shiftId
          ).length
        );
      } catch {
        setPresentCount(null);
      }
    }, [shiftId]);

  useEffect(() => {
    loadPresentCount();
  }, [loadPresentCount]);

  /* ---------------------------------------------------------------------- */
  /* CAMERA PERMISSION                                                       */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (
      permission &&
      !permission.granted &&
      permission.canAskAgain
    ) {
      requestPermission();
    }
  }, [
    permission,
    requestPermission,
  ]);

  /* ---------------------------------------------------------------------- */
  /* SUCCESS                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleMarkedSuccess =
    useCallback(
      (attTime: string) => {
        setMarkedAt(attTime);

        goTo('success');

        loadPresentCount();

        resetTimerRef.current =
          setTimeout(() => {
            resetToScanning();
          }, 2600);
      },
      [
        goTo,
        loadPresentCount,
        resetToScanning,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* RAW SCAN                                                                */
  /* ---------------------------------------------------------------------- */

  const handleRawScan =
    useCallback(
      async (raw: string) => {
        const { workerId } =
          decodeWorkerQr(raw);

        if (!workerId) {
          setErrorInfo({
            code: 'INVALID_QR',
            message:
              'This QR code is not registered with the company.',
          });

          goTo('error');

          return;
        }

        try {
          const found =
            await fetchWorkerByWorkerId(
              workerId
            );

          if (!found) {
            setErrorInfo({
              code: 'WORKER_NOT_FOUND',
              message:
                'Worker does not exist.',
            });

            goTo('error');

            return;
          }

          if (!found.active) {
            setErrorInfo({
              code: 'WORKER_INACTIVE',
              message:
                'This worker is currently inactive.',
            });

            goTo('error');

            return;
          }

          setWorker(found);

          goTo('confirming');
        } catch {
          setErrorInfo({
            code: 'SERVER_ERROR',
            message:
              'Could not verify the worker. Check your connection.',
          });

          goTo('error');
        }
      },
      [goTo]
    );

  /* ---------------------------------------------------------------------- */
  /* BARCODE                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleScan =
    useCallback(
      ({
        data,
      }: BarcodeScanningResult) => {
        if (
          stageRef.current !==
            'scanning' ||
          busyRef.current
        ) {
          return;
        }

        busyRef.current = true;

        handleRawScan(data).finally(
          () => {
            busyRef.current = false;
          }
        );
      },
      [handleRawScan]
    );

  /* ---------------------------------------------------------------------- */
  /* CONFIRM ATTENDANCE                                                      */
  /* ---------------------------------------------------------------------- */

  const confirmAttendance =
    useCallback(async () => {
      if (
        !worker ||
        !shiftId
      ) {
        return;
      }

      setSubmitting(true);

      try {
        const res =
          await markAttendance({
            worker_id:
              worker.worker_id,
            shift_id: shiftId,
          });

        if (res.success) {
          handleMarkedSuccess(
            res.data?.marked_at
              ? String(
                  res.data.marked_at
                )
              : new Date().toISOString()
          );
        } else if (res.message) {
          setErrorInfo({
            code: 'ALREADY_MARKED',
            message: res.message,
          });

          goTo('duplicate');
        }
      } catch {
        setErrorInfo({
          code: 'SERVER_ERROR',
          message:
            'Could not reach the server. Try again.',
        });

        goTo('error');
      } finally {
        setSubmitting(false);
      }
    }, [
      worker,
      shiftId,
      goTo,
      handleMarkedSuccess,
    ]);

  /* ---------------------------------------------------------------------- */
  /* DISPLAY DATA                                                            */
  /* ---------------------------------------------------------------------- */

  const active =
    stage !== 'scanning';

  const color =
    statusColor(stage);

  const todayLabel =
    new Date().toLocaleDateString(
      [],
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );

  const markedTimeLabel =
    new Date(
      markedAt
    ).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

  /* ---------------------------------------------------------------------- */
  /* RENDER                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <SafeAreaView
        style={styles.safe}
        edges={['top', 'bottom']}
      >
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <IconButton
            icon="chevron-back"
            variant="dark"
            onPress={() =>
              router.back()
            }
            accessibilityLabel="Go back"
          />

          <Pressable
            style={styles.topCenter}
            onPress={() =>
              setShiftPickerOpen(true)
            }
            disabled={
              shiftLoading ||
              shifts.length === 0
            }
          >
            <View style={styles.shiftPill}>
              <View
                style={[
                  styles.shiftDot,
                  {
                    backgroundColor:
                      activeShift?.shift_code ===
                      'SHIFT_1'
                        ? '#F3B44B'
                        : '#58C79E',
                  },
                ]}
              />

              <Text
                style={styles.topShift}
                numberOfLines={1}
              >
                {shiftName}
              </Text>

              <Ionicons
                name="chevron-down"
                size={14}
                color="rgba(255,255,255,0.75)"
                style={{
                  marginLeft: 5,
                }}
              />
            </View>

            <Text style={styles.topMeta}>
              {presentCount !== null
                ? `${presentCount} marked today`
                : 'Ready to scan'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setTorch((value) => !value)
            }
            style={[
              styles.torchButton,
              torch &&
                styles.torchButtonActive,
            ]}
          >
            <Ionicons
              name={
                torch
                  ? 'flash'
                  : 'flash-off-outline'
              }
              size={20}
              color={
                torch
                  ? '#102019'
                  : '#FFFFFF'
              }
            />
          </Pressable>
        </View>

        {/* CAMERA */}
        <View style={styles.cameraOuter}>
          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <CameraView
                style={styles.camera}
                facing="back"
                enableTorch={torch}
                onBarcodeScanned={
                  stage ===
                  'scanning'
                    ? handleScan
                    : undefined
                }
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />
            ) : (
              <View
                style={
                  styles.cameraFallback
                }
              >
                <View
                  style={
                    styles.fallbackIcon
                  }
                >
                  <Ionicons
                    name="camera-outline"
                    size={36}
                    color="#A9B4AE"
                  />
                </View>

                <Text
                  style={
                    styles.fallbackTitle
                  }
                >
                  Camera access required
                </Text>

                <Text
                  style={
                    styles.fallbackText
                  }
                >
                  Allow camera access to
                  scan worker QR codes.
                </Text>

                {permission &&
                !permission.granted ? (
                  <AppButton
                    title="Allow Camera Access"
                    icon="camera"
                    onPress={
                      requestPermission
                    }
                    variant="secondary"
                    style={
                      styles.permissionButton
                    }
                  />
                ) : null}
              </View>
            )}

            <ScanFrame
              color={color}
            />

            <View
              pointerEvents="none"
              style={
                styles.cameraTopGradient
              }
            />

            <View
              pointerEvents="none"
              style={
                styles.cameraBottomGradient
              }
            />
          </View>
        </View>

        {/* INSTRUCTION */}
        <View style={styles.instruction}>
          <View
            style={styles.instructionIcon}
          >
            <Ionicons
              name="qr-code-outline"
              size={17}
              color="#D9EEE5"
            />
          </View>

          <View
            style={styles.instructionTextWrap}
          >
            <Text
              style={
                styles.instructionText
              }
            >
              Scan worker QR code
            </Text>

            <Text
              style={
                styles.instructionSub
              }
            >
              Tap the shift above to
              change shifts
            </Text>
          </View>

          <View
            style={styles.liveBadge}
          >
            <View
              style={styles.liveDot}
            />

            <Text
              style={styles.liveText}
            >
              LIVE
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* ================================================================== */}
      {/* SHIFT SELECTOR                                                      */}
      {/* ================================================================== */}

      <Modal
        visible={shiftPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setShiftPickerOpen(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setShiftPickerOpen(false)
            }
          />

          <View style={styles.shiftModal}>
            <View
              style={styles.modalHandle}
            />

            <View
              style={styles.modalHeader}
            >
              <View>
                <Text
                  style={
                    styles.modalTitle
                  }
                >
                  Select Shift
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Change the active shift
                  without leaving scanner
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setShiftPickerOpen(false)
                }
                style={
                  styles.modalClose
                }
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={Colors.text}
                />
              </Pressable>
            </View>

            <View style={styles.modalShiftList}>
              {shifts.map((shift) => {
                const isFirst =
                  shift.shift_code ===
                  'SHIFT_1';

                const selected =
                  activeShift?.id ===
                  shift.id;

                return (
                  <Pressable
                    key={shift.id}
                    onPress={() =>
                      changeShift(
                        shift
                      )
                    }
                    style={({ pressed }) => [
                      styles.modalShift,
                      selected &&
                        styles.modalShiftSelected,
                      pressed &&
                        styles.modalShiftPressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.modalShiftIcon,
                        {
                          backgroundColor:
                            isFirst
                              ? Colors.warningLight
                              : Colors.primaryLight,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isFirst
                            ? 'sunny'
                            : 'moon'
                        }
                        size={21}
                        color={
                          isFirst
                            ? Colors.warning
                            : Colors.primary
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.modalShiftText
                      }
                    >
                      <Text
                        style={
                          styles.modalShiftName
                        }
                      >
                        {shift.name}
                      </Text>

                      <Text
                        style={
                          styles.modalShiftSub
                        }
                      >
                        {selected
                          ? 'Currently scanning this shift'
                          : 'Tap to switch scanner'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.modalCheck,
                        selected &&
                          styles.modalCheckSelected,
                      ]}
                    >
                      {selected ? (
                        <Ionicons
                          name="checkmark"
                          size={15}
                          color="#FFFFFF"
                        />
                      ) : (
                        <Ionicons
                          name="arrow-forward"
                          size={14}
                          color={
                            Colors.textMuted
                          }
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() =>
                setShiftPickerOpen(false)
              }
              style={
                styles.cancelButton
              }
            >
              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ================================================================== */}
      {/* RESULT OVERLAY                                                      */}
      {/* ================================================================== */}

      {active ? (
        <View style={styles.overlay}>
          <ScrollView
            style={styles.overlayScroll}
            contentContainerStyle={
              styles.overlayContent
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {/* CONFIRM / SUCCESS / DUPLICATE */}

            {worker &&
            (
              stage ===
                'confirming' ||
              stage === 'success' ||
              stage === 'duplicate'
            ) ? (
              <Card
                style={styles.panel}
                elevated
              >
                <View
                  style={
                    styles.handleBar
                  }
                />

                {/* CONFIRM */}
                {stage ===
                'confirming' ? (
                  <>
                    <View
                      style={
                        styles.panelHeader
                      }
                    >
                      <View
                        style={
                          styles.avatarRing
                        }
                      >
                        <Avatar
                          name={
                            worker.name
                          }
                          size={82}
                        />
                      </View>

                      <View
                        style={
                          styles.verifiedBadge
                        }
                      >
                        <Ionicons
                          name="checkmark"
                          size={12}
                          color="#FFFFFF"
                        />
                      </View>

                      <Text
                        style={
                          styles.panelName
                        }
                      >
                        {worker.name}
                      </Text>

                      <View
                        style={
                          styles.workerIdPill
                        }
                      >
                        <Ionicons
                          name="person-outline"
                          size={12}
                          color={
                            Colors.primary
                          }
                        />

                        <Text
                          style={
                            styles.panelId
                          }
                        >
                          {worker.worker_id}
                        </Text>
                      </View>

                      {worker.department ? (
                        <Badge
                          label={
                            worker.department
                          }
                          color={
                            Colors.textSecondary
                          }
                          background={
                            Colors.surfaceSecondary
                          }
                        />
                      ) : null}
                    </View>

                    <View
                      style={
                        styles.panelCard
                      }
                    >
                      <DetailRow
                        icon="business-outline"
                        label="Department"
                        value={
                          worker.department ??
                          '—'
                        }
                      />

                      <DetailRow
                        icon="briefcase-outline"
                        label="Designation"
                        value={
                          worker.designation ??
                          '—'
                        }
                      />

                      <DetailRow
                        icon="time-outline"
                        label="Shift"
                        value={
                          shiftName
                        }
                      />

                      <DetailRow
                        icon="calendar-outline"
                        label="Date"
                        value={
                          todayLabel
                        }
                      />

                      <DetailRow
                        icon="pulse-outline"
                        label="Status"
                        value="Active"
                        valueColor={
                          Colors.successDark
                        }
                        dot={
                          Colors.success
                        }
                        last
                      />
                    </View>

                    <View
                      style={
                        styles.confirmNotice
                      }
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={
                          Colors.primary
                        }
                      />

                      <Text
                        style={
                          styles.confirmNoticeText
                        }
                      >
                        Verify the worker
                        details before
                        marking attendance.
                      </Text>
                    </View>

                    <AppButton
                      title="Mark Attendance"
                      icon="checkmark-circle"
                      size="lg"
                      loading={
                        submitting
                      }
                      onPress={
                        confirmAttendance
                      }
                      style={
                        styles.primaryButton
                      }
                    />

                    <AppButton
                      title="Scan Another"
                      icon="qr-code-outline"
                      variant="outline"
                      size="lg"
                      onPress={
                        resetToScanning
                      }
                      style={
                        styles.secondaryButton
                      }
                    />
                  </>
                ) : stage ===
                  'success' ? (
                  <>
                    <StatusHero
                      tone="success"
                      title="Attendance Marked"
                      message={`${worker.name} is present for ${shiftName}.`}
                    />

                    <View
                      style={
                        styles.successBanner
                      }
                    >
                      <View
                        style={
                          styles.successBannerIcon
                        }
                      >
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color="#FFFFFF"
                        />
                      </View>

                      <View
                        style={
                          styles.successBannerText
                        }
                      >
                        <Text
                          style={
                            styles.successBannerTitle
                          }
                        >
                          Attendance recorded
                        </Text>

                        <Text
                          style={
                            styles.successBannerSubtitle
                          }
                        >
                          {markedTimeLabel}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={
                        styles.panelCard
                      }
                    >
                      <DetailRow
                        icon="person-outline"
                        label="Worker"
                        value={`${worker.name} · ${worker.worker_id}`}
                      />

                      <DetailRow
                        icon="time-outline"
                        label="Shift"
                        value={
                          shiftName
                        }
                      />

                      <DetailRow
                        icon="checkmark-done-outline"
                        label="Marked at"
                        value={
                          markedTimeLabel
                        }
                      />

                      <DetailRow
                        icon="calendar-outline"
                        label="Date"
                        value={
                          todayLabel
                        }
                        last
                      />
                    </View>

                    <AppButton
                      title="Scan Next Worker"
                      icon="qr-code"
                      size="lg"
                      onPress={
                        resetToScanning
                      }
                      style={
                        styles.primaryButton
                      }
                    />

                    <AppButton
                      title="View Attendance"
                      icon="list-outline"
                      variant="outline"
                      size="lg"
                      onPress={() =>
                        router.replace(
                          '/(tabs)/attendance'
                        )
                      }
                      style={
                        styles.secondaryButton
                      }
                    />
                  </>
                ) : (
                  <>
                    <StatusHero
                      tone="warning"
                      color={
                        Colors.danger
                      }
                      title="Already Marked"
                      message={
                        errorInfo?.message ??
                        'This worker already has attendance for the selected shift today.'
                      }
                    />

                    <View
                      style={
                        styles.panelCard
                      }
                    >
                      <DetailRow
                        icon="person-outline"
                        label="Worker"
                        value={`${worker.name} · ${worker.worker_id}`}
                      />

                      <DetailRow
                        icon="time-outline"
                        label="Shift"
                        value={
                          shiftName
                        }
                      />

                      <DetailRow
                        icon="alert-circle-outline"
                        label="Status"
                        value="Already marked"
                        valueColor={
                          Colors.danger
                        }
                        dot={
                          Colors.danger
                        }
                      />

                      <DetailRow
                        icon="calendar-outline"
                        label="Date"
                        value={
                          todayLabel
                        }
                        last
                      />
                    </View>

                    <AppButton
                      title="Scan Another"
                      icon="qr-code"
                      size="lg"
                      onPress={
                        resetToScanning
                      }
                      style={
                        styles.primaryButton
                      }
                    />

                    <AppButton
                      title="View Attendance"
                      icon="list-outline"
                      variant="outline"
                      size="lg"
                      onPress={() =>
                        router.replace(
                          '/(tabs)/attendance'
                        )
                      }
                      style={
                        styles.secondaryButton
                      }
                    />
                  </>
                )}
              </Card>
            ) : null}

            {/* ERROR */}

            {stage === 'error' ? (
              <Card
                style={styles.panel}
                elevated
              >
                <View
                  style={
                    styles.handleBar
                  }
                />

                <StatusHero
                  tone="danger"
                  title={
                    errorInfo?.code ===
                    'INVALID_QR'
                      ? 'Invalid QR Code'
                      : 'Unable to Scan'
                  }
                  message={
                    errorInfo?.message ??
                    'The QR code could not be processed. Please try again.'
                  }
                />

                <View
                  style={
                    styles.panelCard
                  }
                >
                  <DetailRow
                    icon="time-outline"
                    label="Shift"
                    value={
                      shiftName
                    }
                  />

                  <DetailRow
                    icon="calendar-outline"
                    label="Date"
                    value={
                      todayLabel
                    }
                  />

                  <DetailRow
                    icon="information-circle-outline"
                    label="Reason"
                    value={
                      errorInfo?.code ??
                      'UNKNOWN'
                    }
                    valueColor={
                      Colors.danger
                    }
                    last
                  />
                </View>

                <AppButton
                  title="Scan Again"
                  icon="qr-code"
                  size="lg"
                  onPress={
                    resetToScanning
                  }
                  style={
                    styles.primaryButton
                  }
                />

                <AppButton
                  title="Back to Shifts"
                  icon="arrow-back-outline"
                  variant="outline"
                  size="lg"
                  onPress={() =>
                    router.replace(
                      '/(tabs)/scan'
                    )
                  }
                  style={
                    styles.secondaryButton
                  }
                />
              </Card>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

/* ========================================================================== */
/* STYLES                                                                     */
/* ========================================================================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07130F',
  },

  safe: {
    flex: 1,
  },

  /* TOP BAR */

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },

  topCenter: {
    flex: 1,
    alignItems: 'center',
  },

  shiftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 6,
    maxWidth: 210,
  },

  shiftDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },

  topShift: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.white,
  },

  topMeta: {
    fontSize: FontSizes.micro,
    color:
      'rgba(255,255,255,0.52)',
    marginTop: Spacing.xxs,
  },

  torchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  torchButtonActive: {
    backgroundColor: '#E9F7F1',
    borderColor: '#E9F7F1',
  },

  /* CAMERA */

  cameraOuter: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  cameraWrap: {
    flex: 1,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
  },

  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  cameraTopGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor:
      'rgba(0,0,0,0.22)',
  },

  cameraBottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 130,
    backgroundColor:
      'rgba(0,0,0,0.20)',
  },

  cameraFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    backgroundColor: '#101815',
  },

  fallbackIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
  },

  fallbackTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
    marginTop: Spacing.lg,
  },

  fallbackText: {
    color:
      'rgba(255,255,255,0.55)',
    fontSize: FontSizes.xs,
    textAlign: 'center',
    lineHeight: LineHeights.relaxed,
    marginTop: Spacing.xs,
    maxWidth: 260,
  },

  permissionButton: {
    marginTop: Spacing.lg,
  },

  /* SCAN FRAME */

  frameArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  frameBox: {
    width: 245,
    height: 245,
    alignItems: 'center',
    justifyContent: 'center',
  },

  frameGlow: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 30,
    borderWidth: 1,
    opacity: 0.15,
  },

  corner: {
    position: 'absolute',
    width: 42,
    height: 42,
  },

  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: Radius.md,
  },

  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: Radius.md,
  },

  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: Radius.md,
  },

  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: Radius.md,
  },

  qrCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: '50%',
    height: 2,
    borderRadius: 2,
  },

  /* INSTRUCTION */

  instruction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 17,
    backgroundColor:
      'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',
  },

  instructionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor:
      'rgba(73,186,143,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  instructionTextWrap: {
    flex: 1,
    marginLeft: 10,
  },

  instructionText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.white,
  },

  instructionSub: {
    fontSize: FontSizes.micro,
    color:
      'rgba(255,255,255,0.48)',
    marginTop: 2,
  },

  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(73,186,143,0.12)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#55C89D',
    marginRight: 5,
  },

  liveText: {
    fontSize: 8,
    fontWeight: FontWeights.bold,
    color: '#75D4B0',
    letterSpacing: 0.6,
  },

  /* SHIFT MODAL */

  modalBackdrop: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.62)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
  },

  shiftModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D9DEDB',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: FontWeights.heavy,
    color: Colors.text,
  },

  modalSubtitle: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },

  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor:
      Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalShiftList: {
    gap: 10,
  },

  modalShift: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },

  modalShiftSelected: {
    borderColor: '#BFDCCE',
    backgroundColor: '#F0F8F4',
  },

  modalShiftPressed: {
    transform: [{ scale: 0.985 }],
  },

  modalShiftIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalShiftText: {
    flex: 1,
    marginLeft: 12,
  },

  modalShiftName: {
    fontSize: 14,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  modalShiftSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 3,
  },

  modalCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor:
      Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCheckSelected: {
    backgroundColor: Colors.primary,
  },

  cancelButton: {
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    backgroundColor:
      Colors.surfaceSecondary,
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  /* OVERLAY */

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor:
      'rgba(5,11,8,0.82)',
  },

  overlayScroll: {
    flex: 1,
  },

  overlayContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    paddingTop: 70,
  },

  /* PANEL */

  panel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
  },

  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 4,
    backgroundColor: '#D9DEDB',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },

  panelHeader: {
    alignItems: 'center',
  },

  avatarRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor:
      Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DCEEE6',
  },

  verifiedBadge: {
    position: 'absolute',
    top: 70,
    marginLeft: 58,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },

  panelName: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.heavy,
    color: Colors.text,
    letterSpacing: -0.4,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  workerIdPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      Colors.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 5,
    marginBottom: 8,
  },

  panelId: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
    color: Colors.primary,
    marginLeft: 5,
  },

  panelCard: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.lg,
  },

  confirmNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F3',
    borderWidth: 1,
    borderColor: '#DCEBE4',
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginTop: Spacing.md,
  },

  confirmNoticeText: {
    flex: 1,
    fontSize: FontSizes.micro,
    lineHeight: 15,
    color: Colors.textSecondary,
    marginLeft: 8,
  },

  /* SUCCESS */

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF8F2',
    borderWidth: 1,
    borderColor: '#D5EDE0',
    borderRadius: 14,
    padding: 11,
    marginTop: Spacing.lg,
  },

  successBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successBannerText: {
    marginLeft: 10,
  },

  successBannerTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.bold,
    color: Colors.text,
  },

  successBannerSubtitle: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    marginTop: 2,
  },

  /* BUTTONS */

  primaryButton: {
    marginTop: Spacing.lg,
  },

  secondaryButton: {
    marginTop: Spacing.sm,
  },
});