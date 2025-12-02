import { test, expect } from '@playwright/test'

test.describe('26个新功能页面测试', () => {
  test.beforeEach(async ({ page }) => {
    // 假设已登录为商户
    await page.goto('/app/merchant')
  })

  // 商户端功能测试
  test('商户端 - 支付统计与分析', async ({ page }) => {
    await page.goto('/app/merchant/analytics')
    await expect(page.locator('h1:has-text("支付统计与分析")')).toBeVisible()
    await expect(page.locator('text=今日收入')).toBeVisible()
  })

  test('商户端 - 收入报表', async ({ page }) => {
    await page.goto('/app/merchant/reports')
    await expect(page.locator('h1:has-text("收入报表")')).toBeVisible()
    await expect(page.locator('button:has-text("生成报表")')).toBeVisible()
  })

  test('商户端 - 客户管理', async ({ page }) => {
    await page.goto('/app/merchant/customers')
    await expect(page.locator('h1:has-text("客户管理")')).toBeVisible()
    await expect(page.locator('input[placeholder*="搜索"]')).toBeVisible()
  })

  test('商户端 - 退款管理', async ({ page }) => {
    await page.goto('/app/merchant/refunds')
    await expect(page.locator('h1:has-text("退款管理")')).toBeVisible()
  })

  test('商户端 - 支付渠道配置', async ({ page }) => {
    await page.goto('/app/merchant/payment-settings')
    await expect(page.locator('h1:has-text("支付渠道配置")')).toBeVisible()
  })

  test('商户端 - Webhook配置', async ({ page }) => {
    await page.goto('/app/merchant/webhooks')
    await expect(page.locator('h1:has-text("Webhook配置")')).toBeVisible()
    await expect(page.locator('button:has-text("添加Webhook")')).toBeVisible()
  })

  test('商户端 - API密钥管理', async ({ page }) => {
    await page.goto('/app/merchant/api-keys')
    await expect(page.locator('h1:has-text("API密钥管理")')).toBeVisible()
  })

  test('商户端 - 商品分析', async ({ page }) => {
    await page.goto('/app/merchant/product-analytics')
    await expect(page.locator('h1:has-text("商品分析")')).toBeVisible()
  })
})

test.describe('用户端功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/user')
  })

  test('用户端 - 钱包管理', async ({ page }) => {
    await page.goto('/app/user/wallets')
    await expect(page.locator('h1:has-text("钱包管理")')).toBeVisible()
  })

  test('用户端 - 支付方式管理', async ({ page }) => {
    await page.goto('/app/user/payment-methods')
    await expect(page.locator('h1:has-text("支付方式管理")')).toBeVisible()
  })

  test('用户端 - 订阅管理', async ({ page }) => {
    await page.goto('/app/user/subscriptions')
    await expect(page.locator('h1:has-text("订阅管理")')).toBeVisible()
  })

  test('用户端 - 授权管理', async ({ page }) => {
    await page.goto('/app/user/authorizations')
    await expect(page.locator('h1:has-text("授权管理")')).toBeVisible()
  })

  test('用户端 - 安全设置', async ({ page }) => {
    await page.goto('/app/user/security')
    await expect(page.locator('h1:has-text("安全设置")')).toBeVisible()
  })

  test('用户端 - 通知设置', async ({ page }) => {
    await page.goto('/app/user/notifications')
    await expect(page.locator('h1:has-text("通知设置")')).toBeVisible()
  })

  test('用户端 - 交易详情', async ({ page }) => {
    await page.goto('/app/user/transaction-detail?id=test')
    await expect(page.locator('h1:has-text("交易详情")')).toBeVisible()
  })

  test('用户端 - 收藏与心愿单', async ({ page }) => {
    await page.goto('/app/user/wishlist')
    await expect(page.locator('h1:has-text("收藏与心愿单")')).toBeVisible()
  })
})

test.describe('Agent端功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/agent')
  })

  test('Agent端 - 配置管理', async ({ page }) => {
    await page.goto('/app/agent/settings')
    await expect(page.locator('h1:has-text("Agent配置管理")')).toBeVisible()
  })

  test('Agent端 - 收入统计', async ({ page }) => {
    await page.goto('/app/agent/revenue')
    await expect(page.locator('h1:has-text("收入统计")')).toBeVisible()
  })

  test('Agent端 - 佣金管理', async ({ page }) => {
    await page.goto('/app/agent/commission-management')
    await expect(page.locator('h1:has-text("佣金管理")')).toBeVisible()
  })

  test('Agent端 - 商品推荐统计', async ({ page }) => {
    await page.goto('/app/agent/recommendations')
    await expect(page.locator('h1:has-text("商品推荐统计")')).toBeVisible()
  })

  test('Agent端 - API调用统计', async ({ page }) => {
    await page.goto('/app/agent/api-stats')
    await expect(page.locator('h1:has-text("API调用统计")')).toBeVisible()
  })

  test('Agent端 - 错误日志', async ({ page }) => {
    await page.goto('/app/agent/error-logs')
    await expect(page.locator('h1:has-text("错误日志")')).toBeVisible()
  })

  test('Agent端 - 测试环境', async ({ page }) => {
    await page.goto('/app/agent/sandbox')
    await expect(page.locator('h1:has-text("测试环境")')).toBeVisible()
  })

  test('Agent端 - 性能监控', async ({ page }) => {
    await page.goto('/app/agent/performance')
    await expect(page.locator('h1:has-text("性能监控")')).toBeVisible()
  })

  test('Agent端 - 用户分析', async ({ page }) => {
    await page.goto('/app/agent/user-analytics')
    await expect(page.locator('h1:has-text("用户分析")')).toBeVisible()
  })

  test('Agent端 - 集成文档', async ({ page }) => {
    await page.goto('/app/agent/docs')
    await expect(page.locator('h1:has-text("集成文档")')).toBeVisible()
  })
})

