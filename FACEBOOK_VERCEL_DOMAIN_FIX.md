# Facebook OAuth Error 191 - Vercel Domain Fix

## The Problem

Facebook is rejecting `hands-on-ai.vercel.app` because the domain isn't properly configured in App Settings.

## Solution: Add BOTH Domain Formats

Facebook can be picky about Vercel domains. Try adding **both** formats:

### Option 1: Add Full Subdomain (Try This First)

1. Go to: https://developers.facebook.com/apps/708028548997739/settings/basic/
2. Scroll to **"App Domains"**
3. Click **"Add Domain"**
4. Enter: `hands-on-ai.vercel.app` (the FULL subdomain)
5. Click **"Save Changes"**

**Note**: Some Facebook apps require the full subdomain, not just the root domain.

### Option 2: Add Root Domain (If Option 1 doesn't work)

1. In the same "App Domains" section
2. Click **"Add Domain"** again
3. Enter: `vercel.app` (root domain)
4. Click **"Save Changes"**

### Option 3: Add BOTH (Recommended)

Add **both** domains to App Domains:
- `vercel.app`
- `hands-on-ai.vercel.app`

This covers all cases.

## Complete Configuration Checklist

### Facebook App Settings → Basic

1. **App Domains** (add both):
   - `vercel.app`
   - `hands-on-ai.vercel.app`

2. **Website/Site URL**:
   - `https://hands-on-ai.vercel.app`

3. **Privacy Policy URL** (if required):
   - Can use: `https://hands-on-ai.vercel.app` (temporary)

4. **Terms of Service URL** (if required):
   - Can use: `https://hands-on-ai.vercel.app` (temporary)

### Facebook Login → Settings

1. **Valid OAuth Redirect URIs**:
   - `https://hands-on-ai.vercel.app/api/facebook/callback`

2. **Client OAuth Login**: Enabled

3. **Web OAuth Login**: Enabled

4. **Enforce HTTPS**: Enabled (should be automatic)

## Alternative: Use Custom Domain

If Vercel subdomains continue to cause issues, you can:

1. **Add a custom domain to Vercel**:
   - Vercel Dashboard → Your Project → Settings → Domains
   - Add your own domain (e.g., `copilot.yourdomain.com`)
   - Update DNS records as instructed

2. **Update Facebook App Settings** with custom domain:
   - App Domains: `yourdomain.com`
   - Site URL: `https://copilot.yourdomain.com`
   - Redirect URI: `https://copilot.yourdomain.com/api/facebook/callback`

3. **Update Vercel environment variable**:
   ```bash
   vercel env rm FACEBOOK_REDIRECT_URI
   vercel env add FACEBOOK_REDIRECT_URI
   # Value: https://copilot.yourdomain.com/api/facebook/callback
   ```

## Debugging Steps

### 1. Verify Current Facebook Settings

Check what's currently configured:
- Go to: https://developers.facebook.com/apps/708028548997739/settings/basic/
- Screenshot or note what's in "App Domains"
- Verify "Website" field

### 2. Check App Status

1. Go to App Dashboard: https://developers.facebook.com/apps/708028548997739/
2. Check for any warnings or restrictions
3. Verify app is not in "Restricted" mode
4. Check if app needs review

### 3. Test Domain Configuration

After adding domains, wait 10 minutes, then test:

```bash
# Test if the callback endpoint exists
curl -I https://hands-on-ai.vercel.app/api/facebook/callback
```

Should return 200 or 400 (not 404).

### 4. Verify Redirect URI Format

The redirect URI must be:
- ✅ `https://hands-on-ai.vercel.app/api/facebook/callback` (correct)
- ❌ `http://hands-on-ai.vercel.app/api/facebook/callback` (wrong - no https)
- ❌ `https://hands-on-ai.vercel.app/api/facebook/callback/` (wrong - trailing slash)
- ❌ `https://HANDS-ON-AI.VERCEL.APP/api/facebook/callback` (wrong - uppercase)

## Common Mistakes

1. **Adding full URL instead of domain**:
   - ❌ Wrong: `https://hands-on-ai.vercel.app`
   - ✅ Correct: `hands-on-ai.vercel.app` (in App Domains)

2. **Not waiting for propagation**:
   - Facebook settings can take 10-15 minutes to propagate
   - Clear browser cache after waiting

3. **Mismatched redirect URI**:
   - Must match exactly between Facebook settings and Vercel env var
   - Check for typos, http vs https, trailing slashes

4. **App in wrong mode**:
   - Development mode: Only works for test users
   - Make sure you're added as a test user or app is in production

## Still Not Working?

### Try This Debug Flow

1. **Remove all domains** from App Domains
2. **Wait 5 minutes**
3. **Add only**: `hands-on-ai.vercel.app` (full subdomain)
4. **Wait 10 minutes**
5. **Test again**

If that doesn't work:

1. **Remove**: `hands-on-ai.vercel.app`
2. **Add**: `vercel.app` (root domain)
3. **Wait 10 minutes**
4. **Test again**

### Contact Facebook Support

If nothing works:
1. Go to: https://developers.facebook.com/support/
2. Report the issue with:
   - App ID: `708028548997739`
   - Error code: `191`
   - Domain: `hands-on-ai.vercel.app`
   - Screenshot of your App Domains settings

## Quick Reference

**Your App**: https://developers.facebook.com/apps/708028548997739/

**Settings to Update**:
- Basic Settings: https://developers.facebook.com/apps/708028548997739/settings/basic/
- Facebook Login: https://developers.facebook.com/apps/708028548997739/fb-login/settings/

**What to Add**:
- App Domains: `hands-on-ai.vercel.app` (and/or `vercel.app`)
- Site URL: `https://hands-on-ai.vercel.app`
- Redirect URI: `https://hands-on-ai.vercel.app/api/facebook/callback`

