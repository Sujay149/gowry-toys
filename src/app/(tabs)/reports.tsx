import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  AppButton,
  Badge,
  Card,
  EmptyState,
  FadeInView,
  Screen,
  Skeleton,
} from '@/components/ui';

import {
  Colors,
  FontSizes,
  FontWeights,
  Radius,
  Spacing,
} from '@/constants/theme';

import {
  currentMonth,
  fetchReports,
  generateMonthlyReport,
  getReportSignedUrl,
  monthLabel,
  shiftMonth,
} from '@/lib/api';

import type { Report } from '@/lib/types';

export default function ReportsScreen() {
  const [month, setMonth] = useState(currentMonth());
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchReports().catch(() => []);
      setReports(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleGenerate = async () => {
    setGenerating(true);

    try {
      const res = await generateMonthlyReport(month);

      if (res.success) {
        Alert.alert(
          'Report generated',
          `${monthLabel(month)} attendance report is ready.`,
          [{ text: 'OK' }]
        );

        load();
      } else {
        Alert.alert(
          'Could not generate',
          res.message ?? 'Please try again.'
        );
      }
    } catch {
      Alert.alert(
        'Error',
        'Could not reach the report generator. Try again.'
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: Report) => {
    setDownloading(report.id);

    try {
      const url = await getReportSignedUrl(
        report.storage_path
      );

      if (!url) {
        Alert.alert(
          'Unavailable',
          'This report file could not be found.'
        );
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Error',
        'Could not open the report.'
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Screen>
      {/* ───────────────── HEADER ───────────────── */}

      <FadeInView>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.eyebrow}>
              DOCUMENT CENTER
            </Text>

            <Text style={styles.pageTitle}>
              Reports
            </Text>

            <Text style={styles.pageSubtitle}>
              Generate and access attendance reports
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="documents-outline"
              size={24}
              color={Colors.primary}
            />
          </View>
        </View>
      </FadeInView>

      {/* ───────────────── GENERATE ───────────────── */}

      <FadeInView delay={80}>
        <Card style={styles.generateCard}>
          <View style={styles.generateTop}>
            <View style={styles.generateIcon}>
              <Ionicons
                name="document-text-outline"
                size={23}
                color={Colors.primary}
              />
            </View>

            <View style={styles.generateHeading}>
              <Text style={styles.generateTitle}>
                Generate monthly report
              </Text>

              <Text style={styles.generateSub}>
                Create a PDF containing worker-wise
                attendance for the selected month.
              </Text>
            </View>
          </View>

          {/* Month selector */}

          <View style={styles.monthSelector}>
            <Pressable
              onPress={() =>
                setMonth(shiftMonth(month, -1))
              }
              style={styles.monthButton}
              hitSlop={6}
            >
              <Ionicons
                name="chevron-back"
                size={19}
                color={Colors.primary}
              />
            </Pressable>

            <View style={styles.selectedMonth}>
              <Ionicons
                name="calendar-outline"
                size={17}
                color={Colors.primary}
              />

              <Text style={styles.monthText}>
                {monthLabel(month)}
              </Text>
            </View>

            <Pressable
              onPress={() =>
                setMonth(shiftMonth(month, 1))
              }
              style={styles.monthButton}
              hitSlop={6}
            >
              <Ionicons
                name="chevron-forward"
                size={19}
                color={Colors.primary}
              />
            </Pressable>
          </View>

          <AppButton
            title="Generate PDF Report"
            icon="document-text"
            onPress={handleGenerate}
            loading={generating}
            size="lg"
          />

          <View style={styles.generateInfo}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={Colors.textMuted}
            />

            <Text style={styles.generateInfoText}>
              The generated report will be available in
              report history.
            </Text>
          </View>
        </Card>
      </FadeInView>

      {/* ───────────────── REPORT HISTORY ───────────────── */}

      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.sectionTitle}>
            Report history
          </Text>

          <Text style={styles.sectionSubtitle}>
            {reports.length > 0
              ? `${reports.length} generated ${
                  reports.length === 1
                    ? 'report'
                    : 'reports'
                }`
              : 'Previously generated reports'}
          </Text>
        </View>

        {reports.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {reports.length}
            </Text>
          </View>
        )}
      </View>

      {/* ───────────────── LOADING ───────────────── */}

      {loading ? (
        <Card
          padded={false}
          style={styles.loadingCard}
        >
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              style={[
                styles.skeletonRow,
                item < 2 && styles.skeletonDivider,
              ]}
            >
              <Skeleton
                width={48}
                height={48}
                radius={15}
              />

              <View style={styles.skeletonContent}>
                <Skeleton
                  width="62%"
                  height={13}
                />

                <Skeleton
                  width="42%"
                  height={10}
                />

                <Skeleton
                  width="28%"
                  height={18}
                  radius={9}
                />
              </View>
            </View>
          ))}
        </Card>
      ) : reports.length === 0 ? (
        /* ───────────────── EMPTY ───────────────── */

        <Card style={styles.emptyCard}>
          <EmptyState
            icon="documents-outline"
            title="No reports yet"
            message="Generate your first monthly attendance report above."
          />
        </Card>
      ) : (
        /* ───────────────── REPORT LIST ───────────────── */

        <FadeInView>
          <View style={styles.list}>
            {reports.map((report, index) => (
              <ReportCard
                key={report.id}
                report={report}
                downloading={
                  downloading === report.id
                }
                onDownload={() =>
                  handleDownload(report)
                }
                onDetails={() =>
                  router.push(
                    `/reports/${report.id}`
                  )
                }
                divider={index < reports.length - 1}
              />
            ))}
          </View>
        </FadeInView>
      )}

      <View style={styles.bottomSpace} />
    </Screen>
  );
}

/* ─────────────────────────────────────────────
   REPORT CARD
───────────────────────────────────────────── */

function ReportCard({
  report,
  downloading,
  onDownload,
  onDetails,
  divider,
}: {
  report: Report;
  downloading: boolean;
  onDownload: () => void;
  onDetails: () => void;
  divider: boolean;
}) {
  const generatedDate = new Date(
    report.generated_at
  ).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const reportMonth = report.report_month
    ? monthLabel(report.report_month.slice(0, 7))
    : 'Attendance report';

  return (
    <Card
      padded={false}
      style={[
        styles.reportCard,
        divider && styles.reportCardSpacing,
      ]}
    >
      {/* Top */}

      <View style={styles.reportTop}>
        <View style={styles.reportIcon}>
          <Ionicons
            name="document-text"
            size={23}
            color={Colors.primary}
          />
        </View>

        <View style={styles.reportMain}>
          <Text
            style={styles.reportName}
            numberOfLines={2}
          >
            {report.file_name}
          </Text>

          <View style={styles.reportMeta}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={Colors.textMuted}
              />

              <Text style={styles.metaText}>
                {reportMonth}
              </Text>
            </View>

            <View style={styles.metaDot} />

            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={12}
                color={Colors.textMuted}
              />

              <Text style={styles.metaText}>
                {generatedDate}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pdfBadge}>
          <Text style={styles.pdfText}>PDF</Text>
        </View>
      </View>

      {/* Divider */}

      <View style={styles.innerDivider} />

      {/* Actions */}

      <View style={styles.reportActions}>
        <Pressable
          onPress={onDetails}
          style={styles.detailsButton}
        >
          <Ionicons
            name="eye-outline"
            size={17}
            color={Colors.textSecondary}
          />

          <Text style={styles.detailsText}>
            View details
          </Text>
        </Pressable>

        <Pressable
          onPress={onDownload}
          disabled={downloading}
          style={[
            styles.downloadButton,
            downloading &&
              styles.downloadButtonDisabled,
          ]}
        >
          <Ionicons
            name={
              downloading
                ? 'hourglass-outline'
                : 'download-outline'
            }
            size={16}
            color={Colors.white}
          />

          <Text style={styles.downloadText}>
            {downloading
              ? 'Opening...'
              : 'Download'}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* Header */

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },

  eyebrow: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
    color: Colors.textMuted,
    marginBottom: 3,
  },

  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: Colors.text,
  },

  pageSubtitle: {
    marginTop: 3,
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 17,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Generate */

  generateCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },

  generateTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  generateIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  generateHeading: {
    flex: 1,
    marginLeft: Spacing.md,
  },

  generateTitle: {
    fontSize: FontSizes.lg,
    lineHeight: 23,
    fontWeight: '800',
    color: Colors.text,
  },

  generateSub: {
    marginTop: 4,
    fontSize: FontSizes.xs,
    lineHeight: 17,
    color: Colors.textSecondary,
  },

  /* Month */

  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },

  monthButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedMonth: {
    flex: 1,
    height: 42,
    marginHorizontal: Spacing.sm,
    borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  monthText: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.text,
  },

  generateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: 6,
  },

  generateInfoText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
    color: Colors.textMuted,
  },

  /* History */

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },

  sectionTitle: {
    fontSize: FontSizes.lg,
    lineHeight: 24,
    fontWeight: '800',
    color: Colors.text,
  },

  sectionSubtitle: {
    marginTop: 3,
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },

  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  countBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.primary,
  },

  /* List */

  list: {
    gap: Spacing.sm,
  },

  reportCard: {
    padding: Spacing.md,
    overflow: 'hidden',
  },

  reportCardSpacing: {
    marginBottom: Spacing.sm,
  },

  reportTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reportMain: {
    flex: 1,
    minWidth: 0,
    marginLeft: Spacing.md,
    paddingRight: Spacing.sm,
  },

  reportName: {
    fontSize: FontSizes.sm,
    lineHeight: 19,
    fontWeight: '700',
    color: Colors.text,
  },

  reportMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    flexWrap: 'wrap',
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  metaText: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.textMuted,
    marginHorizontal: 7,
  },

  pdfBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 7,
    backgroundColor: Colors.successLight,
  },

  pdfText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.successDark,
  },

  innerDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginTop: Spacing.md,
  },

  /* Actions */

  reportActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },

  detailsButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  detailsText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

  downloadButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  downloadButtonDisabled: {
    opacity: 0.65,
  },

  downloadText: {
    fontSize: FontSizes.xs,
    fontWeight: '800',
    color: Colors.white,
  },

  /* Loading */

  loadingCard: {
    padding: 0,
    overflow: 'hidden',
  },

  skeletonRow: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },

  skeletonDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  skeletonContent: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 8,
  },

  /* Empty */

  emptyCard: {
    paddingVertical: Spacing.lg,
  },

  bottomSpace: {
    height: Spacing.xl,
  },
});