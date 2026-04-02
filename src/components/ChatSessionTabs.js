/**
 * ChatSessionTabs — Horizontal session tab bar for multi-session management
 *
 * Shows up to MAX_SESSIONS tabs at the top of the chat screen.
 * Users can switch between sessions, create new ones, or close existing ones.
 * Session metadata is persisted in MMKV.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { mmkv } from '../stores/mmkvStorage';
export const MAX_SESSIONS = 5;
const STORAGE_KEY_PREFIX = 'chat_sessions_';
/** Load persisted sessions for an instance */
export function loadSessions(instanceId) {
    try {
        const raw = mmkv.getString(`${STORAGE_KEY_PREFIX}${instanceId}`);
        if (raw)
            return JSON.parse(raw);
    }
    catch { }
    return [];
}
/** Persist sessions for an instance */
export function saveSessions(instanceId, sessions) {
    mmkv.set(`${STORAGE_KEY_PREFIX}${instanceId}`, JSON.stringify(sessions));
}
export function ChatSessionTabs({ sessions, activeSessionId, onSelect, onNew, onClose, t }) {
    if (sessions.length <= 1)
        return null; // Don't show tabs for single session
    return (<View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            return (<TouchableOpacity key={session.id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onSelect(session.id)} onLongPress={() => {
                    if (sessions.length > 1)
                        onClose(session.id);
                }}>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                {session.label}
              </Text>
              {sessions.length > 1 && (<TouchableOpacity onPress={() => onClose(session.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>×</Text>
                </TouchableOpacity>)}
            </TouchableOpacity>);
        })}

        {sessions.length < MAX_SESSIONS && (<TouchableOpacity style={styles.addBtn} onPress={onNew}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>)}
      </ScrollView>
    </View>);
}
const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bgCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    scrollContent: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bgPrimary,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
        maxWidth: 140,
    },
    tabActive: {
        backgroundColor: colors.accent + '20',
        borderWidth: 1,
        borderColor: colors.accent + '40',
    },
    tabText: {
        fontSize: 12,
        color: colors.textMuted,
        flexShrink: 1,
    },
    tabTextActive: {
        color: colors.accent,
        fontWeight: '600',
    },
    closeBtn: {
        marginLeft: 4,
        width: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeBtnText: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 16,
    },
    addBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    addBtnText: {
        fontSize: 18,
        color: colors.textMuted,
        lineHeight: 20,
    },
});
