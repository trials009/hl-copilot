const config = require('../config/config');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');

const chatRoutes = require('./routes/chat');
const profileRoutes = require('./routes/profile');
const facebookRoutes = require('./routes/facebook');
const calendarRoutes = require('./routes/calendar');
const schedulingRoutes = require('./routes/scheduling');

const app = express();
const PORT = config.server.port;

// Middleware
app.use(cors({
  origin: '*', // In production, restrict to HighLevel domain
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: config.server.env === 'production' }
}));

// Allow iframe embedding for widget (must be before static files)
app.use('/widget', (req, res, next) => {
  // Remove any default X-Frame-Options that might block iframe
  res.removeHeader('X-Frame-Options');
  // Allow iframe embedding from any origin (for HighLevel integration)
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");
  // Ensure no authentication is required for static widget files
  next();
});

// Serve static files from frontend (no authentication required)
app.use('/widget', express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    // Ensure widget files are publicly accessible
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *;");
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// API Routes
app.use('/api/chat', chatRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/scheduling', schedulingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'HighLevel Copilot API is running' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'HighLevel Copilot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      chat: '/api/chat',
      profile: '/api/profile',
      facebook: '/api/facebook',
      calendar: '/api/calendar',
      scheduling: '/api/scheduling'
    }
  });
});

// Only start server if not in Vercel environment
if (!config.server.isVercel) {
  app.listen(PORT, () => {
    console.log(`HighLevel Copilot API server running on port ${PORT}`);
    console.log(`Environment: ${config.server.env}`);
    console.log(`Backend URL: ${config.server.backendUrl}`);

    // Show configuration summary
    const summary = config.getSummary();
    if (summary.validation.warnings.length > 0 || summary.validation.errors.length > 0) {
      console.log('\n📋 Configuration Status:');
      if (summary.ai.configured) {
        console.log('   ✅ AI: Configured');
      } else {
        console.log('   ⚠️  AI: Not configured (Mock mode)');
      }
      if (summary.facebook.configured) {
        console.log('   ✅ Facebook: Configured');
      } else {
        console.log('   ⚠️  Facebook: Not configured (Mock mode)');
      }
    }
  });
}

// Export for Vercel
module.exports = app;

