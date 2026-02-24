// 一对一私信聊天
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

type Nav = NativeStackNavigationProp<ChatStackParamList, 'DirectMessage'>;
type Route = RouteProp<ChatStackParamList, 'DirectMessage'>;

type Message = {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'skill_card';
  createdAt: string;
  status?: 'sent' | 'delivered' | 'read';
};

const PLACEHOLDER_MSGS: Message[] = [
  { id: '1', senderId: 'them', content: 'Hey! Saw your agent setup post 👀', type: 'text', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', senderId: 'me', content: 'Thanks! Been running it for 3 days straight with zero downtime', type: 'text', createdAt: new Date(Date.now() - 3500000).toISOString(), status: 'read' },
  { id: '3', senderId: 'them', content: 'Which skills are you using?', type: 'text', createdAt: new Date(Date.now() - 3400000).toISOString() },
  { id: '4', senderId: 'me', content: 'Mostly the Web Search + Code Review ones from marketplace', type: 'text', createdAt: new Date(Date.now() - 3300000).toISOString(), status: 'delivered' },
];

async function fetchMessages(userId: string): Promise<Message[]> {
  try { return apiFetch<Message[]>(`/social/dm/${userId}/messages`); }
  catch { return []; }
}

async function sendMessage(userId: string, content: string) {
  return apiFetch(`/social/dm/${userId}/messages`, { method: 'POST', body: JSON.stringify({ content, type: 'text' }) });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function DirectMessageScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { userId, userName } = route.params;
  const me = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['dm-messages', userId],
    queryFn: () => fetchMessages(userId),
    retry: false,
    refetchInterval: 8000,
  });

  const msgs: Message[] = (Array.isArray(data) && data.length > 0) ? data : PLACEHOLDER_MSGS;

  const sendMut = useMutation({
    mutationFn: (content: string) => sendMessage(userId, content),
    onMutate: async (content) => {
      const optimistic: Message = {
        id: `opt-${Date.now()}`, senderId: 'me', content, type: 'text',
        createdAt: new Date().toISOString(), status: 'sent',
      };
      qc.setQueryData(['dm-messages', userId], (old: Message[] | undefined) => [...(old ?? []), optimistic]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['dm-messages', userId] }),
  });

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendMut.mutate(text);
    // Scroll to bottom
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [input, sendMut]);

  const renderMsg = ({ item }: { item: Message }) => {
    const isMine = item.senderId === 'me' || item.senderId === me?.id;
    return (
      <View style={[styles.msgRow, isMine ? styles.msgRowMine : styles.msgRowTheirs]}>
        {!isMine && (
          <View style={styles.peerAvatar}>
            <Text style={styles.peerAvatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
          <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
            {item.content}
          </Text>
          <View style={styles.msgMeta}>
            <Text style={styles.msgTime}>{formatTime(item.createdAt)}</Text>
            {isMine && item.status && (
              <Text style={styles.msgStatus}>
                {item.status === 'read' ? '✓✓' : item.status === 'delivered' ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
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
            placeholder="Message..."
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
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
  msgRow: { flexDirection: 'row', marginBottom: 12, maxWidth: '80%' },
  msgRowMine: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  msgRowTheirs: { alignSelf: 'flex-start' },
  peerAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: 8, alignSelf: 'flex-end' },
  peerAvatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 9, maxWidth: '100%' },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.bgCard, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTextTheirs: { color: colors.textPrimary },
  msgMeta: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 3, gap: 4 },
  msgTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
  msgStatus: { fontSize: 10, color: 'rgba(255,255,255,0.6)' },
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
