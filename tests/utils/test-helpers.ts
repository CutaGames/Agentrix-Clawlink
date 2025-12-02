import { Page } from '@playwright/test'

/**
 * 等待页面加载完成
 */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 登录用户
 */
export async function loginUser(page: Page, email: string = 'test@example.com', password: string = 'test123456') {
  await page.goto('/')
  await page.click('text=登录')
  await page.waitForSelector('[data-testid="login-modal"]', { timeout: 5000 })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button:has-text("登录")')
  await page.waitForURL(/\/app\/user/, { timeout: 10000 })
}

/**
 * 登录商户
 */
export async function loginMerchant(page: Page) {
  await loginUser(page)
  await page.goto('/app/merchant')
}

/**
 * 登录Agent
 */
export async function loginAgent(page: Page) {
  await loginUser(page)
  await page.goto('/app/agent')
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `tests/reports/screenshots/${name}.png`, fullPage: true })
}

/**
 * 等待API响应
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp, timeout: number = 10000) {
  await page.waitForResponse(
    (response) => {
      const url = response.url()
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern)
      }
      return urlPattern.test(url)
    },
    { timeout }
  )
}

