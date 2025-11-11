const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const config = require('../../config/config');
const { getBusinessProfile, updateBusinessProfile } = require('../utils/profileStorage');

// Initialize Groq client
const groq = config.ai.groq.apiKey ? new Groq({
  apiKey: config.ai.groq.apiKey
}) : null;

// Store conversation histories per session
const conversations = new Map();

/**
 * Extract industry hints from URL or referrer
 * Returns an array of potential industries or null if none detected
 */
function extractIndustryFromUrl(url, referrer) {
  if (!url && !referrer) return null;

  const combinedUrl = (url || '') + ' ' + (referrer || '');
  const urlLower = combinedUrl.toLowerCase();

  // Industry keyword mappings
  const industryKeywords = {
    'restaurant': ['restaurant', 'food', 'dining', 'cafe', 'bakery', 'pizza', 'burger', 'cuisine', 'menu', 'chef', 'catering'],
    'fitness': ['fitness', 'gym', 'workout', 'health', 'wellness', 'yoga', 'pilates', 'training', 'exercise', 'nutrition'],
    'ecommerce': ['shop', 'store', 'buy', 'product', 'cart', 'checkout', 'ecommerce', 'e-commerce', 'retail', 'merchandise'],
    'professional': ['service', 'consulting', 'legal', 'accounting', 'financial', 'professional', 'business', 'agency', 'firm'],
    'beauty': ['beauty', 'salon', 'spa', 'cosmetic', 'hair', 'nail', 'skincare', 'makeup'],
    'education': ['education', 'school', 'course', 'training', 'learning', 'academy', 'tutor', 'university'],
    'realestate': ['real estate', 'property', 'home', 'house', 'apartment', 'realtor', 'mortgage'],
    'technology': ['tech', 'software', 'app', 'development', 'programming', 'digital', 'it', 'computer'],
    'healthcare': ['health', 'medical', 'doctor', 'clinic', 'hospital', 'therapy', 'treatment', 'patient'],
    'automotive': ['car', 'auto', 'vehicle', 'automotive', 'dealership', 'repair', 'mechanic']
  };

  // Check for matches
  const detectedIndustries = [];
  for (const [industry, keywords] of Object.entries(industryKeywords)) {
    if (keywords.some(keyword => urlLower.includes(keyword))) {
      detectedIndustries.push(industry);
    }
  }

  return detectedIndustries.length > 0 ? detectedIndustries : null;
}

/**
 * Generate dynamic industry options based on URL context or return null for random generation
 */
function generateIndustryOptions(urlIndustries) {
  if (!urlIndustries || urlIndustries.length === 0) {
    return null; // Let AI generate random options
  }

  // Convert detected industries to readable format
  const industryMap = {
    'restaurant': 'Restaurant & Food',
    'fitness': 'Fitness & Health',
    'ecommerce': 'E-commerce',
    'professional': 'Professional Services',
    'beauty': 'Beauty & Wellness',
    'education': 'Education & Training',
    'realestate': 'Real Estate',
    'technology': 'Technology & Software',
    'healthcare': 'Healthcare & Medical',
    'automotive': 'Automotive'
  };

  const options = urlIndustries
    .slice(0, 3) // Take top 3 matches
    .map(ind => industryMap[ind] || ind)
    .filter(Boolean);

  return options.length > 0 ? options : null;
}

/**
 * Analyze conversation history and generate context-aware quick reply reminder
 * Now completely dynamic - no hardcoded industries
 * Enforces Facebook connection after 3-4 questions
 */
function getQuickReplyContext(conversationHistory, urlContext = null, facebookConnected = false) {
  // Look through conversation history to see what user has already selected
  const userMessages = conversationHistory.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());
  const assistantMessages = conversationHistory.filter(msg => msg.role === 'assistant').map(msg => msg.content.toLowerCase());

  // Count REAL user responses (exclude greetings, empty messages, and trigger messages)
  const realUserResponses = userMessages.filter(msg => {
    const trimmed = msg.trim();
    return trimmed !== '' &&
      trimmed !== 'hello' &&
      trimmed !== 'hi' &&
      trimmed !== 'start' &&
      trimmed.length >= 3;
  }).length;

  // Count how many user messages we have (to determine conversation stage)
  const userMessageCount = userMessages.length;
  const assistantMessageCount = assistantMessages.length;

  // Check if this is the very first interaction (first user message, no assistant responses yet)
  const isFirstInteraction = userMessageCount === 1 && assistantMessageCount === 0;

  // Check if the first message is empty or just a greeting (triggers welcome)
  const firstMessageIsTrigger = isFirstInteraction && (
    userMessages[0].trim() === '' ||
    userMessages[0].trim() === 'hello' ||
    userMessages[0].trim() === 'hi' ||
    userMessages[0].trim() === 'start' ||
    userMessages[0].length < 3
  );

  // Check if asking about products/services (to include "All of these")
  const lastAssistantMsg = assistantMessages[assistantMessages.length - 1] || '';
  const isAskingAboutProducts = lastAssistantMsg.includes('product') ||
    lastAssistantMsg.includes('service') ||
    lastAssistantMsg.includes('menu') ||
    lastAssistantMsg.includes('offer') ||
    lastAssistantMsg.includes('specialize');

  const isAskingAboutAudience = lastAssistantMsg.includes('audience') ||
    lastAssistantMsg.includes('customer') ||
    lastAssistantMsg.includes('target') ||
    lastAssistantMsg.includes('who');

  // Check if we've already asked about Facebook connection recently
  const alreadyAskedAboutFacebook = lastAssistantMsg.includes('facebook') ||
    lastAssistantMsg.includes('connect');

  // Check if user just clicked "Connect Facebook"
  const lastUserMsg = userMessages[userMessages.length - 1] || '';
  const userClickedConnect = lastUserMsg.includes('connect') && lastUserMsg.includes('facebook');

  let contextReminder = '';

  // CRITICAL: After 3-4 real user responses, REQUIRE Facebook connection
  // BUT only if we haven't already asked in the last message
  if (realUserResponses >= 3 && !facebookConnected && !alreadyAskedAboutFacebook && !userClickedConnect) {
    contextReminder = '\n\n🚨 CRITICAL CONTEXT: The user has answered 3+ questions but Facebook is NOT connected yet. You MUST now ask them to connect their Facebook account. Include "Connect Facebook" as a quick reply option. Say something like "Great! Now let\'s connect your Facebook account so I can help you create and schedule posts." Make it clear this is the next step. QUICK_REPLIES must include "Connect Facebook".';
    return contextReminder;
  }

  // If user clicked Connect Facebook, don't give any special context (they're on connection screen)
  if (userClickedConnect) {
    return '';
  }

  // First interaction - ask about industry with URL context if available
  if (isFirstInteraction && firstMessageIsTrigger) {
    if (urlContext && urlContext.industryOptions && urlContext.industryOptions.length > 0) {
      const optionsStr = urlContext.industryOptions.map(opt => `"${opt}"`).join(', ');
      contextReminder = `\n\nCONTEXT (Question 1 of 4): This is the very first interaction. Ask "What industry are you in?" Based on the user's website URL, they might be in one of these industries: [${optionsStr}]. Generate quick reply options that include these as suggestions, but also add 2-3 other common industries. Format: QUICK_REPLIES: ["Option1", "Option2", ...]`;
    } else {
      // No URL context - let AI generate diverse industry options
      contextReminder = '\n\nCONTEXT (Question 1 of 4): This is the very first interaction. Ask "What industry are you in?" Generate 4-5 diverse industry quick reply options that cover common business types. Include an "Other" option.';
    }
  } else if (realUserResponses === 1) {
    // Second question - ask about products/services
    contextReminder = '\n\nCONTEXT (Question 2 of 4): The user has shared their industry. Now ask about their specific products/services. Generate relevant options based on their industry. IMPORTANT: Start the quick replies with "All of these" as the FIRST option, then list 3-4 specific categories, then "Other" as the last option. Example: ["All of these", "Category1", "Category2", "Category3", "Other"]';
  } else if (realUserResponses === 2) {
    // Third question - ask about target audience or business details
    if (isAskingAboutAudience) {
      contextReminder = '\n\nCONTEXT (Question 3 of 4): Ask about their target audience or customer demographics. If showing multiple audience segments, include "All of these" as the first option. Generate 3-4 relevant audience options based on their business, with "Other" at the end.';
    } else {
      contextReminder = '\n\nCONTEXT (Question 3 of 4): Ask about target audience, business goals, or other relevant details. Generate contextually relevant quick replies. If showing categories, include "All of these" first and "Other" last.';
    }
  } else if (realUserResponses >= 3 && facebookConnected) {
    // Facebook is connected - can proceed to scheduling
    contextReminder = '\n\nCONTEXT: Facebook is connected! You can now ask if they want to generate posts. Include "Schedule FB Posts" or "Generate Posts" as a quick reply option.';
  } else if (isAskingAboutProducts) {
    // If asking about products at any point, remind about "All of these"
    contextReminder = '\n\nCONTEXT: When asking about products/services/categories, ALWAYS include "All of these" as the FIRST option in quick replies, followed by specific options, then "Other" as the last option.';
  }

  return contextReminder;
}

/**
 * Parse quick replies from AI response
 * Looks for "QUICK_REPLIES:" prefix followed by JSON array
 */
function parseQuickReplies(response) {
  // Look for QUICK_REPLIES: followed by a JSON array (handle multiline)
  const lines = response.split('\n');
  let quickRepliesStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().toUpperCase().startsWith('QUICK_REPLIES:')) {
      quickRepliesStartIndex = i;
      break;
    }
  }

  if (quickRepliesStartIndex !== -1) {
    // Extract everything from QUICK_REPLIES: onwards
    const quickRepliesSection = lines.slice(quickRepliesStartIndex).join('\n');
    const match = quickRepliesSection.match(/QUICK_REPLIES:\s*(\[[\s\S]*\])/i);

    if (match) {
      try {
        const quickReplies = JSON.parse(match[1]);
        // Remove quick replies section from response text
        const cleanedResponse = lines.slice(0, quickRepliesStartIndex).join('\n').trim();
        return { quickReplies, cleanedResponse };
      } catch (e) {
        console.error('Error parsing quick replies JSON:', e);
        // Try fallback extraction
        const fallbackMatch = match[1].match(/"([^"]+)"/g);
        if (fallbackMatch) {
          const quickReplies = fallbackMatch.map(item => item.replace(/"/g, ''));
          const cleanedResponse = lines.slice(0, quickRepliesStartIndex).join('\n').trim();
          return { quickReplies, cleanedResponse };
        }
      }
    }
  }

  return { quickReplies: null, cleanedResponse: response };
}

// System prompt for the copilot - completely dynamic, no hardcoding
const SYSTEM_PROMPT = `You are a helpful AI Copilot assistant for HighLevel. Your role is to:
1. Engage users in friendly, natural conversation
2. Learn about their business organically through conversation
3. Guide them to connect their Facebook account (MANDATORY after 3-4 questions)
4. Help them generate content calendars and schedule social media posts

CONVERSATION FLOW (Required):
- Question 1: Ask about their industry/business type
- Question 2: Ask about specific products/services they offer (provide relevant options based on their industry)
- Question 3: Ask about target audience OR any other relevant business detail
- Question 4 (MANDATORY): If Facebook is NOT connected, you MUST suggest connecting Facebook with "Connect Facebook" as a quick reply option
- After Facebook connection: Continue gathering details or proceed to post generation

Be conversational and helpful, but ALWAYS suggest Facebook connection after 3-4 questions if not yet connected.

CRITICAL - Quick Reply Generation Rules:
After each response where you ask a question or need user input, you MUST generate 3-5 relevant quick reply options that are contextually appropriate.

Format: Add "QUICK_REPLIES:" on a new line followed by a JSON array of strings.

Example:
Your conversational response here asking about their business.

QUICK_REPLIES: ["Option 1", "Option 2", "Option 3", "Option 4"]

IMPORTANT DYNAMIC RULES:
1. ALWAYS review the conversation history before generating quick replies
2. NEVER repeat quick reply options that were already shown in previous messages
3. Generate quick replies that are relevant to the CURRENT question you're asking
4. If asking about industry for the first time:
   - Use any industry suggestions provided in context (if available)
   - Generate diverse, common industry options dynamically
   - Include 4-5 varied options covering different business types
   - Always include an "Other" option
5. If asking about products/services or categories (like menu items, service types, etc.):
   - Generate relevant options based on their industry
   - ALWAYS include "All of these" as the first option
   - Include 3-4 specific category options
   - Always include an "Other" option at the end
   - Example for restaurant: ["All of these", "Pizza & Pasta", "Burgers", "Desserts", "Other"]
6. If asking about target audience:
   - Generate relevant demographic or customer type options
   - Include "All of these" if showing multiple audience segments
   - Keep options short and clear
7. After 3-4 questions, if Facebook NOT connected:
   - Your next message MUST include "Connect Facebook" as a quick reply option
   - Make it clear that connecting Facebook is the next step
8. DO NOT repeat industry selection options after the first question
9. Progress the conversation naturally through the flow

Guidelines for quick replies:
- Make them contextually relevant to the CURRENT question AND conversation history
- Keep them short (2-4 words typically)
- Make them actionable and helpful
- Generate them dynamically based on context - never hardcode
- Always include "All of these" when showing product/service/category options
- Always include an "Other" option when asking for categories
- Think: "What did the user already tell me? What am I asking now? What options make sense for THIS specific question?"

SPECIAL ACTION KEYWORDS (use these exact phrases when suggesting these actions):
- When suggesting Facebook connection: Use "Connect Facebook" or "Connect to Facebook"
- When suggesting post/calendar generation: Use "Schedule FB Posts" or "Generate Posts" or "Create Calendar"
- When offering to skip: Use "Skip" or "Maybe Later"
These keywords trigger specific UI actions, so use them verbatim.

CRITICAL FACEBOOK CONNECTION RULES:
- After 3-4 user responses (excluding greetings), you MUST suggest "Connect Facebook" if not yet connected
- ONLY suggest "Schedule FB Posts", "Generate Posts", or "Create Calendar" if the user has ALREADY connected their Facebook account
- If Facebook is NOT connected yet, suggest "Connect Facebook" as the next step
- NEVER suggest scheduling posts before Facebook connection is established
- The context will tell you if Facebook is connected - check before suggesting post scheduling
- Facebook connection is MANDATORY before proceeding to post generation`;

/**
 * POST /api/chat/stream
 * Handle chat messages with streaming response (character by character)
 */
router.post('/stream', async (req, res) => {
  try {
    const { message, sessionId, userId, url, referrer } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required'
      });
    }

    // Set up Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Get or create conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [{
        role: 'system',
        content: SYSTEM_PROMPT
      }]);
    }

    const conversationHistory = conversations.get(sessionId);

    // Add user message
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Extract industry hints from URL/referrer (only on first message)
    let urlContext = null;
    if (conversationHistory.filter(msg => msg.role === 'user').length === 1) {
      const urlIndustries = extractIndustryFromUrl(url, referrer);
      const industryOptions = generateIndustryOptions(urlIndustries);
      if (industryOptions) {
        urlContext = { industryOptions };
      }
    }

    // Get business profile if available
    const businessProfile = getBusinessProfile(userId || sessionId);
    let contextPrompt = '';

    if (businessProfile) {
      contextPrompt = `\n\nUser's Business Profile:
- Industry: ${businessProfile.industry || 'Not specified'}
- Target Audience: ${businessProfile.audience || 'Not specified'}
- Brand Tone: ${businessProfile.tone || 'Not specified'}
- Content Preferences: ${businessProfile.contentPreferences || 'Not specified'}
- Facebook Connected: ${businessProfile.facebookConnected ? 'Yes' : 'No'}`;
    } else {
      // Always include Facebook connection status, even if no full profile exists
      contextPrompt = `\n\nUser Status:
- Facebook Connected: No`;
    }

    // Add context to system message
    if (contextPrompt) {
      conversationHistory[0].content = SYSTEM_PROMPT + contextPrompt;
    }

    // Add dynamic quick reply context reminder based on conversation history and URL context
    const facebookConnected = businessProfile?.facebookConnected || false;
    const quickReplyContext = getQuickReplyContext(conversationHistory, urlContext, facebookConnected);
    if (quickReplyContext) {
      // Add as a system message reminder right before the API call
      conversationHistory.push({
        role: 'system',
        content: quickReplyContext
      });
    }

    // Check if Groq is configured
    if (!groq) {
      return res.status(500).json({
        error: 'AI service not configured',
        note: 'Please configure GROQ_API_KEY in your environment variables'
      });
    }

    // Call Groq API with streaming
    const stream = await groq.chat.completions.create({
      model: config.ai.groq.model,
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000,
      stream: true
    });

    let fullResponse = '';
    let chunkCount = 0;
    let hasContent = false;

    // Set a timeout to prevent hanging (30 seconds)
    let timeoutTriggered = false;
    const streamTimeout = setTimeout(() => {
      timeoutTriggered = true;
      console.error('Stream timeout after 30 seconds');
      try {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Request timeout - the AI response took too long',
        })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
      } catch (e) {
        console.error('Error sending timeout error:', e);
      }
    }, 30000);

    // Stream response character by character
    try {
      for await (const chunk of stream) {
        // Check if timeout was triggered
        if (timeoutTriggered) {
          break;
        }

        const content = chunk.choices[0]?.delta?.content || '';
        const finishReason = chunk.choices[0]?.finish_reason;

        if (content) {
          hasContent = true;
          fullResponse += content;
          chunkCount++;

          // Send each character (or small chunks) for smooth streaming
          // Send as small chunks for better responsiveness
          for (let i = 0; i < content.length; i++) {
            res.write(`data: ${JSON.stringify({
              type: 'chunk',
              content: content[i],
              done: false
            })}\n\n`);
          }

          // Flush to client immediately
          if (res.flush) res.flush();
        }

        // Check if stream is finished
        if (finishReason) {
          console.log('Stream finished with reason:', finishReason);
          clearTimeout(streamTimeout);
          break;
        }
      }

      clearTimeout(streamTimeout);
    } catch (streamError) {
      clearTimeout(streamTimeout);
      console.error('Streaming error:', streamError);
      throw streamError;
    }

    // Don't process if timeout was triggered
    if (timeoutTriggered) {
      return;
    }

    // Ensure we have a response even if stream was empty
    if (!hasContent && fullResponse === '') {
      console.warn('Stream completed with no content');
      fullResponse = 'I apologize, but I encountered an issue processing your message. Could you please try again?';
    }

    console.log(`Stream completed: ${chunkCount} chunks, ${fullResponse.length} characters`);

    // Parse quick replies from response
    const { quickReplies, cleanedResponse } = parseQuickReplies(fullResponse);

    // Finalize the response
    res.write(`data: ${JSON.stringify({
      type: 'done',
      fullResponse: cleanedResponse,
      sessionId: sessionId,
      quickReplies: quickReplies || null
    })}\n\n`);

    // Add assistant response to history (without quick replies marker)
    conversationHistory.push({
      role: 'assistant',
      content: cleanedResponse
    });

    // Extract business information if mentioned
    extractBusinessInfo(message, fullResponse, userId || sessionId);

    // Close the stream
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat streaming error:', error);

    // Send error via SSE
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process chat message',
      details: config.server.env === 'development' ? error.message : undefined
    })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/chat
 * Handle chat messages (non-streaming fallback)
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId, userId, url, referrer } = req.body;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required'
      });
    }

    // Get or create conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, [{
        role: 'system',
        content: SYSTEM_PROMPT
      }]);
    }

    const conversationHistory = conversations.get(sessionId);

    // Add user message
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // Extract industry hints from URL/referrer (only on first message)
    let urlContext = null;
    if (conversationHistory.filter(msg => msg.role === 'user').length === 1) {
      const urlIndustries = extractIndustryFromUrl(url, referrer);
      const industryOptions = generateIndustryOptions(urlIndustries);
      if (industryOptions) {
        urlContext = { industryOptions };
      }
    }

    // Get business profile if available
    const businessProfile = getBusinessProfile(userId || sessionId);
    let contextPrompt = '';

    if (businessProfile) {
      contextPrompt = `\n\nUser's Business Profile:
- Industry: ${businessProfile.industry || 'Not specified'}
- Target Audience: ${businessProfile.audience || 'Not specified'}
- Brand Tone: ${businessProfile.tone || 'Not specified'}
- Content Preferences: ${businessProfile.contentPreferences || 'Not specified'}
- Facebook Connected: ${businessProfile.facebookConnected ? 'Yes' : 'No'}`;
    } else {
      // Always include Facebook connection status, even if no full profile exists
      contextPrompt = `\n\nUser Status:
- Facebook Connected: No`;
    }

    // Add context to system message
    if (contextPrompt) {
      conversationHistory[0].content = SYSTEM_PROMPT + contextPrompt;
    }

    // Add dynamic quick reply context reminder based on conversation history and URL context
    const facebookConnected = businessProfile?.facebookConnected || false;
    const quickReplyContext = getQuickReplyContext(conversationHistory, urlContext, facebookConnected);
    if (quickReplyContext) {
      // Add as a system message reminder right before the API call
      conversationHistory.push({
        role: 'system',
        content: quickReplyContext
      });
    }

    // Check if Groq is configured
    if (!groq) {
      return res.status(500).json({
        error: 'AI service not configured',
        note: 'Please configure GROQ_API_KEY in your environment variables'
      });
    }

    // Call Groq API
    const completion = await groq.chat.completions.create({
      model: config.ai.groq.model,
      messages: conversationHistory,
      temperature: 0.7,
      max_tokens: 1000
    });

    const assistantMessage = completion.choices[0].message.content;

    // Parse quick replies from response
    const { quickReplies, cleanedResponse } = parseQuickReplies(assistantMessage);

    // Add assistant response to history (without quick replies marker)
    conversationHistory.push({
      role: 'assistant',
      content: cleanedResponse
    });

    // Extract business information if mentioned
    extractBusinessInfo(message, cleanedResponse, userId || sessionId);

    // Return response
    res.json({
      response: cleanedResponse,
      sessionId: sessionId,
      quickReplies: quickReplies || null
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

/**
 * Extract business information from conversation
 */
function extractBusinessInfo(userMessage, assistantMessage, userId) {
  const profile = getBusinessProfile(userId) || {};

  // Simple keyword extraction (in production, use more sophisticated NLP)
  const industryKeywords = ['industry', 'business type', 'niche', 'sector'];
  const audienceKeywords = ['audience', 'target', 'customers', 'clients', 'demographic'];
  const toneKeywords = ['tone', 'voice', 'style', 'personality'];
  const contentKeywords = ['content', 'posts', 'topics', 'themes'];

  const message = (userMessage + ' ' + assistantMessage).toLowerCase();

  // Extract industry
  if (!profile.industry) {
    const industryMatch = message.match(/(?:industry|business type|niche|sector)[:\s]+([^.,!?]+)/i);
    if (industryMatch) {
      profile.industry = industryMatch[1].trim();
    }
  }

  // Extract audience
  if (!profile.audience) {
    const audienceMatch = message.match(/(?:target audience|customers|clients)[:\s]+([^.,!?]+)/i);
    if (audienceMatch) {
      profile.audience = audienceMatch[1].trim();
    }
  }

  // Extract tone
  if (!profile.tone) {
    const toneMatch = message.match(/(?:tone|voice|style)[:\s]+([^.,!?]+)/i);
    if (toneMatch) {
      profile.tone = toneMatch[1].trim();
    }
  }

  // Update profile if any changes
  if (Object.keys(profile).length > 0) {
    updateBusinessProfile(userId, profile);
  }
}

/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const history = conversations.get(sessionId) || [];

  // Filter out system message for client
  const userHistory = history.filter(msg => msg.role !== 'system');

  res.json({ history: userHistory });
});

/**
 * DELETE /api/chat/history/:sessionId
 * Clear conversation history
 */
router.delete('/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  conversations.delete(sessionId);
  res.json({ message: 'Conversation history cleared' });
});

module.exports = router;