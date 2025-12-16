import Head from 'next/head'
import { DashboardLayout } from '../../../components/layout/DashboardLayout'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface ImportResult {
  total: number
  success: number
  failed: number
  skipped: number
  errors: Array<{ row: number; name: string; error: string }>
  createdIds: string[]
}

interface PreviewData {
  total: number
  products: any[]
  columns: string[]
}

const TEMPLATE_COLUMNS = [
  { key: 'name', label: '商品名称', required: true, example: 'iPhone 15 Pro' },
  { key: 'description', label: '商品描述', required: false, example: '苹果最新旗舰手机' },
  { key: 'price', label: '价格', required: true, example: '7999' },
  { key: 'currency', label: '货币', required: false, example: 'CNY' },
  { key: 'stock', label: '库存', required: false, example: '100' },
  { key: 'category', label: '分类', required: true, example: '电子产品' },
  { key: 'productType', label: '商品类型', required: false, example: 'physical' },
  { key: 'commissionRate', label: '佣金率(%)', required: false, example: '5' },
  { key: 'image', label: '图片URL', required: false, example: 'https://...' },
  { key: 'tags', label: '标签', required: false, example: '手机,苹果' },
]

export default function BatchImport() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'create' | 'upsert'>('create')
  const [skipErrors, setSkipErrors] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // 下载模板
  const downloadTemplate = () => {
    window.open(`${API_URL}/api/products/batch/template`, '_blank')
  }

  // 生成 Excel 模板（在前端生成）
  const downloadExcelTemplate = () => {
    // 创建 CSV 内容
    const headers = TEMPLATE_COLUMNS.map(c => c.label)
    const examples = TEMPLATE_COLUMNS.map(c => c.example || '')
    const notes = TEMPLATE_COLUMNS.map(c => c.required ? '(必填)' : '(可选)')
    
    const csv = [
      headers.join(','),
      examples.join(','),
      notes.join(','),
    ].join('\n')
    
    // 创建下载
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // 选择文件
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError(null)
    setResult(null)

    // 预览文件内容
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/products/batch/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setPreview(data.data)
      } else {
        setError(data.message || '预览失败')
      }
    } catch (err: any) {
      setError('预览文件失败: ' + err.message)
    }
  }

  // 执行导入
  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', mode)
      formData.append('skipErrors', String(skipErrors))

      const token = localStorage.getItem('token')
      const res = await fetch(`${API_URL}/api/products/batch/import/csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (data.success) {
        setResult(data.data)
      } else {
        setError(data.message || '导入失败')
      }
    } catch (err: any) {
      setError('导入失败: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  // 重置
  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // 拖拽上传
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.match(/\.(csv|txt)$/i)) {
      const event = { target: { files: [droppedFile] } } as any
      handleFileSelect(event)
    } else {
      setError('请上传 CSV 文件')
    }
  }, [])

  return (
    <DashboardLayout userType="merchant">
      <Head>
        <title>批量导入商品 - 商户后台</title>
      </Head>

      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">批量导入商品</h1>
            <p className="text-gray-600 mt-1">通过 CSV 文件快速上传大量商品</p>
          </div>
          <Link
            href="/app/merchant/products"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            ← 返回商品列表
          </Link>
        </div>

        {/* 步骤1: 下载模板 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">1</span>
            下载模板
          </h2>
          <p className="text-gray-600 mb-4">
            下载 CSV 模板，按照格式填写商品信息后上传
          </p>
          <div className="flex gap-4">
            <button
              onClick={downloadExcelTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              下载 CSV 模板
            </button>
          </div>

          {/* 模板字段说明 */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-sm text-gray-700 mb-2">模板字段说明：</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
              {TEMPLATE_COLUMNS.map(col => (
                <div key={col.key} className="flex items-center gap-1">
                  <span className={col.required ? 'text-red-500' : 'text-gray-400'}>
                    {col.required ? '*' : '○'}
                  </span>
                  <span className="text-gray-700">{col.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * 必填字段 &nbsp; ○ 可选字段 &nbsp; 
              商品类型可选: physical(实物), service(服务), nft, ft(代币), game_asset(游戏资产), rwa(真实资产)
            </p>
          </div>
        </div>

        {/* 步骤2: 上传文件 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">2</span>
            上传文件
          </h2>

          {/* 导入选项 */}
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="create"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
                className="text-blue-600"
              />
              <span className="text-sm">仅创建新商品（跳过已存在）</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="mode"
                value="upsert"
                checked={mode === 'upsert'}
                onChange={() => setMode('upsert')}
                className="text-blue-600"
              />
              <span className="text-sm">创建或更新（已存在则更新）</span>
            </label>
            <label className="flex items-center gap-2 ml-4">
              <input
                type="checkbox"
                checked={skipErrors}
                onChange={(e) => setSkipErrors(e.target.checked)}
                className="text-blue-600"
              />
              <span className="text-sm">跳过错误继续导入</span>
            </label>
          </div>

          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-blue-400'
            }`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {file ? (
              <div>
                <svg className="w-12 h-12 mx-auto text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-700 font-medium">{file.name}</p>
                <p className="text-gray-500 text-sm">
                  {(file.size / 1024).toFixed(1)} KB
                  {preview && ` · ${preview.total} 条商品数据`}
                </p>
                <button
                  onClick={handleReset}
                  className="text-red-500 text-sm mt-2 hover:underline"
                >
                  移除文件
                </button>
              </div>
            ) : (
              <div>
                <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 mb-2">拖拽 CSV 文件到这里，或</p>
                <label className="cursor-pointer">
                  <span className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block">
                    选择文件
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
                <p className="text-gray-400 text-sm mt-2">支持 CSV 格式，最大 5MB</p>
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 步骤3: 预览 & 导入 */}
        {preview && !result && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">3</span>
              预览数据
            </h2>

            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg">
              共 {preview.total} 条商品数据，以下显示前 10 条预览：
            </div>

            {/* 预览表格 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">商品名称</th>
                    <th className="px-3 py-2 text-left">价格</th>
                    <th className="px-3 py-2 text-left">库存</th>
                    <th className="px-3 py-2 text-left">分类</th>
                    <th className="px-3 py-2 text-left">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.products.map((p, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">{p.currency || 'CNY'} {p.price}</td>
                      <td className="px-3 py-2">{p.stock || '-'}</td>
                      <td className="px-3 py-2">{p.category}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {p.productType || 'physical'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 导入按钮 */}
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={handleReset}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    导入中...
                  </>
                ) : (
                  <>
                    开始导入 ({preview.total} 条)
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 导入结果 */}
        {result && (
          <div className="bg-white rounded-xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              导入完成
            </h2>

            {/* 统计卡片 */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900">{result.total}</div>
                <div className="text-sm text-gray-500">总数</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-sm text-green-600">成功</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-red-600">失败</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-600">{result.skipped}</div>
                <div className="text-sm text-yellow-600">跳过</div>
              </div>
            </div>

            {/* 错误详情 */}
            {result.errors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-medium text-gray-700 mb-2">错误详情：</h3>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">行号</th>
                        <th className="px-3 py-2 text-left">商品名</th>
                        <th className="px-3 py-2 text-left">错误</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((err, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2 text-gray-500">{err.row}</td>
                          <td className="px-3 py-2">{err.name}</td>
                          <td className="px-3 py-2 text-red-600">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-4">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                继续导入
              </button>
              <Link
                href="/app/merchant/products"
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                查看商品列表
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
