const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const config = require('../../config/config');
const { getBusinessProfile } = require('../utils/profileStorage');

// Initialize Groq client
const groq = config.ai.groq.apiKey ? new Groq({
  apiKey: config.ai.groq.apiKey
}) : null;

const MOCK_MODE = !config.ai.isConfigured();

/**
 * Generate mock calendar for demo purposes
 */
function generateMockCalendar(profile, startDate) {
  const calendar = [];
  const start = startDate ? new Date(startDate) : new Date();

  const postTypes = ['Educational', 'Promotional', 'Inspirational', 'Behind-the-Scenes', 'User-Generated', 'Tips & Tricks'];
  const industries = {
    'Fitness': {
      themes: ['Workout Tips', 'Nutrition Advice', 'Success Stories', 'Equipment Reviews', 'Motivation Monday'],
      hashtags: ['#fitness', '#workout', '#health', '#motivation', '#gym']
    },
    'Restaurant': {
      themes: ['New Menu Items', 'Chef Specials', 'Customer Reviews', 'Kitchen Behind-the-Scenes', 'Food Photography'],
      hashtags: ['#food', '#restaurant', '#delicious', '#foodie', '#dining']
    },
    'E-commerce': {
      themes: ['Product Launches', 'Customer Testimonials', 'Flash Sales', 'How-to Guides', 'Brand Story'],
      hashtags: ['#shopping', '#deals', '#newarrivals', '#style', '#fashion']
    }
  };

  const industryData = industries[profile?.industry] || {
    themes: ['Business Tips', 'Industry News', 'Customer Spotlight', 'Company Updates', 'Expert Advice'],
    hashtags: ['#business', '#marketing', '#success', '#entrepreneur', '#growth']
  };

  for (let i = 0; i < 30; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    const themeIndex = i % industryData.themes.length;
    const typeIndex = i % postTypes.length;

    calendar.push({
      id: `post-${i + 1}`,
      day: i + 1,
      date: date.toISOString().split('T')[0],
      theme: `${industryData.themes[themeIndex]} - Day ${i + 1}`,
      caption: `Engaging content for ${profile?.industry || 'your business'} on ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}. This post is designed to connect with your ${profile?.audience || 'target audience'} and showcase your ${profile?.tone || 'professional'} brand voice.`,
      type: postTypes[typeIndex],
      hashtags: industryData.hashtags,
      scheduled: false,
      createdAt: new Date().toISOString()
    });
  }

  return calendar;
}

/**
 * POST /api/calendar/generate
 * Generate a 30-day content calendar based on business profile
 */
router.post('/generate', async (req, res) => {
  try {
    const { userId, startDate } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required'
      });
    }

    // Get business profile
    const profile = getBusinessProfile(userId);

    if (!profile) {
      return res.status(404).json({
        error: 'Business profile not found',
        message: 'Please complete the business profile setup first'
      });
    }

    // Calculate start date (default to today)
    const start = startDate ? new Date(startDate) : new Date();
    const calendar = [];
    const posts = [];

    // Mock mode - return mock calendar
    if (MOCK_MODE) {
      const mockCalendar = generateMockCalendar(profile, start);
      return res.json({
        success: true,
        calendar: mockCalendar,
        profile: {
          industry: profile.industry,
          audience: profile.audience,
          tone: profile.tone
        },
        generatedAt: new Date().toISOString(),
        mock: true,
        note: 'Running in mock mode. GROQ_API_KEY not configured.'
      });
    }

    // Generate 30 days of content
    const prompt = `Generate a 30-day social media content calendar for a business with the following profile:

Industry: ${profile.industry || 'General business'}
Target Audience: ${profile.audience || 'General audience'}
Brand Tone: ${profile.tone || 'Professional'}
Content Preferences: ${profile.contentPreferences || 'Mixed content'}

Requirements:
1. Create 30 unique post ideas (one per day)
2. Each post should include:
   - Date (starting from ${start.toLocaleDateString()})
   - Post theme/topic
   - Suggested caption/content (2-3 sentences)
   - Post type (e.g., educational, promotional, inspirational, behind-the-scenes, user-generated)
   - Hashtag suggestions (3-5 relevant hashtags)

3. Vary the content types throughout the month
4. Make content relevant to the business industry and audience
5. Ensure posts are engaging and actionable

Return the response as a JSON object with a "posts" array containing exactly 30 items with this structure:
{
  "posts": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Theme/topic",
      "caption": "Full caption text",
      "type": "Post type",
      "hashtags": ["hashtag1", "hashtag2", "hashtag3"]
    },
    ...
  ]
}

Generate exactly 30 posts, one for each day.`;

    // Call Groq to generate calendar
    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: config.ai.groq.model,
        messages: [
          {
            role: 'system',
            content: 'You are a social media content strategist. Generate detailed, actionable content calendars. Always return a valid JSON object with a "posts" array containing exactly 30 items.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });
    } catch (groqError) {
      console.warn('Groq API error, falling back to mock calendar:', groqError.message);
      // Fallback to mock calendar if Groq fails
      const mockCalendar = generateMockCalendar(profile, start);
      return res.json({
        success: true,
        calendar: mockCalendar,
        profile: {
          industry: profile.industry,
          audience: profile.audience,
          tone: profile.tone
        },
        generatedAt: new Date().toISOString(),
        mock: true,
        note: 'Groq API unavailable, using mock calendar.'
      });
    }

    let generatedContent;
    try {
      // Try to parse as JSON
      const responseText = completion.choices[0].message.content;
      generatedContent = JSON.parse(responseText);

      // Handle case where response might be wrapped in a property
      if (generatedContent.posts || generatedContent.calendar) {
        posts.push(...(generatedContent.posts || generatedContent.calendar));
      } else if (Array.isArray(generatedContent)) {
        posts.push(...generatedContent);
      } else {
        // If it's an object with numeric keys, convert to array
        posts.push(...Object.values(generatedContent));
      }
    } catch (parseError) {
      // Fallback: parse the response manually if JSON parsing fails
      console.warn('Failed to parse JSON response, using fallback parser');
      posts.push(...parseFallbackContent(completion.choices[0].message.content, start));
    }

    // Ensure we have exactly 30 posts
    while (posts.length < 30) {
      const day = posts.length + 1;
      const date = new Date(start);
      date.setDate(date.getDate() + day - 1);

      posts.push({
        day: day,
        date: date.toISOString().split('T')[0],
        theme: `Content Theme ${day}`,
        caption: `Engaging content for day ${day} related to ${profile.industry || 'your business'}.`,
        type: 'Educational',
        hashtags: ['business', 'marketing', 'socialmedia']
      });
    }

    // Truncate to 30 if we have more
    const finalPosts = posts.slice(0, 30);

    // Format calendar response
    finalPosts.forEach((post, index) => {
      const postDate = new Date(start);
      postDate.setDate(postDate.getDate() + index);

      calendar.push({
        id: `post-${index + 1}`,
        day: index + 1,
        date: postDate.toISOString().split('T')[0],
        theme: post.theme || `Theme ${index + 1}`,
        caption: post.caption || post.content || `Post content for day ${index + 1}`,
        type: post.type || 'General',
        hashtags: Array.isArray(post.hashtags) ? post.hashtags : (post.hashtags ? post.hashtags.split(',') : []),
        scheduled: false,
        createdAt: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      calendar: calendar,
      profile: {
        industry: profile.industry,
        audience: profile.audience,
        tone: profile.tone
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Calendar generation error:', error);

    // Try to return mock calendar as fallback
    try {
      const profile = getBusinessProfile(req.body.userId);
      const mockCalendar = generateMockCalendar(profile, req.body.startDate ? new Date(req.body.startDate) : new Date());
      return res.json({
        success: true,
        calendar: mockCalendar,
        profile: profile ? {
          industry: profile.industry,
          audience: profile.audience,
          tone: profile.tone
        } : {},
        generatedAt: new Date().toISOString(),
        mock: true,
        note: 'Error occurred, using mock calendar as fallback.'
      });
    } catch (fallbackError) {
      res.status(500).json({
        error: 'Failed to generate content calendar',
        details: error.message,
        note: 'This might be due to missing GROQ_API_KEY or API limits'
      });
    }
  }
});

/**
 * Fallback parser for non-JSON responses
 */
function parseFallbackContent(content, startDate) {
  const posts = [];
  const lines = content.split('\n');
  let currentPost = null;

  for (let i = 0; i < lines.length && posts.length < 30; i++) {
    const line = lines[i].trim();

    if (line.includes('Day') || line.match(/^\d+\./)) {
      if (currentPost) {
        posts.push(currentPost);
      }
      currentPost = {
        day: posts.length + 1,
        date: new Date(startDate.getTime() + posts.length * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        theme: '',
        caption: '',
        type: 'General',
        hashtags: []
      };
    } else if (currentPost) {
      if (line.toLowerCase().includes('theme') || line.toLowerCase().includes('topic')) {
        currentPost.theme = line.replace(/theme|topic:/gi, '').trim();
      } else if (line.toLowerCase().includes('caption') || line.toLowerCase().includes('content')) {
        currentPost.caption = line.replace(/caption|content:/gi, '').trim();
      } else if (line.length > 20 && !currentPost.caption) {
        currentPost.caption = line;
      }
    }
  }

  if (currentPost && posts.length < 30) {
    posts.push(currentPost);
  }

  return posts;
}

/**
 * PATCH /api/calendar/post/:postId
 * Update/edit a calendar post
 */
router.patch('/post/:postId', (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, updates } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // In production, update in database
    // For now, return success (frontend will handle local updates)
    res.json({
      success: true,
      message: 'Post updated successfully',
      postId: postId,
      updates: updates
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      error: 'Failed to update post',
      details: error.message
    });
  }
});

/**
 * GET /api/calendar/:userId
 * Get saved calendar for a user
 */
router.get('/:userId', (req, res) => {
  // In production, store calendars in database
  // For now, return a message that calendar needs to be generated
  res.json({
    message: 'Calendar not found. Please generate a new calendar.',
    endpoint: 'POST /api/calendar/generate'
  });
});

module.exports = router;
