# HighLevel Custom JavaScript Setup Guide

Based on [HighLevel's official documentation](https://help.gohighlevel.com/support/solutions/articles/155000003278-unlocking-customization-enhancing-marketplace-apps-with-custom-javascript), here's the correct way to add Custom JavaScript.

## ⚠️ Important: Correct Location

Custom JavaScript in HighLevel is located at:
**Settings → Company → Custom JavaScript & Custom CSS**

This is in the **Agency view**, not the regular settings.

## Step-by-Step Instructions

### 1. Navigate to the Correct Location

1. Log into your HighLevel **Agency** account (or sandbox with agency access)
2. Go to **Settings** (gear icon in left sidebar)
3. Click on **Company** (in the settings menu)
4. Look for **Custom JavaScript & Custom CSS** section
5. You should see two tabs or sections:
   - **Custom JavaScript**
   - **Custom CSS**

### 2. Update the Integration Code

The code in `highlevel-integration.js` has been updated to:
- Include `<script>` tags (HighLevel may require this)
- Remove `console.log` statements (per HighLevel guidelines)
- Be self-contained (no remote file references)

### 3. Paste the Code

1. Open `highlevel-integration.js` from your project
2. **Copy the ENTIRE file** (including the `<script>` tags at start and end)
3. In HighLevel, go to **Settings → Company → Custom JavaScript & Custom CSS**
4. Click on the **Custom JavaScript** tab/section
5. **Paste the code** into the editor
6. **Update the API URL** (line ~26):
   ```javascript
   const COPILOT_API_URL = 'http://localhost:3000'; // For local dev
   // OR
   const COPILOT_API_URL = 'https://your-app.vercel.app'; // For production
   ```
7. Click **Save** or **Save Changes**

### 4. Reload HighLevel

- Refresh the page (F5 or Cmd+R)
- The floating button should appear in the bottom-right corner

## Key Requirements from HighLevel Documentation

According to the [official documentation](https://help.gohighlevel.com/support/solutions/articles/155000003278-unlocking-customization-enhancing-marketplace-apps-with-custom-javascript):

1. ✅ **Self-contained code**: All logic must be in the script (no remote file references)
2. ✅ **No console.log**: Removed from the code
3. ✅ **Script tags**: Code is wrapped in `<script>` tags
4. ✅ **No obfuscated code**: Code is clear and readable
5. ✅ **No database access**: Code doesn't access HighLevel database directly

## Troubleshooting

### Code Still Not Working?

1. **Verify Location**: Make sure you're in **Settings → Company → Custom JavaScript & Custom CSS** (Agency view)
2. **Check Agency Access**: You need Agency-level access, not just sub-account access
3. **Browser Console**: Open Developer Tools (F12) and check for errors
4. **Code Format**: Ensure the entire code is pasted, including `<script>` tags

### Testing

For testing purposes, you can:
1. Use a sandbox account with agency access
2. Test the code in **Settings → Company → Custom JavaScript & Custom CSS**
3. Once working, you can submit it for Marketplace App review if needed

## Alternative: If You Don't Have Agency Access

If you don't have Agency access and are using a sub-account:

1. **Contact your Agency admin** to add the Custom JS
2. **Or create a sandbox account** with agency access for testing
3. **Or use the Marketplace App submission process** (requires review, 10-day SLA)

## Quick Test

After pasting the code:

1. Save and reload HighLevel
2. Open browser console (F12)
3. Type: `document.getElementById('hl-copilot-toggle-btn')`
4. If it returns an element → Button exists!
5. If it returns `null` → Code isn't executing (check location/access)

## Notes

- The code is now wrapped in `<script>` tags as per HighLevel's requirements
- All `console.log` statements have been removed
- The code is self-contained (no external file references)
- The iframe loads the widget from your backend, which is allowed

