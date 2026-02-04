// 未激活身份页面
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';
import { IdentityType } from '../../types/identity';

interface Props {
  identity: IdentityType;
  isPending: boolean;
  onActivate: () => void;
}

const identityConfig = {
  merchant: {
    icon: '🏪',
    title: '商户身份',
    features: [
      '✓ 管理分佣计划',
      '✓ 生成收款链接/二维码',
      '✓ 查看结算账本',
      '✓ 数据分析报表',
    ],
  },
  developer: {
    icon: '💻',
    title: '开发者身份',
    features: [
      '✓ 接单赚钱',
      '✓ 管理预算池和里程碑',
      '✓ 发布 Skill 到市场',
      '✓ 参与任务市场',
    ],
  },
};

export const LockedIdentityContent: React.FC<Props> = ({ 
  identity, 
  isPending, 
  onActivate 
}) => {
  const config = identityConfig[identity as keyof typeof identityConfig];

  if (!config) return null;

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.lockContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <Text style={styles.title}>{config.title}未激活</Text>
        </View>

        {isPending ? (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingIcon}>⏳</Text>
            <Text style={styles.pendingTitle}>审核中</Text>
            <Text style={styles.pendingDesc}>
              您的{config.title}申请正在审核中，预计 1-2 个工作日内完成。
            </Text>
            <Text style={styles.pendingTip}>
              审核通过后，App 和 Web 端将同步激活。
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.subtitle}>
              激活{config.title}，解锁以下功能：
            </Text>
            <View style={styles.featureList}>
              {config.features.map((feature, index) => (
                <Text key={index} style={styles.feature}>{feature}</Text>
              ))}
            </View>
            <PrimaryButton 
              title="申请激活" 
              onPress={onActivate}
            />
            <Text style={styles.syncTip}>
              已在 Web 端申请？App 自动同步
            </Text>
          </>
        )}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  lockContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 24,
  },
  feature: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  syncTip: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
  // 审核中状态
  pendingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  pendingIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  pendingTitle: {
    color: '#f59e0b',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  pendingDesc: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  pendingTip: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});
