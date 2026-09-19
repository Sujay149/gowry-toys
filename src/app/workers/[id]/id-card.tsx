import * as MediaLibrary from 'expo-media-library/legacy';
import * as Print from 'expo-print';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Dimensions, Platform, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { AppButton, AppHeader, Screen } from '@/components/ui';
import { WorkerIdCard } from '@/components/worker-id-card';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { fetchWorkerByWorkerId } from '@/lib/api';
import type { Worker } from '@/lib/types';

type Busy = 'download' | 'print' | null;

const CARD_WIDTH = Math.min(320, Dimensions.get('window').width - 40);

export default function WorkerIdCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const cardRef = useRef<View>(null);
  const [permission, requestPermission] = MediaLibrary.usePermissions({
    writeOnly: true,
    granularPermissions: ['photo'],
  });

  useEffect(() => {
    fetchWorkerByWorkerId(id ?? '').then((w) => setWorker(w));
  }, [id]);

  const handleDownload = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Download the ID card from the mobile app.');
      return;
    }
    try {
      setBusy('download');
      const uri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'tmpfile' });
      const granted = permission?.granted ? permission : await requestPermission();
      if (!granted.granted) {
        Alert.alert('Permission needed', 'Allow photo access to save the ID card.');
        return;
      }
      await MediaLibrary.createAssetAsync(uri);
      Alert.alert('Saved', `${worker?.name ?? 'Worker'}'s ID card was saved to your photos.`);
    } catch {
      Alert.alert('Error', 'Could not save the ID card. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not available on web', 'Print the ID card from the mobile app.');
      return;
    }
    try {
      setBusy('print');
      const dataUri = await captureRef(cardRef, { format: 'png', quality: 1, result: 'data-uri' });
      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      @page { margin: 0; }
      html, body { margin: 0; padding: 0; }
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #ffffff;
      }
      img { width: 100mm; height: auto; }
    </style>
  </head>
  <body><img src="${dataUri}" /></body>
</html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Print.printAsync({ uri });
    } catch {
      Alert.alert('Error', 'Could not print the ID card. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!worker) {
    return (
      <Screen header={<AppHeader title="Worker ID Card" onBack={() => router.back()} />}>
        <Text style={styles.loadingText}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen header={<AppHeader title="Worker ID Card" onBack={() => router.back()} />}>
      <Text style={styles.hint}>Preview</Text>
      <WorkerIdCard cardRef={cardRef} worker={worker} width={CARD_WIDTH} />

      <AppButton
        title="Download ID Card"
        icon="download-outline"
        size="lg"
        loading={busy === 'download'}
        disabled={busy !== null}
        style={styles.action}
        onPress={handleDownload}
      />
      <AppButton
        title="Print ID Card"
        icon="print-outline"
        variant="outline"
        size="lg"
        loading={busy === 'print'}
        disabled={busy !== null}
        style={styles.action}
        onPress={handlePrint}
      />
      <AppButton
        title="Done"
        icon="checkmark-done"
        variant="ghost"
        style={styles.action}
        onPress={() => router.back()}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: Spacing.xxl,
  },
  hint: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  action: {
    marginTop: Spacing.md,
  },
});