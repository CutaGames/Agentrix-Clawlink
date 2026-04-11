import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { useI18n } from '../../stores/i18nStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { LocalAiStatus } from '../../stores/settingsStore';
import {
  MobileLocalInferenceService,
  type MobileLocalRuntimeCapabilities,
} from '../../services/mobileLocalInference.service';
import { OtaModelDownloadService, type DownloadProgress } from '../../services/otaModelDownload.service';

interface LocalModelInfo {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionZh: string;
  tier: string;
  recommended?: boolean;
}

const AVAILABLE_MODELS: LocalModelInfo[] = [
  {
    id: 'gemma-4-2b',
    name: 'Gemma 4 E2B',
    descriptionEn: 'Base 3.1 GB model plus a 986 MB multimodal projector. Full package enables local text and image turns; local audio file input only turns on when the runtime reports wav/mp3 support.',
    descriptionZh: '3.1 GB 基础模型外加 986 MB 多模态投影器。完整包下载后可在端侧处理文本和图片轮次；音频文件输入仅在运行时确认支持 wav/mp3 时启用。',
    tier: 'LOCAL',
    recommended: true,
  },
  {
    id: 'gemma-4-4b',
    name: 'Gemma 4 E4B',
    descriptionEn: 'Higher quality local Gemma package with the same multimodal projector bundle. Better reasoning, but it needs more RAM and still keeps heavy tool orchestration in the cloud path.',
    descriptionZh: '更高质量的本地 Gemma 包，包含同样的多模态投影器。推理更强，但更吃内存，重工具编排仍保留云端路径。',
    tier: 'LOCAL',
  },
];

function statusColor(status: LocalAiStatus): string {
  switch (status) {
    case 'ready': return '#10B981';
    case 'downloading': return '#3B82F6';
    case 'error': return '#EF4444';
    default: return colors.textMuted;
  }
}

function statusLabel(status: LocalAiStatus, t: ReturnType<typeof useI18n>['t']): string {
  switch (status) {
    case 'ready': return t({ en: 'Ready', zh: '已就绪' });
    case 'downloading': return t({ en: 'Downloading...', zh: '下载中...' });
    case 'error': return t({ en: 'Error', zh: '出错' });
    default: return t({ en: 'Not Downloaded', zh: '未下载' });
  }
}

export function LocalAiModelScreen() {
  const { t } = useI18n();
  const localAiEnabled = useSettingsStore((s) => s.localAiEnabled);
  const localAiStatus = useSettingsStore((s) => s.localAiStatus);
  const localAiProgress = useSettingsStore((s) => s.localAiProgress);
  const localAiModelId = useSettingsStore((s) => s.localAiModelId);
  const setLocalAiEnabled = useSettingsStore((s) => s.setLocalAiEnabled);
  const setLocalAiStatus = useSettingsStore((s) => s.setLocalAiStatus);
  const setLocalAiModelId = useSettingsStore((s) => s.setLocalAiModelId);
  const setLocalAiProgress = useSettingsStore((s) => s.setLocalAiProgress);
  const selectedModelId = useSettingsStore((s) => s.selectedModelId);
  const setSelectedModel = useSettingsStore((s) => s.setSelectedModel);
  const [bridgeAvailable, setBridgeAvailable] = useState<boolean | null>(null);
  const [runtimeCapabilities, setRuntimeCapabilities] = useState<MobileLocalRuntimeCapabilities | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState('');
  const [downloadEta, setDownloadEta] = useState('');

  useEffect(() => {
    let cancelled = false;

    void MobileLocalInferenceService.isAvailable(localAiModelId).then((available) => {
      if (!cancelled) {
        setBridgeAvailable(available);
      }
    });

    void MobileLocalInferenceService.getCapabilities({ model: localAiModelId })
      .then((capabilities) => {
        if (!cancelled) {
          setRuntimeCapabilities(capabilities);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRuntimeCapabilities(MobileLocalInferenceService.getDeclaredCapabilities({ model: localAiModelId }));
        }
      });

    // Check if model already downloaded on mount
    const downloaded = OtaModelDownloadService.isModelDownloaded(localAiModelId);
    if (downloaded && localAiStatus !== 'ready') {
      setLocalAiStatus('ready');
      setLocalAiEnabled(true);
      setLocalAiProgress(100);
    }

    return () => {
      cancelled = true;
    };
  }, [localAiModelId, localAiStatus, setLocalAiEnabled, setLocalAiProgress, setLocalAiStatus]);

  const formatSpeed = (bps: number): string => {
    if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)} MB/s`;
    if (bps > 1_000) return `${(bps / 1_000).toFixed(0)} KB/s`;
    return `${bps.toFixed(0)} B/s`;
  };

  const formatEta = (seconds: number): string => {
    if (seconds > 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    if (seconds > 60) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleDownload = useCallback((modelId: string) => {
    setLocalAiModelId(modelId);
    setLocalAiStatus('downloading');
    setLocalAiProgress(0);
    setDownloadSpeed('');
    setDownloadEta('');

    void OtaModelDownloadService.startDownload(modelId, {
      onProgress: (progress: DownloadProgress) => {
        setLocalAiProgress(progress.percent);
        if (progress.speedBps > 0) {
          setDownloadSpeed(formatSpeed(progress.speedBps));
        }
        if (progress.etaSeconds > 0) {
          setDownloadEta(formatEta(progress.etaSeconds));
        }
        if (progress.state === 'verifying') {
          setLocalAiProgress(99);
        }
      },
      onComplete: () => {
        setLocalAiProgress(100);
        setLocalAiStatus('ready');
        setLocalAiEnabled(true);
        setSelectedModel(modelId);
        setDownloadSpeed('');
        setDownloadEta('');
        Alert.alert(
          t({ en: 'Download Complete', zh: '下载完成' }),
          t({ en: 'Local AI package is ready. Text and supported image turns can stay on-device; audio file input enables automatically if the runtime exposes wav/mp3 support.', zh: '本地 AI 完整包已就绪。文本和受支持的图片轮次可留在端侧；若运行时暴露 wav/mp3 支持，音频文件输入也会自动启用。' }),
        );
      },
      onError: (error: string) => {
        setLocalAiStatus('error');
        setLocalAiProgress(0);
        setDownloadSpeed('');
        setDownloadEta('');
        Alert.alert(
          t({ en: 'Download Failed', zh: '下载失败' }),
          error,
        );
      },
    });
  }, [setLocalAiEnabled, setLocalAiModelId, setLocalAiProgress, setLocalAiStatus, setSelectedModel, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t({ en: 'Delete Local Model', zh: '删除本地模型' }),
      t({ en: 'This will remove the downloaded model and free up storage space.', zh: '将删除已下载的模型并释放存储空间。' }),
      [
        { text: t({ en: 'Cancel', zh: '取消' }), style: 'cancel' },
        {
          text: t({ en: 'Delete', zh: '删除' }),
          style: 'destructive',
          onPress: () => {
            OtaModelDownloadService.deleteModel(localAiModelId);
            setLocalAiStatus('not_downloaded');
            setLocalAiProgress(0);
            setLocalAiEnabled(false);
          },
        },
      ],
    );
  }, [localAiModelId, setLocalAiEnabled, setLocalAiProgress, setLocalAiStatus, t]);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === localAiModelId) ?? AVAILABLE_MODELS[0];
  const currentPackageReady = OtaModelDownloadService.areRequiredArtifactsDownloaded(localAiModelId);
  const currentModelEntry = OtaModelDownloadService.getModelEntry(localAiModelId);
  const currentPackageSize = OtaModelDownloadService.getPackageSizeLabel(localAiModelId);
  const currentProjectorSize = currentModelEntry?.multimodalProjector?.sizeLabel || '';
  const bridgeUnavailable = bridgeAvailable === false;
  const canUpgradeCurrentPackage = localAiStatus === 'ready' && !currentPackageReady && !!currentModelEntry?.multimodalProjector;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tri-tier explanation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Tri-Tier AI Architecture', zh: '三级混合 AI 架构' })}</Text>
        <Text style={styles.cardDesc}>
          {t({
            en: 'Agentrix uses a 3-tier model: on-device local model for speed & privacy, cloud API for daily conversations, and frontier models for complex tasks.',
            zh: 'Agentrix 采用三级模型：端侧本地模型（快速+隐私）→ 云端 API（日常对话）→ 超脑模型（复杂任务）',
          })}
        </Text>
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Text style={styles.tierIcon}>📱</Text>
            <Text style={[styles.tierLabel, { color: '#10B981' }]}>{t({ en: 'Local', zh: '端侧' })}</Text>
            <Text style={styles.tierCost}>{t({ en: 'Free', zh: '免费' })}</Text>
          </View>
          <Text style={styles.tierArrow}>→</Text>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <Text style={styles.tierIcon}>☁️</Text>
            <Text style={[styles.tierLabel, { color: '#3B82F6' }]}>{t({ en: 'Cloud API', zh: '云端' })}</Text>
            <Text style={styles.tierCost}>{t({ en: 'Platform/Own', zh: '平台/自有' })}</Text>
          </View>
          <Text style={styles.tierArrow}>→</Text>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
            <Text style={styles.tierIcon}>🧠</Text>
            <Text style={[styles.tierLabel, { color: '#8B5CF6' }]}>{t({ en: 'Ultra', zh: '超脑' })}</Text>
            <Text style={styles.tierCost}>Opus/GPT-5</Text>
          </View>
        </View>
      </View>

      {/* Status card */}
      <View style={styles.card}>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, { backgroundColor: statusColor(localAiStatus) }]} />
          <Text style={styles.statusText}>{statusLabel(localAiStatus, t)}</Text>
          {localAiStatus === 'downloading' && (
            <Text style={styles.progressText}>{localAiProgress}%</Text>
          )}
        </View>

        {localAiStatus === 'downloading' && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${localAiProgress}%` }]} />
          </View>
        )}

        {localAiStatus === 'downloading' && (downloadSpeed || downloadEta) && (
          <View style={styles.downloadMeta}>
            {downloadSpeed ? <Text style={styles.downloadMetaText}>⚡ {downloadSpeed}</Text> : null}
            {downloadEta ? <Text style={styles.downloadMetaText}>⏱️ {downloadEta}</Text> : null}
          </View>
        )}

        {localAiStatus === 'downloading' && (
          <Text style={styles.downloadHintText}>
            {t({
              en: 'Downloads currently need to finish in one pass. If the app or network is interrupted, restart the download from this screen.',
              zh: '当前下载暂不支持断点续传。如果应用或网络中断，请回到此页重新开始下载。',
            })}
          </Text>
        )}

        {localAiStatus === 'ready' && (
          <View style={styles.readyInfo}>
            <Text style={styles.readyModel}>{currentModel.name}</Text>
            <Text style={styles.readyDesc}>
              {t({
                en: currentPackageReady
                  ? 'On-device package is active. Text is local, image turns stay local when runtime vision is enabled, and speech playback still uses the local TTS path until a vocoder package exists.'
                  : 'Base text is active, but the multimodal projector add-on is still missing. Image turns are blocked until you finish the full package, and Agentrix will no longer auto-switch them to the cloud.',
                zh: currentPackageReady
                  ? '端侧完整包已激活。文本可本地处理，图片轮次会在运行时视觉能力开启后留在端侧；语音播报暂时仍走本地 TTS 路径，等待后续 vocoder 包。'
                  : '基础文本能力已激活，但多模态投影器附件还未补齐。图片轮次在补齐完整包前会被直接拦截，Agentrix 不会再自动切到云端。',
              })}
            </Text>
            <Text style={styles.readyMeta}>{t({ en: `Full package size: ${currentPackageSize}`, zh: `完整包大小：${currentPackageSize}` })}</Text>
          </View>
        )}

        {bridgeUnavailable && (
          <Text style={styles.warningText}>
            {t({
              en: localAiStatus === 'ready'
                ? 'The local package is on disk, but this device is not exposing the native inference bridge yet. Local chat turns will be blocked instead of silently falling back to the cloud.'
                : 'Native inference bridge is not available on this device yet. You can still download the package now, but local chat will stay blocked until the bridge is exposed.',
              zh: localAiStatus === 'ready'
                ? '模型包已经下载到本机，但这台设备暂时还没有暴露原生推理桥。本地聊天轮次会被直接拦截，不会再偷偷回退到云端。'
                : '当前设备暂时还没有暴露原生推理桥。你仍可先下载模型包，但在桥接可用前，本地聊天会保持拦截状态。',
            })}
          </Text>
        )}
      </View>

      {canUpgradeCurrentPackage && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>{t({ en: 'Finish the local image package', zh: '补齐本地图片包' })}</Text>
          <Text style={styles.upgradeDesc}>
            {t({
              en: `${currentModel.name} is currently text-only on this device. Download the projector add-on (${currentProjectorSize}) to unlock local image turns. Until then, Agentrix will block image turns instead of silently switching to the cloud.`,
              zh: `当前设备上的 ${currentModel.name} 仍是纯文本模式。继续下载投影器附件（${currentProjectorSize}）后，图片轮次才能留在端侧。在此之前，Agentrix 会直接拦截图片轮次，不会再偷偷切到云端。`,
            })}
          </Text>
          <TouchableOpacity style={styles.upgradePrimaryBtn} onPress={() => handleDownload(localAiModelId)}>
            <Text style={styles.upgradePrimaryBtnText}>{t({ en: `Complete full package (+${currentProjectorSize})`, zh: `补齐完整包（+${currentProjectorSize}）` })}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Local Multimodal Surface', zh: '本地多模态能力面' })}</Text>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Image input', zh: '图片输入' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsVisionInput
              ? t({ en: '📷 Local ready', zh: '📷 端侧可用' })
              : currentModelEntry?.multimodalProjector
                ? (currentPackageReady
                  ? t({ en: '⛔ Runtime still not exposing vision; image turns stay blocked', zh: '⛔ 运行时仍未暴露视觉能力；图片轮次保持拦截' })
                  : t({ en: '⬇️ Download projector add-on to unlock local image turns', zh: '⬇️ 需下载投影器附件后才能本地处理图片' }))
                : t({ en: '—', zh: '—' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio file input', zh: '音频文件输入' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioInput
              ? t({ en: '🎙️ Local ready (wav/mp3)', zh: '🎙️ 端侧可用（wav/mp3）' })
              : t({ en: '⛔ Not local yet; switch to a cloud model manually for audio files', zh: '⛔ 端侧暂不支持；音频文件请手动切到云端模型' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio output surface', zh: '音频输出面' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioOutput
              ? t({ en: '🔊 Model-native ready', zh: '🔊 模型原生可用' })
              : t({ en: '🗣️ Local TTS wrapper for now', zh: '🗣️ 当前仍走本地 TTS 包装层' })}
          </Text>
        </View>
      </View>

      {/* Available models */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t({ en: 'Available Models', zh: '可用模型' })}</Text>
      </View>

      {AVAILABLE_MODELS.map((model) => {
        const packageReady = OtaModelDownloadService.areRequiredArtifactsDownloaded(model.id);
        const modelDownloaded = OtaModelDownloadService.isModelDownloaded(model.id);
        const packageSize = OtaModelDownloadService.getPackageSizeLabel(model.id);
        const modelEntry = OtaModelDownloadService.getModelEntry(model.id);
        const canUpgradePackage = modelDownloaded && !packageReady;

        return (
          <View key={model.id} style={[styles.modelCard, localAiModelId === model.id && styles.modelCardSelected]}>
            <View style={styles.modelHeader}>
              <Text style={styles.modelName}>{model.name}</Text>
              {model.recommended && (
                <View style={styles.recommendBadge}>
                  <Text style={styles.recommendText}>{t({ en: 'Recommended', zh: '推荐' })}</Text>
                </View>
              )}
            </View>
            <Text style={styles.modelDesc}>
              {t({ en: model.descriptionEn, zh: model.descriptionZh })}
            </Text>
            <View style={styles.modelMeta}>
              <Text style={styles.metaText}>📦 {packageSize}</Text>
              <Text style={styles.metaText}>⚡ {model.tier}</Text>
              <Text style={styles.metaText}>💰 {t({ en: 'Free', zh: '免费' })}</Text>
              {modelEntry?.multimodalProjector ? <Text style={styles.metaText}>{t({ en: '🖼️ mmproj included', zh: '🖼️ 含 mmproj' })}</Text> : null}
            </View>

            {localAiModelId === model.id && localAiStatus === 'ready' && !canUpgradePackage ? (
              <View style={styles.modelActions}>
                <TouchableOpacity style={styles.activeBtn} disabled>
                  <Text style={styles.activeBtnText}>✅ {t({ en: 'Active', zh: '已激活' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>{t({ en: 'Delete', zh: '删除' })}</Text>
                </TouchableOpacity>
              </View>
            ) : localAiModelId === model.id && localAiStatus === 'ready' && canUpgradePackage ? (
              <View style={styles.modelActions}>
                <TouchableOpacity style={styles.activeBtn} disabled>
                  <Text style={styles.activeBtnText}>{t({ en: 'Text Ready', zh: '文本已就绪' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadBtnCompact} onPress={() => handleDownload(model.id)}>
                  <Text style={styles.downloadBtnText}>{t({ en: 'Upgrade to Full Package', zh: '升级到完整包' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>{t({ en: 'Delete', zh: '删除' })}</Text>
                </TouchableOpacity>
              </View>
            ) : localAiModelId === model.id && localAiStatus === 'downloading' ? (
              <View style={styles.modelActions}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.downloadingText}>{t({ en: 'Downloading...', zh: '下载中...' })} {localAiProgress}%</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownload(model.id)}
                disabled={localAiStatus === 'downloading'}
              >
                <Text style={styles.downloadBtnText}>
                  ⬇️ {canUpgradePackage
                    ? t({ en: 'Upgrade to Full Package', zh: '升级到完整包' })
                    : t({ en: `Download (${packageSize})`, zh: `下载 (${packageSize})` })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Current routing explanation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Current Model Routing', zh: '当前模型路由' })}</Text>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Short text turns', zh: '简短文本轮次' })}</Text>
          <Text style={styles.routeValue}>
            {localAiStatus === 'ready' && !bridgeUnavailable
              ? t({ en: `📱 ${currentModel.name} (when you select it in chat)`, zh: `📱 ${currentModel.name}（需在聊天中手动选中）` })
              : t({ en: `☁️ Use a cloud model until the local runtime is ready`, zh: '☁️ 本地运行时就绪前请继续使用云端模型' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Image turns', zh: '图片轮次' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsVisionInput
              ? t({ en: `📱 ${currentModel.name}`, zh: `📱 ${currentModel.name}` })
              : t({ en: '⛔ Blocked until the projector/full package is ready', zh: '⛔ 补齐投影器/完整包前会被直接拦截' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio file turns', zh: '音频文件轮次' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioInput
              ? t({ en: `📱 ${currentModel.name} (wav/mp3)`, zh: `📱 ${currentModel.name}（wav/mp3）` })
              : t({ en: '⛔ Blocked until local audio input is exposed', zh: '⛔ 本地音频输入可用前会被直接拦截' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Unsupported turns', zh: '不支持的轮次' })}</Text>
          <Text style={styles.routeValue}>{t({ en: '⛔ Blocked until you switch models manually', zh: '⛔ 会被直接拦截，需手动切到云端模型' })}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 48, gap: 16 },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 },
  tierBadge: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, minWidth: 70 },
  tierIcon: { fontSize: 20 },
  tierLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  tierCost: { fontSize: 9, color: colors.textMuted, marginTop: 1 },
  tierArrow: { fontSize: 16, color: colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  progressText: { fontSize: 14, fontWeight: '700', color: '#3B82F6', marginLeft: 'auto' },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#3B82F6', borderRadius: 3 },
  readyInfo: { gap: 4 },
  readyModel: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  readyDesc: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  readyMeta: { fontSize: 11, color: colors.textMuted },
  warningText: { fontSize: 11, color: '#F59E0B', lineHeight: 16 },
  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  modelCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  modelCardSelected: { borderColor: '#10B981' },
  modelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  recommendBadge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  recommendText: { fontSize: 10, fontWeight: '700', color: '#10B981' },
  modelDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
  modelMeta: { flexDirection: 'row', gap: 12 },
  metaText: { fontSize: 11, color: colors.textMuted },
  modelActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  activeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16,185,129,0.12)',
    alignItems: 'center',
  },
  activeBtnText: { fontSize: 13, fontWeight: '600', color: '#10B981' },
  deleteBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  downloadBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    marginTop: 4,
  },
  downloadBtnCompact: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
  },
  downloadBtnText: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  downloadingText: { fontSize: 13, color: '#3B82F6' },
  downloadMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  downloadMetaText: { fontSize: 11, color: colors.textMuted },
  downloadHintText: { fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  upgradeCard: {
    backgroundColor: 'rgba(59,130,246,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.22)',
    padding: 16,
    gap: 10,
  },
  upgradeTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  upgradeDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  upgradePrimaryBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.16)',
    alignItems: 'center',
  },
  upgradePrimaryBtnText: { fontSize: 14, fontWeight: '700', color: '#3B82F6' },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 6,
  },
  routeLabel: { flex: 1, fontSize: 12, color: colors.textMuted },
  routeValue: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
});
