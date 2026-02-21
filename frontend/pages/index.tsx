import Head from 'next/head'
import { Navigation } from '../components/ui/Navigation'
import { Footer } from '../components/layout/Footer'
import { useLocalization } from '../contexts/LocalizationContext'
import { HeroSection } from '../components/home/HeroSection'
import { ClawSection } from '../components/home/ClawSection'
import { MarketplaceShowcaseSection } from '../components/home/MarketplaceShowcaseSection'
import { FeaturesSection } from '../components/home/FeaturesSection'
import { AgentRolesSection } from '../components/home/AgentRolesSection'
import { AllianceSection } from '../components/home/AllianceSection'
import { DownloadSection } from '../components/home/DownloadSection'
import { CTASection } from '../components/home/CTASection'

export default function Home() {
  const { t } = useLocalization()

  return (
    <>
      <Head>
        <title>{t({ zh: 'Agentrix — AI Agent 操作系统 | 部署、Skill 市场、任务集市、X402支付', en: 'Agentrix — AI Agent Operating System | Deploy · Skills · Task Market · X402' })}</title>
        <meta name="description" content={t({ zh: 'Agentrix Claw 让你一键云端部署 AI Agent，内置 5000+ Skill 市场、任务集市与 X402 自主支付。活动期新用户免费赠送 10 GB 云端存储。', en: 'Agentrix Claw: Deploy AI Agents in one tap. 5000+ Skills from ClawHub, Task Market, X402 autonomous payments. New users get 10 GB free storage during early access.' })} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navigation />

      <main className="min-h-screen bg-slate-950 text-white">
        <HeroSection />
        <ClawSection />
        <MarketplaceShowcaseSection />
        <AgentRolesSection />
        <FeaturesSection />
        <AllianceSection />
        <DownloadSection />
        <CTASection />
      </main>

      <Footer />
    </>
  )
}
