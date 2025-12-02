import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

export default function AgentSandbox() {
  const [testApiKey, setTestApiKey] = useState('pk_test_***')
  const [testResults, setTestResults] = useState<any[]>([])
  const [testing, setTesting] = useState(false)

  const runTest = async (testName: string) => {
    setTesting(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const result = {
        test: testName,
        status: Math.random() > 0.3 ? 'passed' : 'failed',
        message: Math.random() > 0.3 ? '测试通过' : '测试失败',
        timestamp: new Date().toISOString(),
      }
      setTestResults([result, ...testResults])
    } catch (error) {
      console.error('测试失败:', error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <DashboardLayout userType="agent">
      <Head>
        <title>测试环境 - Agent中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">测试环境</h1>
          <p className="text-gray-600 mt-1">在沙箱环境中测试您的Agent功能</p>
        </div>

        {/* API密钥 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">测试API密钥</h2>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={testApiKey}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
            />
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              复制
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              重新生成
            </button>
          </div>
        </div>

        {/* 测试套件 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">测试套件</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => runTest('商品搜索')}
              disabled={testing}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="font-medium text-gray-900">商品搜索</div>
              <div className="text-sm text-gray-500 mt-1">测试商品搜索API</div>
            </button>
            <button
              onClick={() => runTest('订单创建')}
              disabled={testing}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="font-medium text-gray-900">订单创建</div>
              <div className="text-sm text-gray-500 mt-1">测试订单创建API</div>
            </button>
            <button
              onClick={() => runTest('支付处理')}
              disabled={testing}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="font-medium text-gray-900">支付处理</div>
              <div className="text-sm text-gray-500 mt-1">测试支付处理API</div>
            </button>
            <button
              onClick={() => runTest('Webhook')}
              disabled={testing}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
            >
              <div className="font-medium text-gray-900">Webhook</div>
              <div className="text-sm text-gray-500 mt-1">测试Webhook回调</div>
            </button>
          </div>
        </div>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">测试结果</h2>
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    result.status === 'passed' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900">{result.test}</span>
                      <span className={`ml-2 text-sm ${
                        result.status === 'passed' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.status === 'passed' ? '✓ 通过' : '✗ 失败'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

