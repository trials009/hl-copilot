# Facebook OAuth Error 191 - Complete Fix Guide

## Your Current Configuration

Based on the OAuth URL you're seeing:
- **App ID**: `708028548997739`
- **Redirect URI**: `https://hands-on-ai.vercel.app/api/facebook/callback`
- **Domain**: `hands-on-ai.vercel.app`

## Step-by-Step Fix

### Step 1: Add App Domain to Facebook

1. Go to: https://developers.facebook.com/apps/708028548997739/settings/basic/
2. Scroll down to **"App Domains"**
3. Click **"Add Domain"**
4. Enter: `vercel.app` (the base domain, not the full URL)
5. Click **"Save Changes"**

**Why `vercel.app`?** Facebook requires the root domain. Since your URL is `hands-on-ai.vercel.app`, the root domain is `vercel.app`.

### Step 2: Add Site URL

In the same "Basic" settings page:

1. Find **"Website"** or **"Site URL"** section
2. Enter: `https://hands-on-ai.vercel.app`
3. Click **"Save Changes"**

### Step 3: Add OAuth Redirect URI

1. Go to: https://developers.facebook.com/apps/708028548997739/fb-login/settings/
2. Find **"Valid OAuth Redirect URIs"** section
3. Click **"Add URI"** or the **"+"** button
4. Enter **exactly** (copy-paste to avoid typos):
   ```
   https://hands-on-ai.vercel.app/api/facebook/callback
   ```
5. Click **"Save Changes"**

### Step 4: Verify Vercel Environment Variable

Make sure `FACEBOOK_REDIRECT_URI` is set correctly in Vercel:

```bash
# Check current value
vercel env ls

# If not set or wrong, update it:
vercel env rm FACEBOOK_REDIRECT_URI
vercel env add FACEBOOK_REDIRECT_URI
# Value: https://hands-on-ai.vercel.app/api/facebook/callback
# Environments: Select Production (arrow keys + spacebar, then Enter)
```

Or via Dashboard:
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `FACEBOOK_REDIRECT_URI`
3. Update to: `https://hands-on-ai.vercel.app/api/facebook/callback`
4. Make sure it's enabled for **Production**

### Step 5: Wait and Test

1. **Wait 5-10 minutes** after saving Facebook settings (they need to propagate)
2. **Redeploy** (if you changed Vercel env vars):
   ```bash
   vercel --prod
   ```
3. **Test again** - try connecting Facebook in your widget

## Common Issues

### Issue 1: Domain Mismatch

**Error**: "The domain of this URL isn't included in the app's domains"

**Fix**: 
- Make sure you added `vercel.app` (not `hands-on-ai.vercel.app`) to App Domains
- Facebook uses the root domain for validation

### Issue 2: Redirect URI Mismatch

**Error**: "Invalid redirect_uri"

**Fix**:
- The redirect URI in Facebook settings must match **exactly**
- Check for:
  - `https://` vs `http://` (must be `https://`)
  - Trailing slashes (should NOT have trailing slash)
  - Case sensitivity (should be lowercase)
  - Exact path: `/api/facebook/callback`

### Issue 3: App in Development Mode

If your app is in **Development Mode**:
- Only you (and test users) can use it
- Add yourself as a test user: **Roles** → **Test Users**
- Or add your Facebook account as an **Admin/Developer**

### Issue 4: Settings Not Propagated

Facebook settings can take 5-10 minutes to propagate. If it still doesn't work:
1. Wait 10 minutes
2. Clear browser cache
3. Try in incognito/private window
4. Check Facebook App status (make sure it's not restricted)

## Verification Checklist

After making changes, verify:

- [ ] **App Domains**: `vercel.app` is added
- [ ] **Site URL**: `https://hands-on-ai.vercel.app` is set
- [ ] **OAuth Redirect URI**: `https://hands-on-ai.vercel.app/api/facebook/callback` is added (exact match)
- [ ] **Vercel Env Var**: `FACEBOOK_REDIRECT_URI` = `https://hands-on-ai.vercel.app/api/facebook/callback`
- [ ] **Waited 10 minutes** for Facebook settings to propagate
- [ ] **Redeployed** to Vercel after env var changes
- [ ] **Tested** the connection flow

## Direct Links to Your Facebook App Settings

- **Basic Settings**: https://developers.facebook.com/apps/708028548997739/settings/basic/
- **Facebook Login Settings**: https://developers.facebook.com/apps/708028548997739/fb-login/settings/

## Still Not Working?

1. **Check Facebook App Status**:
   - Go to App Dashboard
   - Make sure app is not in "Restricted" mode
   - Check for any warnings or errors

2. **Test the Redirect URI**:
   - Try opening: `https://hands-on-ai.vercel.app/api/facebook/callback?code=test&state=test`
   - Should not return 404 (even if it errors, the endpoint should exist)

3. **Check Vercel Logs**:
   - Vercel Dashboard → Your Project → Deployments → Logs
   - Look for any errors when the OAuth callback is hit

4. **Verify Environment Variables**:
   ```bash
   vercel env ls
   ```
   - Make sure `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, and `FACEBOOK_REDIRECT_URI` are all set

5. **Check Browser Console**:
   - Open browser DevTools (F12)
   - Check Console tab for any JavaScript errors
   - Check Network tab to see the actual OAuth request

