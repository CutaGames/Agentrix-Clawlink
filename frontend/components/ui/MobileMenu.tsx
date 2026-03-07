import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useLocalization } from '../../contexts/LocalizationContext'
import { LanguageSwitcher } from './LanguageSwitcher'
import { AgentrixLogo } from '../common/AgentrixLogo'

const primaryItems = [
  { name: { zh: 'Agentrix Claw', en: 'Agentrix Claw' }, href: '/claw', icon: '📱' },
  { name: { zh: '市场', en: 'Marketplace' }, href: '/marketplace', icon: '🛍️' },
  { name: { zh: 'Agent 工作台', en: 'Workspace' }, href: '/agent-enhanced', icon: '🤖' },
]

const secondaryItems = [
  { name: { zh: 'AX 支付', en: 'AX Payment' }, href: '/ax-payment', icon: '💳' },
  { name: { zh: '开发者', en: 'Developers' }, href: '/developers', icon: '⚙️' },
  { name: { zh: '联盟', en: 'Alliance' }, href: '/alliance', icon: '🤝' },
]

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { isAuthenticated } = useUser()
  const { t } = useLocalization()

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10 hover:text-white md:hidden"
        aria-label="菜单"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 h-full w-[86vw] max-w-sm transform border-r border-white/10 bg-slate-950 text-white shadow-2xl shadow-black/60 transition-transform duration-300 md:hidden">
            <div className="border-b border-white/10 p-5">
              <div className="flex items-center justify-between">
                <Link href="/" className="hover:opacity-80 transition-opacity" onClick={() => setIsOpen(false)}>
                  <AgentrixLogo size="md" showText={true} className="text-white" />
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-white/10 p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                  aria-label="关闭菜单"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">Agentrix</p>
                  <p className="mt-1 text-sm text-slate-300">{t({ zh: '移动端统一导航', en: 'Unified mobile navigation' })}</p>
                </div>
                <LanguageSwitcher />
              </div>
            </div>

            <nav className="space-y-6 p-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t({ zh: '核心导航', en: 'Primary' })}</p>
                {primaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 rounded-2xl border px-4 py-3.5 transition-colors ${
                      router.pathname === item.href
                        ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                        : 'border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{t(item.name)}</span>
                  </Link>
                ))}
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{t({ zh: '更多入口', en: 'More' })}</p>
                <div className="space-y-2">
                  {secondaryItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-3 rounded-2xl border px-4 py-3 transition-colors ${
                        router.pathname === item.href
                          ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-300'
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className="font-medium">{t(item.name)}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                {isAuthenticated ? (
                <Link
                    href="/app/user"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-white shadow-lg shadow-cyan-500/20 hover:opacity-90"
                  >
                    <span>👤</span>
                    <span className="font-medium">{t({ zh: '个人中心', en: 'Dashboard' })}</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      router.push('/auth/login')
                    }}
                    className="flex w-full items-center space-x-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3.5 text-white shadow-lg shadow-cyan-500/20 hover:opacity-90"
                  >
                    <span>🔐</span>
                    <span className="font-medium">{t({ zh: '登录', en: 'Sign in' })}</span>
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-violet-300">Claw</p>
                <p className="mt-2 text-sm text-slate-200">{t({ zh: '移动端入口与桌面端保持一致，导航更清晰。', en: 'Mobile navigation now matches the desktop experience.' })}</p>
                <Link
                  href="/claw#download"
                  onClick={() => setIsOpen(false)}
                  className="mt-3 inline-flex items-center rounded-full border border-violet-400/30 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/10"
                >
                  {t({ zh: '下载 Claw', en: 'Download Claw' })}
                </Link>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}

