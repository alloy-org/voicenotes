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
    
    async callPlugin(method, ...args) {
        throw new Error('callPlugin must be implemented');
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
        this.mockFlags = {
            wasJustInvoked: false  // Mock the plugin's flag state
        };
        
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
    
    async callPlugin(method, ...args) {
        console.log(this.config.logPrefix, 'Calling plugin method:', method, 'with args:', args);
        
        // Mock implementation for development
        if (method === 'wasJustInvoked') {
            const result = this.mockFlags.wasJustInvoked;
            console.log(this.config.logPrefix, 'Mock: wasJustInvoked returning', result);
            
            // Clear the flag after checking (simulate real plugin behavior)
            this.mockFlags.wasJustInvoked = false;
            console.log(this.config.logPrefix, 'Mock: Cleared wasJustInvoked flag');
            
            return result;
        } else if (method === 'getCurrentNoteUUID') {
            const mockNoteUUID = 'mock-note-uuid-12345';
            console.log(this.config.logPrefix, 'Mock: getCurrentNoteUUID returning', mockNoteUUID);
            return mockNoteUUID;
        } else if (method === 'getNoteTasks') {
            const noteUUID = args[0];
            console.log(this.config.logPrefix, 'Mock: getNoteTasks for note', noteUUID);
            
            // Return mock tasks that match common action items
            const mockTasks = [
                {
                    uuid: 'task-uuid-1',
                    content: 'Call the plumber today to fix the kitchen sink leak before it floods',
                    important: false,
                    urgent: false
                },
                {
                    uuid: 'task-uuid-2',
                    content: 'Sort through and donate outgrown kids\' clothes by Saturday afternoon',
                    important: false,
                    urgent: false
                },
                {
                    uuid: 'task-uuid-3',
                    content: 'Make reservations for Grandma\'s 80th birthday dinner on Sunday at 6 PM',
                    important: false,
                    urgent: false
                }
            ];
            
            console.log(this.config.logPrefix, 'Mock: returning', mockTasks.length, 'tasks');
            return mockTasks;
        } else if (method === 'updateTask') {
            const taskUUID = args[0];
            const properties = args[1];
            console.log(this.config.logPrefix, 'Mock: updateTask', taskUUID, 'with properties:', properties);
            
            // Simulate successful update
            console.log(this.config.logPrefix, 'Mock: task updated successfully');
            return true;
        } else if (method === 'getApiKey') {
            console.log(this.config.logPrefix, 'Mock: getApiKey - falling back to environment variables');
            // In development, return null so the whisper service falls back to environment variables
            return null;
        }
        
        console.log(this.config.logPrefix, 'Unknown method:', method);
        return false;
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
            lastInsertion: this.insertedTexts.length > 0 ? this.insertedTexts[this.insertedTexts.length - 1] : null,
            mockFlags: this.mockFlags
        };
    }
    
    // Dev-only method to simulate appOption being called
    simulateAppOptionCall() {
        console.log(this.config.logPrefix, 'Simulating appOption call - setting wasJustInvoked = true');
        this.mockFlags.wasJustInvoked = true;
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
    
    async callPlugin(method, ...args) {
        try {
            return await this.callAmplenotePlugin(method, ...args);
        } catch (error) {
            console.error(`Failed to call plugin method ${method}:`, error);
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
            simulateAppOptionCall: () => service.simulateAppOptionCall(),
        };
        console.log('🔧 Development utilities available at window.pluginDebug');
        console.log('🔧 Use window.pluginDebug.simulateAppOptionCall() to test auto-start');
    }
    
    return service;
}

// Make the main function globally available for other plugins to use
if (typeof window !== 'undefined') {
    window.setupPluginCommunication = setupPluginCommunication;
} 