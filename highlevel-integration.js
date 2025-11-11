/**
 * HighLevel Copilot Integration
 * 
 * Professional integration for HighLevel sandbox environment
 * 
 * INSTRUCTIONS:
 * 1. Deploy backend to Vercel (see VERCEL_DEPLOYMENT.md)
 * 2. Copy your Vercel deployment URL
 * 3. In HighLevel: Settings > Company > Custom JavaScript & Custom CSS
 *    (For Agency view - this is where Custom JS is located)
 * 4. Paste the CSS from highlevel-integration.css into the "Custom CSS" section
 * 5. Paste this JavaScript code into the "Custom JS" section
 * 6. Update COPILOT_API_URL below (line ~40) with your Vercel URL
 * 7. After each Vercel deployment, update widgetVersion (line ~117) to force cache refresh
 *    Example: Change 'v1.0.3' to 'v1.0.4' after deploying new changes
 * 8. Save and reload HighLevel
 * 
 * IMPORTANT: Based on HighLevel documentation:
 * - Custom JS and CSS are in separate sections in Settings > Company > Custom JavaScript & Custom CSS
 * - Code must be self-contained (no remote file references)
 * - HighLevel will automatically wrap this in <script> tags, so don't include them
 * 
 * DESIGN:
 * - Purple gradient button (matches widget design: #667eea to #764ba2)
 * - Widget starts directly in chat mode (no welcome screen)
 * - Modern design with smooth animations and transitions
 * - Responsive for mobile devices
 * 
 * The Copilot will appear as a floating button (✨ Ask AI) in the bottom-right corner of HighLevel's interface
 */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION - UPDATE THESE VALUES
    // ============================================

    // Your Vercel deployment URL (or localhost for dev)
    // IMPORTANT: Replace with your actual Vercel URL after deployment
    // Example: const COPILOT_API_URL = 'https://your-app.vercel.app';
    const COPILOT_API_URL = 'https://hands-on-ai.vercel.app'; // ⚠️ UPDATE THIS with your Vercel URL!

    // For local development, use:
    // const COPILOT_API_URL = 'http://localhost:3000';

    // Try to get HighLevel user ID from window context
    const getHighLevelUserId = () => {
        // Try multiple ways to get HighLevel user ID
        if (window.HIGHLVL_USER_ID) return window.HIGHLVL_USER_ID;
        if (window.gohighlevel?.user?.id) return window.gohighlevel.user.id;
        if (window.location?.search) {
            const params = new URLSearchParams(window.location.search);
            const userId = params.get('userId') || params.get('user_id');
            if (userId) return userId;
        }
        // Fallback: generate unique ID
        return 'hl_user_' + Date.now() + '_' + Math.random().toString(36).substring(7);
    };

    const COPILOT_USER_ID = getHighLevelUserId();

    // Widget styling configuration (matches latest widget design)
    const WIDGET_CONFIG = {
        position: 'bottom-right',
        width: '420px',
        height: '650px',
        zIndex: 999999, // High z-index to appear above HighLevel UI
        buttonSize: '64px',
        buttonOffset: '24px',
        primaryColor: '#667eea',
        secondaryColor: '#764ba2',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    function createElement(tag, props = {}) {
        const el = document.createElement(tag);
        Object.assign(el, props);
        return el;
    }

    // ============================================
    // NOTE: CSS is now in a separate file
    // ============================================
    // The CSS should be pasted into HighLevel's Custom CSS section
    // See: highlevel-integration.css
    // Styles are no longer injected via JavaScript

    // ============================================
    // WIDGET INITIALIZATION
    // ============================================

    let widgetContainer = null;
    let toggleButton = null;
    let isOpen = false;
    let iframe = null;

    function initializeWidget() {
        // Don't initialize if already exists
        if (document.getElementById('hl-copilot-widget-container')) {
            return;
        }

        // Note: CSS should be in HighLevel's Custom CSS section
        // No need to inject styles via JavaScript

        // Create widget container
        widgetContainer = createElement('div', {
            id: 'hl-copilot-widget-container'
        });

        // Create iframe (widget starts directly in chat mode)
        // Add cache-busting query parameter to ensure fresh content after deployments
        // IMPORTANT: Update widgetVersion when deploying new versions to force cache refresh
        const widgetVersion = 'v1.0.4'; // ⚠️ UPDATE THIS when deploying new versions
        const getCacheBuster = () => `?v=${widgetVersion}&_=${Date.now()}&cb=${Math.random().toString(36).substring(7)}`;
        iframe = createElement('iframe', {
            id: 'hl-copilot-iframe',
            src: `${COPILOT_API_URL}/widget/widget.html${getCacheBuster()}`,
            allow: 'clipboard-read; clipboard-write',
            // Safari-compatible sandbox: allow all necessary permissions
            sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
            title: 'HighLevel Copilot Assistant',
            // Safari-specific: ensure iframe can load content
            loading: 'eager'
        });

        // Configure iframe communication
        iframe.onload = function () {
            try {
                // Send configuration to iframe
                const iframeWindow = iframe.contentWindow;
                if (iframeWindow) {
                    iframeWindow.postMessage({
                        type: 'copilot-config',
                        apiUrl: COPILOT_API_URL,
                        userId: COPILOT_USER_ID,
                        source: 'highlevel'
                    }, '*');
                }
            } catch (e) {
                console.warn('Could not configure iframe:', e);
            }
        };

        // Safari-specific: Handle iframe load errors
        iframe.onerror = function (e) {
            console.error('Iframe load error:', e);
            // Force reload on error (Safari cache issue)
            setTimeout(() => {
                if (iframe && iframe.parentNode) {
                    const newSrc = iframe.src.split('?')[0] + getCacheBuster();
                    iframe.src = newSrc;
                }
            }, 1000);
        };

        widgetContainer.appendChild(iframe);
        document.body.appendChild(widgetContainer);

        // Create toggle button
        createToggleButton();

        // Listen for messages from iframe
        window.addEventListener('message', handleMessage);

        // Handle escape key to close
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen) {
                closeWidget();
            }
        });

        // Close on outside click (optional)
        document.addEventListener('click', function (e) {
            if (isOpen &&
                !widgetContainer.contains(e.target) &&
                !toggleButton.contains(e.target)) {
                // Optional: close on outside click
                // closeWidget();
            }
        });

        // HighLevel Copilot initialized successfully
    }

    function createToggleButton() {
        toggleButton = createElement('button', {
            id: 'hl-copilot-toggle-btn',
            innerHTML: '✨', // Ask AI icon (sparkles represent AI assistance)
            title: 'Ask AI - Open Copilot Assistant',
            'aria-label': 'Ask AI - Toggle Copilot Assistant'
        });

        toggleButton.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleWidget();
        });

        document.body.appendChild(toggleButton);
    }

    function toggleWidget() {
        isOpen = !isOpen;

        if (isOpen) {
            openWidget();
        } else {
            closeWidget();
        }
    }

    function openWidget() {
        if (widgetContainer) {
            widgetContainer.style.display = 'block';
            toggleButton.classList.add('active');
            toggleButton.innerHTML = '✕';
            toggleButton.title = 'Close Copilot Assistant';

            // Force reload iframe with fresh cache-busting to ensure latest content
            // This ensures the iframe always loads the latest HTML after deployments
            if (iframe) {
                const baseUrl = `${COPILOT_API_URL}/widget/widget.html`;
                const widgetVersion = 'v1.0.4'; // Must match version above
                const newCacheBuster = `?v=${widgetVersion}&_=${Date.now()}&cb=${Math.random().toString(36).substring(7)}&reload=${Date.now()}`;
                // Remove old iframe and create new one to force complete reload
                const oldIframe = iframe;
                iframe = createElement('iframe', {
                    id: 'hl-copilot-iframe',
                    src: baseUrl + newCacheBuster,
                    allow: 'clipboard-read; clipboard-write',
                    // Safari-compatible sandbox: allow all necessary permissions
                    sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation',
                    title: 'HighLevel Copilot Assistant',
                    loading: 'eager'
                });
                // Replace old iframe with new one
                if (oldIframe.parentNode) {
                    oldIframe.parentNode.replaceChild(iframe, oldIframe);
                }
                // Re-attach onload handler
                iframe.onload = function () {
                    try {
                        const iframeWindow = iframe.contentWindow;
                        if (iframeWindow) {
                            iframeWindow.postMessage({
                                type: 'copilot-config',
                                apiUrl: COPILOT_API_URL,
                                userId: COPILOT_USER_ID,
                                source: 'highlevel'
                            }, '*');
                        }
                    } catch (e) {
                        console.warn('Could not configure iframe:', e);
                    }
                };
            }

            // Focus iframe for keyboard navigation
            setTimeout(() => {
                if (iframe) {
                    try {
                        iframe.focus();
                    } catch (e) {
                        // Cross-origin restrictions may prevent focus
                    }
                }
            }, 100);
        }
    }

    function closeWidget() {
        if (widgetContainer) {
            widgetContainer.style.display = 'none';
            toggleButton.classList.remove('active');
            toggleButton.innerHTML = '✨'; // Ask AI icon
            toggleButton.title = 'Ask AI - Open Copilot Assistant';
        }
        isOpen = false;
    }

    function handleMessage(event) {
        // Security: Verify origin (in production, check event.origin)
        // For now, accept all origins for development
        if (event.data && event.data.type === 'closeCopilot') {
            closeWidget();
        }

        // Handle other message types as needed
        if (event.data && event.data.type === 'copilot-ready') {
            // Copilot widget is ready
        }
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.HLCopilot = {
        open: openWidget,
        close: closeWidget,
        toggle: toggleWidget,
        isOpen: () => isOpen,
        config: {
            apiUrl: COPILOT_API_URL,
            userId: COPILOT_USER_ID
        }
    };

    // ============================================
    // INITIALIZATION
    // ============================================

    // Wait for DOM and HighLevel to be ready
    function waitForHighLevel() {
        if (document.body) {
            initializeWidget();
        } else {
            setTimeout(waitForHighLevel, 100);
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitForHighLevel);
    } else {
        waitForHighLevel();
    }

    // Also try immediate initialization
    setTimeout(waitForHighLevel, 500);

})();