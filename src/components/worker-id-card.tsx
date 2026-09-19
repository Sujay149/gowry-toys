import type { RefObject } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';
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
  width?: number;
  cardRef?: RefObject<View | null>;
}

export function WorkerIdCard({
  worker,
  width = CARD_WIDTH,
  cardRef,
  style,
  ...rest
}: WorkerIdCardProps) {
  const s = width / CARD_WIDTH;

  const photoSize = 116 * s;
  const qrSize = 150 * s;

  return (
    <View
      {...rest}
      ref={cardRef}
      collapsable={false}
      style={[
        styles.card,
        {
          width,
          borderRadius: 14 * s,
          paddingHorizontal: 20 * s,
          paddingVertical: 20 * s,
        },
        style,
      ]}
    >
      {/* Brand */}
      <View style={styles.brandSection}>
        <Text
          style={[
            styles.brand,
            {
              fontSize: 21 * s,
              letterSpacing: 3 * s,
            },
          ]}
        >
          GOWRI TOYS
        </Text>

        <View
          style={[
            styles.brandLine,
            {
              width: 42 * s,
              height: 3 * s,
              marginTop: 7 * s,
            },
          ]}
        />
      </View>

      {/* Worker Photo */}
      <View
        style={[
          styles.photoFrame,
          {
            width: photoSize,
            height: photoSize,
            borderRadius: 10 * s,
            marginTop: 18 * s,
          },
        ]}
      >
        {worker.avatar_url ? (
          <Image
            source={{ uri: worker.avatar_url }}
            style={[
              styles.photo,
              {
                width: photoSize,
                height: photoSize,
                borderRadius: 9 * s,
              },
            ]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.photoPlaceholder,
              {
                width: photoSize,
                height: photoSize,
                borderRadius: 9 * s,
              },
            ]}
          >
            <Text
              style={[
                styles.initials,
                {
                  fontSize: 34 * s,
                },
              ]}
            >
              {initialsOf(worker.name) || '?'}
            </Text>
          </View>
        )}
      </View>

      {/* Worker Details */}
      <View
        style={[
          styles.details,
          {
            marginTop: 16 * s,
          },
        ]}
      >
        <Text
          style={[
            styles.name,
            {
              fontSize: 22 * s,
              lineHeight: 27 * s,
            },
          ]}
          numberOfLines={2}
        >
          {worker.name}
        </Text>

        <View
          style={[
            styles.idSection,
            {
              marginTop: 9 * s,
              paddingHorizontal: 14 * s,
              paddingVertical: 7 * s,
              borderRadius: 8 * s,
            },
          ]}
        >
          <Text
            style={[
              styles.idLabel,
              {
                fontSize: 8 * s,
                letterSpacing: 1.2 * s,
              },
            ]}
          >
            WORKER ID
          </Text>

          <Text
            style={[
              styles.workerId,
              {
                fontSize: 17 * s,
                marginTop: 2 * s,
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {worker.worker_id}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View
        style={[
          styles.divider,
          {
            marginTop: 18 * s,
          },
        ]}
      />

      {/* QR Code */}
      <View
        style={[
          styles.qrSection,
          {
            marginTop: 16 * s,
          },
        ]}
      >
        <View
          style={[
            styles.qrFrame,
            {
              width: qrSize + 22 * s,
              height: qrSize + 22 * s,
              padding: 11 * s,
              borderRadius: 10 * s,
            },
          ]}
        >
          <QRCode
            value={encodeWorkerQr(worker.worker_id)}
            size={qrSize}
            color="#000000"
            backgroundColor="#FFFFFF"
            ecl="M"
          />
        </View>

        <Text
          style={[
            styles.scanText,
            {
              fontSize: 8 * s,
              letterSpacing: 1.1 * s,
              marginTop: 9 * s,
            },
          ]}
        >
          SCAN FOR ATTENDANCE
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#F1F3F1',
    borderWidth: 1.5,
    borderColor: '#111111',

    // Keep this subtle because the card is also captured for printing.
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  brandSection: {
    alignItems: 'center',
  },

  brand: {
    color: '#111111',
    fontWeight: '900',
    textAlign: 'center',
  },

  brandLine: {
    backgroundColor: '#111111',
    borderRadius: 99,
  },

  photoFrame: {
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#111111',
    backgroundColor: '#FFFFFF',
  },

  photo: {
    backgroundColor: '#FFFFFF',
  },

  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5E8E5',
  },

  initials: {
    color: '#171918',
    fontWeight: '900',
  },

  details: {
    width: '100%',
    alignItems: 'center',
  },

  name: {
    maxWidth: '94%',
    color: '#111111',
    fontWeight: '900',
    textAlign: 'center',
  },

  idSection: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D2D5D2',
  },

  idLabel: {
    color: '#666B67',
    fontWeight: '800',
  },

  workerId: {
    color: '#111111',
    fontWeight: '900',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },

  divider: {
    width: '86%',
    height: 1,
    backgroundColor: '#D0D3D0',
  },

  qrSection: {
    alignItems: 'center',
  },

  qrFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#111111',
  },

  scanText: {
    color: '#555A56',
    fontWeight: '800',
    textAlign: 'center',
  },
});