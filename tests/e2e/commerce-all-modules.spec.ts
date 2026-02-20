import { test, expect } from '@playwright/test';

/**
 * Agentrix Commerce 3模块端到端测试 (模拟人类交互)
 * 覆盖：支付与钱包 / 协作与任务 / 收益
 */
test.describe('Commerce 3 Modules Human E2E', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('[StructuredResponseCard]')) {
        console.log('[browser]', text);
      }
    });

    // 注入本地登录态，避免被 auth 阻塞
    await page.addInitScript(() => {
      const user = {
        id: 'test-user',
        agentrixId: 'AX-TEST-USER',
        role: 'developer',
        roles: ['developer'],
        email: 'test@agentrix.local',
        walletAddress: '0x0000000000000000000000000000000000000000',
        kycLevel: 'none',
        kycStatus: 'none',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('agentrix_user', JSON.stringify(user));
      localStorage.setItem('agentrix_current_role', 'developer');
    });

    // 基础 profile mock
    await page.route('**/api/users/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            roles: ['developer'],
            email: 'test@agentrix.local',
            nickname: 'Test Developer',
          },
        }),
      });
    });

    // ===== Commerce API mocks (让表单可“跑通”) =====
    await page.route('**/api/pay-intents**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'pi_test_001',
            amount: 100,
            currency: 'USDC',
            status: 'CREATED',
            payUrl: 'http://localhost:3000/pay/intent/pi_test_001',
          }),
        });
        return;
      }
      // list/get fallback
      if (url.includes('/api/pay-intents/') || url.includes('id=')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'pi_test_001', amount: 100, currency: 'USDC', status: 'CREATED' }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/payments/transak/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://global.transak.com?session=test' }),
      });
    });

    await page.route('**/api/commerce/split-plans**', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'sp_test_001', name: 'E2E Split Plan', status: 'draft' }),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/commerce/budget-pools**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/commissions**', async (route) => {
      // commissions list
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'c_1', amount: 1.23, currency: 'USDC', status: 'pending' },
        ]),
      });
    });
    await page.route('**/api/commissions/settlements**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 's_1', amount: 0.5, currency: 'USDC', status: 'settled' },
        ]),
      });
    });
    await page.route('**/api/commissions/settle**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'settle_1', amount: 0.5, currency: 'USDC' }),
      });
    });

    // 进入 agent-enhanced（与已通过的 hints 用例保持一致的入口）
    await page.goto('/agent-enhanced?mode=developer', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('textarea')).toBeVisible({ timeout: 30000 });

    // 唤起 Commerce 能力中心（与线上使用一致：@commerce）
    const chatInput = page.locator('textarea[placeholder="输入指令或通过 @ 调用插件..."]');
    await expect(chatInput).toBeVisible({ timeout: 30000 });
    await chatInput.click();
    await chatInput.fill('@commerce');
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Commerce 能力中心')).toBeVisible({ timeout: 40000 });
    // 等待卡片初次渲染完成，避免 React 重渲染导致元素 detached
    await page.waitForTimeout(800);
  });

  test('Module 1: 支付与钱包 (pay_wallet) - 快速支付 + 入金/出金表单可用', async ({ page }) => {
    const commerceCard = page.locator('div.bg-gradient-to-br:has-text("Commerce 能力中心")').first();
    const category = commerceCard
      .getByText('支付与钱包', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await category.getByRole('button', { name: '展开子功能' }).click();

    // 第三层表单（收付款与兑换）应出现
    // Debug: determine whether any <select> exists at all.
    const categoryOuterHtmlInfo = await category.evaluate((el) => {
      const html = el.outerHTML;
      return {
        length: html.length,
        hasThirdTierContainer: html.includes('border-slate-700/50'),
        hasSelectTag: html.includes('<select'),
        hasPayExchangeTitle: html.includes('收付款与兑换'),
        hasCommissionTitle: html.includes('分佣结算'),
      };
    });
    console.log('[e2e] category.outerHTML(info)', categoryOuterHtmlInfo);
    const selectCount = await page.locator('select').count();
    const selectCountInCard = await commerceCard.locator('select').count();
    const selectCountInCategory = await category.locator('select').count();
    const commerceCategoryTestIdCount = await page.locator('[data-testid^="commerce-category-"]').count();
    console.log('[e2e] commerceCategoryTestIdCount', commerceCategoryTestIdCount);
    console.log('[e2e] selectCount', { selectCount, selectCountInCard, selectCountInCategory });
    await expect(category.locator('select')).toBeVisible({ timeout: 15000 });

    // 快速支付
    await category
      .getByText('快速支付', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await expect(category.locator('input[placeholder="金额 *"]')).toBeVisible({ timeout: 15000 });
    await category.locator('input[placeholder="金额 *"]').fill('100');
    await category.locator('button:has-text("创建支付意图")').click();
    await expect(category.locator('text=支付意图详情')).toBeVisible({ timeout: 15000 });

    // 入金表单
    await category
      .getByText('充值入金', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await expect(category.locator('button:has-text("💵 开始入金")')).toBeVisible({ timeout: 15000 });

    // 出金表单
    await category
      .getByText('提现出金', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await expect(category.locator('button:has-text("💱 出金预览")')).toBeVisible({ timeout: 15000 });

    // 交易记录表单
    await category
      .getByText('交易记录', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await expect(category.locator('button:has-text("查询状态")')).toBeVisible({ timeout: 15000 });
  });

  test('Module 2: 协作与任务 (collaborate) - 分账方案 + 发布任务表单可用', async ({ page }) => {
    const commerceCard = page.locator('div.bg-gradient-to-br:has-text("Commerce 能力中心")').first();
    const category = commerceCard
      .getByText('协作与任务', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await category.getByRole('button', { name: '展开子功能' }).click();

    // Debug: verify whether publish wizard is present in DOM.
    const categoryHtml2 = await category.evaluate((el) => el.outerHTML);
    console.log('[e2e][module2] html', {
      length: categoryHtml2.length,
      hasPublishForm: categoryHtml2.includes('发布表单'),
      hasTitleInput: categoryHtml2.includes('placeholder="标题 *"'),
      hasCollabHeader: categoryHtml2.includes('协作分账'),
    });

    await expect(
      category.getByText('👥 协作分账', { exact: true }).locator('xpath=following::select[1]')
    ).toBeVisible({ timeout: 15000 });

    await expect(category.getByTestId('collab-render-marker')).toHaveCount(1);

    // 分账方案
    await category
      .getByText('分账方案', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await expect(category.locator('input[placeholder="方案名称 *"]')).toBeVisible({ timeout: 15000 });
    await category.locator('input[placeholder="方案名称 *"]').fill('E2E Split Plan');
    await category.locator('button:has-text("创建分账方案")').click();
    await expect(category.locator('text=创建成功')).toBeVisible({ timeout: 15000 });

    // 发布任务（Wizard 表单出现即可）
    await category
      .getByText('发布任务', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();

    // Debug after click: did the publish title input appear?
    await page.waitForTimeout(200);
    const categoryHtml2After = await category.evaluate((el) => el.outerHTML);
    console.log('[e2e][module2] after publish_task click', {
      hasPublishForm: categoryHtml2After.includes('发布表单'),
      hasTitleInput: categoryHtml2After.includes('placeholder="标题 *"'),
    });
    await expect(category.locator('input[placeholder="标题 *"]')).toBeVisible({ timeout: 15000 });
  });

  test('Module 3: 收益 (earnings) - 收益明细 + 提取收益可用', async ({ page }) => {
    const commerceCard = page.locator('div.bg-gradient-to-br:has-text("Commerce 能力中心")').first();
    const category = commerceCard
      .getByText('收益', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await category.getByRole('button', { name: '展开子功能' }).click();

    await expect(
      category.getByText('💸 分佣结算', { exact: true }).locator('xpath=following::select[1]')
    ).toBeVisible({ timeout: 15000 });

    await category
      .getByText('收益明细', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await category.locator('button:has-text("查询记录")').click();
    await expect(category.locator('text=收益明细已更新')).toBeVisible({ timeout: 15000 });

    await category
      .getByText('提取收益', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-md")][1]')
      .getByRole('button', { name: '快捷触发' })
      .click();
    await category.locator('button:has-text("执行结算")').click();
    await expect(category.locator('text=结算已执行')).toBeVisible({ timeout: 15000 });
  });
});
