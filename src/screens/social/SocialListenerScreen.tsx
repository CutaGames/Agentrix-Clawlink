/**
 * SocialListenerScreen — Manage & monitor Social Listener integrations.
 *
 * Shows connection status for Telegram, Discord, Twitter;
 * lets users register the Telegram bot webhook in one tap;
 * displays a live event log of incoming social events.
 * Includes step-by-step guided setup for beginners.
 *
 * Backend endpoints used:
 *   GET  /social/callback/status           — platform status + webhook URLs
 *   POST /social/callback/telegram/setup   — register Telegram webhook
 *   GET  /social/callback/events           — recent 50 events
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { useI18n } from '../../stores/i18nStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PlatformStatus {
  telegram: { connected: boolean; botUsername: string; webhookUrl: string };
  discord:  { connected: boolean; clientId: string; interactionsUrl: string };
  twitter:  { connected: boolean; webhookUrl: string };
}

interface SocialEvent {
  id: string;
  platform: 'telegram' | 'discord' | 'twitter';
  eventType: 'mention' | 'dm' | 'message' | 'command';
  senderName: string;
  text: string;
  timestamp: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_META: Record<string, { icon: string; color: string; label: string }> = {
  telegram: { icon: '✈️', color: '#229ED9', label: 'Telegram' },
  discord:  { icon: '🎮', color: '#5865F2', label: 'Discord' },
  twitter:  { icon: '𝕏', color: '#1a1a2e', label: 'Twitter / X' },
};

function copyToClipboard(text: string, label: string) {
  Clipboard.setStringAsync(text).catch(() => {});
  Alert.alert('Copied!', `${label} copied to clipboard.`);
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Guided Setup Steps ────────────────────────────────────────────────────────

function TelegramGuide({ botUsername, webhookUrl, onSetup, settingUp, t }: {
  botUsername: string;
  webhookUrl: string;
  onSetup: () => void;
  settingUp: boolean;
  t: any;
}) {
  return (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>{t({ en: '📖 Quick Setup Guide', zh: '📖 快速设置指南' })}</Text>
      
      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Register Webhook (One-Tap)', zh: '注册 Webhook（一键完成）' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: 'Tap the button below to automatically register the webhook with your Telegram bot.', zh: '点击下方按钮自动向你的 Telegram 机器人注册 Webhook。' })}</Text>
          <TouchableOpacity
            style={[styles.guideBtn, settingUp && { opacity: 0.6 }]}
            onPress={onSetup}
            disabled={settingUp}
          >
            {settingUp ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.guideBtnText}>⚡ {t({ en: 'Register Webhook', zh: '注册 Webhook' })}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Open your Telegram Bot', zh: '打开你的 Telegram 机器人' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: `Open @${botUsername} in Telegram and send /start to activate it.`, zh: `在 Telegram 中打开 @${botUsername}，发送 /start 来激活。` })}</Text>
          <TouchableOpacity
            style={styles.guideBtnOutline}
            onPress={() => Linking.openURL(`https://t.me/${botUsername}`)}
          >
            <Text style={styles.guideBtnOutlineText}>💬 {t({ en: 'Open Bot in Telegram', zh: '在 Telegram 中打开机器人' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Start Chatting!', zh: '开始聊天！' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: 'Send any message to your bot. Your AI agent will automatically reply! Messages will appear in the event log below.', zh: '向机器人发送任意消息，你的 AI 智能体会自动回复！消息会出现在下方的事件日志中。' })}</Text>
        </View>
      </View>
    </View>
  );
}

function DiscordGuide({ clientId, interactionsUrl, t }: { clientId: string; interactionsUrl: string; t: any }) {
  return (
    <View style={styles.guideContainer}>
      <Text style={styles.guideTitle}>{t({ en: '📖 Discord Setup Guide', zh: '📖 Discord 设置指南' })}</Text>
      
      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Open Discord Developer Portal', zh: '打开 Discord 开发者门户' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: 'Go to your application settings in the Discord Developer Portal.', zh: '进入 Discord 开发者门户中的应用设置。' })}</Text>
          <TouchableOpacity
            style={styles.guideBtnOutline}
            onPress={() => Linking.openURL(`https://discord.com/developers/applications/${clientId}/information`)}
          >
            <Text style={styles.guideBtnOutlineText}>🔗 {t({ en: 'Open Dev Portal', zh: '打开开发者门户' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Set Interactions URL', zh: '设置交互 URL' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: 'Copy the Interactions URL below and paste it in your Discord app\'s "Interactions Endpoint URL" field.', zh: '复制下方的交互 URL，粘贴到 Discord 应用的「Interactions Endpoint URL」字段。' })}</Text>
          <TouchableOpacity
            style={styles.guideBtnOutline}
            onPress={() => copyToClipboard(interactionsUrl, 'Interactions URL')}
          >
            <Text style={styles.guideBtnOutlineText}>📋 {t({ en: 'Copy Interactions URL', zh: '复制交互 URL' })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.guideStep}>
        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.stepTitle}>{t({ en: 'Invite Bot to Server', zh: '邀请机器人到服务器' })}</Text>
          <Text style={styles.stepDesc}>{t({ en: 'Add the bot to your Discord server using OAuth2 → Bot permissions. Your AI agent will respond to mentions and commands.', zh: '使用 OAuth2 → Bot 权限将机器人添加到你的 Discord 服务器。你的 AI 智能体会自动回复提及和命令。' })}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  status,
  onSetupTelegram,
  settingUp,
  expanded,
  onToggleExpand,
  t,
}: {
  platform: 'telegram' | 'discord' | 'twitter';
  status: PlatformStatus;
  onSetupTelegram: () => void;
  settingUp: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  t: any;
}) {
  const meta = PLATFORM_META[platform];
  const connected =
    platform === 'telegram' ? status.telegram.connected
    : platform === 'discord' ? status.discord.connected
    : status.twitter.connected;

  const webhookUrl =
    platform === 'telegram' ? status.telegram.webhookUrl
    : platform === 'discord' ? status.discord.interactionsUrl
    : status.twitter.webhookUrl;

  const subtitle =
    platform === 'telegram'
      ? `@${status.telegram.botUsername}`
      : platform === 'discord'
      ? `Client: ${status.discord.clientId}`
      : 'Account Activity API';

  return (
    <View style={[styles.card, { borderLeftColor: meta.color, borderLeftWidth: 3 }]}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggleExpand} activeOpacity={0.7}>
        <Text style={styles.cardIcon}>{meta.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{meta.label}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#22c55e' : '#f59e0b' }]} />
        <Text style={[styles.statusLabel, { color: connected ? '#22c55e' : '#f59e0b' }]}>
          {connected ? t({ en: 'Ready', zh: '已就绪' }) : t({ en: 'Config needed', zh: '需要配置' })}
        </Text>
        <Text style={styles.expandArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <>
          {/* Webhook URL row */}
          <TouchableOpacity
            style={styles.urlRow}
            onPress={() => copyToClipboard(webhookUrl, 'Webhook URL')}
            activeOpacity={0.7}
          >
            <Text style={styles.urlText} numberOfLines={1}>{webhookUrl}</Text>
            <Text style={styles.copyIcon}>📋</Text>
          </TouchableOpacity>

          {/* Platform-specific guided setup */}
          {platform === 'telegram' && (
            <TelegramGuide
              botUsername={status.telegram.botUsername}
              webhookUrl={status.telegram.webhookUrl}
              onSetup={onSetupTelegram}
              settingUp={settingUp}
              t={t}
            />
          )}

          {platform === 'discord' && (
            <DiscordGuide
              clientId={status.discord.clientId}
              interactionsUrl={status.discord.interactionsUrl}
              t={t}
            />
          )}

          {platform === 'twitter' && (
            <View style={styles.guideContainer}>
              <Text style={styles.guideTitle}>{t({ en: '📖 Twitter/X Setup Guide', zh: '📖 Twitter/X 设置指南' })}</Text>
              <View style={styles.guideStep}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{t({ en: 'Open Twitter Developer Portal', zh: '打开 Twitter 开发者门户' })}</Text>
                  <Text style={styles.stepDesc}>
                    {t({ en: 'Go to developer.x.com, create a project, and navigate to Account Activity API settings.', zh: '前往 developer.x.com，创建项目，然后进入 Account Activity API 设置。' })}
                  </Text>
                  <TouchableOpacity
                    style={styles.guideBtnOutline}
                    onPress={() => Linking.openURL('https://developer.x.com')}
                  >
                    <Text style={styles.guideBtnOutlineText}>🔗 {t({ en: 'Open Developer Portal', zh: '打开开发者门户' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.guideStep}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{t({ en: 'Register Webhook URL', zh: '注册 Webhook URL' })}</Text>
                  <Text style={styles.stepDesc}>
                    {t({ en: 'Copy the webhook URL above and paste it in the Account Activity API → Webhook URL field.', zh: '复制上方的 Webhook URL，粘贴到 Account Activity API → Webhook URL 字段。' })}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SocialListenerScreen() {
  const qc = useQueryClient();
  const { t, language } = useI18n();
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>('telegram');

  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useQuery({
    queryKey: ['social-listener-status'],
    queryFn: () => apiFetch<{ ok: boolean; platforms: PlatformStatus }>('/social/callback/status'),
    retry: false,
  });

  const { data: eventsData, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['social-listener-events'],
    queryFn: () => apiFetch<{ ok: boolean; events: SocialEvent[] }>('/social/callback/events'),
    refetchInterval: 10000, // poll every 10s
    retry: false,
  });

  const setupMut = useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean; description?: string; webhookUrl?: string }>(
        '/social/callback/telegram/setup',
        { method: 'POST' },
      ),
    onSuccess: (res) => {
      if (res.ok) {
        Alert.alert(
          t({ en: '✅ Webhook Registered', zh: '✅ Webhook 已注册' }),
          t({ en: `Telegram bot is now receiving messages. Open your bot and send a message to test!`, zh: `Telegram 机器人现已开始接收消息。打开你的机器人发送一条消息测试吧！` })
        );
      } else {
        Alert.alert(t({ en: 'Setup Failed', zh: '设置失败' }), res.description ?? t({ en: 'Unknown error', zh: '未知错误' }));
      }
      qc.invalidateQueries({ queryKey: ['social-listener-status'] });
    },
    onError: (e: any) => Alert.alert(t({ en: 'Error', zh: '错误' }), e.message ?? t({ en: 'Setup failed', zh: '设置失败' })),
  });

  const onRefresh = useCallback(() => {
    refetchStatus();
    refetchEvents();
  }, [refetchStatus, refetchEvents]);

  const status = statusData?.platforms;
  const events: SocialEvent[] = eventsData?.events ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={statusLoading && eventsLoading}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
    >
      {/* Header info */}
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>🌐 {t({ en: 'Social Listener', zh: 'Social Listener 社交监听' })}</Text>
        <Text style={styles.headerSub}>
          {t({ en: 'Connect your Telegram, Discord and Twitter bots. Incoming mentions and messages will be routed to your agents automatically.', zh: '连接你的 Telegram、Discord 和 Twitter 机器人。收到的提及和消息将自动转发到你的智能体。' })}
        </Text>
      </View>

      {/* Quick start tip for beginners */}
      <View style={styles.tipBox}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          {t({ en: 'Tip: Start with Telegram — it\'s the easiest to set up! Just tap the card below, then follow the 3-step guide.', zh: '提示：建议从 Telegram 开始——设置最简单！点击下方卡片，按照 3 步指南操作即可。' })}
        </Text>
      </View>

      {statusLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} />
      ) : status ? (
        <>
          <PlatformCard
            platform="telegram"
            status={status}
            onSetupTelegram={() => setupMut.mutate()}
            settingUp={setupMut.isPending}
            expanded={expandedPlatform === 'telegram'}
            onToggleExpand={() => setExpandedPlatform(expandedPlatform === 'telegram' ? null : 'telegram')}
            t={t}
          />
          <PlatformCard
            platform="discord"
            status={status}
            onSetupTelegram={() => {}}
            settingUp={false}
            expanded={expandedPlatform === 'discord'}
            onToggleExpand={() => setExpandedPlatform(expandedPlatform === 'discord' ? null : 'discord')}
            t={t}
          />
          <PlatformCard
            platform="twitter"
            status={status}
            onSetupTelegram={() => {}}
            settingUp={false}
            expanded={expandedPlatform === 'twitter'}
            onToggleExpand={() => setExpandedPlatform(expandedPlatform === 'twitter' ? null : 'twitter')}
            t={t}
          />
        </>
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {t({ en: 'Could not load status — check backend connection.', zh: '无法加载状态——请检查后端连接。' })}</Text>
          <TouchableOpacity onPress={() => refetchStatus()} style={styles.retryBtn}>
            <Text style={styles.retryText}>{t({ en: 'Retry', zh: '重试' })}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Log */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📥 {t({ en: 'Recent Events', zh: '最近事件' })}</Text>
        {eventsLoading && <ActivityIndicator color={colors.accent} size="small" />}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyEvents}>
          <Text style={styles.emptyEventsText}>
            {t({ en: `No events yet. Send a message to @${status?.telegram.botUsername ?? 'your bot'} on Telegram or mention your Discord bot to see events here.`, zh: `暂无事件。在 Telegram 上给 @${status?.telegram.botUsername ?? '你的机器人'} 发送消息，或在 Discord 中 @你的机器人来查看事件。` })}
          </Text>
        </View>
      ) : (
        events.map((ev) => {
          const meta = PLATFORM_META[ev.platform] ?? PLATFORM_META.twitter;
          return (
            <View key={ev.id} style={styles.eventRow}>
              <Text style={styles.eventIcon}>{meta.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={styles.eventMeta}>
                  <Text style={styles.eventSender}>{ev.senderName || 'unknown'}</Text>
                  <Text style={styles.eventType}>{ev.eventType}</Text>
                  <Text style={styles.eventTime}>{timeAgo(ev.timestamp)}</Text>
                </View>
                <Text style={styles.eventText} numberOfLines={2}>{ev.text}</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  headerBox: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  headerSub: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  tipBox: {
    flexDirection: 'row',
    backgroundColor: '#2563eb15',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2563eb33',
    alignItems: 'flex-start',
  },
  tipIcon: { fontSize: 18, marginTop: 1 },
  tipText: { flex: 1, fontSize: 13, color: '#60a5fa', lineHeight: 19, fontWeight: '500' },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 11, fontWeight: '700' },
  expandArrow: { fontSize: 10, color: colors.textMuted, marginLeft: 4 },

  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlText: { flex: 1, fontSize: 11, color: colors.textMuted, fontFamily: 'monospace' },
  copyIcon: { fontSize: 14 },

  // Guided Setup
  guideContainer: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guideTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  guideStep: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.accent + '22',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  stepNumberText: { fontSize: 13, fontWeight: '800', color: colors.accent },
  stepTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  stepDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 8 },
  guideBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  guideBtnText: { fontSize: 13, fontWeight: '700', color: '#000' },
  guideBtnOutline: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.accent + '55',
    backgroundColor: colors.accent + '11',
  },
  guideBtnOutlineText: { fontSize: 13, fontWeight: '600', color: colors.accent },

  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.bgSecondary,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnPrimary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actionBtnText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  actionBtnTextPrimary: { fontSize: 12, color: '#000', fontWeight: '700' },

  setupNote: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setupNoteText: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },

  errorBox: { alignItems: 'center', padding: 24, gap: 12 },
  errorText: { fontSize: 14, color: colors.textMuted, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, backgroundColor: colors.accent, borderRadius: 10 },
  retryText: { color: '#000', fontWeight: '700', fontSize: 13 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  emptyEvents: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyEventsText: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },

  eventRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventIcon: { fontSize: 18, marginTop: 2 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  eventSender: { fontSize: 12, fontWeight: '700', color: colors.textPrimary },
  eventType: { fontSize: 10, color: colors.accent, backgroundColor: colors.accent + '22', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6, fontWeight: '600' },
  eventTime: { fontSize: 10, color: colors.textMuted, marginLeft: 'auto' },
  eventText: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
});
