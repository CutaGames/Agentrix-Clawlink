import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Navigation } from '../components/ui/Navigation';
import { Footer } from '../components/layout/Footer';
import { PluginMarketplace, Plugin } from '../components/agent/marketplace/PluginMarketplace';
import { useUser } from '../contexts/UserContext';
import { useLocalization } from '../contexts/LocalizationContext';
import { useToast } from '../contexts/ToastContext';
import { LoginModal } from '../components/auth/LoginModal';

export default function PluginsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useUser();
  const { t } = useLocalization();
  const { success, error } = useToast();
  const [showLogin, setShowLogin] = useState(false);
  const [installedPlugins, setInstalledPlugins] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<'user' | 'merchant' | 'developer'>('user');

  // 加载已安装的插件列表
  useEffect(() => {
    if (isAuthenticated) {
      loadInstalledPlugins();
    }
  }, [isAuthenticated]);

  const loadInstalledPlugins = async () => {
    try {
      const { pluginApi } = await import('../lib/api/plugin.api');
      const userPlugins = await pluginApi.getUserPlugins();
      setInstalledPlugins(userPlugins.map(up => up.pluginId));
    } catch (err: any) {
      console.error('加载已安装插件失败:', err);
      // 静默失败，不影响页面显示
    }
  };

  // 根据用户角色确定插件市场角色
  const determineRole = (): 'user' | 'merchant' | 'developer' => {
    if (!user) return 'user';
    if (user.roles?.includes('merchant' as any)) return 'merchant';
    if (user.roles?.includes('agent' as any) || user.roles?.includes('developer' as any)) return 'developer';
    return 'user';
  };

  const handleInstall = async (pluginId: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }

    try {
      // 调用后端 API 安装插件
      const { pluginApi } = await import('../lib/api/plugin.api');
      await pluginApi.installPlugin(pluginId);
      
      // 更新已安装插件列表
      setInstalledPlugins([...installedPlugins, pluginId]);
      success(t({ zh: '插件已安装', en: 'Plugin installed' }));
      
      // 重新加载已安装插件列表以确保同步
      await loadInstalledPlugins();
    } catch (err: any) {
      console.error('插件安装失败:', err);
      error(err.message || t({ zh: '安装失败', en: 'Install failed' }));
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      // 调用后端 API 卸载插件
      const { pluginApi } = await import('../lib/api/plugin.api');
      await pluginApi.uninstallPlugin(pluginId);
      
      // 更新已安装插件列表
      setInstalledPlugins(installedPlugins.filter((id) => id !== pluginId));
      success(t({ zh: '插件已卸载', en: 'Plugin uninstalled' }));
      
      // 重新加载已安装插件列表以确保同步
      await loadInstalledPlugins();
    } catch (err: any) {
      console.error('插件卸载失败:', err);
      error(err.message || t({ zh: '卸载失败', en: 'Uninstall failed' }));
    }
  };

  const handlePurchase = async (pluginId: string) => {
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }

    try {
      // 调用真实的购买 API
      const { pluginApi } = await import('../lib/api/plugin.api');
      const result = await pluginApi.purchasePlugin(pluginId);
      
      if (result.success) {
        success(t({ zh: result.message || '购买成功，已自动安装', en: result.message || 'Purchase successful, installed automatically' }));
        // 更新已安装插件列表
        if (result.userPlugin) {
          setInstalledPlugins([...installedPlugins, pluginId]);
        }
        // 重新加载已安装插件列表以确保同步
        await loadInstalledPlugins();
      } else {
        error(t({ zh: '购买失败', en: 'Purchase failed' }));
      }
    } catch (err: any) {
      console.error('插件购买失败:', err);
      error(err.message || t({ zh: '购买失败', en: 'Purchase failed' }));
    }
  };

  return (
    <>
      <Head>
        <title>{t({ zh: '插件市场 - 通过 Agent 使用插件', en: 'Plugin Marketplace - Use Plugins through Agent' })}</title>
        <meta
          name="description"
          content={t({
            zh: '在 Agent Builder 中安装插件，扩展 Agent 功能。所有插件都通过 Agent 使用。',
            en: 'Install plugins in Agent Builder to extend Agent capabilities. All plugins are used through Agent.',
          })}
        />
      </Head>
      <Navigation onLoginClick={() => setShowLogin(true)} />
      <main className="bg-gradient-to-b from-gray-50 to-white min-h-screen">
        {/* 通过 Agent 访问提示 */}
        <section className="bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 border-b border-emerald-500/20">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">
                    {t({ zh: '通过 Agent 使用插件', en: 'Use Plugins through Agent' })}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t({ zh: '在 Agent Builder 中直接安装插件，或在工作台中管理已安装的插件', en: 'Install plugins directly in Agent Builder, or manage installed plugins in workspace' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/agent-builder')}
                className="bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all shadow-lg"
              >
                {t({ zh: '创建 Agent', en: 'Create Agent' })}
              </button>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-6 py-12 lg:py-16">
          {/* 页面头部 */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {t({ zh: '插件市场', en: 'Plugin Marketplace' })}
            </h1>
            <p className="text-lg text-gray-600 mb-6">
              {t({
                zh: '浏览和安装插件，扩展您的 Agent 功能。免费和付费插件可供选择。',
                en: 'Browse and install plugins to extend your Agent capabilities. Free and paid plugins available.',
              })}
            </p>
            
            {/* 提示框 */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-800 font-semibold mb-2">
                {t({ zh: '💡 提示：在 Agent Builder 中安装插件', en: '💡 Tip: Install Plugins in Agent Builder' })}
              </p>
              <p className="text-xs text-emerald-700">
                {t({ zh: '创建 Agent 时，在"能力组装"步骤中可以直接浏览和安装插件。已创建的 Agent 可以在工作台的"插件管理"中安装新插件。', en: 'When creating Agent, you can browse and install plugins in the "Capability Assembly" step. Created Agents can install new plugins in the "Plugin Management" section of the workspace.' })}
              </p>
            </div>

            {/* 角色切换 */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">
                {t({ zh: '当前角色', en: 'Current Role' })}:
              </span>
              <div className="flex gap-2">
                {(['user', 'merchant', 'developer'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setUserRole(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userRole === role
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {role === 'user'
                      ? t({ zh: '个人', en: 'Personal' })
                      : role === 'merchant'
                      ? t({ zh: '商家', en: 'Merchant' })
                      : t({ zh: '开发者', en: 'Developer' })}
                  </button>
                ))}
              </div>
            </div>

            {!isAuthenticated && (
              <div className="p-4 rounded-lg border border-yellow-200 bg-yellow-50 text-sm text-yellow-800 flex items-center justify-between">
                <span>{t({ zh: '登录后可以安装和管理插件', en: 'Login to install and manage plugins' })}</span>
                <button
                  onClick={() => setShowLogin(true)}
                  className="px-3 py-1 rounded-full bg-yellow-600 text-white text-xs font-semibold"
                >
                  {t({ zh: '登录/注册', en: 'Login/Register' })}
                </button>
              </div>
            )}
          </div>

          {/* 插件市场组件 */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 lg:p-8">
            <PluginMarketplace
              role={userRole}
              installedPlugins={installedPlugins}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onPurchase={handlePurchase}
            />
          </div>
        </section>
      </main>
      <Footer />
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}

