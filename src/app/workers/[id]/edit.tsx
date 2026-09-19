import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppHeader, Avatar, Card, Screen, TextField } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import {
  fetchWorkerByWorkerId,
  updateWorker,
  uploadWorkerAvatar,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Worker } from '@/lib/types';

export default function EditWorkerScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64?: string | null; mimeType?: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkerByWorkerId(id ?? '').then((w) => {
      if (!w) return;
      setWorker(w);
      setName(w.name);
      setPhone(w.phone ?? '');
      setDepartment(w.department ?? '');
    });
  }, [id]);

  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor';

  useEffect(() => {
    if (!canManage) {
      router.replace('/(tabs)/dashboard');
    }
  }, [canManage]);

  if (!canManage) {
    return null;
  }

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? null });
    } catch {
      // Image picking is not available; the form still works without a photo.
    }
  };

  const handleSave = async () => {
    if (!worker) return;
    if (!name.trim()) {
      setError('Worker name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateWorker(worker.id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
      });
      if (photo) {
        const avatarUrl = await uploadWorkerAvatar(worker.id, photo);
        await updateWorker(worker.id, { avatar_url: avatarUrl });
      }
      router.back();
    } catch {
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      padded={false}
      header={<AppHeader title="Edit Worker" onBack={() => router.back()} />}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.photoCard}>
        <Avatar
          name={name.trim() || '?'}
          size={88}
          source={photo ? photo.uri : (worker?.avatar_url ?? null)}
        />
        <View style={styles.photoActions}>
          <Pressable style={styles.photoAction} onPress={pickPhoto} hitSlop={8}>
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.photoActionText}>
              {photo ? 'Change Photo' : worker?.avatar_url ? 'Change Photo' : 'Add Photo'}
            </Text>
          </Pressable>
          {photo || worker?.avatar_url ? (
            <Pressable
              style={styles.photoAction}
              onPress={() => {
                setPhoto(null);
                if (worker?.avatar_url) {
                  updateWorker(worker.id, { avatar_url: null }).catch(() => {});
                  worker.avatar_url = null;
                }
              }}
              hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              <Text style={[styles.photoActionText, { color: Colors.danger }]}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <TextField label="Full Name *" icon="person-outline" value={name} onChangeText={setName} />
      <TextField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Department" icon="business-outline" value={department} onChangeText={setDepartment} />

      <AppButton title="Save Changes" onPress={handleSave} loading={saving} size="lg" icon="save-outline" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  error: {
    color: Colors.danger,
    fontSize: 14,
    marginBottom: Spacing.md,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: 10,
  },
  photoCard: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  photoActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  photoAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  photoActionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});