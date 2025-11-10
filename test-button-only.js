/**
 * TEST VERSION - Just shows the floating button
 * Use this to verify the button appears before testing full functionality
 * 
 * INSTRUCTIONS:
 * 1. Copy this entire file
 * 2. Paste into HighLevel: Settings > Custom JS
 * 3. Click "Save Changes"
 * 4. Reload HighLevel page
 * 5. You should see a purple floating button in bottom-right corner
 */

(function () {
    'use strict';

    console.log('🚀 Test button script loading...');

    // Wait for DOM
    function init() {
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }

        // Check if button already exists
        if (document.getElementById('hl-copilot-toggle-btn')) {
            console.log('✅ Button already exists');
            return;
        }

        // Create button
        const button = document.createElement('button');
        button.id = 'hl-copilot-toggle-btn';
        button.innerHTML = '🤖';
        button.title = 'Open Copilot Assistant';
        button.setAttribute('aria-label', 'Toggle Copilot Assistant');

        // Add styles
        const styles = `
            #hl-copilot-toggle-btn {
                position: fixed;
                right: 24px;
                bottom: 24px;
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                font-size: 28px;
                cursor: pointer;
                box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                z-index: 999999;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0;
                outline: none;
            }

            #hl-copilot-toggle-btn:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 30px rgba(102, 126, 234, 0.6);
            }

            #hl-copilot-toggle-btn:active {
                transform: scale(0.95);
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);

        // Add click handler
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            alert('Button clicked! If you see this, the button is working. Now update the full integration code with your API URL.');
        });

        // Add to page
        document.body.appendChild(button);

        console.log('✅ Test button created successfully!');
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also try after a delay
    setTimeout(init, 500);

})();

