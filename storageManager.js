class StorageManager {
    static getItem(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            // 尝试解析JSON数据
            const parsed = JSON.parse(item);
            
            // 如果是任务数据且是旧格式，进行迁移
            if (key === 'tasks' && Array.isArray(parsed) && parsed.length > 0 && !parsed[0].id) {
                return this.migrateTasks(parsed);
            }
            
            return parsed;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return null;
        }
    }

    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error saving ${key} to localStorage:`, error);
            return false;
        }
    }

    static migrateTasks(oldTasks) {
        try {
            const migratedTasks = oldTasks.map(task => ({
                ...task,
                id: Date.now().toString(),
                tags: [],
                project: '默认',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
            this.setItem('tasks', migratedTasks);
            return migratedTasks;
        } catch (error) {
            console.error('Error migrating tasks:', error);
            return oldTasks; // 返回原始数据作为回退
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
}

export default StorageManager;