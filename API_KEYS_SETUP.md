# Step-by-Step API Keys Setup Guide

Complete instructions to get API keys from Groq, Facebook, and HighLevel for local development.

---

## 🔑 Step 1: Groq API Key (Required - AI/LLM)

### Why You Need It
- Powers the conversational AI (chat interface)
- Generates 30-day content calendars
- Provides fast streaming responses (character-by-character)

### How to Get It

1. **Visit Groq Console**
   - Go to: https://console.groq.com/
   - Click **"Sign Up"** or **"Log In"** (top right)

2. **Create Account**
   - Sign up with email or Google account
   - Verify your email if required
   - Complete the signup process

3. **Navigate to API Keys**
   - Once logged in, click on **"API Keys"** in the left sidebar
   - Or go directly to: https://console.groq.com/keys

4. **Create API Key**
   - Click **"Create API Key"** button
   - Give it a name (e.g., "HighLevel Copilot")
   - Click **"Submit"** or **"Create"**

5. **Copy Your Key**
   - **IMPORTANT**: Copy the key immediately (starts with `gsk_`)
   - You won't be able to see it again after closing the dialog
   - Format: `gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

6. **Add to Your Project**
   - Open your `.env` file in the project root
   - Add:
     ```env
     GROQ_API_KEY=gsk_your_actual_key_here
     GROQ_MODEL=llama-3.3-70b-versatile
     ```
   
   **Note**: If `llama-3.3-70b-versatile` doesn't work, try:
   - `llama-3.1-8b-instant` (faster, lighter)
   - `llama-3.1-405b-reasoning` (if available)
   - Check https://console.groq.com/docs/models for current available models

### Free Tier Limits
- ✅ Free tier available
- ✅ Very generous limits
- ✅ Fast response times
- ✅ No credit card required

### Verification
- Test your key: The server will show configuration status on startup
- Look for: `✅ AI: Configured` in server logs

---

## 📘 Step 2: Facebook App Credentials (Required - Social Media)

### Why You Need It
- Connect user's Facebook pages
- Schedule posts to Facebook
- Access Facebook Graph API

### How to Get It

#### Part A: Create Facebook App

1. **Visit Facebook Developers**
   - Go to: https://developers.facebook.com/
   - Click **"My Apps"** (top right)
   - Click **"Create App"**

2. **Choose App Type**
   - Select **"Business"** as the app type
   - Click **"Next"**

3. **Fill App Details**
   - **App Name**: `HighLevel Copilot` (or your preferred name)
   - **App Contact Email**: Your email
   - **Business Account**: (Optional - can skip)
   - Click **"Create App"**

4. **Complete Security Check**
   - Facebook may ask you to verify your account
   - Follow the verification steps

#### Part B: Add Facebook Login Product

1. **Add Product**
   - In your app dashboard, find **"Add Product"** or **"Products"** section
   - Click **"Set Up"** on **"Facebook Login"**

2. **Choose Platform**
   - Select **"Web"** platform
   - Enter your site URL: `http://localhost:3000` (for local dev)

3. **Configure Settings**
   - Go to **"Facebook Login" > "Settings"** in the left sidebar
   - Add **Valid OAuth Redirect URIs**:
     ```
     http://localhost:3000/api/facebook/callback
     ```
   - Click **"Save Changes"**

#### Part C: Get App ID and App Secret

1. **Get App ID**
   - Go to **"Settings" > "Basic"** in the left sidebar
   - Find **"App ID"** - copy this number
   - Example: `1234567890123456`

2. **Get App Secret**
   - In the same **"Settings" > "Basic"** page
   - Find **"App Secret"** section
   - Click **"Show"** next to App Secret
   - Enter your Facebook password if prompted
   - Copy the secret (long string of characters)
   - Example: `abc123def456ghi789jkl012mno345pqr678`

#### Part D: Configure Permissions

1. **Add Permissions**
   - Go to **"App Review" > "Permissions and Features"** in the left sidebar
   - Add these permissions:
     - `pages_manage_posts` - To create and schedule posts
     - `pages_read_engagement` - To read page data
     - `business_management` - To manage business pages
     - `pages_show_list` - To list user's pages

2. **For Development Mode**
   - If your app is in **Development Mode** (default), you can add test users
   - Go to **"Roles" > "Test Users"**
   - Add yourself as a test user
   - Or add your Facebook account as an admin/developer

3. **For Production**
   - You'll need to submit for App Review to use these permissions with real users
   - For now, Development Mode is fine for local testing

#### Part E: Add to Your Project

1. **Update `.env` file**
   ```env
   FACEBOOK_APP_ID=your_app_id_here
   FACEBOOK_APP_SECRET=your_app_secret_here
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/facebook/callback
   ```
   
   

2. **Verify Configuration**
   - Restart your server
   - Check server logs for: `✅ Facebook: Configured`

### Important Notes
- ⚠️ **App Secret is sensitive** - Never commit it to version control
- ⚠️ **Development Mode**: App works with test users only
- ⚠️ **Redirect URI**: Must match exactly (including `http://` vs `https://`)
- ✅ **Local Testing**: Development mode is perfect for local testing

---

## 🏢 Step 3: HighLevel API Key (Optional - For Future Features)

### Why You Need It
- Currently optional for basic functionality
- Future enhancements: User authentication, CRM integration
- Better user context in the widget

### How to Get It

**⚠️ Important**: HighLevel API keys are **NOT always available** in test developer accounts or sub-accounts. The location varies by account type and subscription level.

#### Try These Locations (In Order):

1. **Settings > Private Integrations**
   - In Settings sidebar, look for **"Private Integrations"**
   - This is often where API keys are located
   - May require specific permissions

2. **Settings > Integrations**
   - Look for an **"Integrations"** section
   - May have an **"API"** or **"API Keys"** subsection

3. **Developer Portal** (For Developer Accounts)
   - Visit: https://developers.gohighlevel.com/
   - Log in with your HighLevel credentials
   - Look for API credentials or OAuth apps section

4. **Location Settings** (If you have multiple locations)
   - Select a location first
   - Go to that location's Settings
   - Look for API or Integration options

5. **Contact HighLevel Support**
   - Use the help/question mark icon (?) in HighLevel
   - Ask: "How do I get an API key for my test developer account?"
   - They can enable API access or guide you to the right location

#### If You Find the API Key Section:

1. **Generate API Key**
   - Click **"Generate API Key"** or **"Create API Key"**
   - Give it a name (e.g., "Copilot Integration")
   - Copy the API key immediately (you may not see it again)
   - Format: Usually a long string or token

2. **Get Account ID / Location ID**
   - You already have this: `13hqGBv6kG9GEoAdSRVt` (from your settings)
   - This is often visible in the URL or Company settings

3. **Add to Your Project**
   - Open your `.env` file
   - Add:
     ```env
     HIGHLVL_API_KEY=your_highlevel_api_key_here
     HIGHLVL_ACCOUNT_ID=13hqGBv6kG9GEoAdSRVt
     ```

### Notes
- ✅ **Optional**: Project works without this for basic features
- ✅ **You Already Have Account ID**: `13hqGBv6kG9GEoAdSRVt`
- ⚠️ **Not Available in All Accounts**: Test developer accounts may not have API key access
- ⚠️ **Custom JS Works**: You can use the widget via Custom JS without API key
- 💡 **Skip for Now**: You can proceed with just Groq and Facebook keys

---

## 📝 Step 4: Session Secret (Required - Security)

### Why You Need It
- Encrypts session data
- Required for OAuth flows
- Security for user sessions

### How to Generate It

**Option 1: Using Node.js (Recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Option 2: Using OpenSSL**
```bash
openssl rand -hex 32
```

**Option 3: Online Generator**
- Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" section
- Copy a 64-character key

### Add to Your Project
```env
SESSION_SECRET=your_generated_random_string_here
```

**Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

---

## ✅ Step 5: Complete `.env` File

Create or update your `.env` file in the project root with all keys:

```env
# Server Configuration
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:3000

# AI/LLM Configuration - Groq (Required)
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Facebook App Configuration (Required)
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
FACEBOOK_REDIRECT_URI=http://localhost:3000/api/facebook/callback

# Session Security (Required)
SESSION_SECRET=your_generated_session_secret_here

# HighLevel API (Optional)
HIGHLVL_API_KEY=your_highlevel_api_key_here
HIGHLVL_ACCOUNT_ID=your_highlevel_account_id_here
```

---

## 🧪 Step 6: Verify Setup

1. **Start Your Server**
   ```bash
   npm start
   ```

2. **Check Configuration Status**
   - Look for this in server logs:
     ```
     📋 Configuration Status:
        ✅ AI: Configured
        ✅ Facebook: Configured
     ```

3. **Test Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","message":"HighLevel Copilot API is running"}`

4. **Test Widget**
   - Open: http://localhost:3000/widget/widget.html
   - Click "Start Conversation"
   - Send a message - should get AI response

5. **Test Facebook Connection**
   - In the widget, navigate to Facebook connection
   - Click "Connect Facebook"
   - Should open Facebook OAuth flow

---

## 🐛 Troubleshooting

### Groq API Issues
- **Error**: "AI service not configured"
  - Check `GROQ_API_KEY` is in `.env`
  - Verify key starts with `gsk_`
  - Restart server after adding key

### Facebook OAuth Issues
- **Error**: "Redirect URI mismatch"
  - Verify redirect URI in Facebook App settings matches exactly
  - Check for `http://` vs `https://`
  - Must be: `http://localhost:3000/api/facebook/callback`

- **Error**: "App not in development mode"
  - Add yourself as a test user in Facebook App settings
  - Or add your Facebook account as admin/developer

- **Error**: "Permissions not granted"
  - Check permissions are added in App Review section
  - For development, add test users

### HighLevel API Issues
- **Error**: "API key invalid"
  - Verify key is copied correctly (no extra spaces)
  - Check if account has API access enabled
  - Verify account ID is correct

### General Issues
- **Server won't start**
  - Check `.env` file exists in project root
  - Verify all required keys are present
  - Check for typos in key names

- **Configuration not loading**
  - Restart server after updating `.env`
  - Check `.env` file is in root directory (not in subdirectories)
  - Verify no syntax errors in `.env` (no quotes needed around values)

---

## 🔒 Security Reminders

1. **Never commit `.env` file** to version control
2. **Keep API keys secret** - don't share them
3. **Rotate keys** if they're exposed
4. **Use different keys** for development and production
5. **Don't hardcode keys** in source code

---

## 📚 Quick Reference

| Service | Key Location | Format | Required |
|---------|-------------|--------|----------|
| Groq | console.groq.com/keys | `gsk_...` | ✅ Yes |
| Facebook App ID | developers.facebook.com | Numbers | ✅ Yes |
| Facebook App Secret | developers.facebook.com | String | ✅ Yes |
| HighLevel API | app.gohighlevel.com | Token | ⚠️ Optional |
| Session Secret | Generated | Hex string | ✅ Yes |

---

## ✅ Checklist

Before running the project, ensure:

- [ ] Groq API key obtained and added to `.env`
- [ ] Facebook App created
- [ ] Facebook App ID and Secret added to `.env`
- [ ] Facebook OAuth redirect URI configured
- [ ] Facebook permissions added
- [ ] Session secret generated and added to `.env`
- [ ] HighLevel API key added (optional)
- [ ] `.env` file is in project root
- [ ] Server restarted after adding keys
- [ ] Configuration status shows all services configured

---

**You're all set!** 🎉 Once all keys are configured, your Copilot will work with real APIs instead of mock mode.

---

## 📝 Important Note About HighLevel API Key

**If you can't find the HighLevel API key in your account:**

1. **It's Optional**: The Copilot widget works perfectly without it for all core features
2. **Custom JS is Enough**: You can use the widget via Custom JS (which you already have access to)
3. **Future Enhancement**: The API key is only needed for advanced features like:
   - Automatic user authentication
   - CRM data access
   - Advanced integrations

**For your assignment/demo:**
- ✅ You can use the widget with just Groq and Facebook keys
- ✅ The Custom JS integration (in Company > Custom JS) is sufficient
- ✅ All core features work without HighLevel API key

**To use the widget without HighLevel API key:**
1. Deploy your backend to Vercel
2. Update `highlevel-integration.js` with your Vercel URL
3. Paste the code into **Company > Custom JS** (which you can see in your settings)
4. The widget will work perfectly!

The HighLevel API key is a "nice to have" for future enhancements, not a requirement for the core functionality.

