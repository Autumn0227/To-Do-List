// 定义全局变量
window.StorageManager = class StorageManager {
    static getItem(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            
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
            // 处理null或undefined输入
            if (!oldTasks) {
                return [];
            }
            
            // 确保输入是数组
            if (!Array.isArray(oldTasks)) {
                console.warn('Expected array for tasks migration, got:', typeof oldTasks);
                return [];
            }
            
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
            return oldTasks || []; // 确保总是返回数组
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
};

window.TaskManager = class TaskManager {
    static storageKey = 'tasks';
    
    static getTasks(filterOptions = {}) {
        const tasks = StorageManager.getItem(this.storageKey) || [];
        
        return tasks.filter(task => {
            if (filterOptions.searchText) {
                const searchText = filterOptions.searchText.toLowerCase();
                if (!task.text.toLowerCase().includes(searchText)) {
                    return false;
                }
            }
            
            if (filterOptions.category && task.category !== filterOptions.category) {
                return false;
            }
            
            if (filterOptions.priority && task.priority !== filterOptions.priority) {
                return false;
            }
            
            if (filterOptions.status) {
                if (filterOptions.status === '已完成' && !task.completed) {
                    return false;
                }
                if (filterOptions.status === '未完成' && task.completed) {
                    return false;
                }
            }
            
            if (filterOptions.tag) {
                if (!task.tags || !task.tags.includes(filterOptions.tag)) {
                    return false;
                }
            }
            
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
};

window.UIController = class UIController {
    constructor() {
        this.taskManager = TaskManager;
        this.currentProject = '默认';
        this.projects = ['默认', '工作', '个人', '学习'];
        this.initElements();
        this.bindEvents();
        this.renderTasks();
        this.setupTheme();
    }

    initElements() {
        this.elements = {
            taskInput: document.getElementById('taskInput'),
            taskTags: document.getElementById('taskTags'),
            addTaskBtn: document.getElementById('addTaskBtn'),
            projectsContainer: document.getElementById('projectsContainer'),
            searchInput: document.getElementById('searchInput'),
            categoryFilter: document.getElementById('categoryFilter'),
            priorityFilter: document.getElementById('priorityFilter'),
            statusFilter: document.getElementById('statusFilter'),
            taskCategory: document.getElementById('taskCategory'),
            taskPriority: document.getElementById('taskPriority'),
            dueDate: document.getElementById('dueDate'),
            themeToggle: document.getElementById('themeToggle'),
            totalTasks: document.getElementById('totalTasks'),
            completedTasks: document.getElementById('completedTasks'),
            pendingTasks: document.getElementById('pendingTasks')
        };
    }

    bindEvents() {
        this.elements.addTaskBtn.addEventListener('click', () => this.handleAddTask());
        this.elements.searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAddTask();
        });
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        // 实时搜索和筛选
        this.elements.searchInput.addEventListener('input', () => this.handleSearch());
        this.elements.categoryFilter.addEventListener('change', () => this.handleSearch());
        this.elements.priorityFilter.addEventListener('change', () => this.handleSearch());
        this.elements.statusFilter.addEventListener('change', () => this.handleSearch());
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    toggleTheme() {
        // 添加主题切换动画类
        document.body.classList.add('theme-transition');
        
        // 切换主题
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // 更新主题切换按钮图标
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = isDark ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        // 移除动画类
        setTimeout(() => {
            document.body.classList.remove('theme-transition');
        }, 300);
    }

    parseTagsInput(tagsInput) {
        return tagsInput.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
    }

    handleAddTask() {
        const taskText = this.elements.taskInput.value.trim();
        if (!taskText) {
            this.showAlert('请输入任务内容');
            return;
        }

        try {
            const tags = this.parseTagsInput(this.elements.taskTags.value);
            const newTask = {
                text: taskText,
                category: this.elements.taskCategory.value || '默认',
                priority: this.elements.taskPriority.value || '中',
                dueDate: this.elements.dueDate.value || null,
                tags: tags,
                project: this.currentProject,
                createdAt: new Date().toISOString()
            };

            this.taskManager.addTask(newTask);
            this.renderTasks();
            this.clearForm();
        } catch (error) {
            this.showAlert(error.message);
        }
    }

    renderTasks(filterOptions = {}) {
        const tasks = this.taskManager.getTasks(filterOptions);
        this.elements.projectsContainer.innerHTML = '';

        const projects = {};
        tasks.forEach(task => {
            if (!projects[task.project]) {
                projects[task.project] = [];
            }
            projects[task.project].push(task);
        });

        Object.entries(projects).forEach(([projectName, projectTasks]) => {
            const projectGroup = document.createElement('div');
            projectGroup.className = 'project-group';

            const projectHeader = document.createElement('div');
            projectHeader.className = 'project-header';
            projectHeader.textContent = projectName;
            projectHeader.addEventListener('click', () => {
                projectHeader.classList.toggle('collapsed');
                taskList.style.display = projectHeader.classList.contains('collapsed') ? 'none' : 'block';
            });

            const taskList = document.createElement('ul');
            taskList.className = 'task-list';

            projectTasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                taskList.appendChild(taskElement);
            });

            projectGroup.appendChild(projectHeader);
            projectGroup.appendChild(taskList);
            this.elements.projectsContainer.appendChild(projectGroup);
        });

        this.updateStats();
    }

    createTaskElement(task) {
        const taskItem = document.createElement('li');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskItem.dataset.id = task.id;
        
        const taskContent = document.createElement('div');
        taskContent.className = 'task-content';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.setAttribute('aria-label', task.completed ? '标记任务为未完成' : '标记任务为已完成');
        checkbox.addEventListener('change', () => {
            checkbox.setAttribute('aria-label', checkbox.checked ? '标记任务为未完成' : '标记任务为已完成');
            this.toggleTaskCompletion(task.id);
        });

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;

        const taskMeta = document.createElement('div');
        taskMeta.className = 'task-meta';

        if (task.tags && task.tags.length > 0) {
            task.tags.forEach(tag => {
                const tagSpan = document.createElement('span');
                tagSpan.className = 'task-tag';
                tagSpan.textContent = tag;
                taskMeta.appendChild(tagSpan);
            });
        }

        if (task.category) {
            const categorySpan = document.createElement('span');
            categorySpan.className = 'task-category';
            categorySpan.textContent = task.category;
            taskMeta.appendChild(categorySpan);
        }

        if (task.priority) {
            const prioritySpan = document.createElement('span');
            prioritySpan.className = `task-priority priority-${task.priority}`;
            prioritySpan.textContent = task.priority;
            taskMeta.appendChild(prioritySpan);
        }

        if (task.dueDate) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'task-date';
            dateSpan.textContent = new Date(task.dueDate).toLocaleDateString();
            taskMeta.appendChild(dateSpan);
        }

        taskContent.appendChild(checkbox);
        taskContent.appendChild(taskText);
        taskContent.appendChild(taskMeta);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });

        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';
        taskActions.appendChild(deleteBtn);

        taskItem.appendChild(taskContent);
        taskItem.appendChild(taskActions);

        taskItem.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                taskItem.classList.toggle('expanded');
            }
        });

        return taskItem;
    }

    toggleTaskCompletion(taskId) {
        this.taskManager.toggleTaskCompletion(taskId);
        this.renderTasks();
    }

    editTask(taskId) {
        // 实现编辑逻辑
    }

    deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            this.taskManager.deleteTask(taskId);
            this.renderTasks();
        }
    }

    handleSearch() {
        const filterOptions = {
            searchText: this.elements.searchInput.value,
            category: this.elements.categoryFilter.value,
            priority: this.elements.priorityFilter.value,
            status: this.elements.statusFilter.value
        };
        this.renderTasks(filterOptions);
    }

    clearForm() {
        this.elements.taskInput.value = '';
        this.elements.taskTags.value = '';
        this.elements.taskCategory.selectedIndex = 0;
        this.elements.taskPriority.selectedIndex = 0;
        this.elements.dueDate.value = '';
    }

    updateStats() {
        const tasks = this.taskManager.getTasks();
        this.elements.totalTasks.textContent = tasks.length;
        this.elements.completedTasks.textContent = tasks.filter(t => t.completed).length;
        this.elements.pendingTasks.textContent = tasks.filter(t => !t.completed).length;
    }

    showAlert(message) {
        alert(message);
    }
};

// 保留更完整的初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM fully loaded and parsed');
        
        // 检查关键元素是否存在
        const loadingElement = document.getElementById('loading');
        const container = document.querySelector('.container');
        
        if (!loadingElement || !container) {
            throw new Error('关键DOM元素未找到');
        }
        
        console.log('关键元素存在，开始初始化...');
        
        // 显示调试边框
        document.body.classList.add('debug-outline');
        
        // 检查并迁移旧数据格式（同步操作）
        const migratedTasks = StorageManager.migrateTasks(StorageManager.getItem('tasks'));
        if (migratedTasks.length > 0) {
            console.log(`成功迁移 ${migratedTasks.length} 条任务数据`);
        } else {
            console.log('没有需要迁移的任务数据，使用空数组初始化');
            StorageManager.setItem('tasks', []);
        }
        
        // 初始化UI控制器
        const uiController = new UIController();
        console.log('UI控制器初始化完成');
        
        // 显示主容器
        container.style.display = 'block';
        console.log('主容器显示设置完成');
        
        // 添加显示类触发过渡效果
        setTimeout(() => {
            container.classList.add('show');
            console.log('过渡效果已触发');
            
            // 隐藏加载动画(使用CSS过渡)
            setTimeout(() => {
                loadingElement.classList.add('hidden');
                document.body.classList.remove('debug-outline');
                console.log('开始隐藏加载动画...');
                
                // 动画完成后完全移除元素
                loadingElement.addEventListener('transitionend', () => {
                    loadingElement.style.display = 'none';
                    console.log('加载动画完全隐藏');
                }, { once: true });
                
                // 最终状态检查
                console.log('容器可见性:', getComputedStyle(container).display);
                console.log('加载动画可见性:', getComputedStyle(loadingElement).display);
            }, 300);
        }, 50);
        
        // 开发调试用 - 输出当前任务数据
        console.log('当前任务数据:', TaskManager.getTasks());
        
        // 最终验证
        setTimeout(() => {
            if (document.querySelector('.container.show') && 
                document.getElementById('loading').style.display === 'none') {
                console.log('✅ 应用初始化验证通过');
            } else {
                console.warn('⚠️ 应用初始化状态异常');
                // 强制显示内容作为后备
                document.querySelector('.container').style.display = 'block';
                document.querySelector('.container').classList.add('show');
                document.getElementById('loading').style.display = 'none';
            }
        }, 1000);
    } catch (error) {
        console.error('应用初始化失败:', error);
        
        // 确保无论如何都显示内容
        const container = document.querySelector('.container');
        if (container) {
            container.style.display = 'block';
            container.classList.add('show');
        }
        
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        alert(`应用初始化失败: ${error.message}\n已强制显示界面`);
    }
});

// 全局导出用于调试
window.TaskManager = TaskManager;
window.StorageManager = StorageManager;