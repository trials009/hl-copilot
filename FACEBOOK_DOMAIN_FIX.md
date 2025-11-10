# Facebook OAuth Error 191 - Domain Not Configured

## Error Message
```
"Can't load URL: The domain of this URL isn't included in the app's domains."
```

## What This Means
Facebook requires you to register your domain in the App Settings before you can use OAuth with that domain.

## Fix: Add Domain to Facebook App Settings

### Step 1: Get Your Vercel Domain

Your Vercel deployment URL is:
```
hands-on-4w166gjzt-kk009s-projects.vercel.app
```

Extract the base domain:
```
vercel.app
```

Or if you have a custom domain, use that.

### Step 2: Add Domain to Facebook App

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Click **"My Apps"** (top right)
   - Select your app

2. **Navigate to App Settings**
   - In the left sidebar, click **"Settings"**
   - Click **"Basic"**

3. **Add App Domain**
   - Scroll down to **"App Domains"** section
   - Click **"Add Domain"**
   - Enter: `vercel.app`
   - **OR** if you have a custom domain, enter that (e.g., `yourdomain.com`)
   - Click **"Save Changes"**

4. **Add Site URL (if required)**
   - In the same **"Basic"** settings page
   - Find **"Website"** or **"Site URL"** section
   - Enter: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app`
   - Click **"Save Changes"**

### Step 3: Update OAuth Redirect URIs

1. **Go to Facebook Login Settings**
   - In the left sidebar, click **"Facebook Login"**
   - Click **"Settings"**

2. **Add Valid OAuth Redirect URIs**
   - Find **"Valid OAuth Redirect URIs"** section
   - Click **"Add URI"**
   - Add: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback`
   - Click **"Save Changes"**

3. **Verify Redirect URI in Vercel**
   - Make sure your Vercel environment variable `FACEBOOK_REDIRECT_URI` is set to:
     ```
     https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback
     ```

### Step 4: Update Vercel Environment Variable

If you haven't set `FACEBOOK_REDIRECT_URI` in Vercel yet:

```bash
vercel env add FACEBOOK_REDIRECT_URI
# When prompted:
# Value: https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback
# Environments: Select Production (use arrow keys + spacebar, then Enter)
```

Or via Dashboard:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add:
   - **Name**: `FACEBOOK_REDIRECT_URI`
   - **Value**: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback`
   - **Environments**: Check **Production**

### Step 5: Redeploy

After updating Facebook settings and Vercel environment variables:

```bash
vercel --prod
```

## Important Notes

### App Domains vs Redirect URIs

- **App Domains**: The base domain (e.g., `vercel.app` or `yourdomain.com`)
  - This tells Facebook which domains your app can use
  - Add the **root domain**, not the full URL

- **Valid OAuth Redirect URIs**: The full callback URL
  - Must match **exactly** (including `https://`)
  - Example: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback`

### For Development Mode

If your Facebook App is in **Development Mode**:
- Only you (and test users) can use it
- The domain restrictions still apply
- You can test with your Vercel URL

### For Production

When you submit your app for review:
- Facebook will verify your domain configuration
- Make sure all domains are correctly set
- Ensure redirect URIs match exactly

## Quick Checklist

- [ ] Added `vercel.app` (or your custom domain) to **App Domains** in Facebook
- [ ] Added site URL: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app` (if required)
- [ ] Added redirect URI: `https://hands-on-4w166gjzt-kk009s-projects.vercel.app/api/facebook/callback` to **Valid OAuth Redirect URIs**
- [ ] Set `FACEBOOK_REDIRECT_URI` environment variable in Vercel
- [ ] Redeployed to Vercel (`vercel --prod`)
- [ ] Tested the Facebook connection flow

## Testing

After making these changes:

1. **Wait 5-10 minutes** for Facebook settings to propagate
2. **Test the connection** in your widget
3. **Check browser console** (F12) for any remaining errors
4. **Check Vercel logs** for backend errors

## Still Getting Errors?

1. **Verify exact URL match**: Copy-paste the redirect URI to ensure no typos
2. **Check HTTPS**: Facebook requires HTTPS for OAuth (Vercel provides this automatically)
3. **Clear browser cache**: Sometimes cached redirects cause issues
4. **Check Facebook App Status**: Make sure your app is not restricted or in review

