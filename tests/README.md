# Test Suite

This directory contains test scripts for the HighLevel Copilot project.

## Test Files

- **`ui-flow.spec.js`** - Playwright tests for UI interactions and user flows
- **`api-flow.spec.js`** - API endpoint tests

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

3. Ensure backend server is running (or tests will auto-start it):
   ```bash
   npm start
   ```

4. (Optional) Set up API keys in `.env` file:
   ```env
   GROQ_API_KEY=your_key_here
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

   **Note**: Tests will work in mock mode even without API keys, but some tests may skip or have different behavior.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run UI Tests Only
```bash
npm run test:ui
```

### Run API Tests Only
```bash
npm run test:api
```

### Run Tests in Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Specific Test File
```bash
npx playwright test tests/ui-flow.spec.js
npx playwright test tests/api-flow.spec.js
```

### Run Tests with Custom Base URL
```bash
TEST_BASE_URL=http://localhost:3000 npx playwright test
```

## Test Configuration

Tests are configured in `playwright.config.js`. Key settings:

- **Timeout**: 30 seconds per test
- **Retries**: 0 (or 2 in CI)
- **Base URL**: `http://localhost:3000` (or from `TEST_BASE_URL` env var)
- **Auto-start server**: Tests will automatically start the backend server if not running

## What Tests Cover

### UI Flow Tests (`ui-flow.spec.js`)

- ✅ Welcome screen display
- ✅ Navigation to chat screen
- ✅ Quick reply buttons
- ✅ Message sending (input field and quick replies)
- ✅ Typing indicators
- ✅ Assistant responses
- ✅ Navigation to connection screen
- ✅ Navigation to calendar screen
- ✅ Grid/list view toggle
- ✅ Loading states
- ✅ Toast notifications
- ✅ Keyboard input
- ✅ Responsive design (mobile/tablet)

### API Flow Tests (`api-flow.spec.js`)

- ✅ Health check endpoint
- ✅ Chat API (streaming and non-streaming)
- ✅ Profile API (get/save)
- ✅ Facebook API (auth URL, status, pages)
- ✅ Calendar API (generate, update)
- ✅ Scheduling API (single and batch)
- ✅ Error handling
- ✅ CORS headers

## Mock Mode

Tests are designed to work with or without API keys:

- **With API keys**: Full functionality tests
- **Without API keys**: Tests verify graceful degradation and mock mode behavior

## Test Results

Test results are saved to:
- **HTML Report**: `test-results/html/index.html`
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)
- **Traces**: `test-results/` (on failure)

View HTML report:
```bash
npx playwright show-report
```

## Continuous Integration

Tests are configured to run in CI environments:

- Auto-retry failed tests (2 retries)
- Single worker for stability
- Auto-start web server
- Generate HTML reports

## Troubleshooting

### Tests Fail with "Connection Refused"

1. Ensure backend server is running:
   ```bash
   npm start
   ```

2. Or let tests auto-start the server (configured in `playwright.config.js`)

### Tests Fail with API Errors

1. Check if API keys are configured in `.env`
2. Tests should still pass in mock mode
3. Check server logs for detailed error messages

### Tests Timeout

1. Increase timeout in `playwright.config.js`
2. Check if server is responding: `curl http://localhost:3000/health`
3. Verify API keys are valid (if using real APIs)

### Browser Not Found

Install Playwright browsers:
```bash
npx playwright install
```

## Writing New Tests

### UI Test Example

```javascript
test('should do something', async ({ page }) => {
  await page.goto('/widget/widget.html');
  await page.click('#some-button');
  await expect(page.locator('#some-element')).toBeVisible();
});
```

### API Test Example

```javascript
test('should return data', async ({ request }) => {
  const response = await request.get('/api/some-endpoint');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty('expectedField');
});
```

## Best Practices

1. **Use descriptive test names**: Clear what the test verifies
2. **Test user flows**: Focus on end-to-end scenarios
3. **Handle async operations**: Use proper waits
4. **Clean up**: Reset state between tests if needed
5. **Mock external APIs**: When possible, use mocks for external services
6. **Test error cases**: Verify error handling works correctly

