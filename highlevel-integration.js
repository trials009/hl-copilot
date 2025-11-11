/**
 * HighLevel Ask AI Integration
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
    * 6. Update COPILOT_API_URL below (line ~30)
    * 7. Save and reload HighLevel
    *
    * IMPORTANT: Based on HighLevel documentation:
 * - Custom JS and CSS are in separate sections in Settings > Company > Custom JavaScript & Custom CSS
    * - Code must be self-contained (no remote file references)
    * - HighLevel will automatically wrap this in <script> tags, so don't include them
        *
        * The Ask AI widget will appear as a floating button in HighLevel's interface
        */

(function () {
    'use strict';

    // ============================================
    // CONFIGURATION - UPDATE THESE VALUES
    // ============================================

    // Your Vercel deployment URL (or localhost for dev)
    // IMPORTANT: Replace with your actual Vercel URL after deployment
    const COPILOT_API_URL = 'https://hands-on-ai.vercel.app'; // Change this!

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

    // Widget styling configuration
    const WIDGET_CONFIG = {
        position: 'bottom-right',
        width: '420px',
        height: '650px',
        zIndex: 999999, // High z-index to appear above HighLevel UI
        buttonSize: '64px',
        buttonOffset: '24px'
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

        // Create iframe with cache-busting to ensure latest widget version loads
        // Version parameter ensures iframe loads fresh content after updates
        // Update version number when making significant widget changes
        const widgetVersion = 'v1.2.0'; // Updated for Ask AI theme refresh
        // Use both version and timestamp for maximum cache-busting
        const cacheBuster = new Date().getTime();
        iframe = createElement('iframe', {
            id: 'hl-copilot-iframe',
            src: `${COPILOT_API_URL}/widget/widget.html?v=${widgetVersion}&t=${cacheBuster}&_=${Date.now()}`,
            allow: 'clipboard-read; clipboard-write',
            sandbox: 'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'
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

        // HighLevel Ask AI initialized successfully
    }

    function createToggleButton() {
        // Create button with copilot icon SVG (matching Ask AI theme)
        const copilotIconSVG = '<svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.7383 5.33367L13.265 4.16701L14.4317 3.64034C14.6917 3.52034 14.6917 3.15367 14.4317 3.03367L13.265 2.50701L12.7383 1.33367C12.6183 1.07367 12.2517 1.07367 12.1317 1.33367L11.605 2.50034L10.4317 3.02701C10.1717 3.14701 10.1717 3.51367 10.4317 3.63367L11.5983 4.16034L12.125 5.33367C12.245 5.59367 12.6183 5.59367 12.7383 5.33367ZM7.43167 6.33367L6.37167 4.00034C6.13833 3.48034 5.39167 3.48034 5.15833 4.00034L4.09833 6.33367L1.765 7.39367C1.245 7.63367 1.245 8.37367 1.765 8.60701L4.09833 9.66701L5.15833 12.0003C5.39833 12.5203 6.13833 12.5203 6.37167 12.0003L7.43167 9.66701L9.765 8.60701C10.285 8.367 10.285 7.62701 9.765 7.39367L7.43167 6.33367ZM12.125 10.667L11.5983 11.8337L10.4317 12.3603C10.1717 12.4803 10.1717 12.847 10.4317 12.967L11.5983 13.4937L12.125 14.667C12.245 14.927 12.6117 14.927 12.7317 14.667L13.2583 13.5003L14.4317 12.9737C14.6917 12.8537 14.6917 12.487 14.4317 12.367L13.265 11.8403L12.7383 10.667C12.6183 10.407 12.245 10.407 12.125 10.667Z" fill="white"/></svg>';
        const closeIconSVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        toggleButton = createElement('button', {
            id: 'hl-copilot-toggle-btn',
            innerHTML: copilotIconSVG,
            title: 'Open Ask AI',
            'aria-label': 'Toggle Ask AI'
        });

        toggleButton.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleWidget();
        });

        // Store SVG icons for toggle
        toggleButton.copilotIcon = copilotIconSVG;
        toggleButton.closeIcon = closeIconSVG;

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
            if (toggleButton.closeIcon) {
                toggleButton.innerHTML = toggleButton.closeIcon;
            } else {
                toggleButton.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
            }
            toggleButton.title = 'Close Ask AI';

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
            if (toggleButton.copilotIcon) {
                toggleButton.innerHTML = toggleButton.copilotIcon;
            } else {
                toggleButton.innerHTML = '<svg width="28" height="28" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.7383 5.33367L13.265 4.16701L14.4317 3.64034C14.6917 3.52034 14.6917 3.15367 14.4317 3.03367L13.265 2.50701L12.7383 1.33367C12.6183 1.07367 12.2517 1.07367 12.1317 1.33367L11.605 2.50034L10.4317 3.02701C10.1717 3.14701 10.1717 3.51367 10.4317 3.63367L11.5983 4.16034L12.125 5.33367C12.245 5.59367 12.6183 5.59367 12.7383 5.33367ZM7.43167 6.33367L6.37167 4.00034C6.13833 3.48034 5.39167 3.48034 5.15833 4.00034L4.09833 6.33367L1.765 7.39367C1.245 7.63367 1.245 8.37367 1.765 8.60701L4.09833 9.66701L5.15833 12.0003C5.39833 12.5203 6.13833 12.5203 6.37167 12.0003L7.43167 9.66701L9.765 8.60701C10.285 8.367 10.285 7.62701 9.765 7.39367L7.43167 6.33367ZM12.125 10.667L11.5983 11.8337L10.4317 12.3603C10.1717 12.4803 10.1717 12.847 10.4317 12.967L11.5983 13.4937L12.125 14.667C12.245 14.927 12.6117 14.927 12.7317 14.667L13.2583 13.5003L14.4317 12.9737C14.6917 12.8537 14.6917 12.487 14.4317 12.367L13.265 11.8403L12.7383 10.667C12.6183 10.407 12.245 10.407 12.125 10.667Z" fill="white"/></svg>';
            }
            toggleButton.title = 'Open Ask AI';
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