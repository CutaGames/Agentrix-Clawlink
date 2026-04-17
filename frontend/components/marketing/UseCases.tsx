import { useRouter } from 'next/router'

export function UseCases() {
  const router = useRouter()

  const useCases = [
    {
      icon: '🤖',
      title: 'Agent 开发者',
      description: '为 Agent 添加交易能力，智能路由，自动执行，完整的支付、订单、结算能力',
      steps: ['集成 SDK', '配置 API Key', '调用支付 API', 'Agent 自动执行交易'],
      cta: '查看文档',
      link: '/developers'
    },
    {
      icon: '🏪',
      title: '商户',
      description: '多渠道销售，智能支付，自动结算，数据分析，支持法币和数字货币支付',
      steps: ['创建商品', '配置支付方式', '上架到 Marketplace', 'AI Agent 自动推荐'],
      cta: '了解详情',
      link: '/use-cases#merchant'
    },
    {
      icon: '🚀',
      title: '项目方（Web3）',
      description: '通过 Agent 直接发行代币，降低发行成本，获得更高收益，自动部署合约，自动上架',
      steps: ['通过 Agent 对话收集信息', '自动部署智能合约', '自动上架到 Marketplace', 'Agent 自动推荐和交易'],
      cta: '体验发行',
      link: '/agent-enhanced'
    },
    {
      icon: '🎨',
      title: '创作者（Web3）',
      description: '通过 Agent 直接发行 NFT，版税 100% 归创作者，批量 Mint，自动上架',
      steps: ['通过 Agent 上传 NFT 文件', '批量 Mint 并上传元数据', '自动上架到 Marketplace', 'Agent 自动推荐和交易'],
      cta: '体验发行',
      link: '/agent-enhanced'
    },
    {
      icon: '🌐',
      title: '资产交易者 / DeFi 玩家',
      description: 'AI 自动聚合 Token / 交易对 / NFT / RWA / Launchpad，随时可执行 swap、限价、定投、扫地、抢购。',
      steps: ['浏览聚合资产', '选择策略或下单方式', 'Agent 自动执行并跟踪', '获取收益/风控提醒'],
      cta: '探索 Marketplace',
      link: '/agent-enhanced'
    }
  ]

  return (
    <section className="bg-white py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            为不同角色提供价值
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            无论您是 Agent 开发者、商户、Web3 项目方、创作者，还是活跃的资产交易者，Agentrix 都能为您提供完美的解决方案
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          {useCases.map((useCase, index) => (
            <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 border border-gray-200 hover:shadow-lg transition-all">
              <div className="flex items-start mb-4">
                <div className="text-4xl mr-4">{useCase.icon}</div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-gray-600 mb-6">{useCase.description}</p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {useCase.steps.map((step, stepIndex) => (
                  <div key={stepIndex} className="flex items-center">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm mr-3 flex-shrink-0">
                      {stepIndex + 1}
                    </div>
                    <span className="text-gray-700 text-sm">{step}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => router.push(useCase.link)}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                {useCase.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
