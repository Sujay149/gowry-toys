import type { RefObject } from 'react';
import { Image, StyleSheet, Text, View, type ViewProps } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { encodeWorkerQr } from '@/lib/qr';
import type { Worker } from '@/lib/types';

const CARD_WIDTH = 320;

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

interface WorkerIdCardProps extends ViewProps {
  worker: Worker;
  /** Card width in points. Height flows from content. */
  width?: number;
  /** Ref attached to the card root so it can be captured for download/print. */
  cardRef?: RefObject<View | null>;
}

export function WorkerIdCard({ worker, width = CARD_WIDTH, cardRef, style, ...rest }: WorkerIdCardProps) {
  const s = width / CARD_WIDTH;
  const photo = (width * 0.38) / 1;
  const qr = width * 0.5;

  return (
    <View
      {...rest}
      ref={cardRef}
      collapsable={false}
      style={[styles.card, { width }, style]}>
      <Text style={[styles.brand, { fontSize: 22 * s }]}>GOWRI TOYS</Text>

      {worker.avatar_url ? (
        <Image
          source={{ uri: worker.avatar_url }}
          style={[styles.photo, { width: photo, height: photo }]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.photoPlaceholder, { width: photo, height: photo }]}>
          <Text style={[styles.initials, { fontSize: 34 * s }]}>
            {initialsOf(worker.name) || '?'}
          </Text>
        </View>
      )}

      <View style={[styles.textBlock, { gap: 10 * s }]}>
        <Text style={[styles.name, { fontSize: 26 * s }]} numberOfLines={2}>
          {worker.name}
        </Text>

        <Text style={[styles.label, { fontSize: 10 * s, marginTop: 4 }]}>Worker ID</Text>
        <Text style={[styles.value, { fontSize: 22 * s }]}>{worker.worker_id}</Text>
      </View>

      <View style={[styles.qrWrap, { padding: 10 * s }]}>
        <QRCode
          value={encodeWorkerQr(worker.worker_id)}
          size={qr}
          color="#000000"
          backgroundColor="#FFFFFF"
          ecl="M"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ECEEEC',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  brand: {
    color: '#000000',
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 14,
    textAlign: 'center',
  },
  photo: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  photoPlaceholder: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#F6F6F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#151716',
    fontWeight: '800',
  },
  textBlock: {
    alignItems: 'center',
    marginTop: 14,
  },
  label: {
    color: '#44474A',
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  value: {
    color: '#000000',
    fontWeight: '800',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  name: {
    color: '#000000',
    fontWeight: '800',
    textAlign: 'center',
  },
  qrWrap: {
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 6,
  },
});