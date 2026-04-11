import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch } from './api';

// Actual EAS project ID (from app.json extra.eas.projectId)
const EAS_PROJECT_ID =
  (Constants.expoConfig?.extra?.eas?.projectId as string | undefined) ??
  '96a641e0-ce03-45ff-9de7-2cd89c488236';

// 閰嶇疆閫氱煡澶勭悊琛屼负
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface PushNotificationToken {
  token: string;
  platform: 'ios' | 'android' | 'web';
}

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  /**
   * 鍒濆鍖栨帹閫侀€氱煡
   */
  async initialize(): Promise<string | null> {
    try {
      // 妫€鏌ユ槸鍚︽槸鐪熷疄璁惧
      if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
      }

      // 鑾峰彇鏉冮檺
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      // 鑾峰彇 Expo Push Token
      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      });
      this.expoPushToken = tokenResponse.data;

      // Android 闇€瑕佽缃€氱煡娓犻亾
      if (Platform.OS === 'android') {
        await this.setupAndroidChannels();
      }

      // 娉ㄥ唽 token 鍒板悗绔?
      await this.registerTokenWithBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return null;
    }
  }

  /**
   * 璁剧疆 Android 閫氱煡娓犻亾
   */
  private async setupAndroidChannels() {
    // 绌烘姇閫氱煡
    await Notifications.setNotificationChannelAsync('airdrops', {
      name: '绌烘姇鎻愰啋',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
    });

    // Agent 瀹℃壒閫氱煡
    await Notifications.setNotificationChannelAsync('approvals', {
      name: 'Agent 瀹℃壒',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
    });

    // 鏀剁泭閫氱煡
    await Notifications.setNotificationChannelAsync('earnings', {
      name: '鏀剁泭鍒拌处',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#10B981',
    });

    // 浜ゆ槗閫氱煡
    await Notifications.setNotificationChannelAsync('transactions', {
      name: '浜ゆ槗閫氱煡',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B',
    });

    // 鍟嗘埛閫氱煡
    await Notifications.setNotificationChannelAsync('merchant', {
      name: '鍟嗘埛娑堟伅',
      importance: Notifications.AndroidImportance.DEFAULT,
    });

    // 寮€鍙戣€呴€氱煡
    await Notifications.setNotificationChannelAsync('developer', {
      name: '寮€鍙戣€呮秷鎭?,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  /**
   * 娉ㄥ唽 Token 鍒板悗绔?
   */
  private async registerTokenWithBackend(token: string) {
    try {
      await apiFetch('/notifications/register', {
        method: 'POST',
        body: JSON.stringify({
          token,
          platform: Platform.OS,
          deviceId: Device.modelId || 'unknown',
        }),
      });
      console.log('Push token registered with backend');
    } catch (error) {
      console.warn('Failed to register push token:', error);
    }
  }

  /**
   * 娣诲姞閫氱煡鐩戝惉鍣?
   */
  addListeners(
    onNotification: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void,
  ) {
    // 鏀跺埌閫氱煡鏃惰Е鍙戯紙搴旂敤鍦ㄥ墠鍙帮級
    this.notificationListener = Notifications.addNotificationReceivedListener(onNotification);

    // 鐢ㄦ埛鐐瑰嚮閫氱煡鏃惰Е鍙?
    this.responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
  }

  /**
   * 绉婚櫎鐩戝惉鍣?
   */
  removeListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove?.();
    }
    if (this.responseListener) {
      this.responseListener.remove?.();
    }
  }

  /**
   * 鍙戦€佹湰鍦伴€氱煡锛堢敤浜庢祴璇曟垨鍗虫椂鎻愰啋锛?
   */
  async sendLocalNotification(params: {
    title: string;
    body: string;
    data?: Record<string, any>;
    channelId?: string;
  }) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data || {},
        ...(Platform.OS === 'android' && params.channelId
          ? { channelId: params.channelId }
          : {}),
      },
      trigger: null, // 绔嬪嵆鍙戦€?
    });
  }

  /**
   * 鑾峰彇褰撳墠 Push Token
   */
  getToken() {
    return this.expoPushToken;
  }

  /**
   * 鑾峰彇鎵€鏈夊緟澶勭悊鐨勯€氱煡
   */
  async getPendingNotifications() {
    return Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * 鍙栨秷鎵€鏈夐€氱煡
   */
  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * 璁剧疆搴旂敤 Badge 鏁伴噺
   */
  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * 鑾峰彇閫氱煡璁剧疆
   */
  async getSettings() {
    return Notifications.getPermissionsAsync();
  }
}

export const notificationService = new NotificationService();

// 閫氱煡绫诲瀷瀹氫箟
export type NotificationType = 
  | 'airdrop_available'    // 鏂扮┖鎶曞彲棰?
  | 'airdrop_claimed'      // 绌烘姇宸查鍙?
  | 'earning_received'     // 鏀剁泭鍒拌处
  | 'payment_received'     // 鏀舵鍒拌处
  | 'payment_sent'         // 浠樻鎴愬姛
  | 'task_assigned'        // 浠诲姟鍒嗛厤
  | 'task_completed'       // 浠诲姟瀹屾垚
  | 'milestone_approved'   // 閲岀▼纰戦€氳繃
  | 'settlement_ready';    // 缁撶畻灏辩华

// 閫氱煡鏁版嵁缁撴瀯
export interface NotificationData {
  type: NotificationType;
  [key: string]: any;
}

/**
 * 澶勭悊閫氱煡鐐瑰嚮锛屽鑸埌瀵瑰簲椤甸潰
 */
export function handleNotificationNavigation(
  data: NotificationData,
  navigation: any,
) {
  switch (data.type) {
    case 'airdrop_available':
    case 'airdrop_claimed':
      navigation.navigate('Airdrop');
      break;
    case 'earning_received':
      navigation.navigate('AutoEarn');
      break;
    case 'payment_received':
    case 'payment_sent':
      navigation.navigate('Activity');
      break;
    case 'task_assigned':
    case 'task_completed':
      navigation.navigate('TaskMarket');
      break;
    case 'milestone_approved':
      navigation.navigate('BudgetPools');
      break;
    case 'settlement_ready':
      navigation.navigate('Settlements');
      break;
    default:
      navigation.navigate('Home');
  }
}