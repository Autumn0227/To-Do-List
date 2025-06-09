import StorageManager from './storageManager.js';

class TaskManager {
    static storageKey = 'tasks';
    
    static getTasks(filterOptions = {}) {
        const tasks = StorageManager.getItem(this.storageKey) || [];
        
        return tasks.filter(task => {
            // 搜索文本筛选
            if (filterOptions.searchText) {
                const searchText = filterOptions.searchText.toLowerCase();
                if (!task.text.toLowerCase().includes(searchText)) {
                    return false;
                }
            }
            
            // 分类筛选
            if (filterOptions.category && task.category !== filterOptions.category) {
                return false;
            }
            
            // 优先级筛选
            if (filterOptions.priority && task.priority !== filterOptions.priority) {
                return false;
            }
            
            // 状态筛选
            if (filterOptions.status) {
                if (filterOptions.status === '已完成' && !task.completed) {
                    return false;
                }
                if (filterOptions.status === '未完成' && task.completed) {
                    return false;
                }
            }
            
            // 标签筛选
            if (filterOptions.tag) {
                if (!task.tags || !task.tags.includes(filterOptions.tag)) {
                    return false;
                }
            }
            
            // 项目筛选
            if (filterOptions.project && task.project !== filterOptions.project) {
                return false;
            }
            
            return true;
        });
    }
    
    static addTask(newTask) {
        const tasks = this.getTasks();
        const taskWithId = {
            ...newTask,
            id: Date.now().toString(),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        tasks.push(taskWithId);
        StorageManager.setItem(this.storageKey, tasks);
    }
    
    static toggleTaskCompletion(taskId) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex].completed = !tasks[taskIndex].completed;
            tasks[taskIndex].updatedAt = new Date().toISOString();
            StorageManager.setItem(this.storageKey, tasks);
        }
    }
    
    static deleteTask(taskId) {
        const tasks = this.getTasks().filter(t => t.id !== taskId);
        StorageManager.setItem(this.storageKey, tasks);
    }
    
    static updateTask(taskId, updates) {
        const tasks = this.getTasks();
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = {
                ...tasks[taskIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            StorageManager.setItem(this.storageKey, tasks);
        }
    }
    
    static getProjects() {
        const tasks = this.getTasks();
        const projects = new Set(tasks.map(t => t.project));
        return Array.from(projects);
    }
    
    static getTags() {
        const tasks = this.getTasks();
        const tags = new Set();
        tasks.forEach(task => {
            if (task.tags) {
                task.tags.forEach(tag => tags.add(tag));
            }
        });
        return Array.from(tags);
    }
}

export default TaskManager;