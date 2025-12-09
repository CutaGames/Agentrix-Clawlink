import { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../contexts/ToastContext';
import { socialAccountApi } from '../../lib/api/social-account.api';

export type SocialAccountType = 'google' | 'apple' | 'x' | 'telegram' | 'discord';

interface SocialAccount {
  id: string;
  type: SocialAccountType;
  socialId: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  connectedAt: string;
  lastUsedAt: string;
}

interface SocialAccountBindingProps {
  onUpdate?: () => void;
}

export function SocialAccountBinding({ onUpdate }: SocialAccountBindingProps) {
  const { user, isAuthenticated } = useUser();
  const { success, error: showError } = useToast();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [binding, setBinding] = useState<SocialAccountType | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAccounts();
    }
  }, [isAuthenticated]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await socialAccountApi.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      console.error('加载社交账号失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBind = async (type: SocialAccountType) => {
    try {
      setBinding(type);

      if (type === 'google') {
        // Google OAuth 重定向
        window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/google?bind=true`;
        return;
      }

      if (type === 'apple') {
        // TODO: 实现 Apple Sign In
        showError('Apple 登录功能开发中');
        return;
      }

      if (type === 'x') {
        // TODO: 实现 X (Twitter) OAuth
        showError('X (Twitter) 登录功能开发中');
        return;
      }

      if (type === 'telegram') {
        // TODO: 实现 Telegram Bot 绑定
        showError('Telegram 绑定功能开发中');
        return;
      }

      if (type === 'discord') {
        // TODO: 实现 Discord OAuth
        showError('Discord 绑定功能开发中');
        return;
      }
    } catch (err: any) {
      showError(err.message || '绑定失败');
    } finally {
      setBinding(null);
    }
  };

  const handleUnbind = async (type: SocialAccountType) => {
    if (!confirm(`确定要解绑${getTypeName(type)}账号吗？`)) {
      return;
    }

    try {
      await socialAccountApi.unbind(type);
      success(`已解绑${getTypeName(type)}账号`);
      await loadAccounts();
      onUpdate?.();
    } catch (err: any) {
      showError(err.message || '解绑失败');
    }
  };

  const getTypeName = (type: SocialAccountType): string => {
    const names: Record<SocialAccountType, string> = {
      google: 'Google',
      apple: 'Apple',
      x: 'X (Twitter)',
      telegram: 'Telegram',
      discord: 'Discord',
    };
    return names[type] || type;
  };

  const getTypeIcon = (type: SocialAccountType): string => {
    const icons: Record<SocialAccountType, string> = {
      google: '🔵',
      apple: '🍎',
      x: '𝕏',
      telegram: '✈️',
      discord: '💬',
    };
    return icons[type] || '🔗';
  };

  const getTypeColor = (type: SocialAccountType): string => {
    const colors: Record<SocialAccountType, string> = {
      google: 'bg-blue-50 border-blue-200',
      apple: 'bg-black text-white',
      x: 'bg-gray-900 text-white',
      telegram: 'bg-blue-100 border-blue-300',
      discord: 'bg-indigo-100 border-indigo-300',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  const allTypes: SocialAccountType[] = ['google', 'apple', 'x', 'telegram', 'discord'];

  if (loading) {
    return (
      <div className="space-y-3">
        {allTypes.map((type) => (
          <div
            key={type}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg animate-pulse"
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div>
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allTypes.map((type) => {
        const account = accounts.find((acc) => acc.type === type);
        const isBound = !!account;
        const isBinding = binding === type;

        return (
          <div
            key={type}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              isBound ? getTypeColor(type) : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isBound ? getTypeColor(type) : 'bg-white border border-gray-200'
                }`}
              >
                <span className="text-lg">{getTypeIcon(type)}</span>
              </div>
              <div>
                <div className="font-medium text-gray-900">{getTypeName(type)}</div>
                <div className="text-sm text-gray-500">
                  {isBound ? (
                    <>
                      {account.displayName || account.username || account.email || '已绑定'}
                      {account.connectedAt && (
                        <span className="ml-2">
                          ({new Date(account.connectedAt).toLocaleDateString('zh-CN')})
                        </span>
                      )}
                    </>
                  ) : (
                    '未绑定'
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => (isBound ? handleUnbind(type) : handleBind(type))}
              disabled={isBinding}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                isBound
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                  : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
              } disabled:opacity-50`}
            >
              {isBinding ? '绑定中...' : isBound ? '解绑' : '绑定'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

