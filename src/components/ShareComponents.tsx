import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Share,
} from 'react-native';
import { colors } from '../theme/colors';
import { socialShareService } from '../services/socialShare';

interface ShareOption {
  icon: string;
  label: string;
  onPress: () => void;
}

interface ShareBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  shareContent: {
    title?: string;
    message: string;
    url?: string;
  };
  onCopy?: () => void;
}

export function ShareBottomSheet({
  visible,
  onClose,
  title = '分享',
  shareContent,
  onCopy,
}: ShareBottomSheetProps) {
  const handleShare = async () => {
    await socialShareService.share(shareContent);
    onClose();
  };

  const handleCopy = async () => {
    const textToCopy = shareContent.url || shareContent.message;
    await socialShareService.copyToClipboard(textToCopy);
    onCopy?.();
    onClose();
  };

  const options: ShareOption[] = [
    {
      icon: '📤',
      label: '分享',
      onPress: handleShare,
    },
    {
      icon: '📋',
      label: '复制链接',
      onPress: handleCopy,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {/* 分享内容预览 */}
          <View style={styles.preview}>
            {shareContent.title && (
              <Text style={styles.previewTitle}>{shareContent.title}</Text>
            )}
            <Text style={styles.previewMessage} numberOfLines={3}>
              {shareContent.message}
            </Text>
            {shareContent.url && (
              <Text style={styles.previewUrl} numberOfLines={1}>
                {shareContent.url}
              </Text>
            )}
          </View>

          {/* 分享选项 */}
          <View style={styles.optionsRow}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.option}
                onPress={option.onPress}
              >
                <View style={styles.optionIcon}>
                  <Text style={styles.optionIconText}>{option.icon}</Text>
                </View>
                <Text style={styles.optionLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

interface ShareButtonProps {
  onPress: () => void;
  style?: any;
  size?: 'small' | 'medium' | 'large';
}

export function ShareButton({ onPress, style, size = 'medium' }: ShareButtonProps) {
  const iconSizes = {
    small: 16,
    medium: 20,
    large: 24,
  };
  const paddingSizes = {
    small: 6,
    medium: 10,
    large: 14,
  };

  return (
    <TouchableOpacity
      style={[
        styles.shareButton,
        { padding: paddingSizes[size] },
        style,
      ]}
      onPress={onPress}
    >
      <Text style={{ fontSize: iconSizes[size] }}>📤</Text>
    </TouchableOpacity>
  );
}

interface QuickShareProps {
  type: 'payment' | 'agent' | 'airdrop' | 'earnings' | 'invite';
  data: any;
  children?: React.ReactNode;
  buttonStyle?: any;
}

export function QuickShare({ type, data, children, buttonStyle }: QuickShareProps) {
  const [showSheet, setShowSheet] = React.useState(false);
  const [shareContent, setShareContent] = React.useState({
    title: '',
    message: '',
    url: '',
  });

  const handlePress = () => {
    let content = { title: '', message: '', url: '' };

    switch (type) {
      case 'payment':
        content = {
          title: data.merchantName ? `向 ${data.merchantName} 付款` : '收款链接',
          message: `请支付 ${data.amount} ${data.currency || 'USDC'}`,
          url: data.paymentUrl,
        };
        break;
      case 'agent':
        content = {
          title: `分享 Agent: ${data.agentName}`,
          message: `🤖 试试这个 Agent: ${data.agentName}`,
          url: data.agentUrl,
        };
        break;
      case 'airdrop':
        content = {
          title: `${data.projectName} 空投`,
          message: `🎁 发现空投: ${data.projectName}，预估 ${data.estimatedValue}`,
          url: data.claimUrl,
        };
        break;
      case 'earnings':
        content = {
          title: 'Agentrix 收益',
          message: `📈 我在 Agentrix 上收益 ${data.totalEarnings}！`,
          url: 'https://agentrix.io/download',
        };
        break;
      case 'invite':
        content = {
          title: '邀请加入 Agentrix',
          message: `🚀 使用邀请码 ${data.inviteCode || ''} 注册 Agentrix`,
          url: data.referralUrl,
        };
        break;
    }

    setShareContent(content);
    setShowSheet(true);
  };

  return (
    <>
      {children ? (
        <TouchableOpacity onPress={handlePress} style={buttonStyle}>
          {children}
        </TouchableOpacity>
      ) : (
        <ShareButton onPress={handlePress} style={buttonStyle} />
      )}
      <ShareBottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
        shareContent={shareContent}
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  preview: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  previewMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  previewUrl: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  option: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionLabel: {
    fontSize: 13,
    color: colors.text,
  },
  cancelButton: {
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
