import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    descriptionZh: '3.1 GB 鍩虹妯″瀷澶栧姞 986 MB 澶氭ā鎬佹姇褰卞櫒銆傚畬鏁村寘涓嬭浇鍚庡彲鍦ㄧ渚у鐞嗘枃鏈拰鍥剧墖杞锛涢煶棰戞枃浠惰緭鍏ヤ粎鍦ㄨ繍琛屾椂纭鏀寔 wav/mp3 鏃跺惎鐢ㄣ€?,
    tier: 'LOCAL',
    recommended: true,
  },
  {
    id: 'gemma-4-4b',
    name: 'Gemma 4 E4B',
    descriptionEn: 'Higher quality local Gemma package with the same multimodal projector bundle. Better reasoning, but it needs more RAM and still keeps heavy tool orchestration in the cloud path.',
    descriptionZh: '鏇撮珮璐ㄩ噺鐨勬湰鍦?Gemma 鍖咃紝鍖呭惈鍚屾牱鐨勫妯℃€佹姇褰卞櫒銆傛帹鐞嗘洿寮猴紝浣嗘洿鍚冨唴瀛橈紝閲嶅伐鍏风紪鎺掍粛淇濈暀浜戠璺緞銆?,
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
    case 'ready': return t({ en: 'Ready', zh: '宸插氨缁? });
    case 'downloading': return t({ en: 'Downloading...', zh: '涓嬭浇涓?..' });
    case 'error': return t({ en: 'Error', zh: '鍑洪敊' });
    default: return t({ en: 'Not Downloaded', zh: '鏈笅杞? });
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
  const pauseStateRef = useRef<string | null>(null);

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
          t({ en: 'Download Complete', zh: '涓嬭浇瀹屾垚' }),
          t({ en: 'Local AI package is ready. Text and supported image turns can stay on-device; audio file input enables automatically if the runtime exposes wav/mp3 support.', zh: '鏈湴 AI 瀹屾暣鍖呭凡灏辩华銆傛枃鏈拰鍙楁敮鎸佺殑鍥剧墖杞鍙暀鍦ㄧ渚э紱鑻ヨ繍琛屾椂鏆撮湶 wav/mp3 鏀寔锛岄煶棰戞枃浠惰緭鍏ヤ篃浼氳嚜鍔ㄥ惎鐢ㄣ€? }),
        );
      },
      onError: (error: string) => {
        setLocalAiStatus('error');
        setLocalAiProgress(0);
        setDownloadSpeed('');
        setDownloadEta('');
        Alert.alert(
          t({ en: 'Download Failed', zh: '涓嬭浇澶辫触' }),
          error,
        );
      },
    });
  }, [setLocalAiEnabled, setLocalAiModelId, setLocalAiProgress, setLocalAiStatus, setSelectedModel, t]);

  const handlePause = useCallback(async () => {
    const state = await OtaModelDownloadService.pauseDownload();
    if (state) {
      pauseStateRef.current = state;
      setLocalAiStatus('not_downloaded');
    }
  }, [setLocalAiStatus]);

  const handleResume = useCallback(() => {
    if (!pauseStateRef.current) return;
    setLocalAiStatus('downloading');
    void OtaModelDownloadService.resumeDownload(pauseStateRef.current, {
      onProgress: (progress: DownloadProgress) => {
        setLocalAiProgress(progress.percent);
        if (progress.speedBps > 0) setDownloadSpeed(formatSpeed(progress.speedBps));
        if (progress.etaSeconds > 0) setDownloadEta(formatEta(progress.etaSeconds));
      },
      onComplete: () => {
        setLocalAiProgress(100);
        setLocalAiStatus('ready');
        setLocalAiEnabled(true);
        setSelectedModel(localAiModelId);
        pauseStateRef.current = null;
      },
      onError: (error: string) => {
        setLocalAiStatus('error');
        Alert.alert(t({ en: 'Resume Failed', zh: '鎭㈠澶辫触' }), error);
      },
    });
  }, [localAiModelId, setLocalAiEnabled, setLocalAiProgress, setLocalAiStatus, setSelectedModel, t]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      t({ en: 'Delete Local Model', zh: '鍒犻櫎鏈湴妯″瀷' }),
      t({ en: 'This will remove the downloaded model and free up storage space.', zh: '灏嗗垹闄ゅ凡涓嬭浇鐨勬ā鍨嬪苟閲婃斁瀛樺偍绌洪棿銆? }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Delete', zh: '鍒犻櫎' }),
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Tri-tier explanation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Tri-Tier AI Architecture', zh: '涓夌骇娣峰悎 AI 鏋舵瀯' })}</Text>
        <Text style={styles.cardDesc}>
          {t({
            en: 'Agentrix uses a 3-tier model: on-device local model for speed & privacy, cloud API for daily conversations, and frontier models for complex tasks.',
            zh: 'Agentrix 閲囩敤涓夌骇妯″瀷锛氱渚ф湰鍦版ā鍨嬶紙蹇€?闅愮锛夆啋 浜戠 API锛堟棩甯稿璇濓級鈫?瓒呰剳妯″瀷锛堝鏉備换鍔★級',
          })}
        </Text>
        <View style={styles.tierRow}>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <Text style={styles.tierIcon}>馃摫</Text>
            <Text style={[styles.tierLabel, { color: '#10B981' }]}>{t({ en: 'Local', zh: '绔晶' })}</Text>
            <Text style={styles.tierCost}>{t({ en: 'Free', zh: '鍏嶈垂' })}</Text>
          </View>
          <Text style={styles.tierArrow}>鈫?/Text>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
            <Text style={styles.tierIcon}>鈽侊笍</Text>
            <Text style={[styles.tierLabel, { color: '#3B82F6' }]}>{t({ en: 'Cloud API', zh: '浜戠' })}</Text>
            <Text style={styles.tierCost}>{t({ en: 'Platform/Own', zh: '骞冲彴/鑷湁' })}</Text>
          </View>
          <Text style={styles.tierArrow}>鈫?/Text>
          <View style={[styles.tierBadge, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
            <Text style={styles.tierIcon}>馃</Text>
            <Text style={[styles.tierLabel, { color: '#8B5CF6' }]}>{t({ en: 'Ultra', zh: '瓒呰剳' })}</Text>
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
            {downloadSpeed ? <Text style={styles.downloadMetaText}>鈿?{downloadSpeed}</Text> : null}
            {downloadEta ? <Text style={styles.downloadMetaText}>鈴憋笍 {downloadEta}</Text> : null}
            <TouchableOpacity onPress={handlePause} style={styles.pauseBtn}>
              <Text style={styles.pauseBtnText}>{t({ en: 'Pause', zh: '鏆傚仠' })}</Text>
            </TouchableOpacity>
          </View>
        )}

        {pauseStateRef.current && localAiStatus === 'not_downloaded' && (
          <TouchableOpacity onPress={handleResume} style={styles.resumeBtn}>
            <Text style={styles.resumeBtnText}>鈻讹笍 {t({ en: 'Resume Download', zh: '缁х画涓嬭浇' })}</Text>
          </TouchableOpacity>
        )}

        {localAiStatus === 'ready' && (
          <View style={styles.readyInfo}>
            <Text style={styles.readyModel}>{currentModel.name}</Text>
            <Text style={styles.readyDesc}>
              {t({
                en: currentPackageReady
                  ? 'On-device package is active. Text is local, image turns stay local when runtime vision is enabled, and speech playback still uses the local TTS path until a vocoder package exists.'
                  : 'Base text model is active, but the multimodal projector add-on is still missing. Tap upgrade to finish the local image package.',
                zh: currentPackageReady
                  ? '绔晶瀹屾暣鍖呭凡婵€娲汇€傛枃鏈彲鏈湴澶勭悊锛屽浘鐗囪疆娆′細鍦ㄨ繍琛屾椂瑙嗚鑳藉姏寮€鍚悗鐣欏湪绔晶锛涜闊虫挱鎶ユ殏鏃朵粛璧版湰鍦?TTS 璺緞锛岀瓑寰呭悗缁?vocoder 鍖呫€?
                  : '鍩虹鏂囨湰妯″瀷宸叉縺娲伙紝浣嗗妯℃€佹姇褰卞櫒闄勪欢杩樻湭琛ラ綈銆傜偣鍑诲崌绾у嵆鍙ˉ瀹屾湰鍦板浘鐗囪兘鍔涖€?,
              })}
            </Text>
            <Text style={styles.readyMeta}>{t({ en: `Full package size: ${currentPackageSize}`, zh: `瀹屾暣鍖呭ぇ灏忥細${currentPackageSize}` })}</Text>
          </View>
        )}

        {bridgeAvailable === false && localAiStatus !== 'ready' && (
          <Text style={styles.warningText}>
            {t({
              en: 'Native inference bridge not available on this device. Model will be downloaded and ready for future updates.',
              zh: '褰撳墠璁惧鏆備笉鏀寔鍘熺敓鎺ㄧ悊銆傛ā鍨嬪皢涓嬭浇渚涘悗缁増鏈娇鐢ㄣ€?,
            })}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Local Multimodal Surface', zh: '鏈湴澶氭ā鎬佽兘鍔涢潰' })}</Text>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Image input', zh: '鍥剧墖杈撳叆' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsVisionInput
              ? t({ en: '馃摲 Local ready', zh: '馃摲 绔晶鍙敤' })
              : currentModelEntry?.multimodalProjector
                ? (currentPackageReady
                  ? t({ en: '鈴?Runtime not exposing vision yet', zh: '鈴?杩愯鏃舵殏鏈毚闇茶瑙夎兘鍔? })
                  : t({ en: '猬囷笍 Download projector add-on', zh: '猬囷笍 闇€涓嬭浇鎶曞奖鍣ㄩ檮浠? }))
                : t({ en: '鈥?, zh: '鈥? })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio file input', zh: '闊抽鏂囦欢杈撳叆' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioInput
              ? t({ en: '馃帣锔?Local ready (wav/mp3)', zh: '馃帣锔?绔晶鍙敤锛坵av/mp3锛? })
              : t({ en: '鈽侊笍 Still falls back to cloud/STT path', zh: '鈽侊笍 浠嶅洖閫€鍒颁簯绔?STT 璺緞' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio output surface', zh: '闊抽杈撳嚭闈? })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioOutput
              ? t({ en: '馃攰 Model-native ready', zh: '馃攰 妯″瀷鍘熺敓鍙敤' })
              : t({ en: '馃棧锔?Local TTS playback for now', zh: '馃棧锔?褰撳墠浠嶈蛋鏈湴 TTS 鎾斁' })}
          </Text>
        </View>
      </View>

      {/* Available models */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t({ en: 'Available Models', zh: '鍙敤妯″瀷' })}</Text>
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
                  <Text style={styles.recommendText}>{t({ en: 'Recommended', zh: '鎺ㄨ崘' })}</Text>
                </View>
              )}
            </View>
            <Text style={styles.modelDesc}>
              {t({ en: model.descriptionEn, zh: model.descriptionZh })}
            </Text>
            <View style={styles.modelMeta}>
              <Text style={styles.metaText}>馃摝 {packageSize}</Text>
              <Text style={styles.metaText}>鈿?{model.tier}</Text>
              <Text style={styles.metaText}>馃挵 {t({ en: 'Free', zh: '鍏嶈垂' })}</Text>
              {modelEntry?.multimodalProjector ? <Text style={styles.metaText}>{t({ en: '馃柤锔?mmproj included', zh: '馃柤锔?鍚?mmproj' })}</Text> : null}
            </View>

            {localAiModelId === model.id && localAiStatus === 'ready' && !canUpgradePackage ? (
              <View style={styles.modelActions}>
                <TouchableOpacity style={styles.activeBtn} disabled>
                  <Text style={styles.activeBtnText}>鉁?{t({ en: 'Active', zh: '宸叉縺娲? })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>{t({ en: 'Delete', zh: '鍒犻櫎' })}</Text>
                </TouchableOpacity>
              </View>
            ) : localAiModelId === model.id && localAiStatus === 'ready' && canUpgradePackage ? (
              <View style={styles.modelActions}>
                <TouchableOpacity style={styles.activeBtn} disabled>
                  <Text style={styles.activeBtnText}>{t({ en: 'Text Ready', zh: '鏂囨湰宸插氨缁? })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.downloadBtnCompact} onPress={() => handleDownload(model.id)}>
                  <Text style={styles.downloadBtnText}>{t({ en: 'Upgrade to Full Package', zh: '鍗囩骇鍒板畬鏁村寘' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                  <Text style={styles.deleteBtnText}>{t({ en: 'Delete', zh: '鍒犻櫎' })}</Text>
                </TouchableOpacity>
              </View>
            ) : localAiModelId === model.id && localAiStatus === 'downloading' ? (
              <View style={styles.modelActions}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.downloadingText}>{t({ en: 'Downloading...', zh: '涓嬭浇涓?..' })} {localAiProgress}%</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => handleDownload(model.id)}
                disabled={localAiStatus === 'downloading'}
              >
                <Text style={styles.downloadBtnText}>
                  猬囷笍 {canUpgradePackage
                    ? t({ en: 'Upgrade to Full Package', zh: '鍗囩骇鍒板畬鏁村寘' })
                    : t({ en: `Download (${packageSize})`, zh: `涓嬭浇 (${packageSize})` })}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Current routing explanation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t({ en: 'Current Model Routing', zh: '褰撳墠妯″瀷璺敱' })}</Text>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Simple queries', zh: '绠€鍗曟煡璇? })}</Text>
          <Text style={styles.routeValue}>
            {localAiStatus === 'ready' ? `馃摫 ${currentModel.name}` : `鈽侊笍 ${selectedModelId}`}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Image turns', zh: '鍥剧墖杞' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsVisionInput
              ? `馃摫 ${currentModel.name}`
              : t({ en: '鈽侊笍 Cloud / upgrade required', zh: '鈽侊笍 浜戠 / 闇€鍗囩骇瀹屾暣鍖? })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Audio file turns', zh: '闊抽鏂囦欢杞' })}</Text>
          <Text style={styles.routeValue}>
            {runtimeCapabilities?.supportsAudioInput
              ? `馃摫 ${currentModel.name} (wav/mp3)`
              : t({ en: '鈽侊笍 Cloud / STT path', zh: '鈽侊笍 浜戠 / STT 璺緞' })}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Daily conversations', zh: '鏃ュ父瀵硅瘽' })}</Text>
          <Text style={styles.routeValue}>鈽侊笍 {selectedModelId}</Text>
        </View>
        <View style={styles.routeRow}>
          <Text style={styles.routeLabel}>{t({ en: 'Complex tasks', zh: '澶嶆潅浠诲姟' })}</Text>
          <Text style={styles.routeValue}>馃 {t({ en: 'Auto (Opus/GPT-5)', zh: '鑷姩 (Opus/GPT-5)' })}</Text>
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
  pauseBtn: {
    marginLeft: 'auto',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  pauseBtnText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  resumeBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
  },
  resumeBtnText: { fontSize: 13, fontWeight: '700', color: '#3B82F6' },
  routeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  routeLabel: { fontSize: 12, color: colors.textMuted },
  routeValue: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
});