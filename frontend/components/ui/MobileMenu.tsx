import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useUser } from '../../contexts/UserContext'
import { useLocalization } from '../../contexts/LocalizationContext'
import { LanguageSwitcher } from './LanguageSwitcher'

const primaryItems = [
  { name: { zh: '产品', en: 'Product' }, href: '/', icon: '🏠' },
  { name: { zh: 'AX Agent', en: 'AX Agent' }, href: '/agent-enhanced', icon: '🤖' },
  { name: { zh: 'Agent Builder', en: 'Agent Builder' }, href: '/agent-builder', icon: '⚡' },
  { name: { zh: 'Marketplace', en: 'Marketplace' }, href: '/marketplace', icon: '🌐' },
  { name: { zh: '联盟', en: 'Alliance' }, href: '/alliance', icon: '🤝' },
  { name: { zh: 'Edge', en: 'Edge' }, href: '/edge', icon: '📱' },
  { name: { zh: '开发者', en: 'Developers' }, href: '/developers', icon: '📘' },
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
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
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
            className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 h-full w-72 transform bg-white shadow-xl transition-transform duration-300 md:hidden">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-gray-900" onClick={() => setIsOpen(false)}>
                  Agentrix
                </Link>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-gray-600 hover:text-gray-900"
                  aria-label="关闭菜单"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <LanguageSwitcher />
              </div>
            </div>

            <nav className="space-y-6 p-4">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{t({ zh: '核心导航', en: 'Primary' })}</p>
                {primaryItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
                      router.pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-medium">{t(item.name)}</span>
                  </Link>
                ))}
              </div>


              <div className="space-y-2 border-t border-gray-200 pt-4">
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{t({ zh: '登录 / 控制台', en: 'Account' })}</p>
                <div>
                  {router.pathname === '/agent-builder' ? null : (
                    <Link
                      href="/agent-builder"
                      onClick={() => setIsOpen(false)}
                      className="flex items-center space-x-3 rounded-lg px-4 py-3 text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <span>⚡</span>
                      <span className="font-medium">{t({ zh: 'Agent Builder', en: 'Agent Builder' })}</span>
                    </Link>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                {isAuthenticated ? (
                <Link
                    href="/app/user"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center space-x-3 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
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
                    className="flex w-full items-center space-x-3 rounded-lg bg-blue-600 px-4 py-3 text-white hover:bg-blue-700"
                  >
                    <span>🔐</span>
                    <span className="font-medium">{t({ zh: '登录', en: 'Sign in' })}</span>
                  </button>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}

