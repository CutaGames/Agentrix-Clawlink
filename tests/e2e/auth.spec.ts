import { test, expect } from '@playwright/test'

test.describe('认证流程测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('用户登录流程', async ({ page }) => {
    // 点击登录按钮
    await page.click('text=登录')
    
    // 等待登录模态框出现
    await page.waitForSelector('[data-testid="login-modal"]', { timeout: 5000 })
    
    // 填写登录信息（使用测试账号）
    await page.fill('input[type="email"]', 'test@example.com')
    await page.fill('input[type="password"]', 'test123456')
    
    // 提交登录
    await page.click('button:has-text("登录")')
    
    // 验证登录成功（跳转到用户中心或显示用户菜单）
    await expect(page).toHaveURL(/\/app\/user/, { timeout: 10000 })
  })

  test('用户注册流程', async ({ page }) => {
    // 点击注册按钮
    await page.click('text=注册')
    
    // 等待注册表单出现
    await page.waitForSelector('form', { timeout: 5000 })
    
    // 填写注册信息
    await page.fill('input[name="email"]', `test${Date.now()}@example.com`)
    await page.fill('input[name="password"]', 'test123456')
    await page.fill('input[name="confirmPassword"]', 'test123456')
    
    // 提交注册
    await page.click('button[type="submit"]')
    
    // 验证注册成功
    await expect(page).toHaveURL(/\/app\/user/, { timeout: 10000 })
  })

  test('钱包连接流程', async ({ page }) => {
    // 假设已登录，进入用户中心
    await page.goto('/app/user')
    
    // 点击连接钱包
    await page.click('text=连接钱包')
    
    // 选择钱包类型（MetaMask）
    await page.click('text=MetaMask')
    
    // 验证钱包连接提示
    await expect(page.locator('text=钱包已连接')).toBeVisible({ timeout: 10000 })
  })
})

