# HighLevel Integration: CSS and JS Separation

## ✅ Yes, CSS Should Be in a Separate File!

HighLevel has **separate sections** for Custom JavaScript and Custom CSS. The CSS should be pasted into the **Custom CSS** section, not embedded in the JavaScript.

## File Structure

You now have two files:

1. **`highlevel-integration.js`** - JavaScript code (paste into Custom JS section)
2. **`highlevel-integration.css`** - CSS styles (paste into Custom CSS section)

## Setup Instructions

### Step 1: Open HighLevel Settings

1. Log into your HighLevel **Agency** account
2. Go to **Settings** (gear icon)
3. Click **Company**
4. Find **Custom JavaScript & Custom CSS**

### Step 2: Paste CSS

1. Open `highlevel-integration.css` from your project
2. **Copy the entire file** (all CSS code)
3. In HighLevel, click on the **Custom CSS** tab/section
4. **Paste the CSS** into the CSS editor
5. **Don't click Save yet** - you need to add the JS too

### Step 3: Paste JavaScript

1. Open `highlevel-integration.js` from your project
2. **Update the API URL** (around line 30):
   ```javascript
   const COPILOT_API_URL = 'http://localhost:3000'; // For local dev
   // OR
   const COPILOT_API_URL = 'https://your-app.vercel.app'; // For production
   ```
3. **Copy the entire file** (all JavaScript code, but NOT the `<script>` tags if present)
4. In HighLevel, click on the **Custom JS** tab/section
5. **Paste the JavaScript** into the JS editor

### Step 4: Save and Reload

1. Click **Save Changes** (this saves both CSS and JS)
2. **Reload the HighLevel page** (F5 or refresh)
3. You should see the floating button in the bottom-right corner

## Why Separate?

According to HighLevel's documentation:
- **Custom JS** section is for JavaScript code
- **Custom CSS** section is for CSS styles
- They are managed separately but work together
- This separation makes it easier to maintain and update

## Important Notes

1. **No `<script>` tags needed** - HighLevel adds them automatically
2. **No `<style>` tags needed** - HighLevel handles CSS automatically
3. **Both must be saved** - Make sure to save after pasting both CSS and JS
4. **Order doesn't matter** - CSS and JS can be pasted in any order, but both are required

## Troubleshooting

### Button doesn't appear?

1. **Check both sections** - Make sure CSS is in Custom CSS AND JS is in Custom JS
2. **Verify both are saved** - Click "Save Changes" after pasting both
3. **Check browser console** (F12) for errors
4. **Reload the page** after saving

### Styles not working?

- Make sure CSS is in the **Custom CSS** section, not in the JS section
- Verify CSS was saved (check the Custom CSS editor still shows your code)
- Check for CSS syntax errors in browser console

### JavaScript not working?

- Make sure JS is in the **Custom JS** section, not in the CSS section
- Remove any `<script>` tags if you accidentally included them
- Check browser console (F12) for JavaScript errors

## Quick Checklist

- [ ] CSS pasted into **Custom CSS** section
- [ ] JavaScript pasted into **Custom JS** section
- [ ] API URL updated in JavaScript
- [ ] Both sections saved (clicked "Save Changes")
- [ ] Page reloaded
- [ ] Floating button appears in bottom-right corner

