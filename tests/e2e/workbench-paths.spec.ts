import { test, expect } from '@playwright/test';

test.describe('Agentrix Workbench Path Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the enhanced agent page
    await page.goto('http://localhost:3000/agent-enhanced');
    
    // Bypass login if possible or handle login
    // For now, we assume the environment is set up with a logged-in user or mock data
  });

  test('User Path: Checklist transitions', async ({ page }) => {
    // 1. Check if we are in User view initially (or switch to it)
    // Click on User Center in RoleSwitcher
    await page.click('text=Personal');
    await page.click('text=User Center');

    // 2. Verify Checklist is visible
    await expect(page.locator('text=Authorize Agent for Purchases')).toBeVisible();

    // 3. Click "Select Agent/Skill" step
    // It should now lead to Marketplace instead of Airdrop
    await page.click('text=选择 Agent/Skill');
    await page.click('text=立即开始');

    // 4. Verify we are in Marketplace view
    await expect(page.locator('text=Marketplace')).toBeVisible();
    await expect(page.locator('text=商品市场')).toBeVisible();
  });

  test('Merchant Path: Registration and Checklist', async ({ page }) => {
    // 1. Switch to Merchant mode
    await page.click('text=Merchant');
    
    // 2. If not registered, verify registration screen
    const isRegistered = await page.locator('text=Merchant Backend').isVisible();
    if (!isRegistered) {
      await expect(page.locator('text=Enable Merchant Access')).toBeVisible();
      // Mock registration is handled by the backend/frontend logic we just fixed
    } else {
      // 3. Verify Checklist
      await expect(page.locator('text=Merchant Go-live Checklist')).toBeVisible();
      
      // 4. Test a transition: Upload Catalog
      await page.click('text=上传/导入 Catalog');
      await page.click('text=立即处理');
      
      // 5. Verify Products tab is active
      await expect(page.locator('text=Product Management')).toBeVisible();
    }
  });

  test('Developer Path: Registration and Checklist', async ({ page }) => {
    // 1. Switch to Developer mode
    await page.click('text=Developer');
    
    // 2. If not registered, verify registration screen
    const isRegistered = await page.locator('text=Developer Tools').isVisible();
    if (!isRegistered) {
      await expect(page.locator('text=Enable Developer Access')).toBeVisible();
    } else {
      // 3. Verify Checklist
      await expect(page.locator('text=Skill Build → Test → Publish')).toBeVisible();
      
      // 4. Test a transition: Create Skill
      await page.click('text=创建 Skill (commerce-min)');
      await page.click('text=启动');
      
      // 5. Verify Skills tab is active
      await expect(page.locator('text=Skill Registry')).toBeVisible();
    }
  });
});
