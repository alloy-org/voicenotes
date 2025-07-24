/**
 * Development Configuration
 * This file handles environment variable loading for development mode only
 */

// Function to fetch and parse .env file
async function fetchEnvFile() {
    try {
        const response = await fetch('/.env');
        if (response.ok) {
            const envText = await response.text();
            const envVars = {};
            
            // Parse .env file format
            envText.split('\n').forEach(line => {
                line = line.trim();
                if (line && !line.startsWith('#') && line.includes('=')) {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('=').trim();
                    // Remove quotes if present
                    envVars[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            });
            
            console.log('🔑 [DEV] Loaded .env file successfully');
            return envVars;
        }
    } catch (error) {
        console.log('📁 [DEV] .env file not accessible via HTTP, trying alternatives...');
    }
    return {};
}

// Environment variable loader for development
export async function loadDevEnvironment() {
    const devConfig = {
        // Default fallback mock key
        OPENAI_API_KEY: 'sk-mock-api-key-for-development-testing'
    };
    
    // Try to fetch .env file first
    const envFileVars = await fetchEnvFile();
    if (envFileVars.OPENAI_API_KEY) {
        devConfig.OPENAI_API_KEY = envFileVars.OPENAI_API_KEY;
        console.log('🔑 [DEV] Using OpenAI API key from .env file');
        return devConfig;
    }
    
    // Check if environment variables are available (injected by build process or dev server)
    if (typeof process !== 'undefined' && process.env) {
        if (process.env.OPENAI_API_KEY) {
            devConfig.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            console.log('🔑 [DEV] Using OpenAI API key from environment variables');
            return devConfig;
        }
    }
    
    // Check if variables are injected in window (alternative injection method)
    if (typeof window !== 'undefined' && window.DEV_ENV) {
        if (window.DEV_ENV.OPENAI_API_KEY) {
            devConfig.OPENAI_API_KEY = window.DEV_ENV.OPENAI_API_KEY;
            console.log('🔑 [DEV] Using OpenAI API key from window.DEV_ENV');
            return devConfig;
        }
    }
    
    // Check localStorage for dev API key (manual override)
    if (typeof localStorage !== 'undefined') {
        const storedApiKey = localStorage.getItem('DEV_OPENAI_API_KEY');
        if (storedApiKey) {
            devConfig.OPENAI_API_KEY = storedApiKey;
            console.log('🔑 [DEV] Using OpenAI API key from localStorage');
            return devConfig;
        }
    }
    
    console.log('⚠️ [DEV] No API key found, using mock key');
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

// Create .env.example template instructions
export const ENV_TEMPLATE = `# Development Environment Variables
# Copy this to .env and fill in your actual values
# This file is only used in development mode

# OpenAI API Key for Whisper transcription and ChatGPT analysis
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# Example format:
# OPENAI_API_KEY=sk-proj-abcd1234567890...

# Note: In production, the API key comes from Amplenote plugin settings`;

// Development utilities
export const devUtils = {
    showEnvTemplate: () => {
        console.log('📋 [DEV] .env file template:');
        console.log(ENV_TEMPLATE);
    },
    
    setApiKey: setDevApiKey,
    clearApiKey: clearDevApiKey,
    
    getCurrentApiKey: async () => {
        const config = await loadDevEnvironment();
        const key = config.OPENAI_API_KEY;
        return key.startsWith('sk-mock') ? '[MOCK KEY]' : key.substring(0, 10) + '...';
    }
}; 