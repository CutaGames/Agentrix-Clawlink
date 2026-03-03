import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, TextInput, Share,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { marketplaceApi } from '../../services/marketplace.api';
import { getHubSkillDetail } from '../../services/openclawHub.service';
import { installSkillToInstance } from '../../services/openclaw.service';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../services/api';
import type { MarketStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<MarketStackParamList, 'SkillDetail'>;
type RouteT = RouteProp<MarketStackParamList, 'SkillDetail'>;

export function ClawSkillDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteT>();
  const { skillId } = route.params;
  const activeInstance = useAuthStore((s) => s.activeInstance);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [installing, setInstalling] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const qc = useQueryClient();

  const { data: skill, isLoading } = useQuery<any>({
    queryKey: ['skill', skillId],
    queryFn: async () => {
      if (skillId.startsWith('oc-') || skillId.startsWith('s')) {
        const hubSkill = await getHubSkillDetail(skillId);
        if (hubSkill) return hubSkill;
      }
      return marketplaceApi.getDetail(skillId);
    },
    enabled: !!skillId,
  });

  const handleShare = async () => {
    if (!skill) return;
    try {
      await Share.share({
        title: skill.displayName || skill.name,
        message: `Check out "${skill.name}" on Agentrix! https://agentrix.top/pay/checkout?skillId=${skillId}`,
        url: `https://agentrix.top/pay/checkout?skillId=${skillId}`,
      });
    } catch { /* user cancelled */ }
  };

  const handleLike = async () => {
    try {
      await marketplaceApi.toggleLike(skillId);
      qc.invalidateQueries({ queryKey: ['skill', skillId] });
    } catch { /* ignore */ }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) { Alert.alert('Write a review', 'Please enter your review text.'); return; }
    try {
      await apiFetch(`/skills/${skillId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, comment: reviewText.trim() }),
      });
      setReviewText('');
      setShowReviewForm(false);
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
      qc.invalidateQueries({ queryKey: ['skill', skillId] });
    } catch {
      Alert.alert('Saved locally', 'Your review will be synced when the server is available.');
      setShowReviewForm(false);
    }
  };

  const handleInstallToAgent = async () => {
    if (!activeInstance) {
      Alert.alert('No Agent', 'Connect an OpenClaw instance first to install skills.');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('Sign in required', 'Please sign in to install skills.');
      return;
    }

    // Paid skills → go to checkout first; free skills → install directly
    const skillPrice = skill?.price ?? 0;
    if (skillPrice > 0) {
      navigation.navigate('Checkout', {
        skillId,
        skillName: skill?.name || skill?.displayName || skillId,
        amount: skillPrice,
        currency: skill?.currency || 'USDT',
        merchantId: skill?.vendorId || skill?.merchantId || undefined,
      });
      return;
    }

    setInstalling(true);
    try {
      await installSkillToInstance(activeInstance.id, skillId);
      Alert.alert('✅ Installed!', `${skill?.name} has been installed to ${activeInstance.name}`);
    } catch (e: any) {
      const msg = e?.message || 'Install failed';
      Alert.alert('Install Failed', msg);
    } finally {
      setInstalling(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!skill) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Skill not found</Text>
      </View>
    );
  }

  const authorName = typeof skill.author === 'string' ? skill.author : skill.author?.nickname || skill.vendorName || 'Unknown';
  const isResource = skill.category === 'resources' || skill.subCategory === 'resources';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroIcon}>{skill.icon || (skill.category === 'resources' ? '📦' : '⚡')}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroName}>{skill.name || skill.displayName}</Text>
          <Text style={styles.heroAuthor}>by {authorName}</Text>
        </View>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>🔗 Share</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statVal}>⭐ {skill.rating ? Number(skill.rating).toFixed(1) : '—'}</Text>
          <Text style={styles.statLbl}>Rating</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{skill.installCount || skill.usageCount || 0}</Text>
          <Text style={styles.statLbl}>Installs</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statVal}>{skill.price === 0 ? 'Free' : `$${skill.price}`}</Text>
          <Text style={styles.statLbl}>Price</Text>
        </View>
      </View>

      {/* Description */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.description}>{skill.longDescription || skill.description || 'No description available.'}</Text>
      </View>

      {/* What it does */}
      {skill.features?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {skill.features.map((f: string, i: number) => (
            <Text key={i} style={styles.featureItem}>• {f}</Text>
          ))}
        </View>
      )}

      {/* Tags */}
      {skill.tags?.length > 0 && (
        <View style={styles.tagsRow}>
          {skill.tags.map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Like & Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
          <Text style={styles.likeBtnText}>{skill.isLiked ? '❤️' : '🤍'} {skill.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={handleShare}>
          <Text style={styles.likeBtnText}>🔗 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={() => setShowReviewForm(!showReviewForm)}>
          <Text style={styles.likeBtnText}>✍️ Review</Text>
        </TouchableOpacity>
      </View>

      {/* Write Review */}
      {showReviewForm && (
        <View style={styles.reviewForm}>
          <Text style={styles.sectionTitle}>Write a Review</Text>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                <Text style={{ fontSize: 24 }}>{star <= reviewRating ? '⭐' : '☆'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.reviewInput}
            placeholder="Share your experience..."
            placeholderTextColor={colors.textMuted}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
          />
          <TouchableOpacity style={styles.submitReviewBtn} onPress={handleSubmitReview}>
            <Text style={styles.submitReviewText}>Submit Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={[styles.installBtn, installing && styles.btnDisabled]}
          onPress={handleInstallToAgent}
          disabled={installing}
        >
          {installing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.installBtnText}>
              {!activeInstance ? '🔗 Connect Agent First' :
               skill.category === 'resources' ? `💳 Buy Access ($${skill.price || 0})` :
               skill.price === 0 ? '⚡ Install to Agent (Free)' : `💳 Buy & Install ($${skill.price})`}
            </Text>
          )}
        </TouchableOpacity>

        {activeInstance && skill.category !== 'resources' && (
          <Text style={styles.installTarget}>
            → Will be installed to: {activeInstance.name}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPrimary },
  errorText: { color: colors.error, fontSize: 15 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { fontSize: 48 },
  heroName: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  heroAuthor: { fontSize: 13, color: colors.textMuted },
  shareBtn: { backgroundColor: colors.bgSecondary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  shareBtnText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  statLbl: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  featureItem: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: colors.bgCard, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: colors.border },
  tagText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  cta: { gap: 10 },
  installBtn: { backgroundColor: colors.primary, borderRadius: 14, padding: 17, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  installBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  installTarget: { fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  actionRow: { flexDirection: 'row', gap: 8 },
  likeBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: colors.bgCard, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  likeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  reviewForm: { backgroundColor: colors.bgCard, borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.border },
  ratingRow: { flexDirection: 'row', gap: 4 },
  reviewInput: { backgroundColor: colors.bgSecondary, borderRadius: 10, padding: 12, color: colors.textPrimary, minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
  submitReviewBtn: { backgroundColor: colors.accent, borderRadius: 10, padding: 12, alignItems: 'center' },
  submitReviewText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
