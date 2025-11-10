/**
 * Centralized Configuration
 * 
 * This file manages all API keys and configuration for both local and Vercel environments.
 * 
 * For local development: Create a .env file with your keys
 * For Vercel: Set environment variables in Vercel dashboard
 * 
 * Environment variables are automatically loaded from:
 * - .env file (local development)
 * - process.env (Vercel/production)
 */

require('dotenv').config();

const config = {
    // Server Configuration
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development',
        backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`,
        isVercel: process.env.VERCEL === '1' || !!process.env.VERCEL_ENV
    },

    // AI/LLM Configuration - Groq (Llama Models)
    ai: {
        provider: 'groq', // 'groq' or 'openai'
        groq: {
            apiKey: process.env.GROQ_API_KEY || null,
            model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile' // Updated: llama-3.1-70b-versatile was decommissioned
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY || null,
            model: process.env.OPENAI_MODEL || 'gpt-4'
        },
        // Helper to get active API key
        getApiKey: function () {
            if (this.provider === 'groq') {
                return this.groq.apiKey;
            }
            return this.openai.apiKey;
        },
        // Check if AI is configured
        isConfigured: function () {
            return !!this.getApiKey();
        }
    },

    // HighLevel API Configuration
    highlevel: {
        apiKey: process.env.HIGHLVL_API_KEY || null,
        accountId: process.env.HIGHLVL_ACCOUNT_ID || null,
        apiUrl: 'https://services.leadconnectorhq.com',
        isConfigured: function () {
            return !!(this.apiKey && this.accountId);
        }
    },

    // Facebook App Configuration
    facebook: {
        appId: process.env.FACEBOOK_APP_ID || null,
        appSecret: process.env.FACEBOOK_APP_SECRET || null,
        redirectUri: process.env.FACEBOOK_REDIRECT_URI || null,
        graphApiUrl: 'https://graph.facebook.com/v18.0',
        // Check if Facebook is configured
        isConfigured: function () {
            return !!(this.appId && this.appSecret);
        },
        // Get redirect URI (auto-generate if not set)
        getRedirectUri: function () {
            if (this.redirectUri) {
                return this.redirectUri;
            }
            // Auto-generate based on environment
            const baseUrl = config.server.backendUrl;
            return `${baseUrl}/api/facebook/callback`;
        }
    },

    // Session Configuration
    session: {
        secret: process.env.SESSION_SECRET || 'highlevel-copilot-secret-change-in-production',
        // Warn if using default secret
        isSecure: function () {
            return this.secret !== 'highlevel-copilot-secret-change-in-production';
        }
    },

    // Feature Flags
    features: {
        // Enable mock mode if credentials are missing
        mockMode: {
            facebook: !process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET,
            ai: !process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY
        }
    },

    // Validation
    validate: function () {
        const warnings = [];
        const errors = [];

        // Check AI configuration
        if (!this.ai.isConfigured()) {
            warnings.push('AI API key not configured. Mock mode will be used for calendar generation.');
        }

        // Check Facebook configuration
        if (!this.facebook.isConfigured()) {
            warnings.push('Facebook credentials not configured. Mock mode will be used for OAuth.');
        }

        // Check session secret
        if (!this.session.isSecure()) {
            warnings.push('Using default session secret. Change SESSION_SECRET in production!');
        }

        // Check required for production
        if (this.server.env === 'production') {
            if (!this.ai.isConfigured()) {
                errors.push('AI API key is required in production');
            }
            if (!this.session.isSecure()) {
                errors.push('Secure SESSION_SECRET is required in production');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },

    // Get configuration summary (for debugging)
    getSummary: function () {
        return {
            environment: this.server.env,
            backendUrl: this.server.backendUrl,
            ai: {
                provider: this.ai.provider,
                configured: this.ai.isConfigured(),
                model: this.ai.provider === 'groq' ? this.ai.groq.model : this.ai.openai.model
            },
            facebook: {
                configured: this.facebook.isConfigured(),
                redirectUri: this.facebook.getRedirectUri()
            },
            highlevel: {
                configured: this.highlevel.isConfigured()
            },
            mockMode: this.features.mockMode,
            validation: this.validate()
        };
    }
};

// Auto-validate on load
if (config.server.env === 'development') {
    const validation = config.validate();
    if (validation.warnings.length > 0) {
        console.log('⚠️  Configuration Warnings:');
        validation.warnings.forEach(warning => console.log('   -', warning));
    }
    if (validation.errors.length > 0) {
        console.error('❌ Configuration Errors:');
        validation.errors.forEach(error => console.error('   -', error));
    }
}

module.exports = config;

