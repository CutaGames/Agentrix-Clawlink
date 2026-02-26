/**
 * SocialListenerScreen — Manage & monitor Social Listener integrations.
 *
 * Shows connection status for Telegram, Discord, Twitter;
 * lets users register the Telegram bot webhook in one tap;
 * displays a live event log of incoming social events.
 *
 * Backend endpoints used:
 *   GET  /social/callback/status           — platform status + webhook URLs
 *   POST /social/callback/telegram/setup   — register Telegram webhook
 *   GET  /social/callback/events           — recent 50 events
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, RefreshControl, Clipboard,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';

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
  Clipboard.setString(text);
  Alert.alert('Copied!', `${label} copied to clipboard.`);
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({
  platform,
  status,
  onSetupTelegram,
  settingUp,
}: {
  platform: 'telegram' | 'discord' | 'twitter';
  status: PlatformStatus;
  onSetupTelegram: () => void;
  settingUp: boolean;
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
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{meta.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{meta.label}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: connected ? '#22c55e' : '#f59e0b' }]} />
        <Text style={[styles.statusLabel, { color: connected ? '#22c55e' : '#f59e0b' }]}>
          {connected ? 'Ready' : 'Config needed'}
        </Text>
      </View>

      {/* Webhook URL row */}
      <TouchableOpacity
        style={styles.urlRow}
        onPress={() => copyToClipboard(webhookUrl, 'Webhook URL')}
        activeOpacity={0.7}
      >
        <Text style={styles.urlText} numberOfLines={1}>{webhookUrl}</Text>
        <Text style={styles.copyIcon}>📋</Text>
      </TouchableOpacity>

      {/* Platform-specific actions */}
      {platform === 'telegram' && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={onSetupTelegram}
            disabled={settingUp || !connected}
          >
            {settingUp ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={styles.actionBtnTextPrimary}>⚡ Register Webhook</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Linking.openURL(`https://t.me/${status.telegram.botUsername}`)
            }
          >
            <Text style={styles.actionBtnText}>Open Bot ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {platform === 'discord' && (
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              copyToClipboard(status.discord.interactionsUrl, 'Interactions URL')
            }
          >
            <Text style={styles.actionBtnText}>📋 Copy Interactions URL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Linking.openURL(
                `https://discord.com/developers/applications/${status.discord.clientId}/information`,
              )
            }
          >
            <Text style={styles.actionBtnText}>Discord Dev Portal ↗</Text>
          </TouchableOpacity>
        </View>
      )}

      {platform === 'twitter' && (
        <View style={styles.setupNote}>
          <Text style={styles.setupNoteText}>
            📌 Register the webhook URL above in the Twitter Developer Portal → Account Activity API.
          </Text>
        </View>
      )}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SocialListenerScreen() {
  const qc = useQueryClient();

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
        Alert.alert('✅ Webhook Registered', `Telegram bot is now receiving messages at:\n${res.webhookUrl ?? ''}`);
      } else {
        Alert.alert('Setup Failed', res.description ?? 'Unknown error');
      }
      qc.invalidateQueries({ queryKey: ['social-listener-status'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message ?? 'Setup failed'),
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
        <Text style={styles.headerTitle}>🌐 Social Listener</Text>
        <Text style={styles.headerSub}>
          Connect your Telegram, Discord and Twitter bots. Incoming mentions and messages will be routed to your agents automatically.
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
          />
          <PlatformCard
            platform="discord"
            status={status}
            onSetupTelegram={() => {}}
            settingUp={false}
          />
          <PlatformCard
            platform="twitter"
            status={status}
            onSetupTelegram={() => {}}
            settingUp={false}
          />
        </>
      ) : (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ Could not load status — check backend connection.</Text>
          <TouchableOpacity onPress={() => refetchStatus()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Event Log */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📥 Recent Events</Text>
        {eventsLoading && <ActivityIndicator color={colors.accent} size="small" />}
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyEvents}>
          <Text style={styles.emptyEventsText}>No events yet. Send a message to @{status?.telegram.botUsername ?? 'your bot'} on Telegram or mention your Discord bot to see events here.</Text>
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
