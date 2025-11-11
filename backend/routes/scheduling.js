const express = require('express');
const router = express.Router();
const axios = require('axios');
const config = require('../../config/config');
const { getBusinessProfile } = require('../utils/profileStorage');

const FACEBOOK_GRAPH_API = config.facebook.graphApiUrl;

/**
 * POST /api/scheduling/schedule
 * Schedule a post to Facebook
 */
router.post('/schedule', async (req, res) => {
  try {
    const { userId, postId, date, caption, hashtags } = req.body;

    if (!userId || !date || !caption) {
      return res.status(400).json({
        error: 'userId, date, and caption are required'
      });
    }

    // Get business profile and Facebook connection
    const profile = getBusinessProfile(userId);

    if (!profile) {
      return res.status(404).json({
        error: 'Business profile not found'
      });
    }

    if (!profile.facebookConnected || !profile.facebookPageId) {
      return res.status(400).json({
        error: 'Facebook account not connected',
        message: 'Please connect your Facebook account first'
      });
    }

    const accessToken = profile.facebookAccessToken;

    if (!accessToken) {
      return res.status(400).json({
        error: 'Facebook access token not found',
        message: 'Please reconnect your Facebook account'
      });
    }

    // Format caption with hashtags
    let fullCaption = caption;
    if (hashtags && Array.isArray(hashtags) && hashtags.length > 0) {
      const hashtagString = hashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
      fullCaption = `${caption}\n\n${hashtagString}`;
    }

    // Parse scheduled date
    // Handle both date strings (YYYY-MM-DD) and full datetime strings
    let scheduledTime;
    const now = new Date();

    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Date-only format (YYYY-MM-DD) - set to 9 AM local time on that date
      const dateParts = date.split('-');
      const year = parseInt(dateParts[0]);
      const month = parseInt(dateParts[1]) - 1; // 0-indexed
      const day = parseInt(dateParts[2]);

      scheduledTime = new Date(year, month, day, 9, 0, 0); // 9 AM local time

      // If the date is in the past, assume they mean next year (or adjust to future)
      if (scheduledTime < now) {
        // Check if it's just the time that's past (same day) or the whole date
        const scheduledDateOnly = new Date(year, month, day);
        const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (scheduledDateOnly < todayDateOnly) {
          // The date itself is in the past - assume next occurrence of that date
          // If it's November 15 and we're past it this year, schedule for next year
          const nextYear = new Date(now.getFullYear() + 1, month, day, 9, 0, 0);
          // But if we're still in the same year and the date hasn't passed yet this year, use this year
          if (month > now.getMonth() || (month === now.getMonth() && day >= now.getDate())) {
            scheduledTime = new Date(now.getFullYear(), month, day, 9, 0, 0);
          } else {
            scheduledTime = nextYear;
          }
          console.log(`Date ${date} was in the past, adjusted to: ${scheduledTime.toISOString()}`);
        } else {
          // Same day but time has passed - set to 10 minutes from now (or tomorrow 9 AM if too late)
          const minTime = new Date(now.getTime() + 10 * 60 * 1000);
          if (minTime.getDate() === now.getDate()) {
            scheduledTime = minTime;
          } else {
            // Too late today, schedule for tomorrow 9 AM
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            scheduledTime = tomorrow;
          }
        }
      }
    } else {
      // Full datetime string
      scheduledTime = new Date(date);

      // If in the past, adjust
      if (scheduledTime < now) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        scheduledTime = tomorrow;
        console.log(`Scheduled time was in the past, adjusted to tomorrow at 9 AM: ${scheduledTime.toISOString()}`);
      }
    }

    // Facebook requires scheduled posts to be at least 10 minutes in the future
    const minScheduledTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    let finalScheduledTime = scheduledTime;

    if (scheduledTime < minScheduledTime) {
      // If less than 10 minutes away, but it's a future date, keep the date and just ensure minimum time
      const scheduledDateOnly = new Date(scheduledTime.getFullYear(), scheduledTime.getMonth(), scheduledTime.getDate());
      const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (scheduledDateOnly > todayDateOnly) {
        // It's a future date - keep the date, but ensure time is at least 10 minutes from now
        // If the scheduled time on that future date is still too close, use minimum time
        finalScheduledTime = scheduledTime < minScheduledTime ? minScheduledTime : scheduledTime;
      } else {
        // Same day - use minimum time (10 minutes from now)
        finalScheduledTime = minScheduledTime;
      }
      console.log(`Scheduled time adjusted to meet Facebook minimum: ${finalScheduledTime.toISOString()}`);
    }

    // Calculate Unix timestamp (seconds since epoch)
    const unixTimestamp = Math.floor(finalScheduledTime.getTime() / 1000);

    // Schedule post to Facebook
    // For scheduled posts, we MUST set published=false and provide scheduled_publish_time
    // According to Facebook API docs: published must be false when scheduling
    const postData = {
      message: fullCaption,
      published: false, // REQUIRED: Must be false for scheduled posts
      scheduled_publish_time: unixTimestamp,
      access_token: accessToken
    };

    console.log('Scheduling post to Facebook:', {
      pageId: profile.facebookPageId,
      scheduledTime: finalScheduledTime.toISOString(),
      unixTimestamp: unixTimestamp,
      messageLength: fullCaption.length
    });

    try {
      const response = await axios.post(
        `${FACEBOOK_GRAPH_API}/${profile.facebookPageId}/feed`,
        postData
      );

      res.json({
        success: true,
        message: 'Post scheduled successfully',
        postId: response.data.id,
        scheduledTime: finalScheduledTime.toISOString(),
        facebookPostId: response.data.id,
        note: 'Post will be published on Facebook at the scheduled time',
        adjusted: finalScheduledTime.getTime() !== scheduledTime.getTime() ? 'Time adjusted to meet Facebook minimum (10 minutes)' : null
      });

    } catch (facebookError) {
      console.error('Facebook API error:', facebookError.response?.data || facebookError.message);

      // Handle specific Facebook API errors
      const errorData = facebookError.response?.data?.error;
      if (errorData) {
        // Error 100: Cannot schedule published post or invalid scheduled time
        if (errorData.code === 100) {
          return res.status(400).json({
            error: 'Facebook scheduling error',
            message: errorData.message || 'Cannot schedule this post. Ensure the scheduled time is at least 10 minutes in the future.',
            code: errorData.code,
            suggestion: 'Try scheduling for a time at least 10 minutes from now',
            fbtrace_id: errorData.fbtrace_id
          });
        }
      }

      // If real API fails, return mock response for demo (only in development)
      if (config.server.env === 'development' && !config.facebook.isConfigured()) {
        return res.json({
          success: true,
          message: 'Post scheduled successfully (MOCKED - Facebook API not fully configured)',
          postId: postId || `mock-${Date.now()}`,
          scheduledTime: finalScheduledTime.toISOString(),
          facebookPostId: `mock-fb-${Date.now()}`,
          note: 'This is a mocked response. Configure Facebook credentials for real scheduling.',
          mock: true
        });
      }

      // Re-throw the error for proper error handling
      throw facebookError;
    }

  } catch (error) {
    console.error('Scheduling error:', error);
    res.status(500).json({
      error: 'Failed to schedule post',
      details: error.response?.data || error.message,
      note: 'If Facebook API is not configured, this will return a mock response in development mode'
    });
  }
});

/**
 * POST /api/scheduling/schedule-batch
 * Schedule multiple posts at once
 */
router.post('/schedule-batch', async (req, res) => {
  try {
    const { userId, posts } = req.body;

    if (!userId || !posts || !Array.isArray(posts)) {
      return res.status(400).json({
        error: 'userId and posts array are required'
      });
    }

    // Get business profile
    const profile = getBusinessProfile(userId);

    if (!profile || !profile.facebookConnected) {
      return res.status(400).json({
        error: 'Facebook account not connected'
      });
    }

    const results = [];
    const errors = [];

    // Schedule each post
    for (const post of posts) {
      try {
        const scheduleResult = await axios.post(
          `${req.protocol}://${req.get('host')}/api/scheduling/schedule`,
          {
            userId,
            postId: post.id,
            date: post.date,
            caption: post.caption,
            hashtags: post.hashtags
          }
        );

        results.push({
          postId: post.id,
          success: true,
          ...scheduleResult.data
        });
      } catch (error) {
        errors.push({
          postId: post.id,
          success: false,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      total: posts.length,
      succeeded: results.length,
      failed: errors.length,
      results: results,
      errors: errors
    });

  } catch (error) {
    console.error('Batch scheduling error:', error);
    res.status(500).json({
      error: 'Failed to schedule posts',
      details: error.message
    });
  }
});

/**
 * GET /api/scheduling/posts/:userId
 * Get scheduled posts for a user
 */
router.get('/posts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = getBusinessProfile(userId);

    if (!profile || !profile.facebookConnected) {
      return res.json({
        posts: [],
        message: 'No Facebook connection found'
      });
    }

    // In production, fetch from Facebook API or database
    // For now, return empty array
    res.json({
      posts: [],
      message: 'Scheduled posts will be stored in database in production'
    });

  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      error: 'Failed to fetch scheduled posts',
      details: error.message
    });
  }
});

module.exports = router;

