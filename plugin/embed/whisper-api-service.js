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
        // Check localStorage for OpenAI API key
        if (typeof localStorage !== 'undefined') {
            const storedApiKey = localStorage.getItem('DEV_OPENAI_API_KEY');
            if (storedApiKey) {
                this.apiKey = storedApiKey;
                console.log('🔑 [WHISPER] Using OpenAI API key from localStorage');
                return;
            }
        }
        
        // Check if variables are injected in window
        if (typeof window !== 'undefined' && window.DEV_ENV && window.DEV_ENV.OPENAI_API_KEY) {
            this.apiKey = window.DEV_ENV.OPENAI_API_KEY;
            console.log('🔑 [WHISPER] Using OpenAI API key from window.DEV_ENV');
            return;
        }
        
        // Fallback to mock key
        this.apiKey = 'sk-mock-openai-key-for-development-testing';
        console.log('⚠️ [WHISPER] No OpenAI API key found, using mock key');
        console.log('💡 [WHISPER] Set your API key with: window.whisperDebug.setApiKey("your-key")');
    }
    
    isUsingMockKey() {
        return this.apiKey === 'sk-mock-openai-key-for-development-testing';
    }
    
    async getApiKey() {
        console.log('[WHISPER] Getting OpenAI API key...');
        return this.apiKey;
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