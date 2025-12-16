import Link from 'next/link'
import { AgentrixLogo } from '../common/AgentrixLogo'
import { useLocalization } from '../../contexts/LocalizationContext'

export function Footer() {
  const { t } = useLocalization()

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* 产品信息 */}
          <div>
            <div className="mb-4">
              <AgentrixLogo size="lg" showText={true} className="text-white" />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {t({ zh: 'AI经济时代的支付协议层', en: 'Payment Protocol Layer for the AI Economy' })}
            </p>
            <div className="flex space-x-4">
              <a
                href="https://twitter.com/agentrix"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                title="X (Twitter)"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href="https://t.me/agentrix"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                title="Telegram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a
                href="https://discord.gg/agentrix"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                title="Discord"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* 产品链接 */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t({ zh: '产品', en: 'Product' })}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/developers" className="hover:text-white transition-colors">
                  {t({ zh: 'API文档', en: 'API Docs' })}
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-white transition-colors">
                  {t({ zh: 'SDK文档', en: 'SDK Docs' })}
                </Link>
              </li>
              <li>
                <Link href="/use-cases" className="hover:text-white transition-colors">
                  {t({ zh: '应用场景', en: 'Use Cases' })}
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-white transition-colors">
                  {t({ zh: '功能特性', en: 'Features' })}
                </Link>
              </li>
            </ul>
          </div>

          {/* 开发者资源 */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t({ zh: '开发者', en: 'Developer' })}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/developers" className="hover:text-white transition-colors">
                  {t({ zh: '快速开始', en: 'Quick Start' })}
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/agentrix"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/developers" className="hover:text-white transition-colors">
                  {t({ zh: '集成指南', en: 'Integration Guide' })}
                </Link>
              </li>
              <li>
                <Link href="/developers" className="hover:text-white transition-colors">
                  {t({ zh: '示例代码', en: 'Sample Code' })}
                </Link>
              </li>
            </ul>
          </div>

          {/* 法律信息 */}
          <div>
            <h4 className="text-white font-semibold mb-4">{t({ zh: '法律', en: 'Legal' })}</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  {t({ zh: '隐私政策', en: 'Privacy Policy' })}
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  {t({ zh: '服务条款', en: 'Terms of Service' })}
                </Link>
              </li>
              <li>
                <Link href="/legal/disclaimer" className="hover:text-white transition-colors">
                  {t({ zh: '免责声明', en: 'Disclaimer' })}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
          <p>© {new Date().getFullYear()} Agentrix. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

