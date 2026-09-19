import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { AppButton, AppHeader, Card, Screen, SectionTitle } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { fetchReports, getReportSignedUrl, monthLabel } from '@/lib/api';
import type { Report } from '@/lib/types';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports().then((list) => setReport(list.find((r) => r.id === id) ?? null));
  }, [id]);

  const download = async () => {
    if (!report) return;
    setLoading(true);
    const url = await getReportSignedUrl(report.storage_path);
    setLoading(false);
    if (url) {
      await Linking.openURL(url);
    }
  };

  if (!report) {
    return (
      <Screen header={<AppHeader title="Report" onBack={() => router.back()} />}>
        <Text style={styles.muted}>Report not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader title="Report" onBack={() => router.back()} />}>
      <Card style={styles.fileCard}>
        <Text style={styles.fileName}>{report.file_name}</Text>
      </Card>

      <SectionTitle title="Details" />
      <Card style={styles.detailCard}>
        {row('Type', 'Monthly Attendance Report')}
        {row('Month', report.report_month ? monthLabel(report.report_month.slice(0, 7)) : '—')}
        {row(
          'Generated',
          new Date(report.generated_at).toLocaleString([], {
            dateStyle: 'medium',
            timeStyle: 'short',
          })
        )}
        {report.payroll_total != null
          ? row('Payroll total', `₹${report.payroll_total.toLocaleString('en-IN')}`)
          : null}
      </Card>

      {report.salary_snapshot ? (
        <>
          <SectionTitle title="Payroll snapshot" subtitle="Frozen at generation time" />
          <Card style={styles.detailCard}>
            {row('Working days', `${report.salary_snapshot.workingDays}`)}
            {row('Total workers', `${report.salary_snapshot.totalWorkers}`)}
            {row('Full days', `${report.salary_snapshot.totalFullDays}`)}
            {row('Half days', `${report.salary_snapshot.totalHalfDays}`)}
            {row('Absent days', `${report.salary_snapshot.totalAbsentDays}`)}
          </Card>
        </>
      ) : null}

      <AppButton
        title="Download PDF"
        icon="download"
        size="lg"
        loading={loading}
        onPress={download}
        style={{ marginTop: Spacing.lg }}
      />
      <AppButton
        title="Back to Reports"
        variant="outline"
        onPress={() => router.push('/(tabs)/reports')}
        style={{ marginTop: Spacing.md }}
      />
    </Screen>
  );
}

function row(label: string, value: string) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  muted: {
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: Spacing.xxl,
  },
  fileCard: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primaryLight,
  },
  fileName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  detailCard: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    flexShrink: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
});