import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Badge, EmptyState } from '@/components/ui';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { fetchWorkers } from '@/lib/api';
import type { Worker } from '@/lib/types';

export default function WorkersScreen() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('active');

  const load = useCallback(async () => {
    const data = await fetchWorkers(true);
    setWorkers(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    let list = workers;
    if (filter === 'active') list = list.filter((w) => w.active);
    else if (filter === 'inactive') list = list.filter((w) => !w.active);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(q) ||
          w.worker_id.toLowerCase().includes(q) ||
          (w.department ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [workers, filter, query]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Workers</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? 'Loading…' : `${filtered.length} of ${workers.length} shown`}
          </Text>
        </View>
        <Pressable style={styles.headerAdd} onPress={() => router.push('/workers/add')} hitSlop={8}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={Colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, ID or department"
            placeholderTextColor={Colors.textMuted}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chips}>
        {(['active', 'all', 'inactive'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
              {f === 'active' ? 'Active' : f === 'inactive' ? 'Inactive' : 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Loading workers…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              icon="people-outline"
              title="No workers found"
              message={query ? 'Try a different search.' : 'Add workers to get started.'}
            />
          }
          renderItem={({ item }) => (
            <Pressable style={({ pressed }) => [styles.worker, pressed && { opacity: 0.8 }]} onPress={() => router.push(`/workers/${item.worker_id}`)}>
              <Avatar name={item.name} source={item.avatar_url ?? null} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>{item.name}</Text>
                <Text style={styles.workerId}>
                  {item.worker_id}
                  {item.department ? ` · ${item.department}` : ''}
                </Text>
              </View>
              <Badge
                label={item.active ? 'Active' : 'Inactive'}
                color={item.active ? Colors.success : Colors.textMuted}
                background={item.active ? Colors.successLight : Colors.background}
              />
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => router.push('/workers/add')}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerAdd: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  chip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.white,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  muted: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 96,
    gap: Spacing.sm,
  },
  worker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  workerName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  workerId: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});