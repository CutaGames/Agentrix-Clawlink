// 技能市场首页
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { colors } from '../theme/colors';
import { marketplaceApi, SkillItem } from '../services/marketplace.api';
import { SkillCard } from '../components/market/SkillCard';
import { CategoryTabs } from '../components/market/CategoryTabs';

type MarketCategory = 'resources' | 'skills' | 'tasks';

interface Props {
  navigation: any;
}

export function MarketplaceScreen({ navigation }: Props) {
  const [category, setCategory] = useState<MarketCategory>('skills');
  const [subCategory, setSubCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const subCategories = marketplaceApi.getSubCategories(category);

  const loadData = useCallback(async (reset: boolean = false) => {
    const currentPage = reset ? 1 : page;
    if (reset) {
      setLoading(true);
    }

    try {
      const result = await marketplaceApi.search({
        category,
        subCategory: subCategory === 'All' ? undefined : subCategory,
        q: search || undefined,
        page: currentPage,
        limit: 20,
      });

      if (reset) {
        setItems(result.items);
      } else {
        setItems(prev => [...prev, ...result.items]);
      }
      setHasMore(currentPage < result.totalPages);
      setPage(currentPage + 1);
    } catch (e) {
      console.error('Failed to load marketplace:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category, subCategory, search, page]);

  useEffect(() => {
    setPage(1);
    setItems([]);
    loadData(true);
  }, [category, subCategory]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setItems([]);
      loadData(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    loadData(true);
  }, [category, subCategory, search]);

  const onEndReached = useCallback(() => {
    if (!loading && hasMore) {
      loadData(false);
    }
  }, [loading, hasMore, page]);

  const handleSkillPress = useCallback((skill: SkillItem) => {
    navigation.navigate('SkillDetail', { skillId: skill.id, skillName: skill.name });
  }, [navigation]);

  const handlePromote = useCallback((skill: SkillItem) => {
    navigation.navigate('CreateLink', {
      skillId: skill.id,
      skillName: skill.name,
      skillPrice: skill.price,
      skillPriceUnit: skill.priceUnit,
    });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: SkillItem }) => (
    <SkillCard
      skill={item}
      onPress={() => handleSkillPress(item)}
      onPromote={() => handlePromote(item)}
    />
  ), [handleSkillPress, handlePromote]);

  const renderHeader = () => (
    <View>
      {/* 搜索栏 */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search skills, resources or tasks..."
          placeholderTextColor={colors.muted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 三分类 Tab */}
      <CategoryTabs
        active={category}
        onChange={(c: 'resources' | 'skills' | 'tasks') => {
          if (c === 'tasks') {
            // Navigate to dedicated Task Market (Bounty Board) screen
            navigation.navigate('TaskMarket');
            return;
          }
          setCategory(c);
          setSubCategory('All');
        }}
      />

      {/* 子筛选 */}
      <View style={styles.subFilterRow}>
        {subCategories.map(sub => (
          <TouchableOpacity
            key={sub}
            style={[
              styles.subFilterChip,
              subCategory === sub && styles.subFilterChipActive,
            ]}
            onPress={() => setSubCategory(sub)}
          >
            <Text style={[
              styles.subFilterText,
              subCategory === sub && styles.subFilterTextActive,
            ]}>
              {sub}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyText}>No results</Text>
        <Text style={styles.emptySubtext}>Try different keywords or categories</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore && items.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>— All loaded —</Text>
        </View>
      );
    }
    if (loading && items.length > 0) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  listContent: {
    paddingBottom: 20,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    padding: 0,
  },
  clearBtn: {
    color: colors.muted,
    fontSize: 16,
    paddingLeft: 8,
  },
  // Sub filters
  subFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  subFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subFilterChipActive: {
    backgroundColor: colors.primary + '20',
    borderColor: colors.primary,
  },
  subFilterText: {
    color: colors.muted,
    fontSize: 13,
  },
  subFilterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 4,
  },
  // Footer
  footerContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    color: colors.muted,
    fontSize: 13,
  },
});
