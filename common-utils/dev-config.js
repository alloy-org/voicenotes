/**
 * Development Configuration
 * Simple environment variable loading for development mode only
 */

// Simple environment variable loader for development
export function loadDevEnvironment() {
    const devConfig = {
        // Default fallback mock key
        OPENAI_API_KEY: 'sk-mock-api-key-for-development-testing'
    };
    
    // Check localStorage for dev API key (primary method)
    if (typeof localStorage !== 'undefined') {
        const storedApiKey = localStorage.getItem('DEV_OPENAI_API_KEY');
        if (storedApiKey) {
            devConfig.OPENAI_API_KEY = storedApiKey;
            console.log('🔑 [DEV] Using OpenAI API key from localStorage');
            return devConfig;
        }
    }
    
    // Check if variables are injected in window
    if (typeof window !== 'undefined' && window.DEV_ENV) {
        if (window.DEV_ENV.OPENAI_API_KEY) {
            devConfig.OPENAI_API_KEY = window.DEV_ENV.OPENAI_API_KEY;
            console.log('🔑 [DEV] Using OpenAI API key from window.DEV_ENV');
            return devConfig;
        }
    }
    
    // Check if environment variables are available (process.env)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.OPENAI_API_KEY) {
            devConfig.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            console.log('🔑 [DEV] Using OpenAI API key from environment variables');
            return devConfig;
        }
    }
    
    console.log('⚠️ [DEV] No API key found, using mock key');
    console.log('💡 [DEV] Set your API key with: window.pluginAPIDebug.setApiKey("your-key")');
    return devConfig;
}

// Helper function to set API key in localStorage for development
export function setDevApiKey(apiKey) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('DEV_OPENAI_API_KEY', apiKey);
        console.log('🔑 [DEV] API key saved to localStorage');
        return true;
    }
    return false;
}

// Helper function to clear dev API key
export function clearDevApiKey() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('DEV_OPENAI_API_KEY');
        console.log('🔑 [DEV] API key cleared from localStorage');
        return true;
    }
    return false;
}

// Development utilities
export const devUtils = {
    setApiKey: setDevApiKey,
    clearApiKey: clearDevApiKey,
    
    getCurrentApiKey: () => {
        const config = loadDevEnvironment();
        const key = config.OPENAI_API_KEY;
        return key.startsWith('sk-mock') ? '[MOCK KEY]' : key.substring(0, 10) + '...';
    },
    
    showInstructions: () => {
        console.log('🔧 [DEV] How to set your OpenAI API key:');
        console.log('1. Get key from: https://platform.openai.com/api-keys');
        console.log('2. Run: window.pluginAPIDebug.setApiKey("sk-your-key-here")');
        console.log('3. Refresh the page');
    }
}; 