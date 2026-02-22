import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import type { MarketStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'Marketplace'>;

const CATEGORIES = ['All', 'Productivity', 'Code', 'Research', 'Creative', 'Business', 'Finance'];

async function fetchSkills(category: string, search: string) {
  const params = new URLSearchParams();
  if (category !== 'All') params.set('category', category);
  if (search) params.set('search', search);
  params.set('limit', '20');
  try {
    return await apiFetch<any>(`/skills?${params.toString()}`);
  } catch (e) {
    return [];   // graceful fallback — avoid crashing the screen on network errors
  }
}

export function ClawMarketplaceScreen() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['skills', category, search],
    queryFn: () => fetchSkills(category, search),
  });

  // Normalise API response — backend may return {items:[...]}, {data:[...]}, or a bare array
  const rawSkills = data?.items ?? data?.data ?? data;
  const skills: any[] = Array.isArray(rawSkills) ? rawSkills : [];

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>

      {/* Categories */}
      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(c) => c}
        style={styles.catList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.catChip, category === item && styles.catChipActive]}
            onPress={() => setCategory(item)}
          >
            <Text style={[styles.catText, category === item && styles.catTextActive]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Skills Grid */}
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={skills}
          keyExtractor={(s: any) => String(s.id ?? s._id ?? Math.random())}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No skills found</Text>
            </View>
          }
          renderItem={({ item: skill }: { item: any }) => (
            <TouchableOpacity
              style={styles.skillCard}
              activeOpacity={0.8}
              onPress={() => {
                if (!skill.id && !skill._id) return;
                navigation.navigate('SkillDetail', { skillId: String(skill.id ?? skill._id), skillName: skill.name ?? '' });
              }}
            >
              <Text style={styles.skillIcon}>{skill.icon || '⚡'}</Text>
              <Text style={styles.skillName} numberOfLines={2}>{skill.name}</Text>
              <Text style={styles.skillDesc} numberOfLines={2}>{skill.description}</Text>
              <View style={styles.skillFooter}>
                <Text style={styles.skillPrice}>
                  {skill.price === 0 ? 'Free' : `$${skill.price}`}
                </Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingText}>⭐ {skill.rating?.toFixed(1) || '—'}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  searchRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchInput: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    color: colors.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catList: { maxHeight: 44, marginBottom: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  catText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  catTextActive: { color: colors.accent },
  grid: { padding: 16, paddingTop: 8, gap: 12 },
  skillCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skillIcon: { fontSize: 28 },
  skillName: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  skillDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  skillFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  skillPrice: { fontSize: 13, fontWeight: '700', color: colors.accent },
  ratingRow: {},
  ratingText: { fontSize: 12, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.textMuted, fontSize: 15 },
});
