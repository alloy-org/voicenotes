/**
 * Whisper Plugin API Service
 * Handles OpenAI API key management for voice transcription
 */

// Whisper-specific API service that extends basic plugin communication
class WhisperAPIService {
    constructor(pluginCommunication) {
        this.pluginCommunication = pluginCommunication;
        this.apiKey = null;
        this.loadOpenAIKey();
        
        console.log('🎤 [WHISPER] WhisperAPIService initialized');
        console.log('🔑 [WHISPER] OpenAI API key source:', this.isUsingMockKey() ? 'mock' : 'environment');
    }
    
    loadOpenAIKey() {
        // Check localStorage for OpenAI API key (highest priority for runtime setting)
        if (typeof localStorage !== 'undefined') {
            const storedApiKey = localStorage.getItem('DEV_OPENAI_API_KEY');
            if (storedApiKey) {
                this.apiKey = storedApiKey;
                console.log('🔑 [WHISPER] Using OpenAI API key from localStorage');
                return;
            }
        }
        
        // Check for environment variables (process.env if available in build context)
        if (typeof process !== 'undefined' && process.env && process.env.OPENAI_API_KEY) {
            this.apiKey = process.env.OPENAI_API_KEY;
            console.log('🔑 [WHISPER] Using OpenAI API key from process.env');
            return;
        }
        
        // Check for runtime environment variables on window (for browser context)
        if (typeof window !== 'undefined' && window.WHISPER_ENV && window.WHISPER_ENV.OPENAI_API_KEY) {
            this.apiKey = window.WHISPER_ENV.OPENAI_API_KEY;
            console.log('🔑 [WHISPER] Using OpenAI API key from window.WHISPER_ENV');
            return;
        }
        
        // Fallback to mock key
        this.apiKey = 'sk-mock-openai-key-for-development-testing';
        console.log('⚠️ [WHISPER] No OpenAI API key found, using mock key');
        console.log('💡 [WHISPER] Set your API key with: window.whisperDebug.setApiKey("your-key")');
        console.log('💡 [WHISPER] Or set window.WHISPER_ENV = {OPENAI_API_KEY: "your-key"} in browser console');
    }
    
    isUsingMockKey() {
        return this.apiKey === 'sk-mock-openai-key-for-development-testing';
    }
    
    async getApiKey() {
        console.log('[WHISPER] Getting OpenAI API key...');
        console.log('[WHISPER] Plugin communication available:', !!this.pluginCommunication);
        console.log('[WHISPER] Plugin communication callPlugin method:', typeof this.pluginCommunication?.callPlugin);
        
        // In production (Amplenote plugin environment), get key from plugin settings
        // In development, use environment variables or localStorage
        if (this.pluginCommunication && typeof this.pluginCommunication.callPlugin === 'function') {
            try {
                console.log('[WHISPER] Attempting to get API key from plugin communication...');
                const pluginApiKey = await this.pluginCommunication.callPlugin('getApiKey');
                console.log('[WHISPER] Plugin communication returned API key:', pluginApiKey ? `${pluginApiKey.substring(0, 10)}...` : 'null/empty');
                
                if (pluginApiKey && pluginApiKey.trim() !== '') {
                    console.log('🔑 [WHISPER] Using OpenAI API key from plugin settings');
                    return pluginApiKey;
                }
                
                // In production, if no API key is set in plugin settings, throw an error
                console.error('🚨 [WHISPER] No OpenAI API key found in plugin settings');
                throw new Error('No OpenAI API key configured. Please set your API key in the plugin settings.');
                
            } catch (error) {
                console.log('🔍 [WHISPER] Plugin communication failed, falling back to environment variables:', error);
                // If plugin communication fails entirely, fall back to development variables
            }
        } else {
            console.log('[WHISPER] Plugin communication not available, using fallback');
        }
        
        // Fallback to development environment variables (only for development)
        if (this.isUsingMockKey()) {
            console.log('🔧 [WHISPER] Using development mock key');
        }
        console.log('[WHISPER] Returning API key:', this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'null');
        return this.apiKey;
    }
    
    async getModel() {
        console.log('[WHISPER] Getting OpenAI model...');
        
        // In production (Amplenote plugin environment), get model from plugin settings
        // In development, use the mock value
        if (this.pluginCommunication && typeof this.pluginCommunication.callPlugin === 'function') {
            try {
                const pluginModel = await this.pluginCommunication.callPlugin('getModel');
                if (pluginModel && pluginModel.trim() !== '') {
                    console.log('🤖 [WHISPER] Using OpenAI model from plugin settings:', pluginModel);
                    return pluginModel;
                }
            } catch (error) {
                console.log('🔍 [WHISPER] Plugin communication failed for model, falling back to default:', error);
            }
        }
        
        // Fallback to default model
        return 'gpt-4.1-mini';
    }
    
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('DEV_OPENAI_API_KEY', apiKey);
            console.log('🔑 [WHISPER] OpenAI API key saved to localStorage');
        }
        console.log('[WHISPER] OpenAI API key updated to:', apiKey.substring(0, 10) + '...');
    }
    
    clearApiKey() {
        this.apiKey = 'sk-mock-openai-key-for-development-testing';
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('DEV_OPENAI_API_KEY');
            console.log('🔑 [WHISPER] OpenAI API key cleared from localStorage');
        }
    }
    
    getCurrentApiKey() {
        return this.isUsingMockKey() ? '[MOCK KEY]' : this.apiKey.substring(0, 10) + '...';
    }
    
    // Delegate basic plugin communication methods
    async insertText(text) {
        return await this.pluginCommunication.insertText(text);
    }
    
    async showAlert(message) {
        return await this.pluginCommunication.showAlert(message);
    }
    
    async wasJustInvoked() {
        console.log('[WHISPER] Checking if plugin was just invoked from appOption...');
        return await this.pluginCommunication.callPlugin('wasJustInvoked');
    }
    
    async getCurrentNoteUUID() {
        console.log('[WHISPER] Getting current note UUID...');
        return await this.pluginCommunication.callPlugin('getCurrentNoteUUID');
    }
    
    async getNoteTasks(noteUUID) {
        console.log('[WHISPER] Getting tasks from note:', noteUUID);
        return await this.pluginCommunication.callPlugin('getNoteTasks', noteUUID);
    }
    
    async updateTask(taskUUID, properties) {
        console.log('[WHISPER] Updating task:', taskUUID, 'with properties:', properties);
        return await this.pluginCommunication.callPlugin('updateTask', taskUUID, properties);
    }
    
    // Debug utilities
    getStats() {
        return {
            openaiApiKey: this.getCurrentApiKey(),
            isUsingMockKey: this.isUsingMockKey(),
            ...this.pluginCommunication.getStats()
        };
    }
}

// Setup function for whisper plugin
function setupWhisperAPI() {
    // Setup basic plugin communication first
    const pluginCommunication = window.setupPluginCommunication({
        logPrefix: '[WHISPER DEV]'
    });
    
    // Create whisper-specific service
    const whisperAPI = new WhisperAPIService(pluginCommunication);
    
    // Make debugging utilities available
    if (typeof window.pluginDebug !== 'undefined') {
        window.whisperDebug = {
            service: whisperAPI,
            setApiKey: (key) => whisperAPI.setApiKey(key),
            clearApiKey: () => whisperAPI.clearApiKey(),
            getCurrentApiKey: () => whisperAPI.getCurrentApiKey(),
            getStats: () => whisperAPI.getStats(),
            showInstructions: () => {
                console.log('🔧 [WHISPER] How to set your OpenAI API key:');
                console.log('1. Get key from: https://platform.openai.com/api-keys');
                console.log('2. Run: window.whisperDebug.setApiKey("sk-your-key-here")');
                console.log('3. Refresh the page');
            },
            reloadApiKey: () => {
                whisperAPI.loadOpenAIKey();
                return whisperAPI.getCurrentApiKey();
            },
            // Delegate plugin communication debug methods
            getInsertedTexts: () => pluginCommunication.getInsertedTexts(),
            clearInsertedTexts: () => pluginCommunication.clearInsertedTexts(),
            // Testing utilities
            simulateAppOptionCall: () => pluginCommunication.simulateAppOptionCall ? pluginCommunication.simulateAppOptionCall() : console.log('Not available in production mode')
        };
        console.log('🎤 Whisper debug utilities available at window.whisperDebug');
        console.log('🔑 Use window.whisperDebug.setApiKey("your-key") to set OpenAI API key');
        console.log('🎬 Use window.whisperDebug.simulateAppOptionCall() to test auto-start');
    }
    
    return whisperAPI;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.setupWhisperAPI = setupWhisperAPI;
} 