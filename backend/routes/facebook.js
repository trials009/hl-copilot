const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../../config/config');
const { updateBusinessProfile, getBusinessProfile } = require('../utils/profileStorage');

const FACEBOOK_APP_ID = config.facebook.appId;
const FACEBOOK_APP_SECRET = config.facebook.appSecret;
const FACEBOOK_REDIRECT_URI = config.facebook.getRedirectUri();
const FACEBOOK_GRAPH_API = config.facebook.graphApiUrl;
const MOCK_MODE = !config.facebook.isConfigured();

// Store temporary OAuth state (in production, use Redis or database)
const oauthStates = new Map();

/**
 * Mock Facebook connection for demo purposes
 */
function mockFacebookConnection(userId) {
  return {
    facebookConnected: true,
    facebookPageId: 'mock_page_123456',
    facebookPageName: 'Demo Business Page',
    facebookAccessToken: 'mock_token_' + Date.now(),
    facebookConnectedAt: new Date().toISOString()
  };
}

/**
 * GET /api/facebook/auth-url
 * Get Facebook OAuth authorization URL (or mock URL)
 */
router.get('/auth-url', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'userId is required' 
      });
    }

    // Mock mode - return mock auth URL
    if (MOCK_MODE) {
      const state = `mock_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      oauthStates.set(state, { userId, timestamp: Date.now(), mock: true });
      
      return res.json({ 
        authUrl: `${req.protocol}://${req.get('host')}/api/facebook/mock-callback?state=${state}`,
        state,
        mock: true,
        note: 'Running in mock mode. Facebook credentials not configured.'
      });
    }

    // Real OAuth flow
    const state = `${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    oauthStates.set(state, { userId, timestamp: Date.now() });

    const authUrl = `${FACEBOOK_GRAPH_API}/oauth/authorize?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}` +
      `&state=${state}` +
      `&scope=pages_manage_posts,pages_read_engagement,business_management`;

    res.json({ 
      authUrl,
      state,
      mock: false
    });
  } catch (error) {
    console.error('Facebook auth URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate auth URL',
      details: error.message 
    });
  }
});

/**
 * GET /api/facebook/mock-callback
 * Mock Facebook OAuth callback for demo
 */
router.get('/mock-callback', (req, res) => {
  try {
    const { state } = req.query;
    
    if (!state) {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    const stateData = oauthStates.get(state);
    if (!stateData || !stateData.mock) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const { userId } = stateData;
    oauthStates.delete(state);

    // Mock connection
    const mockData = mockFacebookConnection(userId);
    updateBusinessProfile(userId, mockData);

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facebook Connected (Demo Mode)</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
          }
          .success {
            color: #4CAF50;
            font-size: 64px;
            margin-bottom: 20px;
          }
          .badge {
            display: inline-block;
            background: #ff9800;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            margin-bottom: 16px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 24px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="badge">DEMO MODE</div>
          <div class="success">✓</div>
          <h1>Facebook Connected!</h1>
          <p><strong>Demo Business Page</strong> has been connected.</p>
          <p style="font-size: 14px; color: #999;">This is a mock connection for demonstration purposes.</p>
          <p>You can now close this window and return to the Copilot.</p>
        </div>
        <script>
          // Immediately notify the opener window
          if (window.opener) {
            window.opener.postMessage({ type: 'facebook-connected', mock: true }, '*');
            console.log('Sent facebook-connected message to opener');
          }
          // Close window after a short delay (500ms to ensure message is received)
          setTimeout(() => {
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Mock callback error:', error);
    res.status(500).send('Connection failed');
  }
});

/**
 * GET /api/facebook/callback
 * Handle Facebook OAuth callback (real mode)
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({ 
        error: 'Facebook OAuth error',
        details: error 
      });
    }

    if (!code || !state) {
      return res.status(400).json({ 
        error: 'Missing code or state parameter' 
      });
    }

    // Verify state
    const stateData = oauthStates.get(state);
    if (!stateData) {
      return res.status(400).json({ 
        error: 'Invalid state parameter' 
      });
    }

    const { userId } = stateData;
    oauthStates.delete(state);

    // Exchange code for access token
    const tokenUrl = `${FACEBOOK_GRAPH_API}/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}` +
      `&client_secret=${FACEBOOK_APP_SECRET}` +
      `&redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}` +
      `&code=${code}`;

    const tokenResponse = await axios.get(tokenUrl);
    const accessToken = tokenResponse.data.access_token;

    if (!accessToken) {
      return res.status(500).json({ 
        error: 'Failed to obtain access token' 
      });
    }

    // Get user's pages
    const pagesResponse = await axios.get(
      `${FACEBOOK_GRAPH_API}/me/accounts?access_token=${accessToken}`
    );

    const pages = pagesResponse.data.data || [];
    
    if (pages.length === 0) {
      return res.status(400).json({ 
        error: 'No Facebook pages found. Please create a page first.' 
      });
    }

    // Use the first page (in production, let user choose)
    const page = pages[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;

    // Store Facebook connection in profile
    updateBusinessProfile(userId, {
      facebookConnected: true,
      facebookPageId: pageId,
      facebookPageName: page.name,
      facebookAccessToken: pageAccessToken,
      facebookConnectedAt: new Date().toISOString()
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Facebook Connected</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .success {
            color: #4CAF50;
            font-size: 48px;
            margin-bottom: 20px;
          }
          h1 {
            color: #333;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✓</div>
          <h1>Facebook Connected Successfully!</h1>
          <p>Your Facebook page "${page.name}" has been connected.</p>
          <p>You can now close this window and return to the Copilot.</p>
        </div>
        <script>
          // Immediately notify the opener window
          if (window.opener) {
            window.opener.postMessage({ type: 'facebook-connected' }, '*');
            console.log('Sent facebook-connected message to opener');
          }
          // Close window after a short delay (500ms to ensure message is received)
          setTimeout(() => {
            window.close();
          }, 500);
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Facebook callback error:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connection Error</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
          }
          .error {
            color: #f44336;
            font-size: 48px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">✗</div>
          <h1>Connection Failed</h1>
          <p>${error.message}</p>
          <p>Please try again.</p>
        </div>
      </body>
      </html>
    `);
  }
});

/**
 * GET /api/facebook/status/:userId
 * Check Facebook connection status
 */
router.get('/status/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const profile = getBusinessProfile(userId);
    
    if (!profile) {
      return res.json({ 
        connected: false,
        message: 'No profile found',
        mock: MOCK_MODE
      });
    }

    res.json({
      connected: profile.facebookConnected || false,
      pageId: profile.facebookPageId || null,
      pageName: profile.facebookPageName || null,
      connectedAt: profile.facebookConnectedAt || null,
      mock: MOCK_MODE && profile.facebookPageId?.startsWith('mock_')
    });
  } catch (error) {
    console.error('Facebook status error:', error);
    res.status(500).json({ 
      error: 'Failed to check Facebook status',
      details: error.message 
    });
  }
});

/**
 * POST /api/facebook/disconnect/:userId
 * Disconnect Facebook account
 */
router.post('/disconnect/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    updateBusinessProfile(userId, {
      facebookConnected: false,
      facebookPageId: null,
      facebookPageName: null,
      facebookAccessToken: null,
      facebookConnectedAt: null
    });

    res.json({ 
      message: 'Facebook account disconnected successfully' 
    });
  } catch (error) {
    console.error('Facebook disconnect error:', error);
    res.status(500).json({ 
      error: 'Failed to disconnect Facebook',
      details: error.message 
    });
  }
});

module.exports = router;
