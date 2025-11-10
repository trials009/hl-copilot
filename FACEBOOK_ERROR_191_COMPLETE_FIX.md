# Facebook OAuth Error 191 - Complete Troubleshooting Guide

## Your Configuration
- **App ID**: `708028548997739`
- **Redirect URI**: `https://hands-on-ai.vercel.app/api/facebook/callback`
- **Domain**: `hands-on-ai.vercel.app`

## Complete Fix Checklist

### 1. Facebook App → Settings → Basic

**Required Fields:**

1. **App Domains** (add BOTH):
   - `vercel.app` (root domain)
   - `hands-on-ai.vercel.app` (full subdomain)
   - Click "Save Changes" after each addition

2. **Website/Site URL**:
   - `https://hands-on-ai.vercel.app`
   - This field is REQUIRED for OAuth

3. **Privacy Policy URL** (may be required):
   - If the field is visible and required, add: `https://hands-on-ai.vercel.app`
   - Or create a simple privacy policy page

4. **Terms of Service URL** (may be required):
   - If the field is visible and required, add: `https://hands-on-ai.vercel.app`

### 2. Facebook Login → Settings

**Critical Settings:**

1. **Valid OAuth Redirect URIs**:
   - Add: `https://hands-on-ai.vercel.app/api/facebook/callback`
   - **MUST match exactly** (no trailing slash, lowercase, https://)

2. **Client OAuth Login**: 
   - Must be **Enabled** ✅

3. **Web OAuth Login**:
   - Must be **Enabled** ✅

4. **Use Strict Mode for Redirect URIs**:
   - If enabled, the redirect URI must match EXACTLY
   - Try **disabling** this temporarily to test
   - If it works with strict mode off, then re-enable and ensure exact match

5. **Enforce HTTPS**:
   - Should be enabled (automatic for production)

### 3. App Review → Permissions

Make sure these permissions are requested:
- `pages_manage_posts`
- `pages_read_engagement`
- `business_management`

### 4. Verify Vercel Environment Variable

```bash
# Check current value
vercel env ls | grep FACEBOOK_REDIRECT_URI

# Should show:
# FACEBOOK_REDIRECT_URI=https://hands-on-ai.vercel.app/api/facebook/callback
```

If wrong:
```bash
vercel env rm FACEBOOK_REDIRECT_URI production
vercel env add FACEBOOK_REDIRECT_URI
# Value: https://hands-on-ai.vercel.app/api/facebook/callback
# Environments: Select Production (arrow keys + spacebar, Enter)
```

## Common Issues & Solutions

### Issue 1: Strict Mode Enabled

**Problem**: "Use Strict Mode for Redirect URIs" requires exact match

**Solution**:
1. Go to: https://developers.facebook.com/apps/708028548997739/fb-login/settings/
2. Find "Use Strict Mode for Redirect URIs"
3. **Temporarily disable** it
4. Save and test
5. If it works, re-enable and ensure exact match

### Issue 2: Missing Required Fields

**Problem**: Facebook may require Privacy Policy URL or Terms of Service

**Solution**:
1. Check "Settings → Basic" for required fields (marked with *)
2. Add temporary URLs if required:
   - Privacy Policy: `https://hands-on-ai.vercel.app`
   - Terms: `https://hands-on-ai.vercel.app`

### Issue 3: App Status

**Problem**: App might be restricted or in review

**Solution**:
1. Go to App Dashboard: https://developers.facebook.com/apps/708028548997739/
2. Check app status (should be "Live" or "Development")
3. If "Restricted", you need to submit for review
4. For Development mode, add yourself as test user

### Issue 4: Domain Validation

**Problem**: Facebook might not recognize Vercel subdomains

**Solution - Try This Order**:

1. **First, try adding ONLY the full subdomain**:
   - App Domains: `hands-on-ai.vercel.app`
   - Wait 10 minutes, test

2. **If that doesn't work, add BOTH**:
   - App Domains: 
     - `vercel.app`
     - `hands-on-ai.vercel.app`
   - Wait 10 minutes, test

3. **If still not working, try root domain only**:
   - Remove `hands-on-ai.vercel.app`
   - Keep only: `vercel.app`
   - Wait 10 minutes, test

### Issue 5: Caching/Propagation

**Problem**: Settings haven't propagated yet

**Solution**:
1. Wait **15-20 minutes** after making changes
2. Clear browser cache completely
3. Try in incognito/private window
4. Try different browser
5. Check Facebook's status page for any issues

## Step-by-Step Debug Process

### Step 1: Verify Current Settings

Take screenshots or note down:
1. App Domains (what's currently listed)
2. Site URL (what's currently set)
3. Valid OAuth Redirect URIs (what's listed)
4. Client OAuth Login (enabled/disabled)
5. Web OAuth Login (enabled/disabled)
6. Strict Mode (enabled/disabled)

### Step 2: Test Redirect URI Format

The redirect URI in your OAuth URL is:
```
https://hands-on-ai.vercel.app/api/facebook/callback
```

Verify in Facebook settings it matches **EXACTLY**:
- ✅ `https://` (not `http://`)
- ✅ `hands-on-ai.vercel.app` (lowercase, no typos)
- ✅ `/api/facebook/callback` (exact path, no trailing slash)
- ✅ No query parameters in the stored URI

### Step 3: Check for Typos

Common typos:
- `hands-on-ai.vercel.app` vs `hands-on-ai.vercel.com` (wrong TLD)
- `https://hands-on-ai.vercel.app/` vs `https://hands-on-ai.vercel.app` (trailing slash)
- `HTTP://hands-on-ai.vercel.app` vs `https://hands-on-ai.vercel.app` (uppercase/wrong protocol)

### Step 4: Verify App Can Access Domain

Test if your app can actually reach the callback:
```bash
curl -I https://hands-on-ai.vercel.app/api/facebook/callback
```

Should return 200, 400, or 401 (not 404).

## Alternative: Use Custom Domain

If Vercel subdomains continue to cause issues:

1. **Add custom domain to Vercel**:
   - Vercel Dashboard → Project → Settings → Domains
   - Add your own domain (e.g., `copilot.yourdomain.com`)
   - Update DNS as instructed

2. **Update Facebook with custom domain**:
   - App Domains: `yourdomain.com`
   - Site URL: `https://copilot.yourdomain.com`
   - Redirect URI: `https://copilot.yourdomain.com/api/facebook/callback`

3. **Update Vercel env var**:
   ```bash
   vercel env rm FACEBOOK_REDIRECT_URI production
   vercel env add FACEBOOK_REDIRECT_URI
   # Value: https://copilot.yourdomain.com/api/facebook/callback
   ```

## Direct Links

- **Basic Settings**: https://developers.facebook.com/apps/708028548997739/settings/basic/
- **Facebook Login Settings**: https://developers.facebook.com/apps/708028548997739/fb-login/settings/
- **App Dashboard**: https://developers.facebook.com/apps/708028548997739/

## Final Checklist

Before testing again, verify:

- [ ] App Domains contains: `hands-on-ai.vercel.app` (and/or `vercel.app`)
- [ ] Site URL is set: `https://hands-on-ai.vercel.app`
- [ ] Valid OAuth Redirect URIs contains: `https://hands-on-ai.vercel.app/api/facebook/callback` (exact match)
- [ ] Client OAuth Login: **Enabled**
- [ ] Web OAuth Login: **Enabled**
- [ ] Privacy Policy URL: Set (if required)
- [ ] Terms of Service URL: Set (if required)
- [ ] Vercel env var `FACEBOOK_REDIRECT_URI` matches exactly
- [ ] Waited 15-20 minutes after last change
- [ ] Cleared browser cache / using incognito
- [ ] App is not in "Restricted" mode

## Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Contact Facebook Support**:
   - https://developers.facebook.com/support/
   - Include:
     - App ID: `708028548997739`
     - Error: `191`
     - Domain: `hands-on-ai.vercel.app`
     - Screenshots of your App Domains and OAuth settings

2. **Check Facebook Status**:
   - https://developers.facebook.com/status/
   - See if there are any known issues

3. **Try Mock Mode**:
   - The app has mock mode built-in
   - You can test the full flow without real Facebook connection
   - Just don't set `FACEBOOK_APP_ID` in Vercel

