import * as Sharing from 'expo-sharing';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import QRCode from 'react-native-qrcode-svg';

import { AppButton, Card, Screen } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { fetchWorkerByWorkerId } from '@/lib/api';
import { encodeWorkerQr } from '@/lib/qr';
import type { Worker } from '@/lib/types';

export default function WorkerQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [sharing, setSharing] = useState(false);
  const qrRef = useRef<View>(null);

  useEffect(() => {
    fetchWorkerByWorkerId(id ?? '').then((w) => setWorker(w));
  }, [id]);

  const shareQr = async () => {
    if (!qrRef.current) return;
    try {
      setSharing(true);
      const uri = await captureRef(qrRef, { format: 'png', quality: 0.95, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `${worker?.worker_id ?? 'Worker'} QR Code`,
        });
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.');
      }
    } catch {
      Alert.alert('Error', 'Could not share the QR code.');
    } finally {
      setSharing(false);
    }
  };

  if (!worker) {
    return (
      <Screen>
        <Text style={styles.loadingText}>Loading…</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card style={styles.card}>
        <View collapsable={false} ref={qrRef} style={styles.qrBox}>
          <View style={styles.qrWhite}>
            <QRCode
              value={encodeWorkerQr(worker.worker_id)}
              size={210}
              color={Colors.text}
              backgroundColor={Colors.white}
              ecl="M"
            />
          </View>
          <Text style={styles.name}>{worker.name}</Text>
          <Text style={styles.wid}>{worker.worker_id}</Text>
          {worker.department ? <Text style={styles.dept}>{worker.department}</Text> : null}
        </View>

        <Text style={styles.hint}>
          The QR contains only the worker type and Worker ID. Supervisors scan this badge to mark
          attendance.
        </Text>

        <AppButton title="Share QR Code" onPress={shareQr} loading={sharing} icon="share-outline" size="lg" style={{ marginTop: Spacing.lg }} />
        <AppButton title="Done" onPress={() => router.back()} variant="outline" style={{ marginTop: Spacing.md }} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingText: {
    color: Colors.textMuted,
    textAlign: 'center',
    paddingTop: Spacing.xxl,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  qrBox: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qrWhite: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  name: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
  },
  wid: {
    fontSize: FontSizes.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  dept: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.lg,
  },
});