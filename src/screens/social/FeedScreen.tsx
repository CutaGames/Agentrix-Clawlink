import React, { useState } from 'react';import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { SocialStackParamList, MainTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<SocialStackParamList, 'Feed'>,
  BottomTabNavigationProp<MainTabParamList>
>;

const FEED_TABS = ['Hot', 'Latest', 'Following'];

async function fetchFeed(tab: string) {
  const endpoint = tab === 'Following' ? '/social/feed/following' :
                   tab === 'Latest' ? '/social/posts?sort=latest' : '/social/posts?sort=hot';
  try { return apiFetch(endpoint); }
  catch { return []; } // graceful fallback while social module is in dev
}

// Placeholder posts while backend builds out
const PLACEHOLDER_POSTS = [
  {
    id: '1', author: 'openclaw_fan', avatar: '🦀',
    content: 'Just deployed my first cloud agent via ClawLink! Running a research agent 24/7 now 🚀',
    likes: 42, comments: 7, time: '2h',
    tags: ['showcase', 'cloud'],
  },
  {
    id: '2', author: 'ai_builder', avatar: '🤖',
    content: 'Built a custom skill that auto-summarizes my emails every morning. 10/10 would recommend OpenClaw for productivity workflows.',
    likes: 87, comments: 15, time: '4h',
    tags: ['skill', 'productivity'],
  },
  {
    id: '3', author: 'claw_dev', avatar: '💻',
    content: 'New MCP skill published: "GitHub Auto-Review". Installs in 1-click from ClawLink Market. Check it out!',
    likes: 120, comments: 23, time: '6h',
    tags: ['skill', 'github', 'dev'],
  },
];

export function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const [feedTab, setFeedTab] = useState('Hot');
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Set header buttons for DM and CreatePost
  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Community',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
          <TouchableOpacity
            style={{ padding: 6 }}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ padding: 6 }}
            onPress={() => navigation.navigate('Chat')}
          >
            <Text style={{ fontSize: 20 }}>✉️</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['feed', feedTab],
    queryFn: () => fetchFeed(feedTab),
    retry: false,
  });

  const posts = (Array.isArray(data) && data.length > 0) ? data : PLACEHOLDER_POSTS;

  const renderPost = ({ item: post }: { item: any }) => (
    <TouchableOpacity
      style={styles.postCard}
      activeOpacity={0.8}
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
      <View style={styles.postHeader}>
        <TouchableOpacity
          onPress={() => post.authorId && navigation.navigate('UserProfile', { userId: post.authorId || post.id })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
        >
          <Text style={styles.postAvatar}>{post.avatar || '👤'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.postAuthor}>{post.author}</Text>
            <Text style={styles.postTime}>{post.time}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Text style={styles.postContent}>{post.content}</Text>
      {post.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((t: string) => (
            <View key={t} style={styles.tag}>
              <Text style={styles.tagText}>#{t}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>❤️ {post.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>💬 {post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>🔗 Share</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header with Chat button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community</Text>
        <TouchableOpacity style={styles.chatBtn} onPress={() => (navigation as any).navigate('ChatList')}>
          <Text style={styles.chatBtnText}>💬 Chats</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Tabs */}
      <View style={styles.tabs}>
        {FEED_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, feedTab === t && styles.tabActive]}
            onPress={() => setFeedTab(t)}
          >
            <Text style={[styles.tabText, feedTab === t && styles.tabTextActive]}>
              {t === 'Hot' ? '🔥 Hot' : t === 'Latest' ? '🆕 Latest' : '👥 Following'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p: any) => p.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  chatBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.accent + '22', borderRadius: 16, borderWidth: 1, borderColor: colors.accent },
  chatBtnText: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  tabs: { flexDirection: 'row', gap: 4, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bgCard },
  tabActive: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  list: { padding: 12, gap: 12 },
  postCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { fontSize: 28 },
  postAuthor: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  postTime: { fontSize: 11, color: colors.textMuted },
  postContent: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.bgSecondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  postActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: 13, color: colors.textMuted },
});
