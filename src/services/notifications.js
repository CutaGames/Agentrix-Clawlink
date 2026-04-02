import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiFetch } from './api';
// Actual EAS project ID (from app.json extra.eas.projectId)
const EAS_PROJECT_ID = Constants.expoConfig?.extra?.eas?.projectId ??
    '96a641e0-ce03-45ff-9de7-2cd89c488236';
// 配置通知处理行为
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});
class NotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
    }
    /**
     * 初始化推送通知
     */
    async initialize() {
        try {
            // 检查是否是真实设备
            if (!Device.isDevice) {
                console.log('Push notifications require a physical device');
                return null;
            }
            // 获取权限
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
            // 获取 Expo Push Token
            const tokenResponse = await Notifications.getExpoPushTokenAsync({
                projectId: EAS_PROJECT_ID,
            });
            this.expoPushToken = tokenResponse.data;
            // Android 需要设置通知渠道
            if (Platform.OS === 'android') {
                await this.setupAndroidChannels();
            }
            // 注册 token 到后端
            await this.registerTokenWithBackend(this.expoPushToken);
            return this.expoPushToken;
        }
        catch (error) {
            console.error('Failed to initialize push notifications:', error);
            return null;
        }
    }
    /**
     * 设置 Android 通知渠道
     */
    async setupAndroidChannels() {
        // 空投通知
        await Notifications.setNotificationChannelAsync('airdrops', {
            name: '空投提醒',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
        });
        // 收益通知
        await Notifications.setNotificationChannelAsync('earnings', {
            name: '收益到账',
            importance: Notifications.AndroidImportance.DEFAULT,
            lightColor: '#10B981',
        });
        // 交易通知
        await Notifications.setNotificationChannelAsync('transactions', {
            name: '交易通知',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#F59E0B',
        });
        // 商户通知
        await Notifications.setNotificationChannelAsync('merchant', {
            name: '商户消息',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
        // 开发者通知
        await Notifications.setNotificationChannelAsync('developer', {
            name: '开发者消息',
            importance: Notifications.AndroidImportance.DEFAULT,
        });
    }
    /**
     * 注册 Token 到后端
     */
    async registerTokenWithBackend(token) {
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
        }
        catch (error) {
            console.warn('Failed to register push token:', error);
        }
    }
    /**
     * 添加通知监听器
     */
    addListeners(onNotification, onNotificationResponse) {
        // 收到通知时触发（应用在前台）
        this.notificationListener = Notifications.addNotificationReceivedListener(onNotification);
        // 用户点击通知时触发
        this.responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);
    }
    /**
     * 移除监听器
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
     * 发送本地通知（用于测试或即时提醒）
     */
    async sendLocalNotification(params) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: params.title,
                body: params.body,
                data: params.data || {},
                ...(Platform.OS === 'android' && params.channelId
                    ? { channelId: params.channelId }
                    : {}),
            },
            trigger: null, // 立即发送
        });
    }
    /**
     * 获取当前 Push Token
     */
    getToken() {
        return this.expoPushToken;
    }
    /**
     * 获取所有待处理的通知
     */
    async getPendingNotifications() {
        return Notifications.getAllScheduledNotificationsAsync();
    }
    /**
     * 取消所有通知
     */
    async cancelAllNotifications() {
        await Notifications.cancelAllScheduledNotificationsAsync();
    }
    /**
     * 设置应用 Badge 数量
     */
    async setBadgeCount(count) {
        await Notifications.setBadgeCountAsync(count);
    }
    /**
     * 获取通知设置
     */
    async getSettings() {
        return Notifications.getPermissionsAsync();
    }
}
export const notificationService = new NotificationService();
/**
 * 处理通知点击，导航到对应页面
 */
export function handleNotificationNavigation(data, navigation) {
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
