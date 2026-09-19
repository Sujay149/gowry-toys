import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppHeader, Screen, TextField } from '@/components/ui';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { createWorker } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Worker } from '@/lib/types';

export default function AddWorkerScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Worker | null>(null);

  const canManage = profile?.role === 'admin' || profile?.role === 'supervisor';

  useEffect(() => {
    if (!canManage) {
      router.replace('/(tabs)/dashboard');
    }
  }, [canManage]);

  if (!canManage) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Worker name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const worker = await createWorker({
        name: name.trim(),
        phone: phone.trim() || undefined,
        department: department.trim() || undefined,
        designation: designation.trim() || undefined,
        joining_date: joiningDate.trim() || undefined,
      });
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
    setDesignation('');
    setJoiningDate('');
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
          title="Show QR Code"
          icon="qr-code"
          size="lg"
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
        The Company ID (WRKxxx) is generated automatically and cannot be changed.
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextField label="Full Name *" icon="person-outline" value={name} onChangeText={setName} placeholder="e.g. Ravi Kumar" />
      <TextField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} placeholder="9876543210" keyboardType="phone-pad" />
      <TextField label="Department" icon="business-outline" value={department} onChangeText={setDepartment} placeholder="e.g. Wood Cutting" />
      <TextField label="Designation" icon="briefcase-outline" value={designation} onChangeText={setDesignation} placeholder="e.g. Worker" />
      <TextField label="Joining Date (YYYY-MM-DD)" icon="calendar-outline" value={joiningDate} onChangeText={setJoiningDate} placeholder="2026-09-18" />

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