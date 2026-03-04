import { useRouter } from 'next/router';
import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useLocalization } from '../../contexts/LocalizationContext';

interface AgentTopNavProps {
  // 简化顶部导航，只保留Logo和Agent Builder
}

export function AgentTopNav({}: AgentTopNavProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useUser();
  const { t } = useLocalization();

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo和标题 */}
          <div className="flex items-center space-x-4">
            {/* 返回主页按钮 */}
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title={t({ zh: '返回主页', en: 'Back to Home' })}
            >
              <ArrowLeft size={16} />
              <span>{t({ zh: '返回主页', en: 'Back to Home' })}</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                <span className="text-white text-lg">🤖</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Agentrix Agent</h1>
                <p className="text-xs text-gray-500">{t({ zh: 'AI 商业智能体工作台', en: 'AI Business Agent Workbench' })}</p>
              </div>
            </div>
          </div>

          {/* 右侧：用户信息和Agent Builder按钮 */}
          <div className="flex items-center gap-3">
            {/* 用户信息显示 */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">
                    {user.agentrixId?.substring(0, 2).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-xs">
                  <div className="text-gray-900 font-medium">
                    {user.agentrixId || user.email || t({ zh: '用户', en: 'User' })}
                  </div>
                  <div className="text-gray-500">
                    {user.role === 'merchant' ? t({ zh: '商家', en: 'Merchant' }) : user.role === 'agent' ? 'Agent' : t({ zh: '个人', en: 'Personal' })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Agent Builder按钮 */}
            <button
              onClick={() => router.push('/agent-builder')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>⚡</span>
              <span>Agent Builder</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

