/**
 * Service Setup Helper
 * Provides easy setup for different environments
 */

import { TaskAPIServiceFactory, ServiceContainer } from './task-api-service.js';
import { createCallAmplenotePluginMock, deserializeWithFunctions } from './embed-comunication.js';

/**
 * Sets up the service container for a given environment
 * @param {string} environment - 'development', 'test', or 'production'
 * @param {Object} options - Additional options
 * @returns {ServiceContainer} Configured service container
 */
export function setupServices(environment, options = {}) {
    const container = new ServiceContainer();
    
    switch (environment) {
        case 'development':
            container.register('taskAPI', () => 
                TaskAPIServiceFactory.create('development'), 
                { singleton: true }
            );
            break;
            
        case 'test':
            container.register('taskAPI', () => 
                TaskAPIServiceFactory.create('test', {
                    mockData: options.mockData || []
                })
            ); // Note: NOT singleton for tests - each test gets fresh instance
            break;
            
        case 'production':
            // Setup Amplenote API
            let callAmplenotePlugin = options.callAmplenotePlugin;
            
            if (!callAmplenotePlugin) {
                if (window.INJECTED_EMBED_COMMANDS_MOCK) {
                    callAmplenotePlugin = createCallAmplenotePluginMock(
                        deserializeWithFunctions(window.INJECTED_EMBED_COMMANDS_MOCK)
                    );
                } else if (window.callAmplenotePlugin) {
                    callAmplenotePlugin = window.callAmplenotePlugin;
                } else {
                    throw new Error('No callAmplenotePlugin available in production environment');
                }
            }
            
            container.register('taskAPI', () => 
                TaskAPIServiceFactory.create('production', { callAmplenotePlugin }), 
                { singleton: true }
            );
            break;
            
        default:
            throw new Error(`Unknown environment: ${environment}`);
    }
    
    return container;
}

/**
 * Gets a task API service for a specific environment (convenience function)
 * @param {string} environment - 'development', 'test', or 'production'
 * @param {Object} options - Additional options
 * @returns {TaskAPIService} The task API service
 */
export function getTaskAPIService(environment, options = {}) {
    const container = setupServices(environment, options);
    return container.get('taskAPI');
}

/**
 * Sets up test environment with specific mock data
 * @param {Array} mockTasks - Array of mock task data
 * @returns {Object} Object with taskAPI service and helper methods
 */
export function setupTestEnvironment(mockTasks = []) {
    const taskAPI = TaskAPIServiceFactory.create('test', { mockData: mockTasks });
    
    return {
        taskAPI,
        // Convenience methods for testing
        setMockTasks: (tasks) => taskAPI.setMockTasks(tasks),
        getMockTasks: () => taskAPI.getMockTasks(),
        setMockResponse: (method, response) => taskAPI.setMockResponse(method, response),
        reset: () => taskAPI.reset()
    };
} 