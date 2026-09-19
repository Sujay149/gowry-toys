import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppHeader, Avatar, Card, Screen, TextField } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { createWorker, todayString, updateWorker, uploadWorkerAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isInvalidSalaryInput, parseSalaryInput } from '@/lib/salary';
import type { Worker } from '@/lib/types';

export default function AddWorkerScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [dailySalaryText, setDailySalaryText] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; base64?: string | null; mimeType?: string | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Worker | null>(null);

  const isAdmin = profile?.role === 'admin';
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
    if (!name.trim()) {
      setError('Worker name is required.');
      return;
    }
    if (isAdmin && isInvalidSalaryInput(dailySalaryText)) {
      setError('Enter a valid daily salary (a number of 0 or more).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const worker = await createWorker({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        designation: 'Worker',
        joining_date: todayString(),
        daily_salary: isAdmin ? parseSalaryInput(dailySalaryText) : null,
      });
      if (photo) {
        const avatarUrl = await uploadWorkerAvatar(worker.id, photo);
        await updateWorker(worker.id, { avatar_url: avatarUrl });
        worker.avatar_url = avatarUrl;
      }
      setCreated(worker);
    } catch (e) {
      setError('Could not add worker. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCreated(null);
    setName('');
    setPhone('');
    setDepartment('');
    setDailySalaryText('');
    setPhoto(null);
    setError(null);
  };

  if (created) {
    return (
      <Screen
        padded={false}
        header={<AppHeader title="Add Worker" onBack={() => router.back()} />}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
        </View>
        <Text style={styles.successTitle}>Worker added</Text>
        <Text style={styles.successName}>{created.name}</Text>
        <Text style={styles.successId}>Worker ID: {created.worker_id}</Text>

        <AppButton
          title="Preview ID Card"
          icon="id-card-outline"
          size="lg"
          style={styles.successButton}
          onPress={() => router.replace(`/workers/${created.worker_id}/id-card`)}
        />
        <AppButton
          title="Show QR Code"
          icon="qr-code"
          variant="outline"
          style={styles.successButton}
          onPress={() => router.replace(`/workers/${created.worker_id}/qr`)}
        />
        <AppButton
          title="Add Another Worker"
          icon="add"
          variant="outline"
          style={styles.successButton}
          onPress={resetForm}
        />
        <AppButton
          title="Done"
          icon="checkmark-done"
          variant="secondary"
          style={styles.successButton}
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    <Screen
      padded={false}
      header={<AppHeader title="Add Worker" onBack={() => router.back()} />}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.hint}>
        The Company ID (WRKxxx) is generated automatically. Joining date and designation are set
        automatically.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.photoCard}>
        <Avatar name={name.trim() || '?'} size={88} source={photo?.uri} />
        <View style={styles.photoActions}>
          <Pressable style={styles.photoAction} onPress={pickPhoto} hitSlop={8}>
            <Ionicons name={photo ? 'camera-outline' : 'add-circle-outline'} size={18} color={Colors.primary} />
            <Text style={styles.photoActionText}>{photo ? 'Change Photo' : 'Add Photo'}</Text>
          </Pressable>
          {photo ? (
            <Pressable style={styles.photoAction} onPress={() => setPhoto(null)} hitSlop={8}>
              <Ionicons name="trash-outline" size={18} color={Colors.danger} />
              <Text style={[styles.photoActionText, { color: Colors.danger }]}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </Card>

      <TextField label="Full Name *" icon="person-outline" value={name} onChangeText={setName} placeholder="e.g. Ravi Kumar" />
      <TextField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" />
      <TextField label="Department" icon="business-outline" value={department} onChangeText={setDepartment} placeholder="e.g. Wood Cutting" />

      {isAdmin ? (
        <TextField
          label="Daily Salary (₹)"
          icon="cash-outline"
          value={dailySalaryText}
          onChangeText={setDailySalaryText}
          placeholder="e.g. 600"
          keyboardType="decimal-pad"
          hint="Optional. Used for payroll — 1 shift = 50%, 2 shifts = 100% of the daily rate."
        />
      ) : null}

      <AppButton title="Save Worker" onPress={handleSave} loading={saving} size="lg" icon="save-outline" />
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
  hint: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: Spacing.lg,
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
  successIcon: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
  },
  successName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  successId: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  successButton: {
    marginTop: Spacing.md,
  },
});