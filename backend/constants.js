/**
 * Application Constants
 * Centralized constants for error codes, success messages, and URLs
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error Messages
const ERROR_MESSAGES = {
  // Chat errors
  MESSAGE_REQUIRED: 'Message and sessionId are required',
  AI_NOT_CONFIGURED: 'AI service not configured',
  AI_CONFIG_NOTE: 'Please configure GROQ_API_KEY in your environment variables',
  CHAT_FAILED: 'Failed to process chat message',
  STREAM_TIMEOUT: 'Request timeout - the AI response took too long',
  
  // Profile errors
  PROFILE_NOT_FOUND: 'Business profile not found',
  PROFILE_SETUP_REQUIRED: 'Please complete the business profile setup first',
  
  // Facebook errors
  FACEBOOK_NOT_CONNECTED: 'Facebook account not connected',
  FACEBOOK_CONNECT_REQUIRED: 'Please connect your Facebook account first',
  FACEBOOK_TOKEN_MISSING: 'Facebook access token not found',
  FACEBOOK_RECONNECT_REQUIRED: 'Please reconnect your Facebook account',
  FACEBOOK_API_ERROR: 'Failed to connect to Facebook API',
  FACEBOOK_OAUTH_ERROR: 'Facebook OAuth error',
  
  // Calendar errors
  USER_ID_REQUIRED: 'userId is required',
  CALENDAR_GENERATION_FAILED: 'Failed to generate calendar',
  
  // Scheduling errors
  SCHEDULE_REQUIRED_FIELDS: 'userId, date, and caption are required',
  SCHEDULE_FAILED: 'Failed to schedule post',
  BULK_SCHEDULE_FAILED: 'Failed to schedule some posts',
  INVALID_DATE: 'Invalid date format',
  PAST_DATE: 'Cannot schedule posts in the past'
};

// Success Messages
const SUCCESS_MESSAGES = {
  POST_SCHEDULED: 'Post scheduled successfully',
  POSTS_SCHEDULED: 'Posts scheduled successfully',
  FACEBOOK_CONNECTED: 'Facebook account connected successfully',
  CALENDAR_GENERATED: 'Calendar generated successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  HISTORY_CLEARED: 'Conversation history cleared'
};

// API URLs
const API_URLS = {
  FACEBOOK_GRAPH: 'https://graph.facebook.com/v18.0',
  FACEBOOK_OAUTH: 'https://www.facebook.com/v18.0/dialog/oauth',
  FACEBOOK_TOKEN: 'https://graph.facebook.com/v18.0/oauth/access_token'
};

// Facebook Permissions
const FACEBOOK_PERMISSIONS = [
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_show_list'
];

// Action Keywords (for UI triggers)
const ACTION_KEYWORDS = {
  CONNECT_FACEBOOK: ['Connect Facebook', 'Connect to Facebook'],
  SCHEDULE_POSTS: ['Schedule FB Posts', 'Generate Posts', 'Create Calendar'],
  SKIP: ['Skip', 'Maybe Later']
};

// Conversation Flow Constants
const CONVERSATION_FLOW = {
  MIN_QUESTIONS_BEFORE_FACEBOOK: 3,
  MAX_QUESTIONS_BEFORE_FACEBOOK: 4
};

// Quick Reply Limits
const QUICK_REPLY_LIMITS = {
  MIN: 3,
  MAX: 5,
  MAX_TOTAL: 10
};

module.exports = {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  API_URLS,
  FACEBOOK_PERMISSIONS,
  ACTION_KEYWORDS,
  CONVERSATION_FLOW,
  QUICK_REPLY_LIMITS
};

