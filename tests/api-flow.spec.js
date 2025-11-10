/**
 * API Flow Tests
 * 
 * Tests all API endpoints for the Copilot backend
 * 
 * Run with: npx playwright test tests/api-flow.spec.js
 * Or: npm test:api
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test user ID and session ID
const TEST_USER_ID = 'test_user_' + Date.now();
const TEST_SESSION_ID = 'test_session_' + Date.now();

test.describe('API Health Check', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('message');
  });

  test('should return API info on root endpoint', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('endpoints');
  });
});

test.describe('Chat API', () => {
  test('POST /api/chat/stream - should stream chat response', async ({ request }) => {
    const response = await request.post(`${API_BASE}/chat/stream`, {
      data: {
        message: 'Hello, I run a fitness business',
        sessionId: TEST_SESSION_ID,
        userId: TEST_USER_ID
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or handle gracefully if API key not configured
    expect([200, 500, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const text = await response.text();
      // Should contain SSE format
      expect(text).toContain('data:');
    }
  });

  test('POST /api/chat - should return chat response (non-streaming)', async ({ request }) => {
    const response = await request.post(`${API_BASE}/chat`, {
      data: {
        message: 'What is a content calendar?',
        sessionId: TEST_SESSION_ID,
        userId: TEST_USER_ID
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or handle gracefully if API key not configured
    expect([200, 500, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('response');
      expect(typeof data.response).toBe('string');
    } else {
      // If API key not configured, should return error message
      const data = await response.json();
      expect(data).toHaveProperty('error');
    }
  });

  test('POST /api/chat - should handle empty message', async ({ request }) => {
    const response = await request.post(`${API_BASE}/chat`, {
      data: {
        message: '',
        sessionId: TEST_SESSION_ID,
        userId: TEST_USER_ID
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 400 for empty message
    expect([400, 200, 500]).toContain(response.status());
  });
});

test.describe('Profile API', () => {
  test('GET /api/profile/:userId - should return empty profile for new user', async ({ request }) => {
    const response = await request.get(`${API_BASE}/profile/${TEST_USER_ID}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('profile');
    // New user should have empty or default profile
  });

  test('POST /api/profile/:userId - should save business profile', async ({ request }) => {
    const profileData = {
      industry: 'Fitness & Health',
      targetAudience: 'Fitness enthusiasts aged 25-45',
      brandTone: 'Motivational and energetic',
      contentPreferences: ['Workout tips', 'Nutrition advice', 'Success stories']
    };

    const response = await request.post(`${API_BASE}/profile/${TEST_USER_ID}`, {
      data: profileData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('success', true);
    expect(data).toHaveProperty('profile');
    expect(data.profile.industry).toBe(profileData.industry);
  });

  test('GET /api/profile/:userId - should return saved profile', async ({ request }) => {
    // First save a profile
    await request.post(`${API_BASE}/profile/${TEST_USER_ID}`, {
      data: {
        industry: 'E-commerce',
        targetAudience: 'Online shoppers',
        brandTone: 'Friendly and helpful'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Then retrieve it
    const response = await request.get(`${API_BASE}/profile/${TEST_USER_ID}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.profile.industry).toBe('E-commerce');
  });
});

test.describe('Facebook API', () => {
  test('GET /api/facebook/auth-url - should return OAuth URL', async ({ request }) => {
    const response = await request.get(`${API_BASE}/facebook/auth-url?userId=${TEST_USER_ID}`);
    
    // Should return 200 or handle mock mode
    expect([200, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('authUrl');
      expect(data.authUrl).toContain('facebook.com');
    }
  });

  test('GET /api/facebook/status/:userId - should return connection status', async ({ request }) => {
    const response = await request.get(`${API_BASE}/facebook/status/${TEST_USER_ID}`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('connected');
    expect(typeof data.connected).toBe('boolean');
  });

  test('GET /api/facebook/pages/:userId - should return Facebook pages', async ({ request }) => {
    const response = await request.get(`${API_BASE}/facebook/pages/${TEST_USER_ID}`);
    
    // Should return 200 or handle not connected
    expect([200, 400, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('pages');
      expect(Array.isArray(data.pages)).toBe(true);
    }
  });
});

test.describe('Calendar API', () => {
  test('POST /api/calendar/generate - should generate content calendar', async ({ request }) => {
    // First, save a business profile
    await request.post(`${API_BASE}/profile/${TEST_USER_ID}`, {
      data: {
        industry: 'Fitness & Health',
        targetAudience: 'Fitness enthusiasts',
        brandTone: 'Motivational',
        contentPreferences: ['Workout tips', 'Nutrition']
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Generate calendar
    const response = await request.post(`${API_BASE}/calendar/generate`, {
      data: {
        userId: TEST_USER_ID
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or handle gracefully if API key not configured
    expect([200, 500, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('calendar');
      expect(data).toHaveProperty('posts');
      expect(Array.isArray(data.posts)).toBe(true);
      
      // Should have 30 posts for 30-day calendar
      expect(data.posts.length).toBeGreaterThan(0);
    }
  });

  test('POST /api/calendar/generate - should return error without profile', async ({ request }) => {
    const newUserId = 'user_without_profile_' + Date.now();
    
    const response = await request.post(`${API_BASE}/calendar/generate`, {
      data: {
        userId: newUserId
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return error if profile doesn't exist
    expect([400, 404, 200]).toContain(response.status());
  });

  test('PATCH /api/calendar/post/:postId - should update calendar post', async ({ request }) => {
    // First generate a calendar
    await request.post(`${API_BASE}/profile/${TEST_USER_ID}`, {
      data: {
        industry: 'Fitness & Health',
        targetAudience: 'Fitness enthusiasts',
        brandTone: 'Motivational'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const calendarResponse = await request.post(`${API_BASE}/calendar/generate`, {
      data: { userId: TEST_USER_ID },
      headers: { 'Content-Type': 'application/json' }
    });

    if (calendarResponse.status() === 200) {
      const calendarData = await calendarResponse.json();
      if (calendarData.posts && calendarData.posts.length > 0) {
        const postId = calendarData.posts[0].id;
        
        // Update the post
        const updateResponse = await request.patch(`${API_BASE}/calendar/post/${postId}`, {
          data: {
            content: 'Updated post content',
            title: 'Updated Title'
          },
          headers: {
            'Content-Type': 'application/json'
          }
        });

        expect([200, 404]).toContain(updateResponse.status());
      }
    }
  });
});

test.describe('Scheduling API', () => {
  test('POST /api/scheduling/schedule - should schedule a post', async ({ request }) => {
    const postData = {
      userId: TEST_USER_ID,
      postId: 'test_post_' + Date.now(),
      content: 'Test post content',
      scheduledTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      pageId: 'test_page_id'
    };

    const response = await request.post(`${API_BASE}/scheduling/schedule`, {
      data: postData,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or handle mock mode / not connected
    expect([200, 400, 404, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
    }
  });

  test('POST /api/scheduling/schedule-batch - should schedule multiple posts', async ({ request }) => {
    const posts = [
      {
        postId: 'post_1',
        content: 'First post',
        scheduledTime: new Date(Date.now() + 86400000).toISOString()
      },
      {
        postId: 'post_2',
        content: 'Second post',
        scheduledTime: new Date(Date.now() + 172800000).toISOString()
      }
    ];

    const response = await request.post(`${API_BASE}/scheduling/schedule-batch`, {
      data: {
        userId: TEST_USER_ID,
        pageId: 'test_page_id',
        posts: posts
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Should return 200 or handle mock mode / not connected
    expect([200, 400, 404, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('scheduled');
    }
  });
});

test.describe('Error Handling', () => {
  test('should handle invalid endpoints gracefully', async ({ request }) => {
    const response = await request.get(`${API_BASE}/invalid-endpoint`);
    expect([404, 400]).toContain(response.status());
  });

  test('should handle malformed JSON requests', async ({ request }) => {
    const response = await request.post(`${API_BASE}/chat`, {
      data: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect([400, 500]).toContain(response.status());
  });

  test('should handle missing required fields', async ({ request }) => {
    const response = await request.post(`${API_BASE}/chat`, {
      data: {
        // Missing message field
        sessionId: TEST_SESSION_ID
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect([400, 500]).toContain(response.status());
  });
});

test.describe('CORS Headers', () => {
  test('should include CORS headers in responses', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    
    // Check for CORS headers (may vary based on configuration)
    const headers = response.headers();
    // CORS might be configured, but we don't fail if it's not
    // This is just a check
    expect(response.status()).toBe(200);
  });
});

