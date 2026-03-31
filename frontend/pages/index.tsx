import Head from 'next/head'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useLocalization } from '../contexts/LocalizationContext'
import { HeroSection } from '../components/home/HeroSection'
import { FeaturesSection } from '../components/home/FeaturesSection'
import { AgentRolesSection } from '../components/home/AgentRolesSection'
import { AllianceSection } from '../components/home/AllianceSection'
import { CTASection } from '../components/home/CTASection'

export default function Home() {
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>{t({ zh: '从对话到交易，从智能体到商业体｜Agentrix', en: 'From Conversation to Transaction, from Agent to Business | Agentrix' })}</title>
        <meta name="description" content={t({ zh: 'Agentrix 让任何 Agent 拥有支付、订单、结算、资产与推广能力，统一支付引擎 × Agent × Marketplace × Auto-Earn × 联盟生态。', en: 'Agentrix enables any Agent with payment, order, settlement, asset and promotion capabilities, unified payment engine × Agent × Marketplace × Auto-Earn × Alliance ecosystem.' })} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <Navigation />

      <main className="min-h-screen bg-slate-950 text-white">
        <HeroSection />
        <FeaturesSection />
        <AgentRolesSection />
        <AllianceSection />
        <CTASection />
      </main>

      <Footer />
    </>
  )
}
