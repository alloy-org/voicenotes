// Test file to demonstrate the plugin API service
import { setupPluginAPIService, DevPluginAPIService } from '../../common-utils/plugin-api-service.js';

async function testPluginAPIService() {
    console.log('=== Testing Plugin API Service ===');
    
    // Setup service (will auto-detect environment)
    const pluginAPI = setupPluginAPIService();
    
    console.log('Service type:', pluginAPI.constructor.name);
    
    // Test getApiKey
    console.log('\n--- Testing getApiKey ---');
    try {
        const apiKey = await pluginAPI.getApiKey();
        console.log('API Key received:', apiKey.substring(0, 10) + '...');
    } catch (error) {
        console.error('Error getting API key:', error);
    }
    
    // Test insertText
    console.log('\n--- Testing insertText ---');
    try {
        const testText = '### Test voice note\nThis is a test transcription from the plugin API service.';
        await pluginAPI.insertText(testText);
        console.log('Text insertion completed');
        
        // If it's a dev service, show what was inserted
        if (pluginAPI instanceof DevPluginAPIService) {
            console.log('Inserted texts:', pluginAPI.getInsertedTexts());
        }
    } catch (error) {
        console.error('Error inserting text:', error);
    }
    
    // Test showAlert
    console.log('\n--- Testing showAlert ---');
    try {
        await pluginAPI.showAlert('Test alert from plugin API service!');
        console.log('Alert shown successfully');
    } catch (error) {
        console.error('Error showing alert:', error);
    }
    
    console.log('\n=== Test completed ===');
    return pluginAPI;
}

// Export for use in browser console
window.testPluginAPIService = testPluginAPIService;

// Auto-run test if this file is loaded directly
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('Plugin API Service test loaded. Run testPluginAPIService() to test.');
    });
} 