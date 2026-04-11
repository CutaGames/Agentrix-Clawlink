import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Share, Platform, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { UiComplexity } from '../../stores/settingsStore';
import type { LocalAiStatus } from '../../stores/settingsStore';
import { useI18n, type Language } from '../../stores/i18nStore';
import { resolveMobileWakeWordConfig } from '../../config/wakeWord';
import { clearVoiceDiagnostics, getVoiceDiagnosticsCount, getVoiceDiagnosticsText } from '../../services/voiceDiagnostics';
import {
  getAndroidOverlayPermissionStatus,
  requestAndroidOverlayPermission,
  syncAndroidBackgroundWakeWordConfig,
  isAndroidBackgroundWakeWordAvailable,
} from '../../services/androidBackgroundWakeWord.service';
import {
  appendLocalWakeWordSample,
  captureLocalWakeWordSample,
  getLocalWakeWordModelReadiness,
  getLocalWakeWordSampleCount,
  hasLocalWakeWordModel,
  runLocalWakeWordSelfCheck,
  thresholdFromSensitivity,
  type WakeWordEngine,
} from '../../services/localWakeWord.service';

export function ClawSettingsScreen() {
  const navigation = useNavigation();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const uiComplexity = useSettingsStore((s) => s.uiComplexity);
  const setUiComplexity = useSettingsStore((s) => s.setUiComplexity);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const toggleNotifications = useSettingsStore((s) => s.toggleNotifications);
  const wakeWordConfig = useSettingsStore((s) => s.wakeWordConfig);
  const setWakeWordConfig = useSettingsStore((s) => s.setWakeWordConfig);
  const resetWakeWordConfig = useSettingsStore((s) => s.resetWakeWordConfig);
  const { language, setLanguage, t } = useI18n();
  const localAiEnabled = useSettingsStore((s) => s.localAiEnabled);
  const localAiStatus = useSettingsStore((s) => s.localAiStatus);
  const localAiProgress = useSettingsStore((s) => s.localAiProgress);
  const localAiModelId = useSettingsStore((s) => s.localAiModelId);
  const setLocalAiEnabled = useSettingsStore((s) => s.setLocalAiEnabled);
  const setLocalAiStatus = useSettingsStore((s) => s.setLocalAiStatus);
  const setLocalAiProgress = useSettingsStore((s) => s.setLocalAiProgress);
  const effectiveWakeWordConfig = resolveMobileWakeWordConfig(wakeWordConfig);
  const diagnosticsCount = getVoiceDiagnosticsCount();
  const [localWakeWordBusy, setLocalWakeWordBusy] = useState(false);
  const [localWakeWordStatus, setLocalWakeWordStatus] = useState('');
  const [overlayPermissionGranted, setOverlayPermissionGranted] = useState<boolean | null>(null);

  const localWakeWordSampleCount = useMemo(
    () => getLocalWakeWordSampleCount(wakeWordConfig.localModel),
    [wakeWordConfig.localModel],
  );
  const localWakeWordReadiness = useMemo(
    () => getLocalWakeWordModelReadiness(wakeWordConfig.localModel),
    [wakeWordConfig.localModel],
  );
  const hasLocalModel = hasLocalWakeWordModel(wakeWordConfig.localModel);
  const effectiveWakeEngine = useMemo<WakeWordEngine>(() => {
    if ((wakeWordConfig.engine === 'local-template' || wakeWordConfig.engine === 'auto') && hasLocalModel) {
      return 'local-template';
    }
    return 'system-speech';
  }, [hasLocalModel, wakeWordConfig.engine]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isAndroidBackgroundWakeWordAvailable()) {
      return;
    }
    void getAndroidOverlayPermissionStatus()
      .then(setOverlayPermissionGranted)
      .catch(() => setOverlayPermissionGranted(false));
  }, [wakeWordConfig.enabled, wakeWordConfig.localModel]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isAndroidBackgroundWakeWordAvailable()) {
      return;
    }
    void syncAndroidBackgroundWakeWordConfig({
      enabled: wakeWordConfig.enabled,
      displayName: wakeWordConfig.displayName,
      threshold: thresholdFromSensitivity(wakeWordConfig.sensitivity),
      activeInstanceId: null,
      activeInstanceName: null,
      model: hasLocalModel ? wakeWordConfig.localModel : null,
    }).catch(() => {});
  }, [hasLocalModel, wakeWordConfig.displayName, wakeWordConfig.enabled, wakeWordConfig.localModel, wakeWordConfig.sensitivity]);

  const wakeWordEngineOptions: { id: WakeWordEngine; label: string; desc: string }[] = [
    {
      id: 'auto',
      label: t({ en: 'Auto', zh: '鑷姩' }),
      desc: t({ en: 'Prefer the device-local model, then system fallback', zh: '浼樺厛绔晶鏈湴妯″瀷锛屽け璐ュ悗鍥為€€鍒扮郴缁熻瘑鍒? }),
    },
    {
      id: 'local-template',
      label: t({ en: 'Local', zh: '鏈湴妯″瀷' }),
      desc: t({ en: 'Template model trained on this device only', zh: '褰撳墠璁惧鏈湴璁粌鐨勬ā鏉挎ā鍨? }),
    },
    {
      id: 'system-speech',
      label: t({ en: 'System', zh: '绯荤粺璇嗗埆' }),
      desc: t({ en: 'Use built-in speech fallback', zh: '浣跨敤绯荤粺璇煶璇嗗埆鍏滃簳' }),
    },
  ];

  const currentWakeEngineDescription = useMemo(() => {
    return wakeWordEngineOptions.find((option) => option.id === wakeWordConfig.engine)?.desc ?? wakeWordEngineOptions[0].desc;
  }, [wakeWordConfig.engine, wakeWordEngineOptions]);

  const handleToggleWakeWord = () => {
    const nextEnabled = !wakeWordConfig.enabled;
    setWakeWordConfig({ enabled: nextEnabled });
    if (
      nextEnabled
      && Platform.OS === 'android'
      && isAndroidBackgroundWakeWordAvailable()
      && !hasLocalModel
    ) {
      Alert.alert(
        t({ en: 'Local sample required for Android background wake word', zh: 'Android 鍚庡彴鍞ら啋闇€瑕佸厛褰曞埗鏈湴鏍锋湰' }),
        t({
          en: `The floating ball can stay on screen after exit, but background wake-word listening only starts after you record at least ${localWakeWordReadiness.minReadySamples} clean local samples.`,
          zh: `閫€鍑?App 鍚庢偓娴悆鍙互淇濈暀锛屼絾鍚庡彴鐑瘝鐩戝惉鍙湁鍦ㄤ綘鑷冲皯褰曞埗 ${localWakeWordReadiness.minReadySamples} 鏉℃竻鏅版湰鍦版牱鏈悗鎵嶄細寮€濮嬨€傛湭褰曟牱鏃朵粛鍙偣鍑绘偓娴悆杩涘叆璇煶椤点€俙,
        }),
      );
    }
  };

  const handleRecordLocalSample = async () => {
    setLocalWakeWordBusy(true);
    setLocalWakeWordStatus(t({ en: 'Listening for one wake-word sample...', zh: '姝ｅ湪褰曞埗涓€鏉℃湰鍦板敜閱掕瘝鏍锋湰锛岃瀵圭潃鎵嬫満璇村嚭鍞ら啋璇?..' }));
    try {
      const sample = await captureLocalWakeWordSample();
      const nextModel = appendLocalWakeWordSample(
        wakeWordConfig.localModel,
        sample,
        wakeWordConfig.displayName,
      );
      setWakeWordConfig({
        localModel: nextModel,
        engine: 'local-template',
      });
      const nextReadiness = getLocalWakeWordModelReadiness(nextModel);
      setLocalWakeWordStatus(
        nextReadiness.ready
          ? t({
              en: `Saved sample ${nextReadiness.sampleCount}. Local wake word is ready. Run self-check once to confirm it matches your voice consistently.`,
              zh: `宸蹭繚瀛樼 ${nextReadiness.sampleCount} 鏉℃牱鏈紝鏈湴鍞ら啋璇嶅凡灏辩华銆傚缓璁啀鍋氫竴娆¤嚜妫€锛岀‘璁ゅ畠鑳界ǔ瀹氬尮閰嶄綘鐨勫０闊炽€俙,
            })
          : t({
              en: `Saved sample ${nextReadiness.sampleCount}. Record ${nextReadiness.remainingSamples} more clean samples before local wake word takes over. Until then, Auto still uses system speech fallback.`,
              zh: `宸蹭繚瀛樼 ${nextReadiness.sampleCount} 鏉℃牱鏈€傝繕闇€瑕佽ˉ褰?${nextReadiness.remainingSamples} 鏉℃竻鏅版牱鏈紝鏈湴鍞ら啋璇嶆墠浼氱湡姝ｆ帴绠°€傛涔嬪墠锛岃嚜鍔ㄦā寮忎粛浼氫娇鐢ㄧ郴缁熻闊冲厹搴曘€俙,
            }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLocalWakeWordStatus(
        t({
          en: `Sample capture failed: ${message}`,
          zh: `鏍锋湰褰曞埗澶辫触锛?{message}`,
        }),
      );
      Alert.alert(t({ en: 'Local wake-word sample failed', zh: '鏈湴鍞ら啋璇嶅綍鍒跺け璐? }), message);
    } finally {
      setLocalWakeWordBusy(false);
    }
  };

  const handleRunLocalSelfCheck = async () => {
    if (!wakeWordConfig.localModel || !hasLocalModel) {
      Alert.alert(
        t({ en: 'Model required', zh: '闇€瑕佸厛璁粌妯″瀷' }),
        t({
          en: `Record at least ${localWakeWordReadiness.minReadySamples} local wake-word samples first.`,
          zh: `璇峰厛褰曞埗鑷冲皯 ${localWakeWordReadiness.minReadySamples} 鏉℃湰鍦板敜閱掕瘝鏍锋湰銆俙,
        }),
      );
      return;
    }

    setLocalWakeWordBusy(true);
    setLocalWakeWordStatus(t({ en: 'Self-check is listening...', zh: '鏈湴妯″瀷鑷涓紝璇峰啀璇翠竴娆″敜閱掕瘝...' }));
    try {
      const result = await runLocalWakeWordSelfCheck(
        wakeWordConfig.localModel,
        thresholdFromSensitivity(wakeWordConfig.sensitivity),
      );
      setLocalWakeWordStatus(
        t({
          en: `Self-check score ${result.similarity.toFixed(3)} / threshold ${result.threshold.toFixed(3)}`,
          zh: `鑷鍒嗘暟 ${result.similarity.toFixed(3)} / 闃堝€?${result.threshold.toFixed(3)}`,
        }),
      );
      Alert.alert(
        t({ en: 'Local wake-word self-check', zh: '鏈湴鍞ら啋璇嶈嚜妫€' }),
        result.matched
          ? t({ en: `Matched successfully. Score ${result.similarity.toFixed(3)}.`, zh: `鍖归厤鎴愬姛锛屽垎鏁?${result.similarity.toFixed(3)}銆俙 })
          : t({ en: `Not matched. Score ${result.similarity.toFixed(3)}. Try recording more samples or lowering sensitivity.`, zh: `鏈尮閰嶆垚鍔燂紝鍒嗘暟 ${result.similarity.toFixed(3)}銆傚缓璁ˉ褰曟洿澶氭牱鏈紝鎴栭€傚綋闄嶄綆鐏垫晱搴﹂棬妲涖€俙 }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setLocalWakeWordStatus(t({ en: `Self-check failed: ${message}`, zh: `鑷澶辫触锛?{message}` }));
      Alert.alert(t({ en: 'Local self-check failed', zh: '鏈湴鑷澶辫触' }), message);
    } finally {
      setLocalWakeWordBusy(false);
    }
  };

  const handleClearLocalModel = () => {
    Alert.alert(
      t({ en: 'Clear local model', zh: '娓呯┖鏈湴妯″瀷' }),
      t({ en: 'This removes all recorded wake-word samples on this device.', zh: '杩欎細鍒犻櫎褰撳墠璁惧涓婄殑鎵€鏈夋湰鍦板敜閱掕瘝鏍锋湰銆? }),
      [
        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
        {
          text: t({ en: 'Clear', zh: '娓呯┖' }),
          style: 'destructive',
          onPress: () => {
            setWakeWordConfig({ localModel: null, engine: wakeWordConfig.engine === 'local-template' ? 'auto' : wakeWordConfig.engine });
            setLocalWakeWordStatus(t({ en: 'Local wake-word samples were cleared.', zh: '鏈湴鍞ら啋璇嶆牱鏈凡娓呯┖銆? }));
          },
        },
      ],
    );
  };

  const uiModes: { id: UiComplexity; icon: string; label: string; desc: string }[] = [
    { id: 'beginner', icon: '馃尡', label: t({ en: 'Beginner', zh: '鍏ラ棬' }), desc: t({ en: 'Chat, basic skills, simple setup', zh: '鑱婂ぉ銆佸熀纭€鎶€鑳姐€佺畝鍖栬缃? }) },
    { id: 'advanced', icon: '馃敡', label: t({ en: 'Advanced', zh: '杩涢樁' }), desc: t({ en: '+ Workflows, Memory Hub, API Keys, Teams', zh: '+ 宸ヤ綔娴併€佽蹇嗕腑蹇冦€丄PI 瀵嗛挜銆佸洟闃熷姛鑳? }) },
    { id: 'professional', icon: '鈿?, label: t({ en: 'Professional', zh: '涓撲笟' }), desc: t({ en: '+ Permissions Matrix, Custom LLM, MCP Tools', zh: '+ 鏉冮檺鐭╅樀銆佽嚜瀹氫箟 LLM銆丮CP 宸ュ叿' }) },
  ];

  const settingGroups = [
    {
      title: t({ en: 'AI Engine', zh: 'AI 寮曟搸' }),
      items: [
        {
          id: 'local-ai',
          icon: '馃',
          label: t({ en: 'Local AI Model', zh: '鏈湴 AI 妯″瀷' }),
          value: localAiStatus === 'ready'
            ? t({ en: 'Ready', zh: '宸插氨缁? })
            : localAiStatus === 'downloading'
            ? `${localAiProgress}%`
            : t({ en: 'Not downloaded', zh: '鏈笅杞? }),
        },
        {
          id: 'wearable-devices',
          icon: '馃暥锔?,
          label: t({ en: 'Wearable Devices', zh: '鍙┛鎴磋澶? }),
          value: '',
        },
      ],
    },
    {
      title: t({ en: 'Agent', zh: '鏅鸿兘浣? }),
      items: [
        { id: 'notify', icon: '馃敂', label: t({ en: 'Notifications', zh: '閫氱煡' }), value: notificationsEnabled ? t({ en: 'On', zh: '寮€鍚? }) : t({ en: 'Off', zh: '鍏抽棴' }) },
        { id: 'theme', icon: '馃帹', label: t({ en: 'Theme', zh: '涓婚' }), value: t({ en: 'Dark', zh: '娣辫壊' }) },
      ],
    },
    {
      title: t({ en: 'Developer', zh: '寮€鍙戣€? }),
      items: [
        { id: 'api', icon: '馃', label: t({ en: 'AI Providers & Subscriptions', zh: 'AI 鍘傚晢涓庤闃? }), value: '' },
        { id: 'logs', icon: '馃搵', label: t({ en: 'Debug Logs', zh: '璋冭瘯鏃ュ織' }), value: diagnosticsCount > 0 ? `${diagnosticsCount}` : '' },
      ],
    },
    {
      title: t({ en: 'About', zh: '鍏充簬' }),
      items: [
        { id: 'version', icon: '鈩癸笍', label: t({ en: 'App Version', zh: '搴旂敤鐗堟湰' }), value: '1.0.0' },
        { id: 'terms', icon: '馃摐', label: t({ en: 'Terms of Service', zh: '鏈嶅姟鏉℃' }), value: '' },
        { id: 'privacy', icon: '馃敀', label: t({ en: 'Privacy Policy', zh: '闅愮鏀跨瓥' }), value: '' },
      ],
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* UI Complexity Selector */}
      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Interface Mode', zh: '鐣岄潰妯″紡' })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>{t({ en: 'Choose how much of the app is visible', zh: '閫夋嫨浣犳兂鐪嬪埌鐨勫姛鑳藉鏉傚害' })}</Text>
          <View style={styles.modeRow}>
            {uiModes.map((mode) => (
              <TouchableOpacity
                key={mode.id}
                style={[styles.modeBtn, uiComplexity === mode.id && styles.modeBtnActive]}
                onPress={() => setUiComplexity(mode.id)}
              >
                <Text style={styles.modeIcon}>{mode.icon}</Text>
                <Text style={[styles.modeLabel, uiComplexity === mode.id && styles.modeLabelActive]}>
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {uiModes.find((m) => m.id === uiComplexity) && (
            <Text style={styles.modeCurrentDesc}>
              {uiModes.find((m) => m.id === uiComplexity)!.icon} {' '}
              {uiModes.find((m) => m.id === uiComplexity)!.desc}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Language', zh: '璇█' })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>{t({ en: 'Switch the entire app language here', zh: '鍦ㄨ繖閲屽垏鎹㈡暣涓?App 鐨勬樉绀鸿瑷€' })}</Text>
          <View style={styles.modeRow}>
            {([
              { code: 'en' as Language, icon: '馃嚭馃嚫', label: 'English' },
              { code: 'zh' as Language, icon: '馃嚚馃嚦', label: '涓枃' },
            ]).map((item) => (
              <TouchableOpacity
                key={item.code}
                style={[styles.modeBtn, language === item.code && styles.modeBtnActive]}
                onPress={() => setLanguage(item.code)}
              >
                <Text style={styles.modeIcon}>{item.icon}</Text>
                <Text style={[styles.modeLabel, language === item.code && styles.modeLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modeCurrentDesc}>
            {language === 'zh'
              ? t({ en: 'Current language: Chinese', zh: '褰撳墠璇█锛氫腑鏂? })
              : t({ en: 'Current language: English', zh: '褰撳墠璇█锛欵nglish' })}
          </Text>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>{t({ en: 'Wake Word', zh: '鍞ら啋璇? })}</Text>
        <View style={styles.modeCard}>
          <Text style={styles.modeDesc}>
            {t({ en: 'The mobile app now uses a device-local wake-word model first, with system speech recognition as fallback.', zh: '绉诲姩绔幇鍦ㄩ粯璁や紭鍏堜娇鐢ㄧ渚ф湰鍦板敜閱掕瘝妯″瀷锛岀郴缁熻闊宠瘑鍒粎浣滀负鍏滃簳銆? })}
          </Text>

          <TouchableOpacity
            style={[styles.toggleRow, wakeWordConfig.enabled && styles.toggleRowActive]}
            onPress={handleToggleWakeWord}
          >
            <Text style={styles.toggleLabel}>{t({ en: 'Enable wake word', zh: '寮€鍚敜閱掕瘝' })}</Text>
            <Text style={[styles.toggleValue, wakeWordConfig.enabled && styles.toggleValueActive]}>
              {wakeWordConfig.enabled ? t({ en: 'On', zh: '宸插紑鍚? }) : t({ en: 'Off', zh: '宸插叧闂? })}
            </Text>
          </TouchableOpacity>

          <Text style={styles.subsectionTitle}>{t({ en: 'Wake-word engine', zh: '鍞ら啋璇嶅紩鎿? })}</Text>
          <View style={styles.modeRow}>
            {wakeWordEngineOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.modeBtn, styles.engineBtn, wakeWordConfig.engine === option.id && styles.modeBtnActive]}
                onPress={() => setWakeWordConfig({ engine: option.id })}
              >
                <Text style={[styles.modeLabel, wakeWordConfig.engine === option.id && styles.modeLabelActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.modeCurrentDesc}>{currentWakeEngineDescription}</Text>

          <Text style={styles.subsectionTitle}>{t({ en: 'Local wake-word model', zh: '鏈湴鍞ら啋璇嶆ā鍨? })}</Text>
          <Text style={styles.modeCurrentDesc}>
            {t({
              en: `Saved samples: ${localWakeWordSampleCount}. Local mode becomes available at ${localWakeWordReadiness.minReadySamples} samples.`,
              zh: `宸蹭繚瀛樻牱鏈細${localWakeWordSampleCount} 鏉°€傛湰鍦版ā寮忚鍒?${localWakeWordReadiness.minReadySamples} 鏉℃牱鏈悗鎵嶄細鍚敤銆俙,
            })}
          </Text>
          <Text style={styles.modeCurrentDesc}>
            {hasLocalModel
              ? t({ en: 'A trained local model is available on this device.', zh: '褰撳墠璁惧宸插瓨鍦ㄥ彲鐢ㄧ殑鏈湴妯″瀷銆? })
              : t({
                  en: `Local training is still incomplete. Record ${localWakeWordReadiness.remainingSamples || localWakeWordReadiness.minReadySamples} more clean samples, or keep using system speech fallback.`,
                  zh: `鏈湴璁粌杩樻病瀹屾垚銆傝缁х画琛ュ綍 ${localWakeWordReadiness.remainingSamples || localWakeWordReadiness.minReadySamples} 鏉℃竻鏅版牱鏈紝鎴栬€呯户缁娇鐢ㄧ郴缁熻闊冲厹搴曘€俙,
                })}
          </Text>
          <Text style={styles.modeCurrentDesc}>
            {effectiveWakeEngine === 'local-template'
              ? t({ en: 'Current active engine: local wake-word model.', zh: '褰撳墠瀹為檯鐢熸晥寮曟搸锛氭湰鍦板敜閱掕瘝妯″瀷銆? })
              : t({ en: 'Current active engine: system speech fallback. This path does not need local training.', zh: '褰撳墠瀹為檯鐢熸晥寮曟搸锛氱郴缁熻闊冲厹搴曘€傝繖鏉¤矾寰勪笉闇€瑕佹湰鍦拌缁冦€? })}
          </Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, localWakeWordBusy && styles.actionBtnDisabled]}
              onPress={() => void handleRecordLocalSample()}
              disabled={localWakeWordBusy}
            >
              <Text style={styles.actionBtnText}>
                {localWakeWordBusy
                  ? t({ en: 'Listening...', zh: '褰曞埗涓?..' })
                  : t({ en: 'Record sample', zh: '褰曞埗鏍锋湰' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, (!hasLocalModel || localWakeWordBusy) && styles.actionBtnDisabled]}
              onPress={() => void handleRunLocalSelfCheck()}
              disabled={!hasLocalModel || localWakeWordBusy}
            >
              <Text style={styles.actionBtnText}>{t({ en: 'Self-check', zh: '鑷' })}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.secondaryBtn, !hasLocalModel && styles.actionBtnDisabled]}
            onPress={handleClearLocalModel}
            disabled={!hasLocalModel}
          >
            <Text style={styles.secondaryBtnText}>{t({ en: 'Clear local model', zh: '娓呯┖鏈湴妯″瀷' })}</Text>
          </TouchableOpacity>
          {!!localWakeWordStatus && (
            <Text style={styles.localStatusText}>{localWakeWordStatus}</Text>
          )}

          {Platform.OS === 'android' && (
            <>
              <Text style={styles.subsectionTitle}>{t({ en: 'Android background wake word', zh: 'Android 鍚庡彴鍞ら啋' })}</Text>
              <Text style={styles.modeCurrentDesc}>
                {t({
                  en: `When the app goes to background, Android can keep a floating ball through a foreground service. Background wake-word listening starts only after at least ${localWakeWordReadiness.minReadySamples} local samples have been recorded.`,
                  zh: `褰?App 閫€鍒板悗鍙板悗锛孉ndroid 浼氶€氳繃鍓嶅彴鏈嶅姟淇濈暀绯荤粺鎮诞鐞冦€傚悗鍙扮儹璇嶇洃鍚彧鏈夊湪鑷冲皯褰曞埗 ${localWakeWordReadiness.minReadySamples} 鏉℃湰鍦版牱鏈悗鎵嶄細寮€濮嬨€俙,
                })}
              </Text>
              <Text style={styles.modeCurrentDesc}>
                {hasLocalModel
                  ? t({ en: 'Background wake word is eligible on this device once overlay permission is granted.', zh: '褰撳墠璁惧鍦ㄦ巿鏉冩偓娴獥鍚庯紝宸茬粡鍏峰鍚庡彴鐑瘝鍞ら啋鏉′欢銆? })
                  : t({ en: 'Until local training is ready, Android background mode only keeps the floating ball visible. Tap it to enter voice.', zh: '鍦ㄦ湰鍦拌缁冨畬鎴愪箣鍓嶏紝Android 鍚庡彴妯″紡鍙細淇濈暀鎮诞鐞冩樉绀猴紝鐐瑰嚮鍚庤繘鍏ヨ闊抽〉锛屼絾涓嶄細鑷姩鐑瘝鍞ら啋銆? })}
              </Text>
              <Text style={styles.modeCurrentDesc}>
                {overlayPermissionGranted
                  ? t({ en: 'Overlay permission: granted', zh: '鎮诞绐楁潈闄愶細宸叉巿鏉? })
                  : t({ en: 'Overlay permission: required for the floating ball after exit', zh: '鎮诞绐楁潈闄愶細閫€鍑哄悗缁х画鏄剧ず鎮诞鐞冨繀椤绘巿鏉? })}
              </Text>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => {
                  void requestAndroidOverlayPermission()
                    .then(() => getAndroidOverlayPermissionStatus())
                    .then(setOverlayPermissionGranted)
                    .catch((error) => {
                      const message = error instanceof Error ? error.message : String(error);
                      Alert.alert(t({ en: 'Permission request failed', zh: '鏉冮檺鐢宠澶辫触' }), message);
                    });
                }}
              >
                <Text style={styles.secondaryBtnText}>
                  {overlayPermissionGranted
                    ? t({ en: 'Re-open overlay permission page', zh: '閲嶆柊鎵撳紑鎮诞绐楁潈闄愰〉' })
                    : t({ en: 'Grant overlay permission', zh: '鎺堟潈鎮诞绐楁潈闄? })}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TextInput
            value={wakeWordConfig.displayName}
            onChangeText={(text) => setWakeWordConfig({ displayName: text })}
            placeholder={t({ en: 'Primary wake phrase, e.g. Hey Agentrix', zh: '涓诲敜閱掔煭璇紝渚嬪 Hey Agentrix' })}
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />

          <TextInput
            value={wakeWordConfig.fallbackPhrases.join(', ')}
            onChangeText={(text) => setWakeWordConfig({ fallbackPhrases: text.split(',').map((item) => item.trim()).filter(Boolean) })}
            placeholder={t({ en: 'System wake phrases, comma separated', zh: '绯荤粺鍞ら啋鐭锛岄€楀彿鍒嗛殧' })}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={styles.textInput}
          />

          <TextInput
            value={String(wakeWordConfig.sensitivity)}
            onChangeText={(text) => {
              const parsed = Number(text);
              if (!Number.isNaN(parsed)) {
                setWakeWordConfig({ sensitivity: parsed });
              }
              if (!text.trim()) {
                setWakeWordConfig({ sensitivity: 0.65 });
              }
            }}
            placeholder="0.65"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.textInput}
          />

          <Text style={styles.modeCurrentDesc}>
            {t({ en: 'Current runtime:', zh: '褰撳墠杩愯閰嶇疆锛? })}{' '}
            {effectiveWakeWordConfig.enabled
              ? `${effectiveWakeWordConfig.displayName} 路 ${effectiveWakeEngine === 'local-template'
                ? t({ en: `Local model (${localWakeWordSampleCount} samples)`, zh: `鏈湴妯″瀷锛?{localWakeWordSampleCount} 鏉℃牱鏈級` })
                : t({ en: `System speech fallback (${effectiveWakeWordConfig.fallbackPhrases.join(', ')})`, zh: `绯荤粺璇煶鍏滃簳锛?{effectiveWakeWordConfig.fallbackPhrases.join(', ')}锛塦 })}`
              : t({ en: 'disabled', zh: '宸插叧闂? })}
          </Text>
          <Text style={styles.modeCurrentDesc}>
            {hasLocalModel
              ? t({ en: 'The app can use your on-device local wake-word model in the foreground.', zh: '褰撳墠鍓嶅彴鍙互鐩存帴浣跨敤绔晶鏈湴鍞ら啋璇嶆ā鍨嬨€? })
              : t({ en: `Foreground mode can still fall back to system wake-phrase listening, but local wake word and Android background wake word stay disabled until you record ${localWakeWordReadiness.minReadySamples} usable samples.`, zh: `鍓嶅彴浠嶅彲閫€鍥炲埌绯荤粺鍞ら啋鐭鐩戝惉锛屼絾鏈湴鍞ら啋璇嶅拰 Android 鍚庡彴鐑瘝鍞ら啋浼氫繚鎸佸叧闂紝鐩村埌浣犲綍鍒?${localWakeWordReadiness.minReadySamples} 鏉″彲鐢ㄦ牱鏈€俙 })}
          </Text>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              resetWakeWordConfig();
              Alert.alert(t({ en: 'Reset complete', zh: '宸查噸缃? }), t({ en: 'Wake-word settings now fall back to packaged defaults.', zh: '鍞ら啋璇嶈缃凡鍥為€€鍒版墦鍖呴粯璁ゅ€笺€? }));
            }}
          >
            <Text style={styles.secondaryBtnText}>{t({ en: 'Reset to packaged defaults', zh: '閲嶇疆涓烘墦鍖呴粯璁ゅ€? })}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {settingGroups.map((group) => (
        <View key={group.title} style={styles.group}>
          <Text style={styles.groupTitle}>{group.title}</Text>
          <View style={styles.groupItems}>
            {group.items.map((item, i) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.item, i < group.items.length - 1 && styles.itemBorder]}
                onPress={() => {
                  if (item.id === 'local-ai') {
                    navigation.navigate('LocalAiModel' as never);
                    return;
                  }
                  if (item.id === 'wearable-devices') {
                    navigation.navigate('WearableHub' as never);
                    return;
                  }
                  if (item.id === 'notify') {
                    toggleNotifications(!notificationsEnabled);
                    return;
                  }
                  if (item.id === 'api') {
                    navigation.navigate('ApiKeys' as never);
                    return;
                  }
                  if (item.id === 'logs') {
                    const diagnosticsText = getVoiceDiagnosticsText();
                    Alert.alert(
                      t({ en: 'Debug Logs', zh: '璋冭瘯鏃ュ織' }),
                      diagnosticsCount > 0
                        ? t({ en: `${diagnosticsCount} diagnostic entries are stored locally. You can share them or clear them here.`, zh: `褰撳墠鏈湴宸蹭繚瀛?${diagnosticsCount} 鏉¤瘖鏂棩蹇椼€備綘鍙互鐩存帴鍒嗕韩鎴栨竻绌恒€俙 })
                        : t({ en: 'No diagnostic entries captured yet.', zh: '褰撳墠杩樻病鏈夐噰闆嗗埌璇婃柇鏃ュ織銆? }),
                      [
                        {
                          text: t({ en: 'Share', zh: '鍒嗕韩' }),
                          onPress: () => {
                            void Share.share({ message: diagnosticsText });
                          },
                        },
                        {
                          text: t({ en: 'Clear', zh: '娓呯┖' }),
                          style: 'destructive',
                          onPress: () => {
                            clearVoiceDiagnostics();
                            Alert.alert(t({ en: 'Cleared', zh: '宸叉竻绌? }), t({ en: 'Diagnostic logs were cleared.', zh: '璇婃柇鏃ュ織宸叉竻绌恒€? }));
                          },
                        },
                        { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
                      ],
                    );
                  }
                }}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={styles.itemLabel}>{item.label}</Text>
                {item.value ? <Text style={styles.itemValue}>{item.value}</Text> : null}
                <Text style={styles.itemArrow}>鈥?/Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={() => Alert.alert(t({ en: 'Sign Out', zh: '閫€鍑虹櫥褰? }), t({ en: 'Are you sure?', zh: '纭畾瑕侀€€鍑虹櫥褰曞悧锛? }), [
          { text: t({ en: 'Cancel', zh: '鍙栨秷' }), style: 'cancel' },
          { text: t({ en: 'Sign Out', zh: '閫€鍑虹櫥褰? }), style: 'destructive', onPress: clearAuth },
        ])}
      >
        <Text style={styles.dangerBtnText}>{t({ en: 'Sign Out', zh: '閫€鍑虹櫥褰? })}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  group: { gap: 8 },
  groupTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 },
  groupItems: { backgroundColor: colors.bgCard, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemIcon: { fontSize: 18, width: 26 },
  itemLabel: { flex: 1, fontSize: 15, color: colors.textPrimary },
  itemValue: { fontSize: 13, color: colors.textMuted },
  itemArrow: { fontSize: 20, color: colors.textMuted },
  dangerBtn: { alignItems: 'center', padding: 14, backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.error + '55' },
  dangerBtnText: { color: colors.error, fontWeight: '700', fontSize: 15 },
  // 鈹€鈹€ UI Mode 鈹€鈹€
  modeCard: {
    backgroundColor: colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border, gap: 10,
  },
  modeDesc: { fontSize: 13, color: colors.textMuted },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border, gap: 4,
  },
  modeBtnActive: { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
  modeIcon: { fontSize: 22 },
  modeLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  modeLabelActive: { color: colors.accent },
  modeCurrentDesc: { fontSize: 12, color: colors.textSecondary, paddingTop: 2 },
  subsectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },
  engineBtn: { flexBasis: 0 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accent + '18',
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  localStatusText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  textInput: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.textPrimary,
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgSecondary,
  },
  toggleRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '12',
  },
  toggleLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  toggleValue: { color: colors.textMuted, fontSize: 12 },
  toggleValueActive: { color: colors.accent },
  secondaryBtn: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  secondaryBtnText: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
});