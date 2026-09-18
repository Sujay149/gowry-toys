import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';

import { AppButton, TextField } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { fetchWorkerByWorkerId, updateWorker } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Worker } from '@/lib/types';

export default function EditWorkerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  const [worker, setWorker] = useState<Worker | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkerByWorkerId(id ?? '').then((w) => {
      if (!w) return;
      setWorker(w);
      setName(w.name);
      setPhone(w.phone ?? '');
      setDepartment(w.department ?? '');
      setDesignation(w.designation ?? '');
      setJoiningDate(w.joining_date ?? '');
    });
  }, [id]);

  if (profile?.role !== 'admin') {
    router.replace('/(tabs)/dashboard');
    return null;
  }

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
        designation: designation.trim() || undefined,
        joining_date: joiningDate.trim() || undefined,
      });
      Alert.alert('Saved', 'Worker details updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch {
      setError('Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.wid}>Worker ID: {worker?.worker_id ?? id} (cannot be changed)</Text>

      <TextField label="Full Name *" icon="person-outline" value={name} onChangeText={setName} />
      <TextField label="Phone" icon="call-outline" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Department" icon="business-outline" value={department} onChangeText={setDepartment} />
      <TextField label="Designation" icon="briefcase-outline" value={designation} onChangeText={setDesignation} />
      <TextField label="Joining Date (YYYY-MM-DD)" icon="calendar-outline" value={joiningDate} onChangeText={setJoiningDate} />

      <AppButton title="Save Changes" onPress={handleSave} loading={saving} size="lg" icon="save-outline" />
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
  error: {
    color: Colors.danger,
    fontSize: 14,
    marginBottom: Spacing.md,
    backgroundColor: Colors.dangerLight,
    padding: Spacing.md,
    borderRadius: 10,
  },
  wid: {
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: Spacing.lg,
  },
});