import TaskManager from './taskManager.js';

class UIController {
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
            searchBtn: document.getElementById('searchBtn'),
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
        this.elements.searchBtn.addEventListener('click', () => this.handleSearch());
        this.elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAddTask();
        });
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
        }
    }

    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
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

        // 按项目分组
        const projects = {};
        tasks.forEach(task => {
            if (!projects[task.project]) {
                projects[task.project] = [];
            }
            projects[task.project].push(task);
        });

        // 渲染每个项目组
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
        checkbox.addEventListener('change', () => this.toggleTaskCompletion(task.id));

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

        const taskActions = document.createElement('div');
        taskActions.className = 'task-actions';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '删除';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });

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

    // 其他方法保持不变...
    toggleTaskCompletion(taskId) {
        this.taskManager.toggleTaskCompletion(taskId);
        this.renderTasks();
        this.updateStats();
    }

    deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            this.taskManager.deleteTask(taskId);
            this.renderTasks();
            this.updateStats();
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
}

export default UIController;