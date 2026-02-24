// 群组聊天
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '../../theme/colors';
import { apiFetch } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import type { ChatStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<ChatStackParamList, 'GroupChat'>;
type Route = RouteProp<ChatStackParamList, 'GroupChat'>;

type GroupMessage = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: 'text' | 'image' | 'system';
  createdAt: string;
};

const PLACEHOLDER_MSGS: GroupMessage[] = [
  { id: 'sys-1', senderId: 'system', senderName: 'System', content: '🎉 Welcome to Agentrix Builders!', type: 'system', createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '1', senderId: 'u1', senderName: 'openclaw_fan', senderAvatar: '🦀', content: 'Build 37 APK just dropped! Who\'s testing?', type: 'text', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', senderId: 'u2', senderName: 'ai_builder', senderAvatar: '🤖', content: 'On it! The new market tabs look slick 🔥', type: 'text', createdAt: new Date(Date.now() - 3500000).toISOString() },
  { id: '3', senderId: 'u3', senderName: 'claw_dev', senderAvatar: '💻', content: 'Team Space feature is finally in 🙌', type: 'text', createdAt: new Date(Date.now() - 3400000).toISOString() },
  { id: '4', senderId: 'u4', senderName: 'skill_wizard', senderAvatar: '⚡', content: 'Just published my second MCP skill. Check it on marketplace!', type: 'text', createdAt: new Date(Date.now() - 3200000).toISOString() },
];

async function fetchGroupMessages(groupId: string): Promise<GroupMessage[]> {
  if (groupId === 'new') return [];
  try { return apiFetch<GroupMessage[]>(`/social/groups/${groupId}/messages`); }
  catch { return []; }
}

async function sendGroupMessage(groupId: string, content: string) {
  return apiFetch(`/social/groups/${groupId}/messages`, {
    method: 'POST', body: JSON.stringify({ content, type: 'text' }),
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function GroupChatScreen() {
  const route = useRoute<Route>();
  const { groupId, groupName } = route.params;
  const me = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['group-messages', groupId],
    queryFn: () => fetchGroupMessages(groupId),
    retry: false,
    refetchInterval: 6000,
  });

  const msgs: GroupMessage[] = (Array.isArray(data) && data.length > 0) ? data : PLACEHOLDER_MSGS;

  const sendMut = useMutation({
    mutationFn: (content: string) => sendGroupMessage(groupId, content),
    onMutate: async (content) => {
      const optimistic: GroupMessage = {
        id: `opt-${Date.now()}`, senderId: me?.id ?? 'me',
        senderName: me?.nickname ?? 'You',
        content, type: 'text', createdAt: new Date().toISOString(),
      };
      qc.setQueryData(['group-messages', groupId], (old: GroupMessage[] | undefined) => [...(old ?? []), optimistic]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['group-messages', groupId] }),
  });

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMut.mutate(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, sendMut]);

  const renderMsg = ({ item }: { item: GroupMessage }) => {
    if (item.type === 'system') {
      return (
        <View style={styles.systemMsgRow}>
          <Text style={styles.systemMsg}>{item.content}</Text>
        </View>
      );
    }
    const isMine = item.senderId === me?.id || item.senderId === 'me';
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        {!isMine && (
          <View style={styles.peerAvatar}>
            <Text style={styles.peerAvatarText}>
              {item.senderAvatar ?? item.senderName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.msgContent}>
          {!isMine && <Text style={styles.senderName}>{item.senderName}</Text>}
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
              {item.content}
            </Text>
          </View>
          <Text style={[styles.msgTime, isMine ? styles.msgTimeMine : styles.msgTimeTheirs]}>
            {formatTime(item.createdAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={{ flex: 1 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => m.id}
            renderItem={renderMsg}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={`Message ${groupName}...`}
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim()}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgPrimary },
  kav: { flex: 1 },
  msgList: { padding: 16, paddingBottom: 8 },
  systemMsgRow: { alignItems: 'center', marginVertical: 8 },
  systemMsg: { fontSize: 12, color: colors.textMuted, backgroundColor: colors.bgCard, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  msgRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '82%' },
  msgRowMine: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  msgRowTheirs: { alignSelf: 'flex-start' },
  peerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 8, alignSelf: 'flex-start', marginTop: 16 },
  peerAvatarText: { fontSize: 15 },
  msgContent: { flex: 1 },
  senderName: { fontSize: 11, color: colors.accent, fontWeight: '700', marginBottom: 3, marginLeft: 2 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: colors.textPrimary },
  msgTime: { fontSize: 10, marginTop: 3 },
  msgTimeMine: { color: colors.textMuted, textAlign: 'right' },
  msgTimeTheirs: { color: colors.textMuted },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12,
    paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: colors.bgCard, color: colors.textPrimary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, borderWidth: 1, borderColor: colors.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 18, marginLeft: 2 },
});
