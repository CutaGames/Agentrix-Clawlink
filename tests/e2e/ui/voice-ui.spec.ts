import { expect, test, type Page } from '@playwright/test';

function byTestId(page: Page, testId: string) {
  return page.locator(`[data-testid="${testId}"]`);
}

function activeByTestId(page: Page, testId: string) {
  return byTestId(page, testId).last();
}

async function setLiveSpeechPermission(page: Page, state: 'granted' | 'denied') {
  await page.evaluate((nextState) => {
    const runtime = (window as any).__AGENTRIX_VOICE_UI_E2E_RUNTIME__;
    runtime?.setLiveSpeechPermission(nextState);
  }, state);
}

async function triggerWakeWord(page: Page) {
  await page.evaluate(() => {
    const runtime = (window as any).__AGENTRIX_VOICE_UI_E2E_RUNTIME__;
    runtime?.triggerWakeWord();
  });
}

async function openVoiceChat(page: Page) {
  await page.goto('/?e2e=voice-ui');
  await expect(activeByTestId(page, 'agent-console-screen')).toBeAttached();
  await expect(activeByTestId(page, 'voice-floating-ball-core')).toBeVisible();
  await activeByTestId(page, 'voice-floating-ball-core').click();
  await expect(page).toHaveURL(/AgentChat/);
  await expect(activeByTestId(page, 'agent-chat-screen')).toBeAttached();
  await expect(activeByTestId(page, 'voice-status-bar')).toBeVisible();
}

test.describe('voice ui regression', () => {
  test('floating ball opens voice chat, onboarding persists, and back avoids white screen', async ({ page }) => {
    await openVoiceChat(page);

    await expect(activeByTestId(page, 'voice-onboarding-tooltip')).toBeVisible();
    await expect(activeByTestId(page, 'voice-onboarding-step-indicator')).toHaveText('1/3');
    await expect(byTestId(page, 'voice-floating-ball')).toHaveCount(0);

    await activeByTestId(page, 'voice-onboarding-next').click();
    await expect(activeByTestId(page, 'voice-onboarding-step-indicator')).toHaveText('2/3');

    await activeByTestId(page, 'voice-onboarding-next').click();
    await expect(activeByTestId(page, 'voice-onboarding-step-indicator')).toHaveText('3/3');

    await activeByTestId(page, 'voice-onboarding-next').click();
    await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);

    await activeByTestId(page, 'agent-chat-back-button').click();
    await expect(page).not.toHaveURL(/AgentChat/);
    await expect(activeByTestId(page, 'agent-console-screen')).toBeAttached();
    await expect(activeByTestId(page, 'voice-floating-ball-core')).toBeVisible();

    await activeByTestId(page, 'voice-floating-ball-core').click();
    await expect(page).toHaveURL(/AgentChat/);
    await expect(activeByTestId(page, 'agent-chat-screen')).toBeAttached();
    await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);
  });

  test('voice chat exposes duplex controls and interaction mode toggles', async ({ page }) => {
    await openVoiceChat(page);

    if (await byTestId(page, 'voice-onboarding-tooltip').count()) {
      await activeByTestId(page, 'voice-onboarding-skip').click();
      await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);
    }

    const sessionState = activeByTestId(page, 'voice-session-state');
    const interactionToggle = activeByTestId(page, 'chat-voice-interaction-toggle');
    const actionButton = activeByTestId(page, 'chat-voice-action-button');
    const voiceToggle = activeByTestId(page, 'chat-voice-mode-toggle');

    await expect(sessionState).toHaveAttribute('aria-label', /voice-session-state:(tap|hold):duplex:/);
    await expect(actionButton).toHaveAttribute('aria-label', /chat-voice-action-button:(tap|hold):duplex:/);

    const before = await interactionToggle.getAttribute('aria-label');
    await interactionToggle.click();
    await expect(interactionToggle).not.toHaveAttribute('aria-label', before ?? '');
    await expect(sessionState).toHaveAttribute('aria-label', /voice-session-state:(tap|hold):duplex:/);

    await voiceToggle.click();
    await expect(byTestId(page, 'voice-status-bar')).toHaveCount(0);
    await expect(activeByTestId(page, 'chat-text-input')).toBeVisible();

    await voiceToggle.click();
    await expect(activeByTestId(page, 'voice-status-bar')).toBeVisible();
    await expect(byTestId(page, 'chat-text-input')).toHaveCount(0);
  });

  test('chat CTA can enter text mode, then upgrade into voice mode and keep back path clean', async ({ page }) => {
    await page.goto('/?e2e=voice-ui');

    await expect(activeByTestId(page, 'agent-console-screen')).toBeAttached();
    await activeByTestId(page, 'agent-console-chat-cta').click();

    await expect(page).toHaveURL(/AgentChat/);
    await expect(activeByTestId(page, 'agent-chat-screen')).toBeAttached();
    await expect(activeByTestId(page, 'chat-text-input')).toBeVisible();
    await expect(byTestId(page, 'voice-status-bar')).toHaveCount(0);

    await activeByTestId(page, 'chat-voice-mode-toggle').click();
    await expect(activeByTestId(page, 'voice-status-bar')).toBeVisible();
    await expect(activeByTestId(page, 'voice-onboarding-tooltip')).toBeVisible();

    await activeByTestId(page, 'voice-onboarding-skip').click();
    await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);

    await activeByTestId(page, 'agent-chat-back-button').click();
    await expect(page).not.toHaveURL(/AgentChat/);
    await expect(activeByTestId(page, 'agent-console-screen')).toBeAttached();
    await expect(activeByTestId(page, 'voice-floating-ball-core')).toBeVisible();
  });

  test('microphone permission denial can recover back into live voice', async ({ page }) => {
    test.fixme(true, 'Expo Web does not emulate mid-session OS microphone permission revocation reliably.');

    await openVoiceChat(page);

    if (await byTestId(page, 'voice-onboarding-tooltip').count()) {
      await activeByTestId(page, 'voice-onboarding-skip').click();
      await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);
    }

    const actionButton = activeByTestId(page, 'chat-voice-action-button');
    const permissionState = activeByTestId(page, 'voice-permission-state');
    const sessionState = activeByTestId(page, 'voice-session-state');

    await actionButton.click();
    await expect(sessionState).toHaveAttribute('aria-label', /voice-session-state:tap:duplex:idle:/);

    await setLiveSpeechPermission(page, 'denied');
    await expect.poll(async () => page.evaluate(() => (window as any).__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__)).toBe('denied');
    await actionButton.click();
    await expect(sessionState).toHaveAttribute('aria-label', /voice-session-state:tap:duplex:idle:/);

    await setLiveSpeechPermission(page, 'granted');
    await expect.poll(async () => page.evaluate(() => (window as any).__AGENTRIX_VOICE_UI_E2E_LIVE_SPEECH_PERMISSION__)).toBe('granted');
    await actionButton.click();
    await expect(permissionState).toHaveAttribute('aria-label', 'voice-permission-state:granted');
    await expect(sessionState).toHaveAttribute('aria-label', /voice-session-state:tap:duplex:recording:/);
  });

  test('wake-word trigger can open voice chat and the agent voice persona is switchable', async ({ page }) => {
    await page.goto('/?e2e=voice-ui');
    await expect(activeByTestId(page, 'agent-console-screen')).toBeAttached();
    await expect(activeByTestId(page, 'voice-floating-ball-core')).toBeVisible();

    await triggerWakeWord(page);
    await expect(page).toHaveURL(/AgentChat/);
    await expect(activeByTestId(page, 'agent-chat-screen')).toBeAttached();

    if (await byTestId(page, 'voice-onboarding-tooltip').count()) {
      await activeByTestId(page, 'voice-onboarding-skip').click();
      await expect(byTestId(page, 'voice-onboarding-tooltip')).toHaveCount(0);
    }

    await activeByTestId(page, 'agent-chat-settings-button').click();
    await expect(activeByTestId(page, 'chat-settings-sheet')).toBeVisible();

    await activeByTestId(page, 'chat-voice-persona-nova').click();
    await expect(activeByTestId(page, 'chat-selected-voice')).toHaveAttribute('aria-label', 'chat-selected-voice:nova');
  });
});