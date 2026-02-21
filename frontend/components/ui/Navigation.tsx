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
import { Store, Smartphone, Sparkles } from 'lucide-react'

const mainNavItems = [
  { href: '/claw', label: { zh: 'Agentrix Claw', en: 'Agentrix Claw' }, isClaw: true },
  { href: '/marketplace', label: { zh: '市场', en: 'Marketplace' }, highlight: true },
  { href: '/agent-enhanced', label: { zh: 'Agent 工作台', en: 'Workspace' } },
  { href: '/ax-payment', label: { zh: 'AX 支付', en: 'AX Payment' } },
  { href: '/developers', label: { zh: '开发者', en: 'Developers' } },
  { href: '/alliance', label: { zh: '联盟', en: 'Alliance' } },
]

export function Navigation() {
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
            <div className="ml-6 flex items-center space-x-6">
              {mainNavItems.map((item) => {
                const isHighlight = 'highlight' in item && item.highlight;
                const isClaw = 'isClaw' in item && item.isClaw;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`text-sm font-semibold tracking-wide transition-all flex items-center gap-1.5 ${
                      isActive(item.href)
                        ? 'text-cyan-400'
                        : isClaw
                          ? 'text-white bg-gradient-to-r from-violet-600/30 to-cyan-600/30 px-3 py-1.5 rounded-full border border-violet-500/40 hover:border-cyan-400/60 hover:text-cyan-300'
                          : isHighlight
                            ? 'text-white bg-gradient-to-r from-blue-600/20 to-purple-600/20 px-3 py-1.5 rounded-full border border-blue-500/30 hover:text-cyan-400'
                            : 'text-slate-300 hover:text-cyan-400'
                    }`}
                  >
                    {isClaw && <Smartphone size={13} className="text-violet-400" />}
                    {isHighlight && !isClaw && <Store size={14} />}
                    {t(item.label)}
                    {isClaw && (
                      <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider bg-gradient-to-r from-violet-500 to-cyan-500 text-white uppercase">
                        NEW
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Search, Notifications, Selectors, Login/User Menu */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex">
              <LanguageSwitcher />
            </div>
            <button
              onClick={() => router.push('/claw#download')}
              className="hidden items-center rounded-full bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border border-violet-500/30 px-4 py-2 text-xs font-bold text-slate-200 transition-all hover:border-cyan-400/60 hover:text-white md:inline-flex gap-1.5"
            >
              <Smartphone size={12} className="text-violet-400" />
              Download Claw
            </button>
            {isAuthenticated && <NotificationCenter />}
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-bold text-white transition-all hover:opacity-90 shadow-lg shadow-blue-600/20"
              >
                {t({ zh: '登录', en: 'Sign in' })}
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
