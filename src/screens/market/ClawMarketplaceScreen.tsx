import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { searchOpenClawHub, invalidateHubCache } from '../../services/openclawHub.service';
import type { MarketStackParamList } from '../../navigation/types';
import TaskMarketScreen from '../TaskMarketScreen';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'Marketplace'>;

const SKILL_CATEGORIES = ['All', 'Dev Tools', 'AI Tools', 'Data', 'Integration', 'Commerce', 'Creative', 'Automation', 'Finance'];
const RESOURCE_CATEGORIES = ['All', 'Productivity', 'Code', 'Research', 'Creative', 'Business', 'Finance'];

// Mock fallback resources shown when API returns no paid items
const MOCK_RESOURCES = [
  { id: 'r1', icon: '🗄️', name: 'Cloud Storage Adapter', description: 'Unified S3/GCS/Azure interface — store and retrieve files via a single API', price: 0.01, tokenCost: null, rating: 4.6 },
  { id: 'r2', icon: '📊', name: 'Market Data API', description: 'Real-time stocks, crypto & forex data feed with historical support', price: 0.01, tokenCost: null, rating: 4.5 },
  { id: 'r3', icon: '🖥️', name: 'Cloud GPU Compute', description: 'On-demand A100/H100 GPU — pay-per-second billing for ML workloads', price: 0.50, tokenCost: null, rating: 4.6 },
  { id: 'r4', icon: '🔍', name: 'Web Search API', description: 'Programmatic web search with structured JSON results', price: 0.005, tokenCost: null, rating: 4.4 },
  { id: 'r5', icon: '🗺️', name: 'Maps & Geocoding', description: 'Address lookup, distance matrix and reverse geocoding', price: 0.002, tokenCost: null, rating: 4.3 },
  { id: 'r6', icon: '📧', name: 'Email Send API', description: 'Transactional email with templates, attachments and delivery tracking', price: 0.001, tokenCost: null, rating: 4.7 },
];

// OpenClaw Hub skills tab — uses the OpenClaw Hub search service
function OpenClawSkillsTab() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['openclawSkills', category, search],
    queryFn: async () => {
      try {
        const result = await searchOpenClawHub({
          q: search || undefined,
          category: category !== 'All' ? category : undefined,
          limit: 30,
        });
        const items = result?.items;
        return Array.isArray(items) && items.length > 0 ? items : null;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  // Fallback skills shown when hub is unreachable
  const MOCK_SKILLS = [
    { id: 's1', icon: '🔍', name: 'Web Search', description: 'AI-powered web search with relevance ranking', price: 0, tokenCost: 0, rating: 4.7 },
    { id: 's2', icon: '💻', name: 'Code Sandbox', description: 'Execute Python and JavaScript safely in sandbox', price: 0, tokenCost: 0, rating: 4.8 },
    { id: 's3', icon: '🧠', name: 'Long-Term Memory', description: 'Persistent memory across agent conversations', price: 0, tokenCost: 0, rating: 4.9 },
    { id: 's4', icon: '📊', name: 'Data Analysis', description: 'Analyse datasets and generate charts', price: 0, tokenCost: 0, rating: 4.6 },
    { id: 's5', icon: '🎨', name: 'Image Generator', description: 'Generate images from text prompts', price: 0, tokenCost: 0, rating: 4.3 },
    { id: 's6', icon: '🔌', name: 'API Connector', description: 'Connect to any REST or GraphQL API', price: 0, tokenCost: 0, rating: 4.5 },
  ];

  const skills: any[] = data ?? MOCK_SKILLS;

  return (
    <View style={styles.tabContainer}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search OpenClaw skills..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>
      <View>
        <FlatList
          data={SKILL_CATEGORIES}
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
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={skills}
          keyExtractor={(s: any) => String(s.id ?? s._id ?? s.name)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item: skill }: { item: any }) => (
            <TouchableOpacity
              style={styles.skillCard}
              activeOpacity={0.8}
              onPress={() => {
                const id = skill.id ?? skill._id;
                if (!id) return;
                navigation.navigate('SkillDetail', { skillId: String(id), skillName: skill.name ?? '' });
              }}
            >
              <Text style={styles.skillIcon}>{skill.icon || '⚡'}</Text>
              <Text style={styles.skillName} numberOfLines={2}>{skill.name}</Text>
              <Text style={styles.skillDesc} numberOfLines={2}>{skill.description}</Text>
              <View style={styles.skillFooter}>
                <Text style={styles.skillPrice}>
                  {skill.tokenCost != null && skill.tokenCost > 0 ? `${skill.tokenCost} tokens` : 'Free'}
                </Text>
                <Text style={styles.ratingText}>
                  {skill.installCount > 0 ? `${skill.installCount > 999 ? `${(skill.installCount/1000).toFixed(1)}k` : skill.installCount} ↓  ` : ''}
                  ⭐ {skill.rating ? Number(skill.rating).toFixed(1) : '—'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

// Resources & Goods tab — paid APIs/compute, falls back to mock data
function ResourcesTab() {
  const navigation = useNavigation<Nav>();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['resources', category, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('layer', 'resource');
      if (category !== 'All') params.set('resourceType', category.toLowerCase());
      if (search) params.set('q', search);
      params.set('limit', '20');
      try {
        const raw = await apiFetch<any>(`/unified-marketplace/search?${params.toString()}`);
        const items = raw?.items ?? raw?.data ?? raw;
        const arr: any[] = Array.isArray(items) ? items : [];
        const mapped = arr.map(s => ({
          id: s.id,
          name: s.displayName || s.name,
          description: s.description,
          icon: s.layer === 'resource' ? '📦' : '⚡',
          price: s.pricing?.pricePerCall ?? 0,
          tokenCost: 0,
          rating: s.rating ?? 0,
        }));
        const paid = mapped.filter(s => s.price > 0 || s.tokenCost > 0);
        return paid.length > 0 ? paid : null;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  const resources: any[] = data ?? MOCK_RESOURCES;

  return (
    <View style={styles.tabContainer}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources & goods..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
      </View>
      <View>
        <FlatList
          data={RESOURCE_CATEGORIES}
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
      </View>
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={resources}
          keyExtractor={(s: any) => String(s.id ?? s._id ?? s.name)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={{ gap: 12 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
          renderItem={({ item: res }: { item: any }) => (
            <TouchableOpacity
              style={styles.skillCard}
              activeOpacity={0.8}
              onPress={() => {
                const id = res.id ?? res._id;
                if (!id) return;
                navigation.navigate('SkillDetail', { skillId: String(id), skillName: res.name ?? '' });
              }}
            >
              <Text style={styles.skillIcon}>{res.icon || '📦'}</Text>
              <Text style={styles.skillName} numberOfLines={2}>{res.name}</Text>
              <Text style={styles.skillDesc} numberOfLines={2}>{res.description}</Text>
              <View style={styles.skillFooter}>
                <Text style={styles.skillPrice}>
                  {res.price != null && res.price > 0 ? `$${res.price}` : `${res.tokenCost ?? 0} tokens`}
                </Text>
                <Text style={styles.ratingText}>⭐ {res.rating ? Number(res.rating).toFixed(1) : '—'}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

export function ClawMarketplaceScreen() {
  const [activeTab, setActiveTab] = useState<'skills' | 'tasks' | 'resources'>('skills');

  return (
    <View style={styles.container}>
      {/* Custom Top Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'skills' && styles.tabItemActive]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>OpenClaw Skills</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.tabTextActive]}>Task Market</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'resources' && styles.tabItemActive]}
          onPress={() => setActiveTab('resources')}
        >
          <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>Resources & Goods</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'skills' && <OpenClawSkillsTab />}
        {activeTab === 'tasks' && <TaskMarketScreen />}
        {activeTab === 'resources' && <ResourcesTab />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 8,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.accent,
  },
  content: {
    flex: 1,
  },
  tabContainer: { flex: 1 },
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
    marginRight: 8,
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
  ratingText: { fontSize: 12, color: colors.textMuted },
});
