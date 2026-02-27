// ---- Navigation Types for ClawLink ----

export type AuthStackParamList = {
  Login: undefined;
  AuthCallback: { code?: string; token?: string; provider?: string };
};

export type OnboardingStackParamList = {
  DeploySelect: undefined;
  CloudDeploy: undefined;
  ConnectExisting: undefined;
  LocalDeploy: undefined;
  SocialBind: { instanceId: string; platform?: 'telegram' };
};

export type AgentStackParamList = {
  AgentConsole: undefined;
  AgentChat: { instanceId?: string; instanceName?: string };
  OpenClawBind: undefined;
  SkillInstall: { skillId: string; skillName: string };
  StoragePlan: undefined;
  AgentLogs: undefined;
  MemoryManagement: undefined;
  WorkflowList: undefined;
  WorkflowDetail: { workflowId?: string };
  AgentAccount: undefined;
  AgentPermissions: { agentAccountId?: string } | undefined;
  // Layer 2
  VoiceChat: { instanceId?: string };
  TeamSpace: undefined;
  TeamInvite: { workspaceId: string; workspaceName: string };
};

export type MarketStackParamList = {
  Marketplace: undefined;
  SkillDetail: { skillId: string; skillName: string };
  Checkout: { skillId: string; skillName?: string };
  TaskMarket: undefined;
  TaskDetail: { taskId: string };
  PublishTask: undefined;
  PostTask: undefined;
  CreateLink: { skillId: string; skillName: string; skillPrice?: number; skillPriceUnit?: string };
  SkillInstall: { skillId: string; skillName: string };
  ShareCard: { shareUrl: string; title?: string; userName?: string };
};

export type SocialStackParamList = {
  // Feed
  Feed: undefined;
  PostDetail: { postId: string };
  UserProfile: { userId: string };
  CreatePost: undefined;
  // Merged Chat (moved from standalone Chat tab)
  ChatList: undefined;
  DirectMessage: { userId: string; userName: string; userAvatar?: string };
  GroupChat: { groupId: string; groupName: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  DirectMessage: { userId: string; userName: string; userAvatar?: string };
  GroupChat: { groupId: string; groupName: string };
};

export type MeStackParamList = {
  Profile: undefined;
  ReferralDashboard: undefined;
  Settings: undefined;
  Account: undefined;
  MySkills: undefined;
  MyOrders: undefined;
  WalletConnect: undefined;
  WalletBackup: undefined;
  NotificationCenter: undefined;
  ShareCard: { shareUrl: string; title?: string; userName?: string };
  SocialListener: undefined;
};

export type MainTabParamList = {
  Agent: undefined;
  Explore: undefined;   // was: Market
  Social: undefined;   // merged: Feed + Chat + Groups
  Me: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};
