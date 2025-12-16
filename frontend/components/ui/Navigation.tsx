import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { UserMenu } from '../auth/UserMenu'
import { MobileMenu } from './MobileMenu'
import { GlobalSearch } from '../search/GlobalSearch'
import { NotificationCenter } from '../notification/NotificationCenter'
import { useLocalization } from '../../contexts/LocalizationContext'
import { AgentrixLogo } from '../common/AgentrixLogo'
import { LanguageSwitcher } from './LanguageSwitcher'

const mainNavItems = [
  { href: '/agent-enhanced', label: { zh: 'AX Agent', en: 'AX Agent' } },
  { href: '/marketplace', label: { zh: 'Marketplace', en: 'Marketplace' } },
  { href: '/alliance', label: { zh: '联盟', en: 'Alliance' } },
  { href: '/edge', label: { zh: 'Edge', en: 'Edge' } },
  { href: '/developers', label: { zh: '开发者', en: 'Developers' } },
]

export function Navigation({ onLoginClick }: { onLoginClick: () => void }) {
  const router = useRouter()
  const { isAuthenticated } = useUser()
  const { t } = useLocalization()

  const isActive = (path: string) => router.pathname === path

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo + Mobile Menu */}
          <div className="flex items-center space-x-3">
            <MobileMenu />
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <AgentrixLogo size="md" showText={true} />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="ml-6 flex items-center space-x-4">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium ${
                    isActive(item.href)
                      ? 'text-blue-600'
                      : 'text-gray-500 transition-colors hover:text-blue-600'
                  }`}
                >
                  {t(item.label)}
                </Link>
              ))}
            </div>
          </div>

          {/* Search, Notifications, Selectors, Login/User Menu */}
          <div className="flex items-center space-x-2">
            <div className="hidden lg:flex">
              <LanguageSwitcher />
            </div>
            {/* 后台入口按钮已移除，用户可通过用户菜单访问后台 */}
            <button
              onClick={() => router.push('/agent-builder')}
              className="hidden items-center rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-200 md:inline-flex"
            >
              ⚡ Agent Builder (Beta)
            </button>
            {/* 搜索功能暂时隐藏，可通过用户菜单访问 */}
            {/* <GlobalSearch /> */}
            {isAuthenticated && <NotificationCenter />}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={onLoginClick}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                {t({ zh: '登录', en: 'Sign in' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
