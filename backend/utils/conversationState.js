/**
 * Conversation State Machine
 * Manages conversation flow and state transitions
 * Uses state machine pattern (can be enhanced with LangGraph.js StateGraph if needed)
 */

/**
 * Conversation States
 */
const CONVERSATION_STATES = {
    GREETING: 'greeting',
    COLLECTING_INDUSTRY: 'collecting_industry',
    COLLECTING_PRODUCTS_SERVICES: 'collecting_products_services',
    COLLECTING_AUDIENCE: 'collecting_audience',
    COLLECTING_TONE: 'collecting_tone',
    FACEBOOK_CONNECTION_REQUIRED: 'facebook_connection_required',
    FACEBOOK_CONNECTED: 'facebook_connected',
    POST_GENERATION_READY: 'post_generation_ready'
};

/**
 * State Schema
 */
const StateSchema = {
    currentState: String,
    businessProfile: Object,
    conversationHistory: Array,
    userResponseCount: Number,
    facebookConnected: Boolean,
    lastQuestionAsked: String,
    metadata: Object
};

/**
 * Determine next state based on current state and context
 */
function determineNextState(state) {
    const { currentState, businessProfile, userResponseCount, facebookConnected, conversationHistory } = state;

    // Use userResponseCount from state (already calculated, no hardcoded filtering)

    // Check what information is missing
    const missingInfo = {
        industry: !businessProfile?.industry,
        productsServices: !businessProfile?.productsServices,
        audience: !businessProfile?.audience,
        tone: !businessProfile?.tone
    };

    // State transition logic
    switch (currentState) {
        case CONVERSATION_STATES.GREETING:
            if (missingInfo.industry) {
                return CONVERSATION_STATES.COLLECTING_INDUSTRY;
            } else if (missingInfo.productsServices) {
                return CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
            } else if (missingInfo.audience) {
                return CONVERSATION_STATES.COLLECTING_AUDIENCE;
            } else if (missingInfo.tone) {
                return CONVERSATION_STATES.COLLECTING_TONE;
            } else if (!facebookConnected && userResponseCount >= 3) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
            } else if (facebookConnected) {
                return CONVERSATION_STATES.POST_GENERATION_READY;
            }
            return CONVERSATION_STATES.COLLECTING_INDUSTRY;

        case CONVERSATION_STATES.COLLECTING_INDUSTRY:
            if (missingInfo.productsServices) {
                return CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
            } else if (missingInfo.audience) {
                return CONVERSATION_STATES.COLLECTING_AUDIENCE;
            } else if (missingInfo.tone) {
                return CONVERSATION_STATES.COLLECTING_TONE;
            } else if (!facebookConnected && userResponseCount >= 3) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
            } else if (facebookConnected) {
                return CONVERSATION_STATES.POST_GENERATION_READY;
            }
            return CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;

        case CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES:
            if (missingInfo.audience) {
                return CONVERSATION_STATES.COLLECTING_AUDIENCE;
            } else if (missingInfo.tone) {
                return CONVERSATION_STATES.COLLECTING_TONE;
            } else if (!facebookConnected && userResponseCount >= 3) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
            } else if (facebookConnected) {
                return CONVERSATION_STATES.POST_GENERATION_READY;
            }
            return CONVERSATION_STATES.COLLECTING_AUDIENCE;

        case CONVERSATION_STATES.COLLECTING_AUDIENCE:
            if (missingInfo.tone) {
                return CONVERSATION_STATES.COLLECTING_TONE;
            } else if (!facebookConnected && userResponseCount >= 3) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
            } else if (facebookConnected) {
                return CONVERSATION_STATES.POST_GENERATION_READY;
            }
            return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;

        case CONVERSATION_STATES.COLLECTING_TONE:
            if (!facebookConnected && userResponseCount >= 3) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
            } else if (facebookConnected) {
                return CONVERSATION_STATES.POST_GENERATION_READY;
            }
            return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;

        case CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED:
            if (facebookConnected) {
                return CONVERSATION_STATES.FACEBOOK_CONNECTED;
            }
            return CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;

        case CONVERSATION_STATES.FACEBOOK_CONNECTED:
            return CONVERSATION_STATES.POST_GENERATION_READY;

        case CONVERSATION_STATES.POST_GENERATION_READY:
            return CONVERSATION_STATES.POST_GENERATION_READY;

        default:
            return CONVERSATION_STATES.GREETING;
    }
}

/**
 * Get context reminder based on current state
 */
function getContextReminderForState(state) {
    const { currentState, businessProfile, facebookConnected, conversationHistory, userResponseCount } = state;

    const missingInfo = {
        industry: !businessProfile?.industry,
        productsServices: !businessProfile?.productsServices,
        audience: !businessProfile?.audience,
        tone: !businessProfile?.tone
    };

    // Use userResponseCount from state (already calculated, no hardcoded filtering)

    let contextReminder = '';

    switch (currentState) {
        case CONVERSATION_STATES.GREETING:
            // Always ask about industry first if missing, regardless of other info
            if (missingInfo.industry) {
                contextReminder = '\n\nCRITICAL: This is the first interaction. You MUST start with a friendly greeting "Hope you are doing well! How can I help you today?" Then IMMEDIATELY ask "What industry are you in?" as the FIRST question. Generate 4-5 diverse industry quick reply options such as: Restaurant & Food, Fitness & Health, E-commerce, Professional Services, Beauty & Wellness, Education & Training, Real Estate, Technology & Software. Always include an "Other" option as the last option. DO NOT ask about anything else until you know their industry.';
            } else {
                contextReminder = '\n\nCONTEXT: This is the first interaction. Start with a friendly greeting like "Hope you are doing well! How can I help you today?" The user\'s industry is known, but you should gather more business information. Ask about their specific products/services or target audience.';
            }
            break;

        case CONVERSATION_STATES.COLLECTING_INDUSTRY:
            // Check if question was already asked
            const industryAsked = conversationHistory.some(msg =>
                msg.role === 'assistant' &&
                (msg.content.toLowerCase().includes('industry') || msg.content.toLowerCase().includes('what industry'))
            );
            if (!industryAsked) {
                contextReminder = '\n\nCONTEXT: Ask "What industry are you in?" and generate 4-5 diverse industry quick reply options. Always include an "Other" option.';
            }
            break;

        case CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES:
            const productsAsked = conversationHistory.some(msg =>
                msg.role === 'assistant' &&
                (msg.content.toLowerCase().includes('products') || msg.content.toLowerCase().includes('services') || msg.content.toLowerCase().includes('offer'))
            );
            if (!productsAsked) {
                contextReminder = '\n\nCONTEXT: Ask about their specific products/services. Generate relevant options based on their industry. IMPORTANT: Start quick replies with "All of these" as the FIRST option, then list 3-4 specific categories, then "Other" as the last option.';
            }
            break;

        case CONVERSATION_STATES.COLLECTING_AUDIENCE:
            const audienceAsked = conversationHistory.some(msg =>
                msg.role === 'assistant' &&
                (msg.content.toLowerCase().includes('target audience') ||
                    msg.content.toLowerCase().includes('ideal customers') ||
                    msg.content.toLowerCase().includes('who are your') ||
                    msg.content.toLowerCase().includes('who do you think'))
            );
            if (!audienceAsked) {
                contextReminder = '\n\nCONTEXT: Ask about their target audience. Generate relevant demographic or customer type options based on their industry.';
            }
            break;

        case CONVERSATION_STATES.COLLECTING_TONE:
            const toneAsked = conversationHistory.some(msg =>
                msg.role === 'assistant' &&
                (msg.content.toLowerCase().includes('tone') || msg.content.toLowerCase().includes('voice') || msg.content.toLowerCase().includes('brand personality'))
            );
            if (!toneAsked) {
                contextReminder = '\n\nCONTEXT: Ask about their brand tone/voice. Generate relevant options.';
            }
            break;

        case CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED:
            const fbAsked = conversationHistory.some(msg =>
                msg.role === 'assistant' && msg.content.toLowerCase().includes('connect facebook')
            );
            if (!fbAsked && userResponseCount >= 3) {
                contextReminder = '\n\n🚨 CRITICAL: The user has answered multiple questions but Facebook is NOT connected. You MUST now ask them to connect their Facebook account. Include "Connect Facebook" as a quick reply option.';
            }
            break;

        case CONVERSATION_STATES.FACEBOOK_CONNECTED:
            contextReminder = '\n\nCONTEXT: Facebook is connected! You can now ask if they want to generate posts. Include "Schedule FB Posts" or "Generate Posts" as a quick reply option.';
            break;

        case CONVERSATION_STATES.POST_GENERATION_READY:
            contextReminder = '\n\nCONTEXT: All information gathered and Facebook is connected. You can help generate posts or calendars.';
            break;
    }

    return contextReminder;
}

/**
 * Initialize conversation state
 * Purely data-driven - no hardcoded patterns, relies on conversation history length and profile completeness
 */
function initializeState(businessProfile, conversationHistory, facebookConnected) {
    // Count all user messages (let LLM/system prompt determine if they're meaningful)
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    const userResponseCount = userMessages.length;

    const missingInfo = {
        industry: !businessProfile?.industry,
        productsServices: !businessProfile?.productsServices,
        audience: !businessProfile?.audience,
        tone: !businessProfile?.tone
    };

    // Determine initial state based purely on data (conversation length and profile completeness)
    let currentState = CONVERSATION_STATES.GREETING;
    if (userResponseCount === 0) {
        // First interaction - always start with greeting
        currentState = CONVERSATION_STATES.GREETING;
    } else if (missingInfo.industry) {
        currentState = CONVERSATION_STATES.COLLECTING_INDUSTRY;
    } else if (missingInfo.productsServices) {
        currentState = CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
    } else if (missingInfo.audience) {
        currentState = CONVERSATION_STATES.COLLECTING_AUDIENCE;
    } else if (missingInfo.tone) {
        currentState = CONVERSATION_STATES.COLLECTING_TONE;
    } else if (!facebookConnected && userResponseCount >= 3) {
        currentState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (facebookConnected) {
        currentState = CONVERSATION_STATES.POST_GENERATION_READY;
    }

    return {
        currentState,
        businessProfile: businessProfile || {},
        conversationHistory,
        userResponseCount: userResponseCount,
        facebookConnected: facebookConnected || false,
        lastQuestionAsked: null,
        metadata: {}
    };
}

/**
 * Update state after processing a message
 */
function updateState(state, newBusinessProfile, newConversationHistory) {
    const updatedState = {
        ...state,
        businessProfile: newBusinessProfile || state.businessProfile,
        conversationHistory: newConversationHistory || state.conversationHistory
    };

    // Recalculate user response count (all user messages)
    updatedState.userResponseCount = updatedState.conversationHistory.filter(msg => msg.role === 'user').length;

    // Determine next state
    updatedState.currentState = determineNextState(updatedState);

    return updatedState;
}

module.exports = {
    CONVERSATION_STATES,
    determineNextState,
    getContextReminderForState,
    initializeState,
    updateState
};

