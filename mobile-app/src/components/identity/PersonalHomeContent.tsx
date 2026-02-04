// 个人身份首页内容
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card } from '../Card';
import { PrimaryButton } from '../PrimaryButton';
import { colors } from '../../theme/colors';

// Mock 数据 - 后续替换为 API
const mockAssets = {
  totalUsdValue: 12345.67,
  change24h: 234.56,
  change24hPercent: 1.9,
  topAssets: [
    { symbol: 'USDT', value: 8000 },
    { symbol: 'ETH', value: 3200 },
    { symbol: 'SOL', value: 1145 },
  ],
};

const mockAirdrops = [
  { id: '1', name: 'Jupiter', protocol: 'Solana', estimatedValue: 120 },
  { id: '2', name: 'LayerZero', protocol: 'Multi-chain', estimatedValue: 80 },
  { id: '3', name: 'zkSync', protocol: 'Ethereum L2', estimatedValue: 200 },
];

const mockAutoEarn = {
  todayEarned: 12.5,
  totalEarned: 456.78,
  activeStrategies: 3,
};

export const PersonalHomeContent: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      {/* 资产总览卡片 */}
      <Card style={styles.assetCard}>
        <View style={styles.assetHeader}>
          <Text style={styles.assetLabel}>💰 总资产</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Assets')}>
            <Text style={styles.viewAll}>查看全部 →</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.assetValue}>
          ${mockAssets.totalUsdValue.toLocaleString()}
        </Text>
        <Text style={[
          styles.assetChange,
          mockAssets.change24h >= 0 ? styles.positive : styles.negative
        ]}>
          {mockAssets.change24h >= 0 ? '+' : ''}${mockAssets.change24h.toFixed(2)} 
          ({mockAssets.change24hPercent.toFixed(1)}%) 今日
        </Text>
        <View style={styles.assetList}>
          {mockAssets.topAssets.map((asset) => (
            <View key={asset.symbol} style={styles.assetItem}>
              <Text style={styles.assetSymbol}>{asset.symbol}</Text>
              <Text style={styles.assetItemValue}>${asset.value.toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* 空投发现 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🎁 发现空投</Text>
          <Text style={styles.badge}>{mockAirdrops.length} 个可领</Text>
        </View>
        <View style={styles.airdropList}>
          {mockAirdrops.slice(0, 2).map((airdrop) => (
            <TouchableOpacity 
              key={airdrop.id} 
              style={styles.airdropCard}
              onPress={() => navigation.navigate('Airdrop')}
            >
              <Text style={styles.airdropName}>{airdrop.name}</Text>
              <Text style={styles.airdropProtocol}>{airdrop.protocol}</Text>
              <Text style={styles.airdropValue}>预估 ${airdrop.estimatedValue}</Text>
              <TouchableOpacity style={styles.claimButton}>
                <Text style={styles.claimButtonText}>领取</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
        <PrimaryButton 
          title="查看全部空投" 
          onPress={() => navigation.navigate('Airdrop')} 
        />
      </Card>

      {/* AutoEarn 收益 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⚡ AutoEarn 收益</Text>
        </View>
        <View style={styles.earnStats}>
          <View style={styles.earnStat}>
            <Text style={styles.earnValue}>+${mockAutoEarn.todayEarned.toFixed(2)}</Text>
            <Text style={styles.earnLabel}>今日</Text>
          </View>
          <View style={styles.earnDivider} />
          <View style={styles.earnStat}>
            <Text style={styles.earnValue}>+${mockAutoEarn.totalEarned.toFixed(2)}</Text>
            <Text style={styles.earnLabel}>累计</Text>
          </View>
          <View style={styles.earnDivider} />
          <View style={styles.earnStat}>
            <Text style={styles.earnValue}>{mockAutoEarn.activeStrategies}</Text>
            <Text style={styles.earnLabel}>策略运行中</Text>
          </View>
        </View>
        <PrimaryButton 
          title="管理策略" 
          onPress={() => navigation.navigate('AutoEarn')} 
        />
      </Card>

      {/* 我的 Agent 快速入口 */}
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🤖 我的 Agent</Text>
        </View>
        <Text style={styles.agentDesc}>
          你的 AI 助手，随时待命
        </Text>
        <View style={styles.agentActions}>
          <TouchableOpacity style={styles.agentAction}>
            <Text style={styles.agentActionIcon}>💬</Text>
            <Text style={styles.agentActionLabel}>对话</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.agentAction}>
            <Text style={styles.agentActionIcon}>📋</Text>
            <Text style={styles.agentActionLabel}>任务</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.agentAction}>
            <Text style={styles.agentActionIcon}>⚙️</Text>
            <Text style={styles.agentActionLabel}>设置</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  // 资产卡片
  assetCard: {
    backgroundColor: colors.primary,
  },
  assetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assetLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  viewAll: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  assetValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
  },
  assetChange: {
    fontSize: 14,
    marginTop: 4,
  },
  positive: {
    color: '#4ade80',
  },
  negative: {
    color: '#f87171',
  },
  assetList: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  assetItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  assetSymbol: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 4,
  },
  assetItemValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // 通用
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.primary,
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  // 空投
  airdropList: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  airdropCard: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  airdropName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  airdropProtocol: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  airdropValue: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingVertical: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  // AutoEarn
  earnStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  earnStat: {
    flex: 1,
    alignItems: 'center',
  },
  earnDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  earnValue: {
    color: '#4ade80',
    fontSize: 18,
    fontWeight: '700',
  },
  earnLabel: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  // Agent
  agentDesc: {
    color: colors.muted,
    fontSize: 14,
    marginBottom: 16,
  },
  agentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  agentAction: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  agentActionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  agentActionLabel: {
    color: colors.text,
    fontSize: 14,
  },
});
