import { test, expect } from '@playwright/test';

test.describe('Commerce Skill Hints Banner', () => {
  test('shows conversion hints in commission plans', async ({ page }) => {
    test.setTimeout(120000);
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

    await page.route('**/api/commerce/split-plans**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/commerce/budget-pools**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
    await page.route('**/api/commerce/conversion-hints', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          key: 'creator_split',
          type: 'marketplace',
          priority: 'high',
          message: 'You are using a "Creator Split" model. Publish to Marketplace for more exposure!',
          messageZh: '您正在使用「创作者分成」模式，发布到Marketplace可获得更多曝光和自动推广',
          action: 'Publish Now',
          actionZh: '一键发布',
          link: '/publish?template=creator-split',
          suggestedConfig: {
            productType: 'virtual',
            fee: '3%'
          },
          dismissible: true
        })
      });
    });

    await page.goto('http://localhost:3000/agent-enhanced?mode=developer&l1=revenue&l2=commission-plans', { waitUntil: 'domcontentloaded', timeout: 120000 });

    await expect(page.getByTestId('commerce-hints-banner')).toBeVisible();
    await expect(page.getByTestId('commerce-hints-action')).toBeVisible();
    await expect(page.locator('text=/Creator Split|创作者分成/i')).toBeVisible();
  });
});
