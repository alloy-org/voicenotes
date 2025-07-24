/**
 * Task API Service Interface and Implementations
 * Using Dependency Injection pattern for environment-specific behavior
 */

// Base interface that all implementations must follow
export class TaskAPIService {
    async getNoteTasks(noteUUID) {
        throw new Error('getNoteTasks must be implemented');
    }
    
    async updateTask(taskUUID, updates) {
        throw new Error('updateTask must be implemented');
    }
    
    async insertTask(noteUUID, taskData) {
        throw new Error('insertTask must be implemented');
    }
    
    async deleteTask(taskUUID) {
        throw new Error('deleteTask must be implemented');
    }
}

// Development implementation - returns hardcoded mock data
export class DevTaskAPIService extends TaskAPIService {
    constructor() {
        super();
        this.mockTasks = [
            {
                uuid: "task-1",
                content: "JavaScript Fundamentals",
                completedAt: null,
                noteUUID: "note-1",
                score: 1
            },
            {
                uuid: "task-2",
                content: "Advanced JavaScript [task-1](https://www.amplenote.com/notes/tasks/task-1?relation=blocking)",
                completedAt: null,
                noteUUID: "note-1",
                score: 1
            }
        ];
    }
    
    async getNoteTasks(noteUUID) {
        console.log('[DEV] Getting tasks for note:', noteUUID);
        return [...this.mockTasks]; // Return copy to avoid mutations
    }
    
    async updateTask(taskUUID, updates) {
        console.log('[DEV] Updating task:', taskUUID, updates);
        const taskIndex = this.mockTasks.findIndex(t => t.uuid === taskUUID);
        if (taskIndex !== -1) {
            this.mockTasks[taskIndex] = { ...this.mockTasks[taskIndex], ...updates };
            return true; // Amplenote API returns boolean
        }
        return false; // Amplenote API returns false if task not found
    }
    
    async insertTask(noteUUID, taskData) {
        console.log('[DEV] Inserting task into note:', noteUUID, taskData);
        const taskUUID = `task-${Date.now()}`;
        const newTask = {
            uuid: taskUUID,
            completedAt: null,
            score: 1,
            noteUUID: noteUUID,
            ...taskData
        };
        this.mockTasks.push(newTask);
        return taskUUID; // Return just the UUID like the real API
    }
    
    async deleteTask(taskUUID) {
        console.log('[DEV] Deleting task:', taskUUID);
        const taskIndex = this.mockTasks.findIndex(t => t.uuid === taskUUID);
        if (taskIndex !== -1) {
            const deletedTask = this.mockTasks.splice(taskIndex, 1)[0];
            return deletedTask;
        }
        return null;
    }
    

}

// Test implementation - configurable mock data
export class TestTaskAPIService extends TaskAPIService {
    constructor(initialMockData = []) {
        super();
        this.mockTasks = [...initialMockData];
        this.mockResponses = new Map(); // For setting up specific test responses
    }
    
    // Test helper methods
    setMockTasks(tasks) {
        this.mockTasks = [...tasks];
    }
    
    getMockTasks() {
        return [...this.mockTasks];
    }
    
    setMockResponse(method, response) {
        this.mockResponses.set(method, response);
    }
    
    clearMockResponses() {
        this.mockResponses.clear();
    }
    
    reset() {
        this.mockTasks = [];
        this.mockResponses.clear();
    }
    
    async getNoteTasks(noteUUID) {
        if (this.mockResponses.has('getNoteTasks')) {
            return this.mockResponses.get('getNoteTasks');
        }
        return this.mockTasks.filter(task => task.noteUUID === noteUUID);
    }
    
    async updateTask(taskUUID, updates) {
        if (this.mockResponses.has('updateTask')) {
            return this.mockResponses.get('updateTask');
        }
        const taskIndex = this.mockTasks.findIndex(t => t.uuid === taskUUID);
        if (taskIndex !== -1) {
            this.mockTasks[taskIndex] = { ...this.mockTasks[taskIndex], ...updates };
            return true; // Amplenote API returns boolean
        }
        return false; // Amplenote API returns false if task not found
    }
    
    async insertTask(noteUUID, taskData) {
        if (this.mockResponses.has('insertTask')) {
            return this.mockResponses.get('insertTask');
        }
        const taskUUID = `test-task-${Date.now()}`;
        const newTask = {
            uuid: taskUUID,
            completedAt: null,
            score: 1,
            noteUUID: noteUUID,
            ...taskData
        };
        this.mockTasks.push(newTask);
        return taskUUID; // Return just the UUID like the real API
    }
    
    async deleteTask(taskUUID) {
        if (this.mockResponses.has('deleteTask')) {
            return this.mockResponses.get('deleteTask');
        }
        const taskIndex = this.mockTasks.findIndex(t => t.uuid === taskUUID);
        if (taskIndex !== -1) {
            return this.mockTasks.splice(taskIndex, 1)[0];
        }
        return null;
    }
    

}

// Production implementation - uses real Amplenote API
export class ProdTaskAPIService extends TaskAPIService {
    constructor(callAmplenotePlugin) {
        super();
        this.callAmplenotePlugin = callAmplenotePlugin;
        if (!callAmplenotePlugin) {
            throw new Error('ProdTaskAPIService requires callAmplenotePlugin function');
        }
    }
    
    async getNoteTasks(noteUUID) {
        try {
            return await this.callAmplenotePlugin('getNoteTasks', { uuid: noteUUID }, { includeDone: true });
        } catch (error) {
            console.error('Failed to get tasks from Amplenote:', error);
            throw error;
        }
    }
    
    async updateTask(taskUUID, updates) {
        try {
            return await this.callAmplenotePlugin('updateTask', taskUUID, updates);
        } catch (error) {
            console.error('Failed to update task in Amplenote:', error);
            throw error;
        }
    }
    

    
    async deleteTask(taskUUID) {
        try {
            // Note: You might need to implement this via updateTask or replaceNoteContent
            // depending on how Amplenote handles task deletion
            return await this.callAmplenotePlugin('deleteTask', taskUUID);
        } catch (error) {
            console.error('Failed to delete task in Amplenote:', error);
            throw error;
        }
    }
    
    async insertTask(noteUUID, taskData) {
        try {
            // insertTask expects: (noteHandle, taskObject)
            // Returns: taskUUID string
            return await this.callAmplenotePlugin('insertTask', { uuid: noteUUID }, taskData);
        } catch (error) {
            console.error('Failed to insert task in Amplenote:', error);
            throw error;
        }
    }
}

// Factory for creating the appropriate service based on environment
export class TaskAPIServiceFactory {
    static create(environment, options = {}) {
        switch (environment) {
            case 'development':
                return new DevTaskAPIService();
                
            case 'test':
                return new TestTaskAPIService(options.mockData);
                
            case 'production':
                if (!options.callAmplenotePlugin) {
                    throw new Error('Production environment requires callAmplenotePlugin option');
                }
                return new ProdTaskAPIService(options.callAmplenotePlugin);
                
            default:
                throw new Error(`Unknown environment: ${environment}`);
        }
    }
}

// Simple DI Container for managing services
export class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }
    
    register(name, factory, options = {}) {
        this.services.set(name, { factory, options });
    }
    
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }
        
        // Singleton pattern
        if (service.options.singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, service.factory());
            }
            return this.singletons.get(name);
        }
        
        // Create new instance
        return service.factory();
    }
    
    has(name) {
        return this.services.has(name);
    }
} 