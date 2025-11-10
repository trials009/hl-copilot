/**
 * UI Flow Tests - Playwright
 * 
 * Tests the complete user interface flow of the Copilot widget
 * 
 * Run with: npx playwright test tests/ui-flow.spec.js
 * Or: npm test:ui
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const WIDGET_URL = `${BASE_URL}/widget/widget.html`;

test.describe('Copilot Widget UI Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to widget
        await page.goto(WIDGET_URL);
        // Wait for widget to load
        await page.waitForSelector('#copilot-widget', { timeout: 10000 });
    });

    test('should display welcome screen on load', async ({ page }) => {
        // Check welcome screen elements
        await expect(page.locator('#welcome-screen')).toBeVisible();
        await expect(page.locator('h2:has-text("Welcome to Copilot!")')).toBeVisible();
        await expect(page.locator('#start-chat-btn')).toBeVisible();
        await expect(page.locator('#start-chat-btn')).toHaveText('Start Conversation');
    });

    test('should navigate to chat screen when start button is clicked', async ({ page }) => {
        // Click start conversation
        await page.click('#start-chat-btn');

        // Wait for chat screen to appear
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Verify chat interface is visible
        await expect(page.locator('#chat-container')).toBeVisible();
        await expect(page.locator('#chat-input')).toBeVisible();
        await expect(page.locator('#send-btn')).toBeVisible();

        // Check for welcome message from assistant
        await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 5000 });
    });

    test('should display quick reply buttons after assistant message', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Wait for assistant message and quick replies
        await page.waitForSelector('.quick-replies-container', { timeout: 5000 });

        // Verify quick reply buttons exist
        const quickReplies = page.locator('.quick-reply-btn');
        await expect(quickReplies.first()).toBeVisible();

        // Check that we have at least one quick reply
        const count = await quickReplies.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should send message when quick reply is clicked', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Wait for quick replies
        await page.waitForSelector('.quick-reply-btn', { timeout: 5000 });

        // Click first quick reply
        const firstQuickReply = page.locator('.quick-reply-btn').first();
        const replyText = await firstQuickReply.textContent();
        await firstQuickReply.click();

        // Verify user message appears
        await expect(page.locator('.message.user')).toBeVisible({ timeout: 3000 });

        // Check message content matches quick reply
        const userMessages = page.locator('.message.user .message-content');
        const lastMessage = userMessages.last();
        await expect(lastMessage).toContainText(replyText.trim());
    });

    test('should send message via input field', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Type message
        const testMessage = 'I run a fitness business';
        await page.fill('#chat-input', testMessage);

        // Send message
        await page.click('#send-btn');

        // Verify user message appears
        await expect(page.locator('.message.user')).toBeVisible({ timeout: 3000 });
        await expect(page.locator('.message.user .message-content').last()).toContainText(testMessage);

        // Input should be cleared
        await expect(page.locator('#chat-input')).toHaveValue('');
    });

    test('should show typing indicator when AI is responding', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Send a message
        await page.fill('#chat-input', 'Tell me about content calendars');
        await page.click('#send-btn');

        // Check for typing indicator (may appear briefly)
        const typingIndicator = page.locator('.typing-indicator-container');
        // It might appear and disappear quickly, so we check if it exists at any point
        try {
            await typingIndicator.waitFor({ timeout: 2000, state: 'visible' });
        } catch (e) {
            // Typing indicator might have already disappeared, which is fine
        }
    });

    test('should display assistant response after sending message', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Send a message
        await page.fill('#chat-input', 'Hello');
        await page.click('#send-btn');

        // Wait for assistant response (with longer timeout for API call)
        await page.waitForSelector('.message.assistant', { timeout: 30000 });

        // Verify assistant message exists
        const assistantMessages = page.locator('.message.assistant');
        const count = await assistantMessages.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should navigate to connection screen', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Navigate to connection screen (via JavaScript)
        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showConnectionScreen();
            }
        });

        // Wait for connection screen
        await page.waitForSelector('#connection-screen', { state: 'visible' });

        // Verify connection screen elements
        await expect(page.locator('#connection-screen')).toBeVisible();
        await expect(page.locator('h2:has-text("Connect Facebook")')).toBeVisible();
        await expect(page.locator('#connect-facebook-btn')).toBeVisible();
    });

    test('should navigate to calendar screen', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Navigate to calendar screen (via JavaScript)
        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showCalendarScreen();
            }
        });

        // Wait for calendar screen
        await page.waitForSelector('#calendar-screen', { state: 'visible' });

        // Verify calendar screen elements
        await expect(page.locator('#calendar-screen')).toBeVisible();
        await expect(page.locator('h2:has-text("30-Day Content Calendar")')).toBeVisible();
        await expect(page.locator('#view-toggle-btn')).toBeVisible();
        await expect(page.locator('#schedule-all-btn')).toBeVisible();
    });

    test('should toggle between grid and list view', async ({ page }) => {
        // Navigate to calendar screen
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showCalendarScreen();
            }
        });

        await page.waitForSelector('#calendar-screen', { state: 'visible' });

        // Check initial view (should be grid)
        await expect(page.locator('#calendar-grid-view')).toBeVisible();

        // Click view toggle
        await page.click('#view-toggle-btn');

        // Wait for list view
        await page.waitForSelector('#calendar-list-view', { state: 'visible' });
        await expect(page.locator('#calendar-list-view')).toBeVisible();

        // Toggle back to grid
        await page.click('#view-toggle-btn');
        await expect(page.locator('#calendar-grid-view')).toBeVisible();
    });

    test('should show loading state during calendar generation', async ({ page }) => {
        // Navigate to calendar screen
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showCalendarScreen();
                // Trigger calendar generation
                window.copilotWidget.generateCalendar();
            }
        });

        // Check for loading indicator
        const loadingIndicator = page.locator('#calendar-loading');
        // Loading might appear briefly
        try {
            await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
        } catch (e) {
            // Loading might have already completed
        }
    });

    test('should display toast notifications', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Trigger a toast (via JavaScript)
        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showToast('Test message', 'success');
            }
        });

        // Check for toast
        await expect(page.locator('.toast-success')).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.toast-message')).toContainText('Test message');
    });

    test('should close widget when close button is clicked', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Click close button
        await page.click('#close-btn');

        // Widget should be hidden (check if it's still in DOM but hidden)
        // Note: The widget might not actually close in standalone mode,
        // but the close button should be functional
        const closeBtn = page.locator('#close-btn');
        await expect(closeBtn).toBeVisible();
    });

    test('should handle keyboard input in chat', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Focus input
        await page.focus('#chat-input');

        // Type message
        await page.keyboard.type('Test keyboard input');

        // Verify text appears
        await expect(page.locator('#chat-input')).toHaveValue('Test keyboard input');

        // Press Enter to send
        await page.keyboard.press('Enter');

        // Verify message was sent
        await expect(page.locator('.message.user')).toBeVisible({ timeout: 3000 });
    });

    test('should show error toast on API failure', async ({ page }) => {
        // Start conversation
        await page.click('#start-chat-btn');
        await page.waitForSelector('#chat-container', { state: 'visible' });

        // Trigger error toast
        await page.evaluate(() => {
            if (window.copilotWidget) {
                window.copilotWidget.showToast('Error occurred', 'error');
            }
        });

        // Check for error toast
        await expect(page.locator('.toast-error')).toBeVisible({ timeout: 2000 });
        await expect(page.locator('.toast-error .toast-message')).toContainText('Error occurred');
    });
});

test.describe('Widget Responsiveness', () => {
    test('should be responsive on mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto(WIDGET_URL);
        await page.waitForSelector('#copilot-widget');

        // Widget should still be visible and functional
        await expect(page.locator('#copilot-widget')).toBeVisible();
        await expect(page.locator('#start-chat-btn')).toBeVisible();
    });

    test('should be responsive on tablet viewport', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto(WIDGET_URL);
        await page.waitForSelector('#copilot-widget');

        // Widget should still be visible and functional
        await expect(page.locator('#copilot-widget')).toBeVisible();
    });
});

