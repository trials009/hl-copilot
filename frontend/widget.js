/**
 * HighLevel Copilot Widget
 * Custom JS widget for HighLevel platform
 */

class CopilotWidget {
    constructor() {
        // Get API URL from parent window message or fallback
        this.apiUrl = window.COPILOT_API_URL || 'http://localhost:3000';
        // Set userId first (needed for sessionId generation)
        // Try to get persistent userId from localStorage first to maintain session across refreshes
        const persistentUserId = localStorage.getItem('copilot_persistent_user_id');
        this.userId = window.COPILOT_USER_ID || persistentUserId || this.generateSessionId();
        if (!persistentUserId && !window.COPILOT_USER_ID) {
            localStorage.setItem('copilot_persistent_user_id', this.userId);
        }
        // Load or generate sessionId - persist across widget closes
        this.sessionId = this.getOrCreateSessionId();
        this.currentScreen = 'chat'; // Start directly in chat
        this.calendar = null;
        this.isHighLevel = window.parent !== window;
        this.calendarView = 'grid'; // 'grid' or 'list'
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        // Track conversation context for contextual quick replies
        this.conversationContext = {
            industry: null,
            businessType: null,
            lastQuestion: null
        };
        this.facebookConnected = false;
        this.init();

        // Listen for configuration from parent (HighLevel)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'copilot-config') {
                this.apiUrl = event.data.apiUrl || this.apiUrl;
                this.userId = event.data.userId || this.userId;
                console.log('Copilot configured:', { apiUrl: this.apiUrl, userId: this.userId });
            }
        });

        // Notify parent that widget is ready
        if (this.isHighLevel) {
            window.parent.postMessage({ type: 'copilot-ready' }, '*');
        }
    }

    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    getOrCreateSessionId() {
        // Use consistent userId for session persistence (already set in constructor)
        const storageKey = `copilot_session_${this.userId}`;
        let sessionId = localStorage.getItem(storageKey);
        
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem(storageKey, sessionId);
        }
        
        return sessionId;
    }

    async loadConversationHistory() {
        try {
            // Wait a bit to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const response = await fetch(`${this.apiUrl}/api/chat/history/${this.sessionId}`);
            if (!response.ok) {
                // No history - show welcome message
                return;
            }
            
            const data = await response.json();
            if (data.history && data.history.length > 0) {
                const messagesContainer = document.getElementById('chat-messages');
                if (!messagesContainer) {
                    // Retry after a short delay if container not ready
                    setTimeout(() => this.loadConversationHistory(), 200);
                    return;
                }
                
                // Clear any existing messages (including welcome message if it was shown)
                messagesContainer.innerHTML = '';
                
                // Restore messages from history, filtering out trigger messages
                data.history.forEach((msg) => {
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        // Skip "start" trigger message and empty messages
                        const content = msg.content.trim().toLowerCase();
                        if (content === 'start' || content === '' || content === 'hello' || content === 'hi') {
                            return; // Skip trigger messages
                        }
                        this.addMessage(msg.role, msg.content, false);
                    }
                });
                
                // Scroll to bottom after loading
                setTimeout(() => {
                    this.scrollToBottom(false);
                }, 100);
                
                // Return true to indicate history was loaded
                return true;
            }
        } catch (error) {
            console.error('Error loading conversation history:', error);
            // Silently fail - start fresh if history can't be loaded
        }
        return false;
    }

    async startNewChat() {
        // Clear conversation history on backend
        try {
            await fetch(`${this.apiUrl}/api/chat/history/${this.sessionId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            console.error('Error clearing conversation history:', error);
        }
        
        // Generate new sessionId and store it
        const storageKey = `copilot_session_${this.userId}`;
        this.sessionId = this.generateSessionId();
        localStorage.setItem(storageKey, this.sessionId);
        
        // Clear messages from UI
        const messagesContainer = document.getElementById('chat-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = '';
        }
        
        // Reset conversation context
        this.conversationContext = {
            industry: null,
            businessType: null,
            lastQuestion: null
        };
        
        // Show initial greeting
        this.showChatScreen(true);
    }

    scrollToBottom(smooth = true) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            messagesContainer.scrollTo({
                top: messagesContainer.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        });
    }

    async init() {
        this.setupEventListeners();
        this.checkFacebookConnection();
        // Show chat screen directly on init (without welcome message yet)
        this.showChatScreen(false);
        // Load previous conversation history if available (wait a bit for DOM to be ready)
        setTimeout(async () => {
            const historyLoaded = await this.loadConversationHistory();
            // Only show welcome message if no history was loaded
            if (!historyLoaded) {
                // Small delay to ensure chat screen is ready, then show welcome
                setTimeout(() => {
                    this.showChatScreen(true);
                }, 100);
            }
        }, 300);
    }

    setupEventListeners() {
        // Start chat button
        const startChatBtn = document.getElementById('start-chat-btn');
        if (startChatBtn) {
            startChatBtn.addEventListener('click', () => this.showChatScreen());
        }

        // Close button
        const closeBtn = document.getElementById('close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeWidget());
        }

        // New chat button
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewChat());
        }

        // Chat input
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Facebook connection
        const connectFbBtn = document.getElementById('connect-facebook-btn');
        const skipFbBtn = document.getElementById('skip-facebook-btn');

        if (connectFbBtn) {
            connectFbBtn.addEventListener('click', () => this.connectFacebook());
        }

        if (skipFbBtn) {
            skipFbBtn.addEventListener('click', () => this.showChatScreen());
        }

        // Calendar actions
        const generateCalendarBtn = document.getElementById('generate-calendar-btn');
        const scheduleAllBtn = document.getElementById('schedule-all-btn');
        const backToChatBtn = document.getElementById('back-to-chat-btn');
        const maximizeCalendarBtn = document.getElementById('maximize-calendar-btn');

        if (generateCalendarBtn) {
            generateCalendarBtn.addEventListener('click', () => this.generateCalendar());
        }

        if (scheduleAllBtn) {
            scheduleAllBtn.addEventListener('click', () => this.scheduleAllPosts());
        }

        if (backToChatBtn) {
            backToChatBtn.addEventListener('click', () => this.showChatScreen());
        }

        if (maximizeCalendarBtn) {
            maximizeCalendarBtn.addEventListener('click', () => this.toggleMaximizeCalendar());
        }

        // Listen for Facebook connection messages
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'facebook-connected') {
                this.facebookConnected = true;
                this.checkFacebookConnection();
                if (event.data.mock) {
                    this.showToast('Facebook connected (Demo Mode)', 'info');
                } else {
                    this.showToast('Facebook connected successfully!', 'success');
                }

                // After connection, if user wanted to generate posts, continue the flow
                setTimeout(() => {
                    // Navigate back to chat if not already there
                    if (this.currentScreen !== 'chat') {
                        this.showChatScreen(false); // false = don't show welcome message
                    }
                    // Add a message to continue the conversation
                    this.addMessage('assistant', 'Great! Your Facebook account is connected. Now I can help you generate and schedule posts. Would you like me to create a 30-day content calendar for your business?');
                    setTimeout(() => {
                        this.showQuickReplies([
                            'Generate calendar',
                            'Not yet'
                        ]);
                    }, 500);
                }, 1500);
            }
        });
    }

    async checkFacebookConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/api/facebook/status/${this.userId}`);
            const data = await response.json();

            this.facebookConnected = data.connected || false;

            if (data.connected) {
                this.updateFacebookStatus(true);
            }
        } catch (error) {
            console.error('Error checking Facebook connection:', error);
            this.facebookConnected = false;
        }
    }

    async sendWelcomeMessage() {
        // Send a trigger message to get AI welcome message with industry question
        // The AI will respond with greeting and ask about industry
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = 'start';
            await this.sendMessage();
        }
    }

    getIndustryOptionsFromUrl() {
        const url = window.location.href.toLowerCase();
        const keywords = {
            'restaurant': ['restaurant', 'food', 'dining', 'cafe', 'bakery', 'pizza'],
            'fitness': ['fitness', 'gym', 'health', 'wellness', 'yoga'],
            'ecommerce': ['shop', 'store', 'ecommerce', 'retail'],
            'professional': ['service', 'consulting', 'professional', 'agency'],
            'beauty': ['beauty', 'salon', 'spa'],
            'education': ['education', 'school', 'course', 'training'],
            'realestate': ['realestate', 'property', 'home'],
            'technology': ['tech', 'software', 'app', 'digital']
        };

        const detected = [];
        for (const [industry, words] of Object.entries(keywords)) {
            if (words.some(word => url.includes(word))) {
                detected.push(industry);
            }
        }

        const industryMap = {
            'restaurant': 'Restaurant & Food',
            'fitness': 'Fitness & Health',
            'ecommerce': 'E-commerce',
            'professional': 'Professional Services',
            'beauty': 'Beauty & Wellness',
            'education': 'Education & Training',
            'realestate': 'Real Estate',
            'technology': 'Technology & Software'
        };

        const options = detected.map(d => industryMap[d]).filter(Boolean);

        // Add common options if URL-based detection found some
        if (options.length > 0) {
            // Add 2-3 other common options not already included
            const common = ['Restaurant & Food', 'Fitness & Health', 'E-commerce', 'Professional Services'];
            common.forEach(opt => {
                if (!options.includes(opt) && options.length < 5) {
                    options.push(opt);
                }
            });
        } else {
            // No URL context - show diverse options
            options.push('Restaurant & Food', 'Fitness & Health', 'E-commerce', 'Professional Services');
        }

        options.push('Other'); // Always include Other
        return options;
    }

    showChatScreen(showWelcome = true) {
        this.hideAllScreens();
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.display = 'flex';
        chatContainer.classList.add('screen-enter');
        this.currentScreen = 'chat';

        // Only show welcome message if chat is empty and showWelcome is true
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = messagesContainer && messagesContainer.children.length > 0;

        if (showWelcome && !hasMessages) {
            // Trigger AI to send welcome message with industry question
            // This will generate the proper greeting and industry options from AI
            setTimeout(() => {
                this.sendWelcomeMessage();
            }, 300);
        }
    }

    showQuickReplies(replies) {
        const messagesContainer = document.getElementById('chat-messages');
        const suggestionText = document.getElementById('chat-suggestion-text');

        // Show suggestion text
        if (suggestionText) {
            suggestionText.style.display = 'block';
        }

        // Remove any existing quick reply containers to avoid duplicates
        const existingQuickReplies = messagesContainer.querySelectorAll('.quick-replies-container');
        existingQuickReplies.forEach(container => container.remove());

        const quickRepliesContainer = document.createElement('div');
        quickRepliesContainer.className = 'quick-replies-container';

        replies.forEach(reply => {
            const button = document.createElement('button');
            button.className = 'quick-reply-btn';
            button.textContent = reply;
            button.addEventListener('click', () => {
                this.selectQuickReply(reply);
                quickRepliesContainer.remove();
                // Hide suggestion text when a quick reply is selected
                if (suggestionText) {
                    suggestionText.style.display = 'none';
                }
            });
            quickRepliesContainer.appendChild(button);
        });

        messagesContainer.appendChild(quickRepliesContainer);

        // Scroll to show quick replies - ensure DOM is updated first
        setTimeout(() => {
            this.scrollToBottom(true);
        }, 100);
    }

    selectQuickReply(reply) {
        console.log('Quick reply clicked:', reply);
        const input = document.getElementById('chat-input');
        if (input) {
            const replyLower = reply.toLowerCase();
            console.log('Reply lowercase:', replyLower);

            // Handle special quick reply actions with flexible matching

            // Facebook connection actions
            if (replyLower.includes('connect') && replyLower.includes('facebook')) {
                console.log('Detected Connect Facebook - connecting directly');
                // Remove quick replies
                const quickReplyContainers = document.querySelectorAll('.quick-replies-container');
                quickReplyContainers.forEach(container => container.remove());
                // Hide suggestion text
                const suggestionText = document.getElementById('chat-suggestion-text');
                if (suggestionText) {
                    suggestionText.style.display = 'none';
                }

                // Connect Facebook directly without showing connection screen
                this.connectFacebook();
                return;
            }

            // Calendar/Post generation actions
            if ((replyLower.includes('generate') && (replyLower.includes('calendar') || replyLower.includes('post'))) ||
                (replyLower.includes('schedule') && replyLower.includes('post')) ||
                replyLower.includes('create calendar')) {
                // Check if Facebook is connected first
                if (!this.facebookConnected) {
                    this.addMessage('assistant', 'I\'d be happy to help you generate posts! First, let me connect your Facebook account so we can schedule them.');
                    setTimeout(() => {
                        this.connectFacebook();
                    }, 1000);
                } else {
                    // Generate calendar and show posts inline in chat
                    this.generateCalendarInline();
                }
                return;
            }

            // Skip/dismiss actions
            if (replyLower === 'skip for now' || replyLower === 'not yet' ||
                replyLower === 'skip' || replyLower === 'maybe later') {
                // Continue conversation - don't send message, just remove quick replies
                return;
            }

            // Regular quick reply - send as message
            input.value = reply;
            this.sendMessage();
        }
    }

    showConnectionScreen() {
        console.log('showConnectionScreen called');
        this.hideAllScreens();
        const screen = document.getElementById('connection-screen');
        console.log('Connection screen element:', screen);
        if (screen) {
            screen.style.display = 'block';
            screen.classList.add('screen-enter');
            this.currentScreen = 'connection';
            console.log('Connection screen displayed');
        } else {
            console.error('Connection screen element not found!');
        }
    }

    showCalendarScreen() {
        // Double-check Facebook connection before showing calendar
        if (!this.facebookConnected) {
            console.warn('Attempted to show calendar without Facebook connection');
            this.addMessage('assistant', 'Please connect your Facebook account first before generating posts.');
            setTimeout(() => {
                this.showConnectionScreen();
            }, 1000);
            return;
        }

        this.hideAllScreens();
        const screen = document.getElementById('calendar-screen');
        screen.style.display = 'flex';
        screen.classList.add('screen-enter');
        this.currentScreen = 'calendar';

        if (!this.calendar) {
            this.generateCalendar();
        } else {
            this.renderCalendar();
        }
    }

    hideAllScreens() {
        const screens = [
            document.getElementById('welcome-screen'),
            document.getElementById('chat-container'),
            document.getElementById('connection-screen'),
            document.getElementById('calendar-screen')
        ];

        screens.forEach(screen => {
            if (screen) {
                screen.classList.remove('screen-enter');
                screen.style.display = 'none';
            }
        });
    }

    async sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();

        // Allow empty message for welcome trigger
        if (!message && this.currentScreen !== 'chat') {
            return;
        }

        // For welcome message, use a special trigger
        const messagesContainer = document.getElementById('chat-messages');
        const hasMessages = messagesContainer && messagesContainer.children.length > 0;
        const messageToSend = message || (hasMessages ? '' : 'start'); // Use 'start' as trigger for first message

        // Check if user wants to generate posts and Facebook is not connected
        const messageLower = message.toLowerCase();
        if ((messageLower.includes('generate') && messageLower.includes('post')) ||
            messageLower.includes('generate posts') ||
            messageLower.includes('create calendar')) {
            // Check Facebook connection first
            if (!this.facebookConnected) {
                this.addMessage('user', message);
                input.value = '';
                this.addMessage('assistant', 'I\'d be happy to help you generate posts! First, let me connect your Facebook account so we can schedule them. Let me set that up for you...');
                setTimeout(() => {
                    this.showConnectionScreen();
                }, 1000);
                return;
            }
        }

        // Track conversation context
        if (messageLower.includes('restaurant') || messageLower.includes('food') || messageLower.includes('bakery') ||
            messageLower.includes('cafe') || messageLower.includes('italian') || messageLower.includes('mexican')) {
            if (!this.conversationContext.industry) {
                this.conversationContext.industry = 'Restaurant & Food';
            }
            if (messageLower.includes('bakery')) {
                this.conversationContext.businessType = 'Bakery';
            } else if (messageLower.includes('cafe') || messageLower.includes('coffee')) {
                this.conversationContext.businessType = 'Cafe';
            } else if (messageLower.includes('italian')) {
                this.conversationContext.businessType = 'Italian Restaurant';
            } else if (messageLower.includes('mexican')) {
                this.conversationContext.businessType = 'Mexican Restaurant';
            }
        }

        // Add user message to chat (skip if it's the welcome trigger)
        if (messageToSend !== 'start') {
            this.addMessage('user', messageToSend);
        }
        input.value = '';

        // Disable input while processing
        input.disabled = true;
        const sendBtn = document.getElementById('send-btn');
        sendBtn.disabled = true;

        // Create assistant message placeholder for streaming
        const assistantMessageId = this.addMessage('assistant', '', true);
        const assistantMessageEl = document.querySelector(`[data-message-id="${assistantMessageId}"] .message-content`);

        let fullResponse = '';

        try {
            // Use streaming endpoint
            const response = await fetch(`${this.apiUrl}/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: messageToSend,
                    sessionId: this.sessionId,
                    userId: this.userId,
                    url: window.location.href,
                    referrer: document.referrer
                })
            });

            if (!response.ok) {
                throw new Error('Streaming request failed');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);

                        if (data === '[DONE]') {
                            // Stream complete
                            break;
                        }

                        try {
                            const parsed = JSON.parse(data);

                            if (parsed.type === 'chunk') {
                                // Add character by character
                                fullResponse += parsed.content;
                                if (assistantMessageEl) {
                                    // Remove typing indicator if present
                                    const typingIndicator = assistantMessageEl.querySelector('.typing-indicator-container');
                                    if (typingIndicator) {
                                        typingIndicator.remove();
                                    }
                                    assistantMessageEl.textContent = fullResponse;
                                    // Scroll to bottom during streaming (auto scroll for better UX during typing)
                                    this.scrollToBottom(false);
                                }
                            } else if (parsed.type === 'done') {
                                // Final response with quick replies
                                fullResponse = parsed.fullResponse || fullResponse;
                                if (assistantMessageEl) {
                                    assistantMessageEl.textContent = fullResponse;
                                }

                                // Scroll after content update
                                this.scrollToBottom(true);

                                // Show dynamically generated quick replies if available
                                if (parsed.quickReplies && Array.isArray(parsed.quickReplies) && parsed.quickReplies.length > 0) {
                                    setTimeout(() => {
                                        this.showQuickReplies(parsed.quickReplies);
                                    }, 500);
                                }
                            } else if (parsed.type === 'error') {
                                throw new Error(parsed.error || 'Unknown error');
                            }
                        } catch (e) {
                            // Skip invalid JSON
                            continue;
                        }
                    }
                }
            }

        } catch (error) {
            console.error('Error sending message:', error);
            if (assistantMessageEl) {
                assistantMessageEl.textContent = 'Sorry, I encountered an error. Please try again.';
            } else {
                this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            }
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            input.focus();
        }
    }

    addMessage(role, content, isStreaming = false, isGreeting = false) {
        const messagesContainer = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role} message-enter`;

        // Generate unique ID for streaming messages
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        messageDiv.setAttribute('data-message-id', messageId);

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';

        if (role === 'user') {
            // Use SVG icon for user
            avatar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="white"/>
                    <path d="M10 12C5.58172 12 2 13.7909 2 16V20H18V16C18 13.7909 14.4183 12 10 12Z" fill="white"/>
                </svg>
            `;
        } else {
            // Use copilot icon for assistant (matching header theme)
            avatar.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.7383 5.33367L13.265 4.16701L14.4317 3.64034C14.6917 3.52034 14.6917 3.15367 14.4317 3.03367L13.265 2.50701L12.7383 1.33367C12.6183 1.07367 12.2517 1.07367 12.1317 1.33367L11.605 2.50034L10.4317 3.02701C10.1717 3.14701 10.1717 3.51367 10.4317 3.63367L11.5983 4.16034L12.125 5.33367C12.245 5.59367 12.6183 5.59367 12.7383 5.33367ZM7.43167 6.33367L6.37167 4.00034C6.13833 3.48034 5.39167 3.48034 5.15833 4.00034L4.09833 6.33367L1.765 7.39367C1.245 7.63367 1.245 8.37367 1.765 8.60701L4.09833 9.66701L5.15833 12.0003C5.39833 12.5203 6.13833 12.5203 6.37167 12.0003L7.43167 9.66701L9.765 8.60701C10.285 8.367 10.285 7.62701 9.765 7.39367L7.43167 6.33367ZM12.125 10.667L11.5983 11.8337L10.4317 12.3603C10.1717 12.4803 10.1717 12.847 10.4317 12.967L11.5983 13.4937L12.125 14.667C12.245 14.927 12.6117 14.927 12.7317 14.667L13.2583 13.5003L14.4317 12.9737C14.6917 12.8537 14.6917 12.487 14.4317 12.367L13.265 11.8403L12.7383 10.667C12.6183 10.407 12.245 10.407 12.125 10.667Z" fill="#6938EF"/>
                </svg>
            `;
        }

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';

        // Add greeting class for purple styling
        if (isGreeting) {
            messageContent.classList.add('greeting');
        }

        if (isStreaming && role === 'assistant') {
            // Show typing indicator
            const typingIndicator = document.createElement('div');
            typingIndicator.className = 'typing-indicator-container';
            typingIndicator.innerHTML = `
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            `;
            messageContent.appendChild(typingIndicator);
        } else {
            messageContent.textContent = content;
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        messagesContainer.appendChild(messageDiv);

        // Scroll to bottom with smooth behavior
        this.scrollToBottom(true);

        // Remove enter animation class after animation
        setTimeout(() => {
            messageDiv.classList.remove('message-enter');
        }, 300);

        return messageId;
    }

    async connectFacebook() {
        try {
            this.showLoading('Connecting to Facebook...');

            const response = await this.fetchWithRetry(`${this.apiUrl}/api/facebook/auth-url?userId=${this.userId}`);
            const data = await response.json();

            if (data.authUrl) {
                // Open Facebook OAuth in new window
                const authWindow = window.open(
                    data.authUrl,
                    'Facebook Login',
                    'width=600,height=700,scrollbars=yes'
                );

                if (data.mock) {
                    this.showToast('Opening Facebook connection (Demo Mode)', 'info');
                }

                // Poll for window close (user completed OAuth)
                // Note: The facebook-connected message handler will handle the success
                let checkCount = 0;
                const maxChecks = 120; // 60 seconds (120 checks * 500ms)

                const checkClosed = setInterval(() => {
                    checkCount++;

                    // Check if window is closed or timeout reached
                    if (authWindow.closed || checkCount >= maxChecks) {
                        clearInterval(checkClosed);
                        this.hideLoading();

                        if (checkCount >= maxChecks) {
                            console.warn('Facebook OAuth popup check timeout');
                            this.showToast('Connection timeout. Please try again.', 'error');
                        }

                        this.checkFacebookConnection();

                        // Don't call showChatScreen() here - it resets the conversation
                        // The message handler will show the success toast and preserve conversation
                        // If we're not in chat screen, navigate back to chat without resetting
                        if (this.currentScreen !== 'chat') {
                            this.showChatScreen(false); // false = don't show welcome message
                        }
                    }
                }, 500);
            } else {
                throw new Error('Failed to get auth URL');
            }
        } catch (error) {
            console.error('Error connecting Facebook:', error);
            this.hideLoading();
            this.showToast('Failed to connect Facebook. Please check your configuration.', 'error', () => {
                this.connectFacebook();
            });
        }
    }

    async generateCalendarInline() {
        try {
            // Show loading message in chat
            this.addMessage('assistant', 'Generating your 30-day content calendar... This may take a moment.');

            const response = await this.fetchWithRetry(`${this.apiUrl}/api/calendar/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const data = await response.json();

            if (data.success && data.calendar) {
                this.calendar = data.calendar;

                // Show success message
                this.addMessage('assistant', `Great! I've generated ${data.calendar.length} posts for your 30-day calendar. Here they are:`);

                // Display posts inline in chat
                setTimeout(() => {
                    this.displayPostsInChat(data.calendar);
                }, 500);
            } else {
                throw new Error(data.error || 'Failed to generate calendar');
            }
        } catch (error) {
            console.error('Error generating calendar:', error);
            this.addMessage('assistant', 'Sorry, I encountered an error generating your calendar. Please try again.');
        }
    }

    displayPostsInChat(posts) {
        const messagesContainer = document.getElementById('chat-messages');
        if (!messagesContainer) return;

        // Group posts by 7-day weeks starting from today
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        
        const weeks = [];
        const weekMap = new Map(); // Map to track which week each post belongs to
        
        posts.forEach((post, index) => {
            const postDate = new Date(post.date);
            postDate.setHours(0, 0, 0, 0);
            
            // Calculate days from today
            const daysFromToday = Math.floor((postDate - today) / (1000 * 60 * 60 * 24));
            
            // Determine which week (0-indexed, 7 days per week)
            const weekIndex = Math.floor(daysFromToday / 7);
            
            if (!weekMap.has(weekIndex)) {
                weekMap.set(weekIndex, []);
            }
            weekMap.get(weekIndex).push({ ...post, index });
        });
        
        // Convert map to sorted array of weeks
        const sortedWeekIndices = Array.from(weekMap.keys()).sort((a, b) => a - b);
        sortedWeekIndices.forEach(weekIndex => {
            weeks.push(weekMap.get(weekIndex));
        });

        // Create accordion for each week
        weeks.forEach((weekPosts, weekIndex) => {
            if (weekPosts.length === 0) return;

            const weekNum = weekIndex + 1;
            
            // Calculate week start and end dates (7 days starting from today)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekStartDate = new Date(today);
            weekStartDate.setDate(today.getDate() + (weekIndex * 7));
            const weekEndDate = new Date(weekStartDate);
            weekEndDate.setDate(weekStartDate.getDate() + 6);
            
            // Use calculated week dates for display (always 7 days per week)
            const firstDate = weekStartDate;
            const lastDate = weekEndDate;

            // Create accordion container
            const accordionContainer = document.createElement('div');
            accordionContainer.className = 'message assistant week-accordion';
            accordionContainer.dataset.weekNum = weekNum;
            
            // Create message content wrapper (to match message structure)
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content week-accordion-wrapper';
            
            // Week header (clickable)
            const weekHeader = document.createElement('div');
            weekHeader.className = 'week-accordion-header';
            weekHeader.innerHTML = `
                <div class="week-header-content">
                    <span class="week-number">Week ${weekNum}</span>
                    <span class="week-date-range">${firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span class="week-post-count">${weekPosts.length} posts</span>
                    <span class="week-accordion-icon">▼</span>
                </div>
            `;
            
            // Week content (collapsed by default)
            const weekContent = document.createElement('div');
            weekContent.className = 'week-accordion-content';
            weekContent.style.display = 'none'; // Collapsed by default
            
            // Create a container for posts to ensure proper layout
            const postsContainer = document.createElement('div');
            postsContainer.className = 'week-posts-container';
            
            // Add posts to week content
            weekPosts.forEach(post => {
                const postMessage = this.createPostMessage(post, post.index);
                postsContainer.appendChild(postMessage);
            });
            
            weekContent.appendChild(postsContainer);

            // Toggle functionality
            weekHeader.addEventListener('click', () => {
                const isExpanded = weekContent.style.display !== 'none';
                weekContent.style.display = isExpanded ? 'none' : 'block';
                const icon = weekHeader.querySelector('.week-accordion-icon');
                if (icon) {
                    icon.textContent = isExpanded ? '▼' : '▲';
                }
                weekHeader.classList.toggle('expanded', !isExpanded);
                
                // Scroll to show the expanded content
                if (!isExpanded) {
                    setTimeout(() => {
                        weekHeader.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 100);
                }
            });

            messageContent.appendChild(weekHeader);
            messageContent.appendChild(weekContent);
            accordionContainer.appendChild(messageContent);
            messagesContainer.appendChild(accordionContainer);
        });

        // Add action buttons at the end
        const actionsMessage = document.createElement('div');
        actionsMessage.className = 'message assistant';
        actionsMessage.innerHTML = `
            <div class="post-actions">
                <button class="primary-btn" id="schedule-all-inline-btn">Schedule All Posts</button>
                <button class="secondary-btn" id="view-calendar-inline-btn">View Calendar</button>
            </div>
        `;
        messagesContainer.appendChild(actionsMessage);

        // Add event listeners
        const scheduleAllBtn = document.getElementById('schedule-all-inline-btn');
        const viewCalendarBtn = document.getElementById('view-calendar-inline-btn');

        if (scheduleAllBtn) {
            scheduleAllBtn.addEventListener('click', () => {
                this.scheduleAllPosts();
            });
        }

        if (viewCalendarBtn) {
            viewCalendarBtn.addEventListener('click', () => {
                this.showCalendarScreen();
            });
        }

        // Scroll to bottom - ensure DOM is updated first
        setTimeout(() => {
            this.scrollToBottom(true);
        }, 100);
    }

    createPostMessage(post, index) {
        const postDiv = document.createElement('div');
        postDiv.className = 'message assistant post-message';

        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const hashtagsHtml = (post.hashtags || []).map(tag =>
            `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
        ).join('');

        postDiv.innerHTML = `
            <div class="post-card">
                <div class="post-header">
                    <span class="post-date">${formattedDate}</span>
                    <span class="post-type-badge">${post.type || 'General'}</span>
                </div>
                <div class="post-theme"><strong>${post.theme || 'Post Theme'}</strong></div>
                <div class="post-caption">${post.caption || ''}</div>
                <div class="post-hashtags">${hashtagsHtml}</div>
                <div class="post-actions-inline">
                    <button class="btn-edit-inline" data-post-id="${post.id || index}">✏️ Edit</button>
                    <button class="btn-preview-inline" data-post-id="${post.id || index}">👁️ Preview</button>
                    <button class="btn-schedule-inline ${post.scheduled ? 'btn-scheduled' : ''}" 
                            data-post-id="${post.id || index}"
                            data-post-date="${post.date}"
                            ${post.scheduled ? 'disabled' : ''}>
                        ${post.scheduled ? '✓ Scheduled' : 'Schedule'}
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        const editBtn = postDiv.querySelector('.btn-edit-inline');
        const previewBtn = postDiv.querySelector('.btn-preview-inline');
        const scheduleBtn = postDiv.querySelector('.btn-schedule-inline');

        if (editBtn) {
            editBtn.addEventListener('click', () => this.editPost(post, index));
        }
        if (previewBtn) {
            previewBtn.addEventListener('click', () => this.previewPost(post));
        }
        if (scheduleBtn && !post.scheduled) {
            scheduleBtn.addEventListener('click', () => this.schedulePost(post, index));
        }

        return postDiv;
    }

    async generateCalendar() {
        try {
            // Only show one loading indicator - use calendar-loading, not the overlay
            const loadingEl = document.getElementById('calendar-loading');
            const progressFill = document.getElementById('progress-fill');
            const calendarGrid = document.getElementById('calendar-grid');

            // Hide buttons during generation
            const scheduleAllBtn = document.getElementById('schedule-all-btn');
            const backToChatBtn = document.getElementById('back-to-chat-btn');
            const regenerateBtn = document.getElementById('generate-calendar-btn');
            const maximizeBtn = document.getElementById('maximize-calendar-btn');

            if (scheduleAllBtn) scheduleAllBtn.disabled = true;
            if (backToChatBtn) backToChatBtn.disabled = true;
            if (regenerateBtn) regenerateBtn.disabled = true;
            if (maximizeBtn) maximizeBtn.disabled = true;

            if (loadingEl) {
                loadingEl.style.display = 'block';
                const loadingText = loadingEl.querySelector('p') || loadingEl;
                if (loadingText) loadingText.textContent = 'Generating your 30-day content calendar...';
            }

            // Show loading skeleton
            if (calendarGrid) {
                calendarGrid.innerHTML = '';
                for (let i = 0; i < 6; i++) {
                    const skeleton = document.createElement('div');
                    skeleton.className = 'calendar-skeleton';
                    calendarGrid.appendChild(skeleton);
                }
            }

            // Simulate progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += 2;
                if (progressFill) {
                    progressFill.style.width = `${Math.min(progress, 90)}%`;
                }
            }, 100);

            const response = await this.fetchWithRetry(`${this.apiUrl}/api/calendar/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            clearInterval(progressInterval);
            if (progressFill) progressFill.style.width = '100%';

            const data = await response.json();

            if (data.success && data.calendar) {
                this.calendar = data.calendar;
                if (data.mock) {
                    this.showToast('Calendar generated (Demo Mode)', 'info');
                } else {
                    this.showToast('Calendar generated successfully!', 'success');
                }
                this.renderCalendar();
            } else {
                throw new Error(data.error || 'Failed to generate calendar');
            }
        } catch (error) {
            console.error('Error generating calendar:', error);
            this.showToast('Failed to generate calendar. Please try again.', 'error', () => {
                this.generateCalendar();
            });
        } finally {
            // Only hide calendar-loading, not the overlay (we didn't use it)
            const loadingEl = document.getElementById('calendar-loading');
            if (loadingEl) loadingEl.style.display = 'none';

            // Re-enable buttons after generation completes (success or error)
            const scheduleAllBtn = document.getElementById('schedule-all-btn');
            const backToChatBtn = document.getElementById('back-to-chat-btn');
            const regenerateBtn = document.getElementById('generate-calendar-btn');
            const maximizeBtn = document.getElementById('maximize-calendar-btn');

            if (scheduleAllBtn) scheduleAllBtn.disabled = false;
            if (backToChatBtn) backToChatBtn.disabled = false;
            if (regenerateBtn) regenerateBtn.disabled = false;
            if (maximizeBtn) maximizeBtn.disabled = false;
        }
    }

    // Fetch with retry mechanism
    async fetchWithRetry(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);

            if (!response.ok && retryCount < this.maxRetries) {
                throw new Error(`HTTP ${response.status}`);
            }

            return response;
        } catch (error) {
            if (retryCount < this.maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchWithRetry(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    renderCalendar() {
        console.log('📅 renderCalendar() called, calendar posts:', this.calendar?.length || 0);
        const calendarGrid = document.getElementById('calendar-grid');

        if (!calendarGrid) {
            console.error('❌ Calendar grid element not found!');
            return;
        }

        if (!this.calendar || this.calendar.length === 0) {
            console.warn('⚠️  No calendar data to render');
            calendarGrid.innerHTML = '<p class="empty-state">No calendar data available.</p>';
            return;
        }

        // Clear existing content
        calendarGrid.innerHTML = '';
        console.log('✅ Calendar grid cleared, rendering calendar...');

        // Get the date range from posts
        const dates = this.calendar.map(post => new Date(post.date));
        const startDate = new Date(Math.min(...dates));
        const endDate = new Date(Math.max(...dates));
        console.log(`📆 Date range: ${startDate.toDateString()} to ${endDate.toDateString()}`);

        // Get the first day of the month and adjust to start on Sunday
        const firstDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
        const startDay = new Date(firstDayOfMonth);
        startDay.setDate(startDay.getDate() - startDay.getDay()); // Go back to Sunday

        // Get the last day of the month and adjust to end on Saturday
        const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        const endDay = new Date(lastDayOfMonth);
        endDay.setDate(endDay.getDate() + (6 - endDay.getDay())); // Go forward to Saturday

        // Create a map of posts by date
        const postsByDate = {};
        this.calendar.forEach((post, index) => {
            const dateKey = new Date(post.date).toDateString();
            if (!postsByDate[dateKey]) {
                postsByDate[dateKey] = [];
            }
            postsByDate[dateKey].push({ ...post, index });
        });

        // Create calendar days
        const currentDay = new Date(startDay);
        const today = new Date().toDateString();

        while (currentDay <= endDay) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day';

            const dateKey = currentDay.toDateString();
            const isOtherMonth = currentDay.getMonth() !== startDate.getMonth();
            const isToday = dateKey === today;
            const postsForDay = postsByDate[dateKey] || [];

            if (isOtherMonth) {
                dayCell.classList.add('other-month');
            }
            if (isToday) {
                dayCell.classList.add('today');
            }
            if (postsForDay.length > 0) {
                dayCell.classList.add('has-post');
            }

            // Day number
            const dayNumber = document.createElement('div');
            dayNumber.className = 'day-number';
            dayNumber.textContent = currentDay.getDate();
            dayCell.appendChild(dayNumber);

            // Add posts for this day
            postsForDay.forEach(post => {
                const postEl = this.createDayPost(post, post.index);
                dayCell.appendChild(postEl);
            });

            calendarGrid.appendChild(dayCell);

            // Move to next day
            currentDay.setDate(currentDay.getDate() + 1);
        }

        console.log(`✅ Calendar rendered successfully with ${calendarGrid.children.length} day cells`);
    }

    createDayPost(post, index) {
        const postEl = document.createElement('div');
        postEl.className = 'day-post';
        postEl.dataset.postId = post.id || `post-${index}`;

        const typeBadge = document.createElement('div');
        typeBadge.className = 'post-type-badge';
        typeBadge.textContent = post.type || 'General';

        const title = document.createElement('div');
        title.className = 'post-title';
        title.textContent = post.theme || 'Post';

        const preview = document.createElement('div');
        preview.className = 'post-preview';
        preview.textContent = this.truncateText(post.caption || '', 50);

        postEl.appendChild(typeBadge);
        postEl.appendChild(title);
        postEl.appendChild(preview);

        // Click to view details
        postEl.addEventListener('click', () => {
            this.showPostModal(post, index);
        });

        return postEl;
    }

    // Create calendar item (grid or list)
    createCalendarItem(post, index, viewType) {
        const item = document.createElement('div');
        item.className = `calendar-item calendar-item-${viewType}`;
        item.id = `post-${post.id || index}`;
        item.dataset.postId = post.id || `post-${index}`;

        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });

        const hashtagsHtml = (post.hashtags || []).map(tag =>
            `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
        ).join('');

        item.innerHTML = `
            <div class="calendar-item-header">
                <span class="calendar-item-date">${formattedDate}</span>
                <span class="calendar-item-type">${post.type || 'General'}</span>
            </div>
            <div class="calendar-item-theme">${post.theme || 'Post Theme'}</div>
            <div class="calendar-item-caption">${this.truncateText(post.caption || '', viewType === 'list' ? 200 : 150)}</div>
            <div class="calendar-item-hashtags">${hashtagsHtml}</div>
            <div class="calendar-item-actions">
                <button class="btn-edit" data-post-id="${post.id || index}" title="Edit post">
                    ✏️ Edit
                </button>
                <button class="btn-preview" data-post-id="${post.id || index}" title="Preview post">
                    👁️ Preview
                </button>
                <button class="btn-schedule ${post.scheduled ? 'btn-scheduled' : ''}" 
                        data-post-id="${post.id || index}"
                        data-post-date="${post.date}"
                        ${post.scheduled || post._scheduling ? 'disabled' : ''}>
                    ${post._scheduling ? 'Scheduling...' : (post.scheduled ? '✓ Scheduled' : 'Schedule')}
                </button>
            </div>
        `;

        // Add event listeners - use one-time handlers to prevent duplicates
        const editBtn = item.querySelector('.btn-edit');
        const previewBtn = item.querySelector('.btn-preview');
        const scheduleBtn = item.querySelector('.btn-schedule');

        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editPost(post, index);
            });
        }
        if (previewBtn) {
            previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.previewPost(post);
            });
        }
        if (scheduleBtn && !post.scheduled && !post._scheduling) {
            scheduleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                // Prevent multiple clicks
                if (post._scheduling) return;
                this.schedulePost(post, index);
            });
        }

        return item;
    }

    // Update individual post button state (for scheduling updates)
    updatePostButtonState(post, index) {
        // Find all buttons for this post (grid and list views)
        // Use both class and data attribute selector
        const postId = post.id || `post-${index}`;
        const buttons = document.querySelectorAll(`.btn-schedule[data-post-id="${postId}"]`);

        console.log(`Updating button state for post ${postId}, scheduled: ${post.scheduled}, _scheduling: ${post._scheduling}, found ${buttons.length} buttons`);

        if (buttons.length === 0) {
            console.warn(`No buttons found for post ${postId}, re-rendering calendar`);
            // If buttons don't exist yet, re-render the calendar
            this.renderCalendar();
            return;
        }

        buttons.forEach(btn => {
            if (post.scheduled) {
                btn.textContent = '✓ Scheduled';
                btn.classList.add('btn-scheduled');
                btn.disabled = true;
                btn.classList.remove('btn-primary'); // Remove primary styling if present
                // Remove click handler since it's disabled
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            } else if (post._scheduling) {
                btn.textContent = 'Scheduling...';
                btn.disabled = true;
            } else {
                btn.textContent = 'Schedule';
                btn.classList.remove('btn-scheduled');
                btn.disabled = false;
            }
        });

        // Ensure calendar array state is synced
        if (this.calendar && this.calendar[index]) {
            this.calendar[index].scheduled = post.scheduled;
            this.calendar[index]._scheduling = post._scheduling;
        }
    }

    // Toggle calendar view (grid/list)
    toggleMaximizeCalendar() {
        const calendarScreen = document.getElementById('calendar-screen');
        const maximizeBtn = document.getElementById('maximize-calendar-btn');

        if (calendarScreen.classList.contains('maximized')) {
            calendarScreen.classList.remove('maximized');
            if (maximizeBtn) maximizeBtn.textContent = '⛶';
            if (maximizeBtn) maximizeBtn.title = 'Maximize';
        } else {
            calendarScreen.classList.add('maximized');
            if (maximizeBtn) maximizeBtn.textContent = '🗗';
            if (maximizeBtn) maximizeBtn.title = 'Restore';
        }
    }

    showPostModal(post, index) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10001;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 24px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        `;

        const date = new Date(post.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });

        const hashtagsHtml = (post.hashtags || []).map(tag =>
            `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
        ).join('');

        modalContent.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h3 style="margin: 0; color: #1f2937;">${post.theme || 'Post Details'}</h3>
                <button class="close-modal-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
            </div>
            <div style="background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 600; color: #374151;">${formattedDate}</span>
                    <span style="background: #ede9fe; color: #7c3aed; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;">${post.type || 'General'}</span>
                </div>
            </div>
            <div style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
                ${post.caption || ''}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                ${hashtagsHtml}
            </div>
            <div style="display: flex; gap: 12px;">
                <button class="btn-edit-modal primary-btn" style="flex: 1;">✏️ Edit</button>
                <button class="btn-preview-modal secondary-btn" style="flex: 1;">👁️ Preview</button>
                <button class="btn-schedule-modal primary-btn" style="flex: 1;" ${post.scheduled ? 'disabled' : ''}>
                    ${post.scheduled ? '✓ Scheduled' : 'Schedule'}
                </button>
            </div>
        `;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        // Event listeners
        modal.querySelector('.close-modal-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.querySelector('.btn-edit-modal').addEventListener('click', () => {
            modal.remove();
            this.editPost(post, index);
        });

        modal.querySelector('.btn-preview-modal').addEventListener('click', () => {
            modal.remove();
            this.previewPost(post);
        });

        const scheduleBtn = modal.querySelector('.btn-schedule-modal');
        if (scheduleBtn && !post.scheduled) {
            scheduleBtn.addEventListener('click', () => {
                modal.remove();
                this.schedulePost(post, index);
            });
        }

        // Close on overlay click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // Helper: Truncate text
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Edit post
    editPost(post, index) {
        const modal = this.createEditModal(post, index);
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    createEditModal(post, index) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Post</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Theme</label>
                        <input type="text" id="edit-theme" value="${(post.theme || '').replace(/"/g, '&quot;')}" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Caption</label>
                        <textarea id="edit-caption" class="form-textarea" rows="5">${(post.caption || '').replace(/"/g, '&quot;')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select id="edit-type" class="form-select">
                            <option value="Educational" ${post.type === 'Educational' ? 'selected' : ''}>Educational</option>
                            <option value="Promotional" ${post.type === 'Promotional' ? 'selected' : ''}>Promotional</option>
                            <option value="Inspirational" ${post.type === 'Inspirational' ? 'selected' : ''}>Inspirational</option>
                            <option value="Behind-the-Scenes" ${post.type === 'Behind-the-Scenes' ? 'selected' : ''}>Behind-the-Scenes</option>
                            <option value="User-Generated" ${post.type === 'User-Generated' ? 'selected' : ''}>User-Generated</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Hashtags (comma-separated)</label>
                        <input type="text" id="edit-hashtags" value="${(post.hashtags || []).join(', ')}" class="form-input">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="secondary-btn" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                    <button class="primary-btn" id="save-post-btn">Save Changes</button>
                </div>
            </div>
        `;

        const saveBtn = modal.querySelector('#save-post-btn');
        saveBtn.addEventListener('click', async () => {
            const updates = {
                theme: modal.querySelector('#edit-theme').value,
                caption: modal.querySelector('#edit-caption').value,
                type: modal.querySelector('#edit-type').value,
                hashtags: modal.querySelector('#edit-hashtags').value.split(',').map(t => t.trim()).filter(t => t)
            };

            // Update local calendar
            this.calendar[index] = { ...this.calendar[index], ...updates };

            // Save to backend
            try {
                await this.fetchWithRetry(`${this.apiUrl}/api/calendar/post/${post.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: this.userId, updates })
                });
                this.showToast('Post updated successfully!', 'success');
                this.renderCalendar();
                modal.remove();
            } catch (error) {
                this.showToast('Failed to update post', 'error');
            }
        });

        return modal;
    }

    // Preview post
    previewPost(post) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content modal-preview">
                <div class="modal-header">
                    <h3>Post Preview</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="post-preview">
                        <div class="preview-header">
                            <div class="preview-avatar">📱</div>
                            <div>
                                <div class="preview-name">Your Business Page</div>
                                <div class="preview-date">${new Date(post.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                            </div>
                        </div>
                        <div class="preview-content">
                            <div class="preview-theme">${post.theme || 'Post Theme'}</div>
                            <div class="preview-caption">${post.caption || ''}</div>
                            <div class="preview-hashtags">
                                ${(post.hashtags || []).map(tag =>
            `<span class="hashtag">${tag.startsWith('#') ? tag : '#' + tag}</span>`
        ).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="primary-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'flex';
    }

    // Toast notifications
    showToast(message, type = 'success', retryCallback = null) {
        const toast = document.getElementById(`${type === 'error' ? 'error' : 'success'}-toast`);
        const messageEl = document.getElementById(`${type === 'error' ? 'error' : 'success'}-message`);
        const retryBtn = document.getElementById('error-retry-btn');

        if (!toast || !messageEl) {
            // Fallback to alert if toast elements don't exist
            alert(message);
            return;
        }

        messageEl.textContent = message;
        toast.style.display = 'flex';
        toast.className = `toast toast-${type}`;

        if (type === 'error' && retryCallback && retryBtn) {
            retryBtn.style.display = 'block';
            retryBtn.onclick = () => {
                toast.style.display = 'none';
                retryCallback();
            };
        } else if (retryBtn) {
            retryBtn.style.display = 'none';
        }

        // Auto-hide after 5 seconds
        setTimeout(() => {
            toast.style.display = 'none';
        }, 5000);
    }

    async schedulePost(post, index) {
        // Prevent duplicate calls - check if already scheduling
        if (post._scheduling) {
            console.log('Post is already being scheduled, skipping duplicate call');
            return;
        }

        // Mark as scheduling to prevent duplicates
        post._scheduling = true;

        try {
            this.showLoading('Scheduling post...');

            const response = await this.fetchWithRetry(`${this.apiUrl}/api/scheduling/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    postId: post.id || `post-${index}`,
                    date: post.date,
                    caption: post.caption,
                    hashtags: post.hashtags
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || errorData.error || 'Failed to schedule post');
            }

            const data = await response.json();

            if (data.success) {
                // Update post state in calendar array first - this is the source of truth
                if (this.calendar && this.calendar[index]) {
                    this.calendar[index].scheduled = true;
                    this.calendar[index]._scheduling = false;
                }
                // Update local post object reference
                post.scheduled = true;
                post._scheduling = false; // Clear scheduling flag

                let message = 'Post scheduled successfully!';
                if (data.adjusted) {
                    message += ` (${data.adjusted})`;
                }
                this.showToast(message, 'success');

                // Use the calendar array post (source of truth) for button update
                const calendarPost = this.calendar && this.calendar[index] ? this.calendar[index] : post;
                this.updatePostButtonState(calendarPost, index);

                // Don't call renderCalendar() - it will recreate everything and might overwrite
                // The button state is already updated above
            } else {
                throw new Error(data.error || data.message || 'Failed to schedule post');
            }
        } catch (error) {
            console.error('Error scheduling post:', error);
            const errorMessage = error.message || 'Failed to schedule post. Please ensure Facebook is connected and the scheduled time is at least 10 minutes in the future.';
            this.showToast(errorMessage, 'error', () => {
                // Reset scheduling flag on retry
                post._scheduling = false;
                this.schedulePost(post, index);
            });
        } finally {
            // Only clear the scheduling flag if not successfully scheduled
            // (success case already handled above and state is already updated)
            if (!post.scheduled) {
                post._scheduling = false;
                // Update in calendar array too
                if (this.calendar && this.calendar[index]) {
                    this.calendar[index]._scheduling = false;
                }
                this.updatePostButtonState(post, index);
            }
            this.hideLoading();
        }
    }

    async scheduleAllPosts() {
        if (!this.calendar || this.calendar.length === 0) {
            alert('No posts to schedule.');
            return;
        }

        const unscheduledPosts = this.calendar.filter(p => !p.scheduled);
        if (unscheduledPosts.length === 0) {
            alert('All posts are already scheduled.');
            return;
        }

        if (!confirm(`Schedule ${unscheduledPosts.length} posts?`)) {
            return;
        }

        try {
            this.showLoading(`Scheduling ${unscheduledPosts.length} posts...`);

            const response = await fetch(`${this.apiUrl}/api/scheduling/schedule-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    posts: unscheduledPosts.map((post, index) => ({
                        id: post.id || `post-${index}`,
                        date: post.date,
                        caption: post.caption,
                        hashtags: post.hashtags
                    }))
                })
            });

            const data = await response.json();

            if (data.success) {
                alert(`Successfully scheduled ${data.succeeded} posts!`);
                // Refresh calendar view
                this.renderCalendar();
            } else {
                throw new Error('Failed to schedule posts');
            }
        } catch (error) {
            console.error('Error scheduling posts:', error);
            alert('Failed to schedule some posts. Please check your Facebook connection.');
        } finally {
            this.hideLoading();
        }
    }

    updateFacebookStatus(connected) {
        // Update UI to reflect Facebook connection status
        const statusIndicator = document.getElementById('status-indicator');
        if (statusIndicator && connected) {
            statusIndicator.textContent = 'Facebook Connected';
        }
    }

    showLoading(message) {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            const p = overlay.querySelector('p') || document.getElementById('loading-message');
            if (p && message) {
                p.textContent = message;
            }
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    closeWidget() {
        // In HighLevel, this would close/minimize the widget
        if (window.parent !== window) {
            // If embedded in iframe, communicate with parent
            window.parent.postMessage({ type: 'closeCopilot' }, '*');
        } else {
            // Standalone mode - hide widget
            document.getElementById('copilot-widget').style.display = 'none';
        }
    }
}

// Initialize widget when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.copilotWidget = new CopilotWidget();
        window.widget = window.copilotWidget; // Alias for easier access
    });
} else {
    window.copilotWidget = new CopilotWidget();
    window.widget = window.copilotWidget; // Alias for easier access
}

// Listen for test commands from parent window
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'test-connection-screen') {
        console.log('📨 Received test command: show connection screen');
        if (window.widget) {
            window.widget.showConnectionScreen();
        }
    }
});

// Export for use in HighLevel Custom JS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CopilotWidget;
}
