import { Alert } from 'react-native';
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { useI18n } from '../../stores/i18nStore';
import type { SocialStackParamList, MainTabParamList } from '../../navigation/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp } from '@react-navigation/native';

type Nav = CompositeNavigationProp<
  NativeStackNavigationProp<SocialStackParamList, 'Feed'>,
  BottomTabNavigationProp<MainTabParamList>
>;

type Post = {
  id: string;
  authorId?: string;
  author: string;
  avatar?: string;
  content: string;
  tags?: string[];
  skillId?: string;   // If present, "Fork & Install" is available
  skillName?: string;
  likes: number;
  comments: number;
  time: string;
  isLiked?: boolean;
  badges?: string[];
};

const FEED_TABS = ['Hot', 'Latest', 'Following'];
// Claw-focused trending tags
const TRENDING_TAGS = ['claw安装', 'claw技巧', '技能分享', '新手入门', '进阶技巧', '一键安装', 'MCP教程', '工作流'];

const BADGE_CONFIG: Record<string, { icon: string; color: string }> = {
  '官方': { icon: '🦀', color: '#00C2FF' },
  'Top Creator': { icon: '⭐', color: '#F59E0B' },
  'Genesis Node': { icon: '⚡', color: '#00d4ff' },
  '进阶玩家': { icon: '🔮', color: '#7c3aed' },
};

// Placeholder posts focused on Claw installation and usage tutorials
const PLACEHOLDER_POSTS: Post[] = [
  {
    id: 'pin-1', authorId: 'official', author: 'Agentrix-claw', avatar: '🦀',
    content: '【新手必读】OpenClaw 完整安装教程\n\n1. 访问 agentrix.top 注册账号\n2. 在「我的实例」中一键开通云端 Claw\n3. 复制安装脚本，在本地终端执行\n4. 安装完成后绑定到 App 即可使用\n\n有任何问题欢迎在评论区提问 👇',
    likes: 318, comments: 52, time: '官方置顶', isLiked: false,
    tags: ['新手入门', 'claw安装', '一键安装'], badges: ['官方'],
  },
  {
    id: 'pin-2', authorId: 'official', author: 'Agentrix-claw', avatar: '🦀',
    content: '【进阶指南】如何给你的 Claw 安装 MCP 技能包\n\n MCP（Model Context Protocol）技能是扩展 Claw 能力的核心方式。\n\n✅ 一键安装：打开市场 → 「OpenClaw」标签 → 点击安装\n✅ 手动安装：编辑 claw_config.json 添加技能包路径\n✅ 推荐技能：Web Search、Code Executor、GitHub Review\n\n安装完成后重启实例即可生效。',
    likes: 245, comments: 38, time: '1d', isLiked: false,
    tags: ['进阶技巧', 'MCP教程', '技能分享'], badges: ['官方'],
  },
  {
    id: '3', authorId: 'u3', author: 'claw_dev', avatar: '💻',
    content: '折腾了一晚上终于把 Claw 本地版跑起来了！关键是要先装好 Node.js 18+ 和 Docker，然后用 App 里的安装脚本一键搞定。\n\n本地版比云端版延迟低不少，推荐有服务器的朋友试试 🎉',
    likes: 127, comments: 31, time: '3h', isLiked: false,
    tags: ['claw安装', 'claw技巧', '新手入门'], badges: ['Genesis Node'],
  },
  {
    id: 'pin-3', authorId: 'official', author: 'Agentrix-claw', avatar: '🦀',
    content: '【高阶玩法】自己写 MCP Skill 并发布到市场\n\n1. 克隆 OpenClaw SDK：git clone https://github.com/openclaw/sdk\n2. 实现 execute() 方法，处理工具调用\n3. 在 skill.json 中定义技能元数据\n4. 提交到社区市场供大家安装\n\n目前社区已有 5200+ 技能，欢迎贡献！',
    likes: 189, comments: 27, time: '2d', isLiked: false,
    tags: ['进阶技巧', 'MCP教程', '技能分享'], badges: ['官方'],
  },
  {
    id: '5', authorId: 'u5', author: 'workflow_pro', avatar: '⚡',
    content: '分享我的每日自动化工作流：\n早上 8 点 → Claw 自动爬取行业新闻 + AI 摘要推送微信\n下午 → 自动整理邮件、生成日报\n晚上 → GitHub PR 自动审查提醒\n\n全程无需人工干预，效率提升 300%！',
    likes: 203, comments: 44, time: '5h', isLiked: false,
    tags: ['工作流', '进阶技巧', 'claw技巧'], badges: ['进阶玩家'],
  },
  {
    id: '6', authorId: 'u6', author: 'newbie_claw', avatar: '🌱',
    content: '第一次用 Claw，照着官方教程安装成功啦！\n感觉 Web Search 这个技能真的很好用，搜索出来的结果还会自动摘要，比直接用搜索引擎方便多了 👍\n大佬们有没有推荐的进阶技能？',
    likes: 56, comments: 18, time: '1h', isLiked: false,
    tags: ['新手入门', '技能分享'], badges: [],
  },
];

async function fetchFeedPage(tab: string, tag: string | null, page: number): Promise<Post[]> {
  const params = new URLSearchParams({ sort: tab.toLowerCase(), page: String(page) });
  if (tag) params.set('tag', tag);
  const endpoint = tab === 'Following' ? `/social/feed/following?${params}` : `/social/posts?${params}`;
  try { return apiFetch<Post[]>(endpoint); }
  catch { return []; }
}

async function likePost(postId: string) {
  return apiFetch(`/social/posts/${postId}/like`, { method: 'POST' });
}

export function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const [feedTab, setFeedTab] = useState('Hot');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const qc = useQueryClient();

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['feed', feedTab, activeTag],
      queryFn: ({ pageParam }) => fetchFeedPage(feedTab, activeTag, pageParam as number),
      initialPageParam: 1,
      getNextPageParam: (lastPage, allPages) =>
        Array.isArray(lastPage) && lastPage.length >= 10 ? allPages.length + 1 : undefined,
      retry: false,
    });

  const allPosts: Post[] = data?.pages?.flatMap((p) => (Array.isArray(p) && p.length > 0 ? p : []))
    ?? [];
  const posts = allPosts.length > 0 ? allPosts : PLACEHOLDER_POSTS.filter((p) => !activeTag || p.tags?.includes(activeTag));

  const likeMut = useMutation({
    mutationFn: (postId: string) => likePost(postId),
    onMutate: (postId) => {
      qc.setQueryData(['feed', feedTab, activeTag], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((p: Post) =>
              p.id === postId
                ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
                : p
            )
          ),
        };
      });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed', feedTab, activeTag] }),
  });

  const handleTagPress = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? null : tag));
  }, []);

  const renderPost = useCallback(({ item: post }: { item: Post }) => (
    <TouchableOpacity
      style={styles.postCard}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
      {/* Author row */}
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => post.authorId && navigation.navigate('UserProfile', { userId: post.authorId })}
      >
        <Text style={styles.postAvatar}>{post.avatar ?? '👤'}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.authorNameRow}>
            <Text style={styles.postAuthor}>{post.author}</Text>
            {post.badges?.map((b) => {
              const cfg = BADGE_CONFIG[b];
              if (!cfg) return null;
              return (
                <View key={b} style={[styles.badgePill, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '66' }]}>
                  <Text style={[styles.badgePillText, { color: cfg.color }]}>{cfg.icon}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.postTime}>{post.time}</Text>
        </View>
      </TouchableOpacity>

      {/* Content */}
      <Text style={styles.postContent} numberOfLines={5}>{post.content}</Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, activeTag === tag && styles.tagActive]}
              onPress={() => handleTagPress(tag)}
            >
              <Text style={[styles.tagText, activeTag === tag && styles.tagTextActive]}>#{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={(e) => { e.stopPropagation(); likeMut.mutate(post.id); }}
        >
          <Text style={[styles.actionText, post.isLiked && styles.actionLiked]}>
            {post.isLiked ? '❤️' : '🤍'} {post.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>💬 {post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionText}>🔗 {t({ en: 'Share', zh: '分享' })}</Text>
        </TouchableOpacity>
        {/* Fork & Install — shown when post has an associated skill */}
        {post.skillId && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.installBtn]}
            onPress={(e) => {
              e.stopPropagation();
              Alert.alert(
                t({ en: '⚡ Fork & Install', zh: '⚡ Fork & 安装' }),
                `${t({ en: 'Install', zh: '安装' })} "${post.skillName ?? post.skillId}" ${t({ en: 'from the marketplace?', zh: '从市场中安装？' })}`,
                [
                  { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
                  {
                    text: t({ en: 'Install', zh: '安装' }),
                    onPress: () => {
                      // Navigate to Explore tab → Checkout for this skill
                      (navigation as any).navigate('Explore', {
                        screen: 'Checkout',
                        params: { skillId: post.skillId, skillName: post.skillName },
                      });
                    },
                  },
                ],
              );
            }}
          >
            <Text style={[styles.actionText, styles.installText]}>⚡ {t({ en: 'Install', zh: '安装' })}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  ), [navigation, activeTag, handleTagPress, likeMut]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🦀 {t({ en: 'Claw Community', zh: 'Claw 社区' })}</Text>
          <Text style={styles.headerSubtitle}>{t({ en: 'Install · Use · Share skills', zh: '安装 · 使用 · 分享技能' })}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('CreatePost' as any)}>
            <Text style={styles.headerIcon}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('ChatList' as any)}>
            <Text style={styles.headerIcon}>💬</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Feed Tabs */}
      <View style={styles.tabs}>
        {FEED_TABS.map((tabLabel) => (
          <TouchableOpacity
            key={tabLabel}
            style={[styles.tab, feedTab === tabLabel && styles.tabActive]}
            onPress={() => { setFeedTab(tabLabel); setActiveTag(null); }}
          >
            <Text style={[styles.tabText, feedTab === tabLabel && styles.tabTextActive]}>
              {tabLabel === 'Hot' ? `🔥 ${t({ en: 'Hot', zh: '热门' })}` : tabLabel === 'Latest' ? `🆕 ${t({ en: 'Latest', zh: '最新' })}` : `👥 ${t({ en: 'Following', zh: '关注' })}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trending Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tagScroll}
        contentContainerStyle={styles.tagScrollContent}
      >
        {TRENDING_TAGS.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={[styles.trendingTag, activeTag === tag && styles.trendingTagActive]}
            onPress={() => handleTagPress(tag)}
          >
            <Text style={[styles.trendingTagText, activeTag === tag && styles.trendingTagTextActive]}>#{tag}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          renderItem={renderPost}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { qc.removeQueries({ queryKey: ['feed'] }); refetch(); }} tintColor={colors.accent} />}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator color={colors.accent} style={{ marginVertical: 16 }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary },
  headerSubtitle: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  headerIcon: { fontSize: 16 },
  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: colors.bgCard },
  tabActive: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent },
  tabText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.accent },
  tagScroll: { maxHeight: 40 },
  tagScrollContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  trendingTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border },
  trendingTagActive: { backgroundColor: colors.accent + '22', borderColor: colors.accent },
  trendingTagText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  trendingTagTextActive: { color: colors.accent },
  list: { padding: 12, gap: 10 },
  postCard: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: colors.border },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: { fontSize: 28 },
  authorNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  postAuthor: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  badgePill: { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1 },
  badgePillText: { fontSize: 10, fontWeight: '700' },
  postTime: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  postContent: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { backgroundColor: colors.bgSecondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'transparent' },
  tagActive: { borderColor: colors.accent, backgroundColor: colors.accent + '1a' },
  tagText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  tagTextActive: { color: colors.accent },
  postActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.bgSecondary, borderRadius: 16 },
  actionText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  actionLiked: { color: '#ef4444' },
  installBtn: { backgroundColor: colors.accent + '22', borderWidth: 1, borderColor: colors.accent + '55' },
  installText: { color: colors.accent },
});
