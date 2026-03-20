import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
import { colors } from '../theme/colors';
import { SUPPORTED_MODELS, ModelId, ModelOption } from '../stores/settingsStore';
import { useI18n } from '../stores/i18nStore';
import { apiFetch } from '../services/api';

const { width } = Dimensions.get('window');

interface SelectEngineModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModelId: ModelId;
  onSelect: (modelId: ModelId) => void;
}

export function SelectEngineModal({ visible, onClose, selectedModelId, onSelect }: SelectEngineModalProps) {
  const { t } = useI18n();
  const [dynamicModels, setDynamicModels] = useState<ModelOption[]>([]);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      try {
        const models = await apiFetch<Array<{ id: string; label: string; provider: string; providerId: string; costTier: string; positioning?: string; isDefault?: boolean }>>('/ai-providers/available-models');
        if (Array.isArray(models) && models.length > 0) {
          setDynamicModels(models.map((m) => ({
            id: m.id,
            label: m.label,
            provider: m.provider,
            icon: m.isDefault ? '🤖' : '💎',
            availability: 'available' as const,
            costTier: m.costTier,
          })));
        }
      } catch {
        // Fallback to static models
      }
    })();
  }, [visible]);

  const availableModels = dynamicModels.length > 0
    ? dynamicModels.filter(m => m.availability === 'available')
    : SUPPORTED_MODELS.filter(m => m.availability === 'available');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.content} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{t({ en: 'Select Engine', zh: '选择引擎' })}</Text>
          <Text style={styles.subtitle}>{t({ en: 'Choose the AI model for your agent', zh: '为您的智能体选择 AI 模型' })}</Text>

          <View style={styles.modelList}>
            {availableModels.map((m) => {
              const isSelected = selectedModelId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.modelItem, isSelected && styles.modelItemActive]}
                  onPress={() => {
                    onSelect(m.id);
                    onClose();
                  }}
                >
                  <Text style={styles.modelIcon}>{m.icon}</Text>
                  <View style={styles.modelTextContainer}>
                    <Text style={[styles.modelLabel, isSelected && styles.modelLabelActive]}>
                      {m.label}
                    </Text>
                    {m.badge && (
                      <Text style={[styles.badge, isSelected && styles.badgeActive]}>{m.badge}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  content: { backgroundColor: colors.bgSecondary, width: '100%', borderRadius: 24, padding: 24, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  modelList: { gap: 12 },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modelItemActive: { borderColor: colors.accent, backgroundColor: colors.accent + '11' },
  modelIcon: { fontSize: 24, marginRight: 12 },
  modelTextContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelLabel: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  modelLabelActive: { color: colors.accent },
  badge: { fontSize: 10, fontWeight: '700', color: colors.textMuted, backgroundColor: colors.bgPrimary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  badgeActive: { color: colors.accent, backgroundColor: colors.accent + '22' },
  checkIcon: { fontSize: 18, color: colors.accent, fontWeight: 'bold' }
});