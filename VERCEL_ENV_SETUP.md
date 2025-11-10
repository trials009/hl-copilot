# Vercel Environment Variables Setup

## How to Add Environment Variables via CLI

When you run `vercel env add VARIABLE_NAME`, you'll be prompted:

1. **Enter the value** - Type your API key/secret
2. **Select environments** - **THIS IS CRITICAL!**

### Step-by-Step:

```bash
vercel env add GROQ_API_KEY
```

**When prompted:**
1. `What's the value of GROQ_API_KEY?` → Enter your key (e.g., `gsk_...`)
2. `Add GROQ_API_KEY to which Environments (select multiple)?`
   - **Use arrow keys** to navigate
   - **Press SPACEBAR** to select/deselect
   - **Select at least one**:
     - `Production` ← **REQUIRED for production deployments**
     - `Preview` ← For preview deployments
     - `Development` ← For local development
   - **Press ENTER** to confirm

### Quick Command (Non-Interactive)

If you want to skip the interactive prompts, you can use:

```bash
# For Production only
echo "your-api-key-here" | vercel env add GROQ_API_KEY production

# For all environments
echo "your-api-key-here" | vercel env add GROQ_API_KEY production preview development
```

### Required Environment Variables

Add these for **Production** (at minimum):

```bash
# Groq API Key
vercel env add GROQ_API_KEY
# Select: Production (use arrow keys + spacebar, then Enter)

# Facebook App ID
vercel env add FACEBOOK_APP_ID
# Select: Production

# Facebook App Secret
vercel env add FACEBOOK_APP_SECRET
# Select: Production

# Facebook Redirect URI (update after deployment)
vercel env add FACEBOOK_REDIRECT_URI
# Value: https://your-app.vercel.app/api/facebook/callback
# Select: Production

# Session Secret (generate first)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output, then:
vercel env add SESSION_SECRET
# Select: Production
```

## Alternative: Use Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project: `hands-on-ai`
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Enter:
   - **Name**: `GROQ_API_KEY`
   - **Value**: Your API key
   - **Environments**: Check **Production** (and Preview/Development if needed)
6. Click **Save**
7. Repeat for all variables

## Verify Environment Variables

```bash
# List all environment variables
vercel env ls

# Pull environment variables (for local .env)
vercel env pull .env.local
```

## Important Notes

- **Production** environment is required for `vercel --prod` deployments
- **Preview** environment is for branch deployments
- **Development** environment is for `vercel dev` local development
- After adding variables, **redeploy** for changes to take effect:
  ```bash
  vercel --prod
  ```

