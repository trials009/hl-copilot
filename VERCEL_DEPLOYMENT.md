# Vercel Deployment Guide

Complete step-by-step guide to deploy the HighLevel Copilot backend to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com) (free tier is sufficient)
2. **Node.js installed**: For running Vercel CLI locally (optional, can use dashboard)
3. **Git repository** (optional, but recommended)

## Method 1: Deploy via Vercel CLI (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

Or if you prefer using npx (no global install):
```bash
npx vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser to authenticate with Vercel.

### Step 3: Navigate to Project Directory

```bash
cd /Users/kaustubhkabra/Documents/handsOnAI
```

### Step 4: Initial Deployment

```bash
vercel
```

**Follow the prompts:**
- Set up and deploy? → **Yes**
- Which scope? → Select your Vercel account/team
- Link to existing project? → **No** (first time)
- Project name? → `highlevel-copilot` (or your preferred name)
- Directory? → Press **Enter** (use current directory `.`)
- Override settings? → **No**

This will create a **preview deployment** (not production yet).

### Step 5: Add Environment Variables

Add all required environment variables. You can do this via CLI or Dashboard.

#### Via CLI:

```bash
# Add each variable (you'll be prompted to enter the value)
vercel env add GROQ_API_KEY
vercel env add FACEBOOK_APP_ID
vercel env add FACEBOOK_APP_SECRET
vercel env add FACEBOOK_REDIRECT_URI
vercel env add SESSION_SECRET
vercel env add GROQ_MODEL
```

**When prompted, enter:**
- `GROQ_API_KEY`: Your Groq API key (starts with `gsk_`)
- `FACEBOOK_APP_ID`: Your Facebook App ID
- `FACEBOOK_APP_SECRET`: Your Facebook App Secret
- `FACEBOOK_REDIRECT_URI`: Will be set after deployment (see Step 7)
- `SESSION_SECRET`: Generate a random string (32+ characters)
  ```bash
  # Generate a secure random string:
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `GROQ_MODEL`: `llama-3.3-70b-versatile` (or leave default)

**Important**: When asked "Which environments should it be available for?", select:
- **Production**
- **Preview** 
- **Development**

### Step 6: Deploy to Production

```bash
vercel --prod
```

This creates your production deployment. **Copy the URL** (e.g., `https://your-app.vercel.app`)

### Step 7: Update Facebook Redirect URI

1. **Update Vercel environment variable**:
   ```bash
   vercel env rm FACEBOOK_REDIRECT_URI
   vercel env add FACEBOOK_REDIRECT_URI
   # Enter: https://your-app.vercel.app/api/facebook/callback
   ```

2. **Update Facebook App settings**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Select your app
   - Go to **Facebook Login > Settings**
   - Add to **Valid OAuth Redirect URIs**:
     ```
     https://your-app.vercel.app/api/facebook/callback
     ```
   - Save changes

3. **Redeploy** (to pick up the new redirect URI):
   ```bash
   vercel --prod
   ```

## Method 2: Deploy via Vercel Dashboard

### Step 1: Prepare Your Code

1. **Push to Git** (recommended):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

   Or use GitHub Desktop or any Git client.

### Step 2: Import Project in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. **Import Git Repository**:
   - Connect your GitHub/GitLab/Bitbucket account if needed
   - Select your repository
   - Click **Import**

### Step 3: Configure Project

1. **Project Settings**:
   - **Framework Preset**: **Other**
   - **Root Directory**: `.` (current directory)
   - **Build Command**: (leave empty - no build needed)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install` (default)

2. **Environment Variables**:
   Click **"Environment Variables"** and add:

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `GROQ_API_KEY` | Your Groq API key | Production, Preview, Development |
   | `FACEBOOK_APP_ID` | Your Facebook App ID | Production, Preview, Development |
   | `FACEBOOK_APP_SECRET` | Your Facebook App Secret | Production, Preview, Development |
   | `FACEBOOK_REDIRECT_URI` | `https://your-app.vercel.app/api/facebook/callback` | Production, Preview, Development |
   | `SESSION_SECRET` | Random 32+ char string | Production, Preview, Development |
   | `GROQ_MODEL` | `llama-3.3-70b-versatile` | Production, Preview, Development |

   **Note**: You'll need to update `FACEBOOK_REDIRECT_URI` after the first deployment with your actual Vercel URL.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (usually 1-2 minutes)
3. **Copy your deployment URL** (e.g., `https://your-app.vercel.app`)

### Step 5: Update Facebook Redirect URI

1. **Update in Vercel Dashboard**:
   - Go to your project → Settings → Environment Variables
   - Edit `FACEBOOK_REDIRECT_URI`
   - Update to: `https://your-actual-url.vercel.app/api/facebook/callback`
   - Save

2. **Update in Facebook**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Select your app → Facebook Login → Settings
   - Add: `https://your-actual-url.vercel.app/api/facebook/callback`
   - Save

3. **Redeploy** (trigger a new deployment to pick up the change)

## Verify Deployment

### Test Your Deployment

1. **Health Check**:
   Open in browser: `https://your-app.vercel.app/health`
   Should return: `{"status":"ok","message":"HighLevel Copilot API is running"}`

2. **Test API Endpoint**:
   ```bash
   curl https://your-app.vercel.app/health
   ```

3. **Check Logs**:
   - In Vercel Dashboard → Your Project → Deployments → Click on a deployment → Logs
   - Look for any errors

## Update HighLevel Integration

After deployment, update the integration code:

1. Open `highlevel-integration.js`
2. Update line ~30:
   ```javascript
   const COPILOT_API_URL = 'https://your-app.vercel.app';
   ```
3. Paste updated code into HighLevel Custom JS section

## Troubleshooting

### Deployment Fails

1. **Check build logs** in Vercel Dashboard
2. **Verify `vercel.json`** exists and is correct
3. **Check `package.json`** has all dependencies
4. **Ensure Node.js version** is compatible (Vercel uses Node 18+ by default)

### Environment Variables Not Working

1. **Verify variables are set** in Vercel Dashboard → Settings → Environment Variables
2. **Check variable names** match exactly (case-sensitive)
3. **Redeploy** after adding/updating variables
4. **Check logs** for errors about missing variables

### API Returns 404

1. **Verify `vercel.json`** configuration
2. **Check `backend/vercel-entry.js`** exists
3. **Ensure routes are properly exported**
4. **Check Vercel function logs** for errors

### CORS Errors

1. **Check `backend/server.js`** CORS configuration
2. **Verify** `origin: '*'` is set (or specific domains)
3. **Check browser console** for specific CORS errors

## Project Structure for Vercel

```
handsOnAI/
├── vercel.json          # Vercel configuration
├── backend/
│   ├── server.js        # Main Express app
│   ├── vercel-entry.js  # Vercel entry point
│   └── routes/          # API routes
├── config/
│   └── config.js        # Configuration (uses env vars)
├── frontend/            # Static files (served at /widget)
└── package.json         # Dependencies
```

## Quick Deploy Commands

```bash
# First time setup
vercel login
vercel

# Add environment variables
vercel env add GROQ_API_KEY
vercel env add FACEBOOK_APP_ID
vercel env add FACEBOOK_APP_SECRET
vercel env add FACEBOOK_REDIRECT_URI
vercel env add SESSION_SECRET

# Deploy to production
vercel --prod

# View deployments
vercel ls

# View logs
vercel logs
```

## Next Steps

After successful deployment:

1. ✅ Copy your Vercel URL
2. ✅ Update `highlevel-integration.js` with the URL
3. ✅ Update Facebook App redirect URI
4. ✅ Test the integration in HighLevel
5. ✅ Verify the floating button appears

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel CLI**: [vercel.com/docs/cli](https://vercel.com/docs/cli)
- **Check logs**: Vercel Dashboard → Your Project → Deployments → Logs

