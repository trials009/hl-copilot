const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const config = require('../../config/config');
const { getBusinessProfile, updateBusinessProfile } = require('../utils/profileStorage');
const { HTTP_STATUS, ERROR_MESSAGES, CONVERSATION_FLOW, QUICK_REPLY_LIMITS } = require('../constants');
const { initializeState, updateState, getContextReminderForState } = require('../utils/conversationState');

// Initialize Groq client
const groq = config.ai.groq.apiKey ? new Groq({
  apiKey: config.ai.groq.apiKey
}) : null;

// Store conversation histories per session
const conversations = new Map();

/**
 * Build dynamic context prompt based on conversation state
 * Uses LangGraph-based state machine for cleaner state management
 */
function buildContextReminder(conversationHistory, facebookConnected, businessProfile = null, isTriggerMessage = false) {
  // Initialize state using state machine
  const state = initializeState(businessProfile, conversationHistory, facebookConnected, isTriggerMessage);

  // Get context reminder based on current state
  return getContextReminderForState(state);
}

/**
 * Parse quick replies from AI response
 * Looks for "QUICK_REPLIES:" prefix followed by JSON array
 */
function parseQuickReplies(response) {
  // Look for QUICK_REPLIES: followed by a JSON array (handle multiline and case-insensitive)
  const lines = response.split('\n');
  let quickRepliesStartIndex = -1;

  // Find the line containing QUICK_REPLIES (case-insensitive)
  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();
    if (trimmedLine.toUpperCase().startsWith('QUICK_REPLIES:')) {
      quickRepliesStartIndex = i;
      break;
    }
  }

  if (quickRepliesStartIndex !== -1) {
    // Extract everything from QUICK_REPLIES: onwards
    const quickRepliesSection = lines.slice(quickRepliesStartIndex).join('\n');
    // Match QUICK_REPLIES: followed by JSON array (handle multiline, whitespace)
    const match = quickRepliesSection.match(/QUICK_REPLIES:\s*(\[[\s\S]*?\])/i);

    if (match) {
      try {
        const quickReplies = JSON.parse(match[1]);
        // Remove quick replies section from response text (everything from QUICK_REPLIES line onwards)
        const cleanedResponse = lines.slice(0, quickRepliesStartIndex).join('\n').trim();
        // Also remove any trailing QUICK_REPLIES text that might appear
        const finalCleaned = cleanedResponse.replace(/\s*QUICK_REPLIES:.*$/is, '').trim();
        return { quickReplies, cleanedResponse: finalCleaned };
      } catch (e) {
        console.error('Error parsing quick replies JSON:', e);
        // Try fallback extraction using regex
        const fallbackMatch = match[1].match(/"([^"]+)"/g);
        if (fallbackMatch) {
          const quickReplies = fallbackMatch.map(item => item.replace(/"/g, ''));
          const cleanedResponse = lines.slice(0, quickRepliesStartIndex).join('\n').trim();
          const finalCleaned = cleanedResponse.replace(/\s*QUICK_REPLIES:.*$/is, '').trim();
          return { quickReplies, cleanedResponse: finalCleaned };
        }
      }
    }
  }

  // Also check if QUICK_REPLIES appears inline (not on a new line)
  const inlineMatch = response.match(/QUICK_REPLIES:\s*(\[[\s\S]*?\])/i);
  if (inlineMatch) {
    try {
      const quickReplies = JSON.parse(inlineMatch[1]);
      const cleanedResponse = response.replace(/QUICK_REPLIES:\s*\[[\s\S]*?\]/i, '').trim();
      return { quickReplies, cleanedResponse };
    } catch (e) {
      console.error('Error parsing inline quick replies:', e);
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
- Question 1: Ask about their industry/business type (if not already known)
- Question 2: Ask about specific products/services they offer OR target audience (provide relevant options based on their industry)
- Question 3: Ask about any missing business details (target audience, brand tone, content preferences, etc.)
- Question 4 (MANDATORY): If Facebook is NOT connected, you MUST suggest connecting Facebook with "Connect Facebook" as a quick reply option
- After Facebook connection: Continue gathering any missing details or proceed to post generation

IMPORTANT: Always check what business information you already have before asking. Don't repeat questions about information that's already been shared. If business profile information is missing, prioritize gathering it before suggesting post generation.

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
   - ALWAYS include "All of these" as the last option
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.MESSAGE_REQUIRED
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

    // Determine if this is a meaningful message (not just a greeting/trigger)
    // Store all messages, but mark very short/greeting messages for special handling
    const trimmedMessage = message.trim();
    const isTriggerMessage = trimmedMessage.length <= 2 || /^(hi|hello|hey|start|ok|yes|no)$/i.test(trimmedMessage);

    // Always add to history, but state machine will handle greeting detection
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // URL context removed - AI will generate industry options dynamically

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
      conversationHistory[0].content = SYSTEM_PROMPT + contextPrompt + "\n\nUse smileys in post generation";
    }

    // Add dynamic context reminder based on conversation history and business profile
    // For trigger messages, treat as first interaction
    const facebookConnected = businessProfile?.facebookConnected || false;
    const contextReminder = buildContextReminder(conversationHistory, facebookConnected, businessProfile, isTriggerMessage);
    if (contextReminder) {
      conversationHistory.push({
        role: 'system',
        content: contextReminder
      });
    }

    // Check if Groq is configured
    if (!groq) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.AI_NOT_CONFIGURED,
        note: ERROR_MESSAGES.AI_CONFIG_NOTE
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

    // Extract business information if mentioned (async, don't await to avoid blocking)
    extractBusinessInfo(message, fullResponse, userId || sessionId, conversationHistory).catch(err => {
      console.error('Background business info extraction error:', err);
    });

    // Update conversation state after processing
    const updatedBusinessProfile = getBusinessProfile(userId || sessionId);
    const updatedState = updateState(
      initializeState(updatedBusinessProfile, conversationHistory, facebookConnected, isTriggerMessage),
      updatedBusinessProfile,
      conversationHistory
    );
    // State is now updated and will be used in next interaction

    // Close the stream
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (error) {
    console.error('Chat streaming error:', error);

    // Send error via SSE
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: ERROR_MESSAGES.CHAT_FAILED,
      details: error.message
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
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: ERROR_MESSAGES.MESSAGE_REQUIRED
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

    // Determine if this is a meaningful message (not just a greeting/trigger)
    // Store all messages, but mark very short/greeting messages for special handling
    const trimmedMessage = message.trim();
    const isTriggerMessage = trimmedMessage.length <= 2 || /^(hi|hello|hey|start|ok|yes|no)$/i.test(trimmedMessage);

    // Always add to history, but state machine will handle greeting detection
    conversationHistory.push({
      role: 'user',
      content: message
    });

    // URL context removed - AI will generate industry options dynamically

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

    // Add dynamic context reminder based on conversation history and business profile
    // For trigger messages, treat as first interaction
    const facebookConnected = businessProfile?.facebookConnected || false;
    const contextReminder = buildContextReminder(conversationHistory, facebookConnected, businessProfile, isTriggerMessage);
    if (contextReminder) {
      conversationHistory.push({
        role: 'system',
        content: contextReminder
      });
    }

    // Check if Groq is configured
    if (!groq) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: ERROR_MESSAGES.AI_NOT_CONFIGURED,
        note: ERROR_MESSAGES.AI_CONFIG_NOTE
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

    // Extract business information if mentioned (async, don't await to avoid blocking)
    extractBusinessInfo(message, cleanedResponse, userId || sessionId, conversationHistory).catch(err => {
      console.error('Background business info extraction error:', err);
    });

    // Update conversation state after processing
    const updatedBusinessProfile = getBusinessProfile(userId || sessionId);
    const updatedState = updateState(
      initializeState(updatedBusinessProfile, conversationHistory, facebookConnected, isTriggerMessage),
      updatedBusinessProfile,
      conversationHistory
    );
    // State is now updated and will be used in next interaction

    // Return response
    res.json({
      response: cleanedResponse,
      sessionId: sessionId,
      quickReplies: quickReplies || null
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: ERROR_MESSAGES.CHAT_FAILED,
      details: error.message
    });
  }
});

/**
 * Extract business information from conversation using LLM
 * Uses Groq to intelligently parse conversation and extract structured business profile data
 */
async function extractBusinessInfo(userMessage, assistantMessage, userId, conversationHistory = []) {
  if (!groq) {
    console.warn('Groq not configured, skipping business info extraction');
    return;
  }

  const profile = getBusinessProfile(userId) || {};

  // Only extract missing information to avoid unnecessary LLM calls
  const missingFields = [];
  if (!profile.industry) missingFields.push('industry');
  if (!profile.productsServices) missingFields.push('productsServices');
  if (!profile.audience) missingFields.push('audience');
  if (!profile.tone) missingFields.push('tone');
  if (!profile.contentPreferences) missingFields.push('contentPreferences');

  if (missingFields.length === 0) {
    return; // Nothing to extract
  }

  try {
    // Build context from recent conversation
    const recentMessages = conversationHistory.slice(-6).map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const extractionPrompt = `You are a business information extraction assistant. Analyze the conversation below and extract business profile information.

Current conversation context:
${recentMessages}

Latest exchange:
Assistant: ${assistantMessage}
User: ${userMessage}

Extract the following information from the conversation (ONLY if clearly mentioned):
${missingFields.map(field => `- ${field}: Extract the ${field} if the user mentioned it`).join('\n')}

Return ONLY a valid JSON object with the extracted information. Use null for fields that cannot be determined.
Example format:
{
  "industry": "Restaurant & Food" or null,
  "productsServices": "Burgers, Salads, Desserts" or null,
  "audience": "Young Professionals" or null,
  "tone": "Friendly and Casual" or null,
  "contentPreferences": "Food photography, recipes" or null
}

IMPORTANT:
- Only extract information that is EXPLICITLY mentioned or clearly implied
- If the user mentions "Burgers" when asked about products, extract "Burgers" or similar
- If the user says "Young professionals" when asked about audience, extract that
- If information is not clear, use null
- Return ONLY the JSON object, no other text`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a precise information extraction assistant. Extract only explicitly mentioned business information and return valid JSON.'
        },
        {
          role: 'user',
          content: extractionPrompt
        }
      ],
      model: 'llama-3.1-8b-instant', // Use fast model for extraction
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 300
    });

    const response = completion.choices[0].message.content.trim();

    // Parse JSON response (handle markdown code blocks if present)
    let extractedData;
    try {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[1]);
      } else {
        extractedData = JSON.parse(response);
      }
    } catch (parseError) {
      console.error('Error parsing LLM extraction response:', parseError);
      console.error('Response was:', response);
      return; // Skip extraction if JSON is invalid
    }

    // Update profile with extracted information (only non-null values)
    const updates = {};
    for (const field of missingFields) {
      if (extractedData[field] && extractedData[field] !== null && extractedData[field] !== 'null') {
        updates[field] = extractedData[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      Object.assign(profile, updates);
      updateBusinessProfile(userId, profile);
      console.log('Business profile updated:', updates);
    }
  } catch (error) {
    console.error('Error extracting business info with LLM:', error);
    // Fail silently - don't break the conversation flow
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