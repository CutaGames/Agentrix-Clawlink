import Head from 'next/head'
import { useState } from 'react'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'

interface ReportData {
  period: string
  totalAmount: number
  transactionCount: number
  platformCommission: number
  agentCommission: number
  netRevenue: number
}

export default function MerchantReports() {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reports, setReports] = useState<ReportData[]>([])

  const generateReport = () => {
    // 模拟生成报表数据
    const mockReports: ReportData[] = [
      {
        period: '2025-01',
        totalAmount: 325000,
        transactionCount: 1200,
        platformCommission: 9750,
        agentCommission: 16250,
        netRevenue: 299000,
      },
      {
        period: '2024-12',
        totalAmount: 280000,
        transactionCount: 1050,
        platformCommission: 8400,
        agentCommission: 14000,
        netRevenue: 257600,
      },
    ]
    setReports(mockReports)
  }

  const exportReport = (format: 'csv' | 'excel') => {
    // 导出报表
    alert(`导出${format.toUpperCase()}格式报表`)
  }

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>收入报表 - 商户中心</title>
      </Head>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">收入报表</h1>
          <p className="text-gray-600 mt-1">查看详细的收入报表和结算记录</p>
        </div>

        {/* 报表筛选 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">报表类型</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="daily">日报</option>
                <option value="weekly">周报</option>
                <option value="monthly">月报</option>
                <option value="yearly">年报</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={generateReport}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                生成报表
              </button>
            </div>
          </div>
        </div>

        {/* 报表数据 */}
        {reports.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">报表数据</h2>
              <div className="space-x-2">
                <button
                  onClick={() => exportReport('csv')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  导出 CSV
                </button>
                <button
                  onClick={() => exportReport('excel')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  导出 Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">期间</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">总收入</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">交易笔数</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">平台佣金</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent佣金</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">净收入</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {reports.map((report, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.period}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">¥{report.totalAmount.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{report.transactionCount}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">¥{report.platformCommission.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">¥{report.agentCommission.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">¥{report.netRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
