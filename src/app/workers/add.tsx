import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { createWorker } from '@/lib/api';
import { useAuth } from '@/lib/auth';

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

  if (profile?.role !== 'admin') {
    router.replace('/(tabs)/dashboard');
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
      Alert.alert(
        'Worker added',
        `${worker.name} created with Worker ID ${worker.worker_id}.`,
        [
          {
            text: 'Done',
            onPress: () => router.back(),
          },
          {
            text: 'Show QR',
            onPress: () => router.replace(`/workers/${worker.worker_id}/qr`),
          },
        ]
      );
    } catch (e) {
      setError('Could not add worker. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
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
    </ScrollView>
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
});