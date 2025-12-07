import Head from 'next/head'
import Link from 'next/link'

export default function Dashboard() {
  const roles = [
    {
      title: '用户中心',
      description: '管理支付、授权和钱包，查看交易记录',
      icon: '👤',
      path: '/app/user',
      color: 'blue',
      features: ['支付记录', '自动支付授权', '钱包管理', '安全设置']
    },
    {
      title: 'Agent控制台',
      description: '管理AI支付能力，查看分润收益，配置商品推荐',
      icon: '🤖',
      path: '/app/agent', 
      color: 'green',
      features: ['收益面板', '支付授权', '商品推荐', '数据分析']
    },
    {
      title: '商户后台',
      description: '管理商品和订单，设置分润规则，查看结算数据',
      icon: '🏪',
      path: '/app/merchant',
      color: 'purple',
      features: ['商品管理', '订单管理', '分润设置', '结算中心']
    }
  ]

  return (
    <>
      <Head>
        <title>选择角色 - Agentrix</title>
      </Head>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              欢迎回到 Agentrix
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              请选择您要进入的管理后台
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {roles.map((role, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-4">{role.icon}</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {role.title}
                </h3>
                <p className="text-gray-600 mb-6">
                  {role.description}
                </p>
                
                <ul className="space-y-2 mb-6">
                  {role.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-500">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={role.path}
                  className={`block w-full text-center py-3 rounded-lg font-semibold transition-colors ${
                    role.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                    role.color === 'green' ? 'bg-green-600 hover:bg-green-700 text-white' :
                    'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  进入后台
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <p className="text-gray-500">
              需要其他角色权限？{' '}
              <a href="#" className="text-blue-600 hover:underline">
                联系管理员
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
