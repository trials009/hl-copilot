# HighLevel Copilot - AI Assistant for Content Management

A conversational AI Copilot widget for HighLevel that helps businesses create and schedule social media content. The Copilot learns about your business, connects to Facebook, generates a 30-day content calendar, and schedules posts automatically.

## 🎯 Features

- **Conversational Interface**: Natural chat-based interaction with character-by-character streaming responses (ChatGPT-like)
- **Business Profile Learning**: Captures industry, target audience, brand tone, and content preferences
- **Facebook Integration**: OAuth flow to connect Facebook pages with mock mode for demos
- **Content Calendar Generation**: AI-powered 30-day content calendar tailored to your business
- **Post Scheduling**: Automatically schedule posts to Facebook via Graph API
- **Professional UI**: HighLevel design system matching, smooth animations, typing indicators, quick replies
- **Loading States**: Skeleton loaders, progress bars, and smooth transitions

## 🏗️ Architecture

### Components

1. **Backend API** (Node.js/Express)
   - RESTful API endpoints for chat, profile management, Facebook OAuth, calendar generation, and scheduling
   - Uses Groq API (Llama models) for conversational AI and content generation with streaming
   - Centralized configuration in `config/config.js`
   - In-memory storage (can be upgraded to database)
   - Mock mode for demos when credentials are missing

2. **Frontend Widget** (Custom JS)
   - Standalone HTML/CSS/JS widget
   - Embedded in HighLevel via Custom JS
   - Responsive chat interface with calendar grid/list views
   - Character-by-character streaming responses
   - Quick reply buttons for common actions

3. **Integrations**
   - HighLevel API (for future enhancements)
   - Facebook Graph API (OAuth + post scheduling)
   - Groq API (Llama models for fast streaming responses)

### Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **AI**: Groq API with Llama 3.1 70B (streaming support)
- **APIs**: Facebook Graph API, HighLevel API
- **Deployment**: Vercel (serverless)

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- HighLevel sandbox account
- Groq API key (recommended) or OpenAI API key
- Facebook App credentials (App ID & App Secret) - optional for demo mode

### Quick Start (5 minutes)

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env` file in the project root:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   BACKEND_URL=http://localhost:3000

   # AI/LLM Configuration - Groq (Recommended)
   GROQ_API_KEY=gsk_your_groq_api_key_here
   GROQ_MODEL=llama-3.3-70b-versatile

   # Alternative: OpenAI
   # OPENAI_API_KEY=sk-your_openai_api_key_here
   # OPENAI_MODEL=gpt-4

   # Facebook App Configuration (Optional - mock mode available)
   FACEBOOK_APP_ID=your_facebook_app_id_here
   FACEBOOK_APP_SECRET=your_facebook_app_secret_here
   FACEBOOK_REDIRECT_URI=http://localhost:3000/api/facebook/callback

   # Session Security
   SESSION_SECRET=your_random_session_secret_here

   # HighLevel API (Optional)
   HIGHLVL_API_KEY=your_highlevel_api_key_here
   HIGHLVL_ACCOUNT_ID=your_highlevel_account_id_here
   ```

3. **Start the backend server**
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

## 🔑 Required API Keys

📖 **For detailed step-by-step instructions, see [API_KEYS_SETUP.md](./API_KEYS_SETUP.md)**

### 1. Groq API Key ⚠️ REQUIRED (Recommended)

**Purpose**: 
- Conversational AI interactions with streaming (character-by-character)
- Content calendar generation (30-day calendar)
- Fast Llama model responses

**How to get:**
1. Visit https://console.groq.com/
2. Sign up or log in (free account available)
3. Go to **API Keys** section
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)

**Add to `.env` as:**
```env
GROQ_API_KEY=gsk-your-key-here
GROQ_MODEL=llama-3.3-70b-versatile
```

**Note**: If the model doesn't work, check available models at https://console.groq.com/docs/models or try `llama-3.1-8b-instant`

**Cost**: Free tier available, very affordable pricing

**Benefits**:
- ✅ Fast streaming responses
- ✅ Character-by-character display (like ChatGPT)
- ✅ Low latency
- ✅ Free tier available

**Alternative: OpenAI API Key**

If you prefer OpenAI:
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Add to `.env` as `OPENAI_API_KEY=sk-your-key-here`

### 2. Facebook App Credentials (Optional - Mock Mode Available)

**Purpose**: 
- Facebook OAuth authentication
- Connecting user's Facebook page
- Scheduling posts to Facebook

**How to get:**
1. Visit https://developers.facebook.com/
2. Click "My Apps" > "Create App"
3. Select "Business" as app type
4. Add "Facebook Login" product
5. Go to Settings > Basic
   - Copy App ID → `FACEBOOK_APP_ID`
   - Copy App Secret → `FACEBOOK_APP_SECRET`
6. Go to Facebook Login > Settings
   - Add Valid OAuth Redirect URI: `http://localhost:3000/api/facebook/callback`
   - (For production, use your deployed backend URL)

**Required Permissions**:
- `pages_manage_posts` - To create and schedule posts
- `pages_read_engagement` - To read page data
- `business_management` - To manage business pages

**Note**: If Facebook credentials are not configured, the system automatically runs in mock mode for demos.

### 3. Session Secret ⚠️ REQUIRED

**Purpose**: 
- Encrypting session data
- Security for OAuth flow

**How to generate:**
```bash
# Option 1: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Using OpenSSL
openssl rand -hex 32
```

**Add to `.env` as:**
```env
SESSION_SECRET=your-random-secret-string-here
```

## 🚀 Deployment to Vercel

### Quick Deploy via CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   cd /Users/kaustubhkabra/Documents/handsOnAI
   vercel
   ```

4. **Follow the prompts**:
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No**
   - Project name? (e.g., `highlevel-copilot`)
   - Directory? (Press Enter for current directory)
   - Override settings? **No**

5. **Add environment variables**:
   ```bash
   vercel env add GROQ_API_KEY
   vercel env add FACEBOOK_APP_ID
   vercel env add FACEBOOK_APP_SECRET
   vercel env add FACEBOOK_REDIRECT_URI
   vercel env add SESSION_SECRET
   ```

   When prompted, enter the values:
   - `GROQ_API_KEY`: Your Groq API key (starts with `gsk_`)
   - `FACEBOOK_APP_ID`: Your Facebook App ID
   - `FACEBOOK_APP_SECRET`: Your Facebook App Secret
   - `FACEBOOK_REDIRECT_URI`: `https://your-app.vercel.app/api/facebook/callback`
   - `SESSION_SECRET`: Generate a random string (32+ chars)

6. **Deploy to production**:
   ```bash
   vercel --prod
   ```

7. **Copy your deployment URL** (e.g., `https://your-app.vercel.app`)

### Deploy via Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your Git repository or upload your project folder
4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `.` (current directory)
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
5. Add Environment Variables in dashboard
6. Click "Deploy"

### Update Facebook Redirect URI

After deploying, update your Facebook App settings:

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app
3. Go to **Facebook Login > Settings**
4. Add to **Valid OAuth Redirect URIs**:
   ```
   https://your-app.vercel.app/api/facebook/callback
   ```
5. Save changes

## 🔌 HighLevel Integration

### File Location

The integration file is located in the **project root**:
```
handsOnAI/
└── highlevel-integration.js  ← This file
```

**Note**: This file is **not served by the backend**. It's a standalone script that you copy and paste into HighLevel's Custom JS section.

### Step-by-Step Integration

1. **Deploy backend to Vercel** (see Deployment section above)
   - Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

2. **Update HighLevel Integration Code**
   - Open `highlevel-integration.js` from the project root
   - Update the API URL (line ~25):
     ```javascript
     const COPILOT_API_URL = 'https://your-app.vercel.app';
     ```
   - For local development:
     ```javascript
     const COPILOT_API_URL = 'http://localhost:3000';
     ```

3. **Add to HighLevel Custom JS**
   - Log into HighLevel sandbox account
   - Navigate to **Settings > Custom JS** (or **Integrations > Custom JS**)
   - Open `highlevel-integration.js` from your project root
   - Copy the **entire contents** of the file
   - Paste into HighLevel's Custom JS editor
   - **IMPORTANT**: Make sure you've updated `COPILOT_API_URL` with your Vercel URL before pasting
   - Click **Save**

4. **Reload HighLevel**
   - Refresh the page (F5 or Cmd+R)
   - Wait a few seconds for the code to load
   - Look for the Copilot button in the bottom-right corner (🤖 icon)

5. **Test the Integration**
   - Click the Copilot button (🤖)
   - Widget should slide in smoothly
   - Start a conversation
   - Test Facebook connection
   - Generate calendar

### What You'll See

- **Floating Button**: Purple gradient button (🤖) in bottom-right
  - Hover: Button scales up
  - Active: Button turns red (✕) when widget is open

- **Widget**: Slides in from bottom-right
  - Smooth animation
  - Professional styling
  - Matches HighLevel's design aesthetic

### Troubleshooting

**Widget not appearing?**
- Check browser console (F12) for errors
- Verify code is saved in HighLevel Custom JS
- Check `COPILOT_API_URL` points to your Vercel deployment
- Test URL in browser: `https://your-app.vercel.app/health`

**API errors?**
- Check Vercel deployment logs
- Verify all environment variables are set in Vercel
- Test endpoints directly

**OAuth not working?**
- Verify redirect URI matches exactly (including http vs https)
- Check app is not in restricted mode
- Ensure HTTPS (required for OAuth)

## 🎬 Usage

### Starting the Application

1. **Backend**: `npm start` (runs on port 3000)
2. **Access widget**: 
   - If embedded in HighLevel: Click the floating button
   - Standalone: Open `http://localhost:3000/frontend/widget.html`

### User Flow

1. **Welcome Screen**: User clicks "Start Conversation"
2. **Chat**: Copilot asks about business (industry, audience, tone, content preferences)
   - Quick reply buttons appear for common actions
   - Character-by-character streaming responses
   - Typing indicators during AI generation
3. **Facebook Connection**: User connects Facebook page (optional, mock mode available)
4. **Calendar Generation**: Copilot generates 30-day content calendar
   - Loading skeletons during generation
   - Progress bar showing completion
5. **Scheduling**: User reviews, edits, and schedules posts to Facebook
   - Grid/list view toggle
   - Edit and preview modals
   - Toast notifications for actions

### API Endpoints

- `POST /api/chat/stream` - Send chat message (streaming SSE)
- `POST /api/chat` - Send chat message (non-streaming)
- `GET /api/profile/:userId` - Get business profile
- `POST /api/profile/:userId` - Save business profile
- `GET /api/facebook/auth-url` - Get Facebook OAuth URL
- `GET /api/facebook/callback` - Facebook OAuth callback
- `GET /api/facebook/status/:userId` - Check Facebook connection
- `POST /api/calendar/generate` - Generate content calendar
- `PATCH /api/calendar/post/:postId` - Update calendar post
- `POST /api/scheduling/schedule` - Schedule a post
- `POST /api/scheduling/schedule-batch` - Schedule multiple posts

## ⚙️ Configuration

All configuration is centralized in `config/config.js`. This file automatically reads from environment variables for both local development and Vercel deployment.

### How It Works

1. **Local Development**: Reads from `.env` file
2. **Vercel Deployment**: Reads from Vercel environment variables
3. **Validation**: Checks configuration on startup
4. **Mock Mode**: Automatically enables when credentials are missing

### Usage in Code

Instead of using `process.env` directly, import the config:

```javascript
const config = require('../config/config');

// Access configuration
const apiKey = config.ai.groq.apiKey;
const isConfigured = config.facebook.isConfigured();
const redirectUri = config.facebook.getRedirectUri();
```

### Configuration Status

The server logs configuration status on startup:

```
📋 Configuration Status:
   ✅ AI: Configured
   ⚠️  Facebook: Not configured (Mock mode)
```

## 📝 What's Real vs Mocked

### ✅ Real Implementation

- **Groq API Integration**: Full integration with Llama models for conversations and content generation
- **Streaming Responses**: Character-by-character display via Server-Sent Events (SSE)
- **Facebook OAuth Flow**: Complete OAuth 2.0 implementation
- **Facebook Graph API**: Real API calls for page access and post scheduling
- **Backend API**: All endpoints are functional
- **Frontend Widget**: Fully interactive UI with animations

### ⚠️ Mocked/Demo Components

- **Facebook Post Scheduling**: In mock mode, if Facebook API is not fully configured, returns mock responses
- **Data Persistence**: Currently uses in-memory storage (should use database in production)
- **Session Management**: Basic session handling (should use Redis in production)
- **HighLevel User ID**: Uses generated session ID if HighLevel user ID not available

## 🐛 Troubleshooting

### Backend won't start

- Check if port 3000 is available
- Verify `.env` file exists and has correct values
- Check Node.js version (v16+)
- Review server logs for configuration errors

### Groq API errors

- Verify `GROQ_API_KEY` is correct (starts with `gsk_`)
- Check API quota/credits
- Ensure model name is correct (default: `llama-3.3-70b-versatile`)

### Facebook OAuth not working

- Verify `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`
- Check redirect URI matches exactly in Facebook App settings
- Ensure app is in "Development" mode or has proper permissions
- For production, ensure HTTPS is used

### Widget not loading in HighLevel

- Check backend URL is accessible
- Verify CORS settings allow HighLevel domain
- Check browser console for errors
- Ensure widget files are being served correctly
- Verify `COPILOT_API_URL` in `highlevel-integration.js` is correct

### Streaming not working

- Check browser console for errors
- Verify `GROQ_API_KEY` is set in environment
- Test endpoint: `POST /api/chat/stream`
- Ensure browser supports Server-Sent Events

## 📚 Project Structure

```
handsOnAI/
├── backend/
│   ├── routes/
│   │   ├── chat.js           # Chat/conversation endpoints
│   │   ├── profile.js        # Business profile endpoints
│   │   ├── facebook.js       # Facebook OAuth & connection
│   │   ├── calendar.js       # Content calendar generation
│   │   └── scheduling.js     # Post scheduling endpoints
│   ├── utils/
│   │   └── profileStorage.js # Profile storage utilities
│   ├── server.js             # Express server
│   └── vercel-entry.js       # Vercel serverless entry point
├── frontend/
│   ├── widget.html          # Widget HTML
│   ├── widget.css           # Widget styles (HighLevel design system)
│   └── widget.js            # Widget JavaScript
├── config/
│   └── config.js            # Centralized configuration
├── highlevel-integration.js # HighLevel Custom JS code
├── package.json             # Dependencies
├── vercel.json              # Vercel configuration
└── README.md                # This file
```

## 🔒 Security Notes

⚠️ **IMPORTANT**: This is a prototype implementation. **DO NOT deploy to production without addressing security and scalability issues.**

See **[SECURITY_SCALABILITY_REVIEW.md](./SECURITY_SCALABILITY_REVIEW.md)** for comprehensive security review and required fixes.

**Critical Issues to Address:**
- No authentication/authorization (P0)
- CORS allows all origins (P0)
- No input validation/sanitization (P0)
- Sensitive data stored in plaintext (P0)
- No rate limiting (P0)
- In-memory storage (no persistence) (P0)

**Basic Security:**
- **Never commit `.env` file** to version control
- **Encrypt Facebook access tokens** in production
- **Use HTTPS** in production
- **Implement rate limiting** to prevent abuse
- **Validate all user inputs**
- **Use environment-specific secrets**

## 🎯 Demo Requirements

### Video Demo (2-5 minutes)

Should include:
1. **Widget in HighLevel**: Show the widget embedded in HighLevel interface
2. **Conversation**: Demonstrate natural conversation with streaming responses
3. **Business Learning**: Show Copilot asking about business and saving profile
4. **Facebook Connection**: Show OAuth flow and successful connection
5. **Content Calendar**: Show generated 30-day calendar with grid/list views
6. **Post Scheduling**: Show scheduling posts to Facebook

### Screenshots

- Welcome screen
- Chat interface with streaming
- Quick reply buttons
- Facebook connection
- Content calendar view (grid/list)
- Scheduled posts confirmation

## 📄 License

ISC

## 👤 Author

HighLevel Copilot Assignment

## 🧪 Testing

### Running Tests

The project includes comprehensive test suites for both UI and API:

1. **Install Playwright browsers** (first time only):
   ```bash
   npx playwright install
   ```

2. **Run all tests**:
   ```bash
   npm test
   ```

3. **Run UI tests only**:
   ```bash
   npm run test:ui
   ```

4. **Run API tests only**:
   ```bash
   npm run test:api
   ```

### Test Files

- **`tests/ui-flow.spec.js`** - Playwright tests for UI interactions and user flows
- **`tests/api-flow.spec.js`** - API endpoint tests

### Test Coverage

**UI Tests:**
- Welcome screen and navigation
- Chat interface and messaging
- Quick reply buttons
- Calendar view (grid/list toggle)
- Loading states and animations
- Toast notifications
- Responsive design

**API Tests:**
- Health check endpoint
- Chat API (streaming and non-streaming)
- Profile API (get/save)
- Facebook API (auth, status, pages)
- Calendar API (generate, update)
- Scheduling API (single and batch)
- Error handling

### Test Configuration

Tests work with or without API keys:
- **With API keys**: Full functionality tests
- **Without API keys**: Tests verify graceful degradation and mock mode

See `tests/README.md` for detailed testing documentation.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check browser/server console logs
4. Verify configuration status on server startup
5. Run tests to verify functionality

---

**Note**: This is a demo/prototype implementation. For production use, additional security, scalability, and reliability measures should be implemented. See `SECURITY_SCALABILITY_REVIEW.md` for details.
