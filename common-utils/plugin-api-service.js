/**
 * Plugin API Service Interface and Implementations
 * Using Dependency Injection pattern for environment-specific behavior
 */

import { loadDevEnvironment, devUtils } from './dev-config.js';

// Base interface that all implementations must follow
export class PluginAPIService {
    async getApiKey() {
        throw new Error('getApiKey must be implemented');
    }
    
    async insertText(text) {
        throw new Error('insertText must be implemented');
    }
    
    async showAlert(message) {
        throw new Error('showAlert must be implemented');
    }
}

// Development implementation - returns mock data and logs actions
export class DevPluginAPIService extends PluginAPIService {
    constructor() {
        super();
        this.mockApiKey = 'sk-mock-api-key-for-development-testing'; // Initial fallback
        this.insertedTexts = []; // Track inserted texts for dev debugging
        this.envLoaded = false;
        
        // Load API key from development environment (async)
        this.initializeApiKey();
        
        console.log('🔧 [DEV] DevPluginAPIService initialized');
    }
    
    async initializeApiKey() {
        try {
            const devConfig = await loadDevEnvironment();
            this.mockApiKey = devConfig.OPENAI_API_KEY;
            this.envLoaded = true;
            console.log('🔑 [DEV] API key source:', this.mockApiKey.startsWith('sk-mock') ? 'mock' : 'environment');
        } catch (error) {
            console.error('🚨 [DEV] Failed to load environment:', error);
        }
    }
    
    async getApiKey() {
        console.log('[DEV PLUGIN] Getting API key...');
        
        // Ensure environment is loaded before returning key
        if (!this.envLoaded) {
            console.log('[DEV PLUGIN] Environment not loaded yet, loading now...');
            await this.initializeApiKey();
        }
        
        await this.simulateDelay(100); // Simulate network delay
        return this.mockApiKey;
    }
    
    async insertText(text) {
        console.log('[DEV PLUGIN] Inserting text:', text);
        this.insertedTexts.push({
            text,
            timestamp: new Date().toISOString()
        });
        await this.simulateDelay(200);
        console.log('[DEV PLUGIN] Text inserted successfully');
        return true;
    }
    
    async showAlert(message) {
        console.log('[DEV PLUGIN] Showing alert:', message);
        // In development, we can use regular browser alerts or custom UI
        alert(`[DEV MODE] ${message}`);
        return true;
    }
    
    // Helper method to simulate async operations
    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Dev utility methods
    getInsertedTexts() {
        return [...this.insertedTexts];
    }
    
    clearInsertedTexts() {
        this.insertedTexts = [];
    }
    
    setMockApiKey(apiKey) {
        this.mockApiKey = apiKey;
        console.log('[DEV PLUGIN] Mock API key updated to:', apiKey.substring(0, 10) + '...');
    }
    
    // Additional debugging methods
    getStats() {
        return {
            totalInsertions: this.insertedTexts.length,
            currentApiKey: this.mockApiKey.substring(0, 10) + '...',
            lastInsertion: this.insertedTexts.length > 0 ? this.insertedTexts[this.insertedTexts.length - 1] : null
        };
    }
    
    // Mock transcription for testing (bypasses OpenAI API)
    async mockTranscribe(audioBlob) {
        console.log('[DEV PLUGIN] Mock transcription for audio blob of size:', audioBlob.size);
        await this.simulateDelay(1000); // Simulate processing time
        return {
            text: `Mock transcription generated at ${new Date().toISOString()}. Original audio was ${(audioBlob.size / 1000000).toFixed(2)}MB.`
        };
    }
}

// Production implementation - uses real Amplenote Plugin API
export class ProdPluginAPIService extends PluginAPIService {
    constructor(callAmplenotePlugin) {
        super();
        this.callAmplenotePlugin = callAmplenotePlugin;
        if (!callAmplenotePlugin) {
            throw new Error('ProdPluginAPIService requires callAmplenotePlugin function');
        }
    }
    
    async getApiKey() {
        try {
            return await this.callAmplenotePlugin('getApiKey');
        } catch (error) {
            console.error('Failed to get API key from plugin:', error);
            throw error;
        }
    }
    
    async insertText(text) {
        try {
            return await this.callAmplenotePlugin('insertText', text);
        } catch (error) {
            console.error('Failed to insert text via plugin:', error);
            throw error;
        }
    }
    
    async showAlert(message) {
        try {
            return await this.callAmplenotePlugin('showAlert', message);
        } catch (error) {
            console.error('Failed to show alert via plugin:', error);
            throw error;
        }
    }
}

// Factory for creating the appropriate service based on environment
export class PluginAPIServiceFactory {
    static create(environment, options = {}) {
        switch (environment) {
            case 'development':
                return new DevPluginAPIService();
                
            case 'production':
                if (!options.callAmplenotePlugin) {
                    throw new Error('Production environment requires callAmplenotePlugin option');
                }
                return new ProdPluginAPIService(options.callAmplenotePlugin);
                
            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }
}

// Environment detection utilities
export function detectEnvironment() {
    // Check various environment indicators
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '::1';
    
    const isFileProtocol = window.location.protocol === 'file:';
    
    const isDevPort = window.location.port && 
                     (window.location.port.startsWith('3') || 
                      window.location.port.startsWith('8') || 
                      window.location.port.startsWith('5'));
    
    let environment = 'production'; // Default to production
    
    console.log('Environment detection:', {
        'process.env.NODE_ENV': typeof process !== 'undefined' ? process.env?.NODE_ENV : 'undefined',
        hostname: window.location.hostname,
        port: window.location.port,
        protocol: window.location.protocol,
        isLocalhost,
        isFileProtocol,
        isDevPort
    });

    if ((typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') || 
        isLocalhost || 
        isDevPort ||
        isFileProtocol) {
        environment = 'development';
        console.log('🚀 Running in DEVELOPMENT mode');
    } else {
        environment = 'production';
        console.log('🌐 Running in PRODUCTION mode');
    }
    
    return environment;
}

// Setup services function
export function setupPluginAPIService() {
    const environment = detectEnvironment();
    const options = {};
    
    if (environment === 'production') {
        // In production, use the real callAmplenotePlugin
        if (typeof window.callAmplenotePlugin === 'function') {
            options.callAmplenotePlugin = window.callAmplenotePlugin;
        } else {
            console.warn('window.callAmplenotePlugin not available, falling back to development mode');
            return PluginAPIServiceFactory.create('development');
        }
    }
    
    const service = PluginAPIServiceFactory.create(environment, options);
    
    // Make debugging utilities globally available
    if (environment === 'development') {
        window.pluginAPIDebug = {
            service,
            getStats: () => service.getStats(),
            getInsertedTexts: () => service.getInsertedTexts(),
            clearInsertedTexts: () => service.clearInsertedTexts(),
            setMockApiKey: (key) => service.setMockApiKey(key),
            mockTranscribe: (blob) => service.mockTranscribe(blob),
            // Environment utilities
            ...devUtils,
            reloadApiKey: async () => {
                const devConfig = await loadDevEnvironment();
                service.setMockApiKey(devConfig.OPENAI_API_KEY);
                if (service.initializeApiKey) {
                    await service.initializeApiKey();
                }
                return devConfig.OPENAI_API_KEY.startsWith('sk-mock') ? '[MOCK KEY]' : 'Environment key loaded';
            }
        };
        console.log('🔧 Development utilities available at window.pluginAPIDebug');
        console.log('💡 Use window.pluginAPIDebug.showEnvTemplate() to see .env template');
        console.log('🔑 Use window.pluginAPIDebug.setApiKey("your-key") to set API key');
    }
    
    return service;
} 