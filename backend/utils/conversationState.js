/**
 * Conversation State Machine
 * Manages conversation flow and state transitions
 * Uses LangGraph.js StateGraph for robust qstate management
 */

const { StateGraph, Annotation, END } = require('@langchain/langgraph');

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
 * State Schema for LangGraph using Annotation.Root
 */
const StateSchema = Annotation.Root({
    currentState: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => CONVERSATION_STATES.GREETING
    }),
    businessProfile: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => ({})
    }),
    conversationHistory: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => []
    }),
    userResponseCount: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => 0
    }),
    facebookConnected: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => false
    }),
    lastQuestionAsked: Annotation({
        reducer: (x, y) => y ?? x,
        default: () => null
    }),
    metadata: Annotation({
        reducer: (x, y) => ({ ...x, ...y }),
        default: () => ({})
    })
});

/**
 * Helper function to check missing information
 */
function getMissingInfo(businessProfile) {
    return {
        industry: !businessProfile?.industry,
        productsServices: !businessProfile?.productsServices,
        audience: !businessProfile?.audience,
        tone: !businessProfile?.tone
    };
}

/**
 * State Node Functions
 * Each function represents a state and determines the next state
 */

function greetingNode(state) {
    const missingInfo = getMissingInfo(state.businessProfile);
    const previousState = state.currentState;
    let nextState;

    if (missingInfo.industry) {
        nextState = CONVERSATION_STATES.COLLECTING_INDUSTRY;
    } else if (missingInfo.productsServices) {
        nextState = CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
    } else if (missingInfo.audience) {
        nextState = CONVERSATION_STATES.COLLECTING_AUDIENCE;
    } else if (missingInfo.tone) {
        nextState = CONVERSATION_STATES.COLLECTING_TONE;
    } else if (!state.facebookConnected && state.userResponseCount >= 3) {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (state.facebookConnected) {
        nextState = CONVERSATION_STATES.POST_GENERATION_READY;
    } else {
        nextState = CONVERSATION_STATES.COLLECTING_INDUSTRY;
    }

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function collectingIndustryNode(state) {
    const missingInfo = getMissingInfo(state.businessProfile);
    const previousState = state.currentState;
    let nextState;

    if (missingInfo.productsServices) {
        nextState = CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
    } else if (missingInfo.audience) {
        nextState = CONVERSATION_STATES.COLLECTING_AUDIENCE;
    } else if (missingInfo.tone) {
        nextState = CONVERSATION_STATES.COLLECTING_TONE;
    } else if (!state.facebookConnected && state.userResponseCount >= 3) {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (state.facebookConnected) {
        nextState = CONVERSATION_STATES.POST_GENERATION_READY;
    } else {
        nextState = CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES;
    }

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function collectingProductsServicesNode(state) {
    const missingInfo = getMissingInfo(state.businessProfile);
    const previousState = state.currentState;
    let nextState;

    if (missingInfo.audience) {
        nextState = CONVERSATION_STATES.COLLECTING_AUDIENCE;
    } else if (missingInfo.tone) {
        nextState = CONVERSATION_STATES.COLLECTING_TONE;
    } else if (!state.facebookConnected && state.userResponseCount >= 3) {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (state.facebookConnected) {
        nextState = CONVERSATION_STATES.POST_GENERATION_READY;
    } else {
        nextState = CONVERSATION_STATES.COLLECTING_AUDIENCE;
    }

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function collectingAudienceNode(state) {
    const missingInfo = getMissingInfo(state.businessProfile);
    const previousState = state.currentState;
    let nextState;

    if (missingInfo.tone) {
        nextState = CONVERSATION_STATES.COLLECTING_TONE;
    } else if (!state.facebookConnected && state.userResponseCount >= 3) {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (state.facebookConnected) {
        nextState = CONVERSATION_STATES.POST_GENERATION_READY;
    } else {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    }

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function collectingToneNode(state) {
    const previousState = state.currentState;
    let nextState;

    if (!state.facebookConnected && state.userResponseCount >= 3) {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    } else if (state.facebookConnected) {
        nextState = CONVERSATION_STATES.POST_GENERATION_READY;
    } else {
        nextState = CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;
    }

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function facebookConnectionRequiredNode(state) {
    const previousState = state.currentState;
    const nextState = state.facebookConnected
        ? CONVERSATION_STATES.FACEBOOK_CONNECTED
        : CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED;

    return {
        currentState: nextState,
        metadata: { ...state.metadata, previousState }
    };
}

function facebookConnectedNode(state) {
    const previousState = state.currentState;

    return {
        currentState: CONVERSATION_STATES.POST_GENERATION_READY,
        metadata: { ...state.metadata, previousState }
    };
}

function postGenerationReadyNode(state) {
    const previousState = state.currentState;

    return {
        currentState: CONVERSATION_STATES.POST_GENERATION_READY,
        metadata: { ...state.metadata, previousState }
    };
}


/**
 * Single node that determines next state based on current state
 * This is simpler and more efficient than routing through multiple nodes
 */
function determineStateNode(state) {
    const currentState = state.currentState;
    let nextState;

    // Route to appropriate node function based on current state
    switch (currentState) {
        case CONVERSATION_STATES.GREETING:
            nextState = greetingNode(state).currentState;
            break;
        case CONVERSATION_STATES.COLLECTING_INDUSTRY:
            nextState = collectingIndustryNode(state).currentState;
            break;
        case CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES:
            nextState = collectingProductsServicesNode(state).currentState;
            break;
        case CONVERSATION_STATES.COLLECTING_AUDIENCE:
            nextState = collectingAudienceNode(state).currentState;
            break;
        case CONVERSATION_STATES.COLLECTING_TONE:
            nextState = collectingToneNode(state).currentState;
            break;
        case CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED:
            nextState = facebookConnectionRequiredNode(state).currentState;
            break;
        case CONVERSATION_STATES.FACEBOOK_CONNECTED:
            nextState = facebookConnectedNode(state).currentState;
            break;
        case CONVERSATION_STATES.POST_GENERATION_READY:
            nextState = postGenerationReadyNode(state).currentState;
            break;
        default:
            nextState = CONVERSATION_STATES.GREETING;
    }

    return { currentState: nextState };
}

/**
 * Build LangGraph StateGraph
 * Uses a single node that determines the next state, then ends
 */
function buildStateGraph() {
    const workflow = new StateGraph(StateSchema);

    // Add single node that determines next state
    workflow.addNode('determine_state', determineStateNode);

    // Set entry point
    workflow.setEntryPoint('determine_state');

    // Always end after determining state (no loops needed)
    workflow.addEdge('determine_state', END);

    // Compile the graph
    return workflow.compile();
}

// Create the compiled graph instance
let stateGraph = null;

/**
 * Get or create the state graph instance
 */
function getStateGraph() {
    if (!stateGraph) {
        stateGraph = buildStateGraph();
    }
    return stateGraph;
}

/**
 * Initialize conversation state
 * Purely data-driven - no hardcoded patterns, relies on conversation history length and profile completeness
 */
function initializeState(businessProfile, conversationHistory, facebookConnected) {
    // Count all user messages (let LLM/system prompt determine if they're meaningful)
    const userMessages = conversationHistory.filter(msg => msg.role === 'user');
    const userResponseCount = userMessages.length;

    const missingInfo = getMissingInfo(businessProfile);

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
 * Determine next state using LangGraph StateGraph
 * The graph routes through nodes to determine the final state
 */
async function determineNextState(state) {
    const graph = getStateGraph();

    // Run the graph with current state and recursion limit
    // We only want to determine the next state, not loop infinitely
    const result = await graph.invoke(
        {
            currentState: state.currentState,
            businessProfile: state.businessProfile,
            conversationHistory: state.conversationHistory,
            userResponseCount: state.userResponseCount,
            facebookConnected: state.facebookConnected,
            lastQuestionAsked: state.lastQuestionAsked,
            metadata: state.metadata
        },
        { recursionLimit: 10 } // Limit recursion to prevent infinite loops
    );

    return result.currentState;
}

/**
 * Get context reminder based on current state
 * Uses state machine to determine what context to provide to the LLM
 * No keyword matching - relies purely on state machine logic
 */
function getContextReminderForState(state) {
    const { currentState, businessProfile, facebookConnected, userResponseCount } = state;
    const missingInfo = getMissingInfo(businessProfile);

    let contextReminder = '';

    switch (currentState) {
        case CONVERSATION_STATES.GREETING:
            if (missingInfo.industry) {
                contextReminder = '\n\nCRITICAL: This is the first interaction. You MUST start with a friendly greeting "Hope you are doing well! How can I help you today?" Then IMMEDIATELY ask "What industry are you in?" as the FIRST question. Generate 4-5 diverse industry quick reply options such as: Restaurant & Food, Fitness & Health, E-commerce, Professional Services, Beauty & Wellness, Education & Training, Real Estate, Technology & Software. Always include an "Other" option as the last option. DO NOT ask about anything else until you know their industry.';
            } else {
                contextReminder = '\n\nCONTEXT: This is the first interaction. Start with a friendly greeting like "Hope you are doing well! How can I help you today?" The user\'s industry is known, but you should gather more business information. Ask about their specific products/services or target audience.';
            }
            break;

        case CONVERSATION_STATES.COLLECTING_INDUSTRY:
            contextReminder = '\n\nCONTEXT: Ask "What industry are you in?" and generate 4-5 diverse industry quick reply options. Always include an "Other" option.';
            break;

        case CONVERSATION_STATES.COLLECTING_PRODUCTS_SERVICES:
            contextReminder = '\n\nCONTEXT: Ask about their specific products/services. Generate relevant options based on their industry. IMPORTANT: Start quick replies with "All of these" as the FIRST option, then list 3-4 specific categories, then "Other" as the last option.';
            break;

        case CONVERSATION_STATES.COLLECTING_AUDIENCE:
            contextReminder = '\n\nCONTEXT: Ask about their target audience. Generate relevant demographic or customer type options based on their industry.';
            break;

        case CONVERSATION_STATES.COLLECTING_TONE:
            contextReminder = '\n\nCONTEXT: Ask about their brand tone/voice. Generate relevant options.';
            break;

        case CONVERSATION_STATES.FACEBOOK_CONNECTION_REQUIRED:
            if (userResponseCount >= 3) {
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
 * Update state after processing a message
 */
async function updateState(state, newBusinessProfile, newConversationHistory) {
    const updatedState = {
        ...state,
        businessProfile: newBusinessProfile || state.businessProfile,
        conversationHistory: newConversationHistory || state.conversationHistory
    };

    // Recalculate user response count (all user messages)
    updatedState.userResponseCount = updatedState.conversationHistory.filter(msg => msg.role === 'user').length;

    // Determine next state using LangGraph
    updatedState.currentState = await determineNextState(updatedState);

    return updatedState;
}

module.exports = {
    CONVERSATION_STATES,
    determineNextState,
    getContextReminderForState,
    initializeState,
    updateState,
    getStateGraph
};
