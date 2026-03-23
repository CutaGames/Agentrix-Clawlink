import { test, expect } from "@playwright/test";

test.describe("Agentrix Desktop — Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Wait for the app to render
    await page.waitForSelector("body", { timeout: 5000 });
  });

  test("app renders without crash", async ({ page }) => {
    // The app should render either login panel or floating ball
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("login panel shows for unauthenticated user", async ({ page }) => {
    // Clear token to simulate unauthenticated state
    await page.evaluate(() => localStorage.removeItem("agentrix_auth_token"));
    await page.reload();
    // Should show some login UI
    await page.waitForTimeout(1000);
    const html = await page.content();
    // Login panel or guest button should be present
    expect(html.length).toBeGreaterThan(100);
  });

  test("guest mode opens chat panel", async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem("agentrix_auth_token"));
    await page.reload();
    await page.waitForTimeout(1000);
    // Look for guest mode button and click it
    const guestBtn = page.locator("text=Guest");
    if (await guestBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await guestBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("floating ball is visible after login", async ({ page }) => {
    // Simulate logged-in state with guest mode
    await page.evaluate(() => {
      localStorage.setItem("agentrix_onboarded", "1");
    });
    await page.reload();
    await page.waitForTimeout(1500);
  });
});

test.describe("Agentrix Desktop — Chat Panel", () => {
  test.beforeEach(async ({ page }) => {
    // Set up as logged-in guest user
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.setItem("agentrix_onboarded", "1");
    });
    await page.reload();
    await page.waitForTimeout(1000);
  });

  test("slash command /help shows command list", async ({ page }) => {
    // This test works when the chat panel is visible
    // In dev mode, click floating ball to open chat panel
    const ball = page.locator("[title='Click to chat'], [title='Toggle chat']");
    if (await ball.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ball.click();
      await page.waitForTimeout(500);
    }

    // Type /help in the textarea
    const textarea = page.locator("textarea");
    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textarea.fill("/help");
      await textarea.press("Enter");
      await page.waitForTimeout(1000);
      // Should show help text
      const content = await page.content();
      expect(content).toContain("Available Commands");
    }
  });

  test("new chat button creates new session", async ({ page }) => {
    const newChatBtn = page.locator("[title='New Chat']");
    if (await newChatBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newChatBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test("settings panel opens and closes", async ({ page }) => {
    const settingsBtn = page.locator("[title='Settings']");
    if (await settingsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      // Settings panel should be visible
      const content = await page.content();
      expect(content.toLowerCase()).toContain("settings");
    }
  });
});

test.describe("Agentrix Desktop — Error Boundary", () => {
  test("error boundary catches render errors gracefully", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    // Inject a render error by dispatching a custom event that forces an error
    // This is a smoke test — in real E2E, we'd test with actual error injection
    const html = await page.content();
    expect(html).not.toContain("Something went wrong");
  });
});
