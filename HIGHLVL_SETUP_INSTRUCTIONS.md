# HighLevel Custom JS Setup - Step by Step

## ⚠️ IMPORTANT: Where to Paste the Code

The JavaScript code **MUST** be pasted in the **Custom JS** section, NOT in any content area or HTML field.

## Correct Location in HighLevel

1. **Log into your HighLevel sandbox account**
2. **Navigate to Settings** (gear icon in left sidebar)
3. **Click on "Custom JS"** (or "Integrations" > "Custom JS" depending on your HighLevel version)
4. **You should see a code editor** (not a text area or content editor)
5. **Paste the code from `highlevel-integration.js`** into this editor
6. **Click "Save"**
7. **Reload the HighLevel page** (refresh browser)

## ❌ Wrong Places (Will Display as Text)

- **DO NOT** paste in:
  - Dashboard content areas
  - HTML/Content editors
  - Site builder
  - Any text input field that's not specifically "Custom JS"

## ✅ Correct Steps

### Step 1: Open the Integration File

Open `highlevel-integration.js` from your project root in a text editor.

### Step 2: Update the API URL

Find this line (around line 25):
```javascript
const COPILOT_API_URL = 'https://your-app.vercel.app';
```

Replace with your actual Vercel URL:
```javascript
const COPILOT_API_URL = 'https://your-actual-app.vercel.app';
```

Or for local development:
```javascript
const COPILOT_API_URL = 'http://localhost:3000';
```

### Step 3: Copy the Entire File

- Select **ALL** the code in `highlevel-integration.js`
- Copy it (Ctrl+C / Cmd+C)

### Step 4: Paste in HighLevel Custom JS

1. In HighLevel, go to **Settings > Custom JS**
2. **Clear any existing code** in the editor
3. **Paste** the code (Ctrl+V / Cmd+V)
4. **Click "Save"** or "Save Changes"
5. **Reload the HighLevel page** (F5 or refresh button)

### Step 5: Verify It Works

After reloading:
- You should see a **floating button** in the bottom-right corner of HighLevel
- The button should have a chat/robot icon
- Clicking it should open the Copilot widget

## Troubleshooting

### Code Shows as Text on Dashboard

**Problem**: You pasted it in the wrong place (content area instead of Custom JS)

**Solution**:
1. Remove the code from wherever you pasted it
2. Go to **Settings > Custom JS** (the correct location)
3. Paste it there instead

### Widget Doesn't Appear

1. **Check browser console** (F12) for errors
2. **Verify API URL** is correct in the code
3. **Check CORS settings** - your backend must allow HighLevel domain
4. **Verify code is saved** - make sure you clicked "Save" in Custom JS

### Still Having Issues?

1. Open browser Developer Tools (F12)
2. Check the Console tab for JavaScript errors
3. Check the Network tab to see if API calls are being made
4. Verify the `COPILOT_API_URL` matches your actual backend URL

## Visual Guide

The Custom JS section in HighLevel should look like:
- A **code editor** with syntax highlighting
- Usually has a dark background
- Has a "Save" or "Save Changes" button
- Located under **Settings > Custom JS** or **Integrations > Custom JS**

If you see a regular text input or content editor, you're in the wrong place!

