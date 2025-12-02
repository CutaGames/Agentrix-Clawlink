import { test, expect } from '@playwright/test'

test.describe('支付流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 假设已登录
    await page.goto('/app/user')
  })

  test('Stripe支付流程', async ({ page }) => {
    // 导航到支付演示页面
    await page.goto('/pay/merchant')
    
    // 填写支付金额
    await page.fill('input[type="number"]', '100')
    
    // 选择Stripe支付方式
    await page.click('text=Credit/Debit Card')
    
    // 等待支付表单加载
    await page.waitForSelector('[data-testid="stripe-payment"]', { timeout: 5000 })
    
    // 填写卡片信息（使用测试卡片）
    await page.frameLocator('iframe').first().fill('input[name="cardNumber"]', '4242424242424242')
    await page.frameLocator('iframe').first().fill('input[name="expiry"]', '12/25')
    await page.frameLocator('iframe').first().fill('input[name="cvc"]', '123')
    
    // 提交支付
    await page.click('button:has-text("确认支付")')
    
    // 验证支付成功
    await expect(page.locator('text=支付成功')).toBeVisible({ timeout: 10000 })
  })

  test('加密货币支付流程', async ({ page }) => {
    // 导航到支付演示页面
    await page.goto('/pay/merchant')
    
    // 填写支付金额
    await page.fill('input[type="number"]', '50')
    
    // 选择加密货币支付
    await page.click('text=Digital Currency')
    
    // 等待钱包连接
    await page.waitForSelector('[data-testid="wallet-payment"]', { timeout: 5000 })
    
    // 点击确认支付（假设钱包已连接）
    await page.click('button:has-text("确认支付")')
    
    // 验证支付处理中
    await expect(page.locator('text=处理中')).toBeVisible({ timeout: 5000 })
  })

  test('X402协议支付流程', async ({ page }) => {
    // 导航到X402支付演示页面
    await page.goto('/pay/x402')
    
    // 检查授权状态
    const hasAuth = await page.locator('text=已授权').isVisible().catch(() => false)
    
    if (!hasAuth) {
      // 创建授权
      await page.click('button:has-text("创建授权")')
      await page.waitForSelector('text=授权成功', { timeout: 10000 })
    }
    
    // 执行支付
    await page.fill('input[type="number"]', '10')
    await page.click('button:has-text("支付")')
    
    // 验证支付成功
    await expect(page.locator('text=支付成功')).toBeVisible({ timeout: 10000 })
  })

  test('跨境支付流程', async ({ page }) => {
    // 导航到跨境支付演示页面
    await page.goto('/pay/cross-border')
    
    // 填写支付信息
    await page.fill('input[name="amount"]', '200')
    await page.selectOption('select[name="fromCurrency"]', 'CNY')
    await page.selectOption('select[name="toCurrency"]', 'USD')
    
    // 等待汇率报价加载
    await page.waitForSelector('[data-testid="quote-list"]', { timeout: 5000 })
    
    // 选择最优报价
    await page.click('[data-testid="quote-item"]:first-child button')
    
    // 确认支付
    await page.click('button:has-text("确认支付")')
    
    // 验证支付成功
    await expect(page.locator('text=支付成功')).toBeVisible({ timeout: 15000 })
  })
})

