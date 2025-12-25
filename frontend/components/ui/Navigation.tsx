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
  { href: '/ax-payment', label: { zh: 'AX 支付', en: 'AX Payment' } },
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
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex h-20 items-center justify-between">
          {/* Logo + Mobile Menu */}
          <div className="flex items-center space-x-3">
            <MobileMenu />
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <AgentrixLogo size="md" showText={true} className="text-white" />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden flex-1 items-center justify-center md:flex">
            <div className="ml-6 flex items-center space-x-8">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-semibold tracking-wide transition-all hover:text-cyan-400 ${
                    isActive(item.href)
                      ? 'text-cyan-400'
                      : 'text-slate-300'
                  }`}
                >
                  {t(item.label)}
                </Link>
              ))}
            </div>
          </div>

          {/* Search, Notifications, Selectors, Login/User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex">
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => router.push('/agent-builder')}
              className="hidden items-center rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-white/10 hover:border-cyan-500/50 md:inline-flex uppercase tracking-widest"
            >
              ⚡ Builder
            </button>
            {isAuthenticated && <NotificationCenter />}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={onLoginClick}
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-blue-600/20"
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
