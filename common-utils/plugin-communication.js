/**
 * Generic Plugin Communication Service
 * Reusable across multiple plugins - only basic communication methods
 */

// Base interface for basic plugin communication
class PluginCommunicationService {
    async insertText(text) {
        throw new Error('insertText must be implemented');
    }
    
    async showAlert(message) {
        throw new Error('showAlert must be implemented');
    }
}

// Development implementation - mocks basic plugin communication
class DevPluginCommunicationService extends PluginCommunicationService {
    constructor(config = {}) {
        super();
        this.config = {
            logPrefix: config.logPrefix || '[DEV PLUGIN]',
            ...config
        };
        this.insertedTexts = [];
        
        console.log('🔧 [DEV] DevPluginCommunicationService initialized');
    }
    
    async insertText(text) {
        console.log(this.config.logPrefix, 'Inserting text:', text);
        this.insertedTexts.push({
            text,
            timestamp: new Date().toISOString()
        });
        await this.simulateDelay(200);
        console.log(this.config.logPrefix, 'Text inserted successfully');
        return true;
    }
    
    async showAlert(message) {
        console.log(this.config.logPrefix, 'Showing alert:', message);
        alert(`[DEV MODE] ${message}`);
        return true;
    }
    
    async simulateDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getInsertedTexts() {
        return [...this.insertedTexts];
    }
    
    clearInsertedTexts() {
        this.insertedTexts = [];
    }
    
    getStats() {
        return {
            totalInsertions: this.insertedTexts.length,
            lastInsertion: this.insertedTexts.length > 0 ? this.insertedTexts[this.insertedTexts.length - 1] : null
        };
    }
}

// Production implementation - uses real Amplenote Plugin API
class ProdPluginCommunicationService extends PluginCommunicationService {
    constructor(callAmplenotePlugin) {
        super();
        this.callAmplenotePlugin = callAmplenotePlugin;
        if (!callAmplenotePlugin) {
            throw new Error('ProdPluginCommunicationService requires callAmplenotePlugin function');
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
class PluginCommunicationServiceFactory {
    static create(environment, options = {}) {
        switch (environment) {
            case 'development':
                return new DevPluginCommunicationService(options.devConfig);
                
            case 'production':
                if (!options.callAmplenotePlugin) {
                    throw new Error('Production environment requires callAmplenotePlugin option');
                }
                return new ProdPluginCommunicationService(options.callAmplenotePlugin);
                
            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }
}

// Environment detection utilities
function detectEnvironment() {
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname === '::1';
    
    const isFileProtocol = window.location.protocol === 'file:';
    
    const isDevPort = window.location.port && 
                     (window.location.port.startsWith('3') || 
                      window.location.port.startsWith('8') || 
                      window.location.port.startsWith('5'));
    
    if (isLocalhost || isDevPort || isFileProtocol) {
        console.log('🚀 Running in DEVELOPMENT mode');
        return 'development';
    } else {
        console.log('🌐 Running in PRODUCTION mode');
        return 'production';
    }
}

// Setup services function - MAIN ENTRY POINT
function setupPluginCommunication(config = {}) {
    const environment = detectEnvironment();
    const options = { devConfig: config };
    
    if (environment === 'production') {
        // In production, use the real callAmplenotePlugin
        if (typeof window.callAmplenotePlugin === 'function') {
            options.callAmplenotePlugin = window.callAmplenotePlugin;
        } else {
            console.warn('window.callAmplenotePlugin not available, falling back to development mode');
            return PluginCommunicationServiceFactory.create('development', options);
        }
    }
    
    const service = PluginCommunicationServiceFactory.create(environment, options);
    
    // Make debugging utilities globally available
    if (environment === 'development') {
        window.pluginDebug = {
            service,
            getStats: () => service.getStats(),
            getInsertedTexts: () => service.getInsertedTexts(),
            clearInsertedTexts: () => service.clearInsertedTexts(),
        };
        console.log('🔧 Development utilities available at window.pluginDebug');
    }
    
    return service;
}

// Make the main function globally available for other plugins to use
if (typeof window !== 'undefined') {
    window.setupPluginCommunication = setupPluginCommunication;
} 