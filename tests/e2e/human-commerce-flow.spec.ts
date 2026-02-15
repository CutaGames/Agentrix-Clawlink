import { test, expect } from '@playwright/test';

test.describe('Commerce Skill Human E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Visit workbench
    await page.goto('/workbench');
    // Ensure we are in a clean state or handle login if needed
    // Assuming the dev environment has a default session or bypasses auth for local testing
  });

  test('Full flow: Trigger, Select Category, Fill Split Plan Form', async ({ page }) => {
    // 2. Trigger commerce skill via chat
    const chatInput = page.locator('textarea[placeholder*="输入"], textarea[placeholder*="Ask"]');
    await chatInput.fill('@commerce');
    await page.keyboard.press('Enter');

    // 3. Wait for categories card to appear
    await expect(page.locator('text=Commerce 能力中心')).toBeVisible({ timeout: 15000 });

    // 4. Expand "协作" category (Collab)
    // Find the category card containing "协作"
    const collabCategory = page.locator('div.rounded-lg:has(div:has-text("协作"))');
    await collabCategory.locator('button:has-text("展开子功能")').click();

    // 5. Select "分账方案" sub-category
    await page.locator('button:has-text("快捷触发"):near(:text("分账方案"))').first().click();

    // 6. Fill the Split Plan form
    // According to StructuredResponseCard.tsx, the placeholders are:
    // "方案名称 *", "平台%", "商家%", "代理%"
    await page.fill('input[placeholder="方案名称 *"]', 'E2E Test Plan');
    await page.fill('input[placeholder="平台%"]', '5');
    await page.fill('input[placeholder="商家%"]', '85');
    await page.fill('input[placeholder="代理%"]', '10');

    // 7. Submit
    await page.click('button:has-text("生成并发送")');

    // 8. Verify execution status and result card
    await expect(page.locator('text=正在执行操作...')).toBeVisible();
    await expect(page.locator('text=成功')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=ID:')).toBeVisible();
  });

  test('Publish Task Flow', async ({ page }) => {
    const chatInput = page.locator('textarea[placeholder*="输入"], textarea[placeholder*="Ask"]');
    await chatInput.fill('我要发布一个协作任务');
    await page.keyboard.press('Enter');

    // Wait for the publish form to appear (Agent should recognize intent and show publish card)
    await expect(page.locator('text=发布表单')).toBeVisible({ timeout: 15000 });

    // Fill Task details
    await page.fill('input[placeholder="标题 *"]', 'E2E Translation Task');
    await page.fill('textarea[placeholder*="任务描述"]', 'Translate 1000 words from CN to EN');
    await page.fill('input[placeholder="预算(USD) *"]', '50');
    await page.fill('input[placeholder="标签"]', 'Translation, English');
    await page.fill('textarea[placeholder*="交付要求"]', '1. High accuracy\n2. Native tone');

    // Submit
    await page.click('button:has-text("🚀 发布任务")');

    // Verify
    await expect(page.locator('text=已发布到任务市场')).toBeVisible({ timeout: 20000 });
  });
});
