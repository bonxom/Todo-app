import axiosInstance from './axiosInstance';
import {
  buildTaskMutationPayload,
  normalizeProject,
  normalizeProjects,
  normalizeProjectTasks,
} from './projectHelpers';

// ==================== Auth Service ====================
export const authService = {
  // Register new user
  register: async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await axiosInstance.post('/api/auth/login', credentials);

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  // Get current user info
  getMe: async () => {
    const response = await axiosInstance.get('/api/auth/me');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await axiosInstance.put('/api/auth/change-password', passwordData);
    return response.data;
  },

  // Update user info
  updateInfo: async (userData) => {
    const response = await axiosInstance.put('/api/auth/update-info', userData);
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      const response = await axiosInstance.post('/api/auth/logout');
      return response.data;
    } finally {
      localStorage.removeItem('token');
    }
  },
};

// ==================== Task Service ====================
export const taskService = {
  // Create new task
  createTask: async (taskData) => {
    const response = await axiosInstance.post('/api/tasks', buildTaskMutationPayload(taskData));
    return response.data;
  },

  // Get all tasks
  getAllTasks: async () => {
    const response = await axiosInstance.get('/api/tasks');
    return response.data;
  },

  // Get today's deadlines
  getTodayDeadlines: async () => {
    const response = await axiosInstance.get('/api/tasks/today-deadlines');
    return response.data;
  },

  // Get tasks by date range
  getTasksByDateRange: async (startDate, endDate) => {
    const response = await axiosInstance.get('/api/tasks', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Get tasks by status
  getTaskByStatus: async (status) => {
    const response = await axiosInstance.get(`/api/tasks/status/${status}`);
    return response.data;
  },

  // Get tasks by category
  getTaskByCategory: async (categoryId) => {
    const response = await axiosInstance.get(`/api/tasks/category/${categoryId}`);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (taskId) => {
    const response = await axiosInstance.get(`/api/tasks/${taskId}`);
    return response.data;
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    const response = await axiosInstance.put(`/api/tasks/${taskId}`, buildTaskMutationPayload(taskData));
    return response.data;
  },

  // Start task
  startTask: async (taskId) => {
    const response = await axiosInstance.put(`/api/tasks/${taskId}/start`);
    return response.data;
  },

  // Finish task
  finishTask: async (taskId) => {
    const response = await axiosInstance.put(`/api/tasks/${taskId}/finish`);
    return response.data;
  },

  // Give up task
  giveUpTask: async (taskId) => {
    const response = await axiosInstance.put(`/api/tasks/${taskId}/give-up`);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId) => {
    const response = await axiosInstance.delete(`/api/tasks/${taskId}`);
    return response.data;
  },
};

// ==================== Category Service ====================
export const categoryService = {
  // Create new category
  createCategory: async (categoryData) => {
    const response = await axiosInstance.post('/api/categories', categoryData);
    return response.data;
  },

  // Get all categories
  getAllCategories: async () => {
    const response = await axiosInstance.get('/api/categories');
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (categoryId) => {
    const response = await axiosInstance.get(`/api/categories/${categoryId}`);
    return response.data;
  },

  // Update category
  updateCategory: async (categoryId, categoryData) => {
    const response = await axiosInstance.put(`/api/categories/${categoryId}`, categoryData);
    return response.data;
  },

  // Delete category
  deleteCategory: async (categoryId) => {
    const response = await axiosInstance.delete(`/api/categories/${categoryId}`);
    return response.data;
  },
};

// ==================== Project Service ====================
export const projectService = {
  // Create new project
  createProject: async (projectData) => {
    const response = await axiosInstance.post('/api/projects', projectData);
    return normalizeProject(response.data);
  },

  // Get all projects
  getAllProjects: async () => {
    const response = await axiosInstance.get('/api/projects');
    return normalizeProjects(response.data);
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    const response = await axiosInstance.get(`/api/projects/${projectId}`);
    return normalizeProject(response.data);
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    const response = await axiosInstance.put(`/api/projects/${projectId}`, projectData);
    return normalizeProject(response.data);
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await axiosInstance.delete(`/api/projects/${projectId}`);
    return response.data;
  },

  // Get tasks for a single project
  getProjectTasks: async (projectId) => {
    const response = await axiosInstance.get(`/api/projects/${projectId}/tasks`);
    return normalizeProjectTasks(response.data);
  },
};

// ==================== User Service ====================
export const userService = {
  createUser: async (userData) => {
    const response = await axiosInstance.post('/api/users', userData);
    return response.data;
  },

  // Get all users (Admin only)
  getAllUsers: async () => {
    const response = await axiosInstance.get('/api/users');
    return response.data;
  },

  // Get user by ID (Admin only)
  getUserById: async (userId) => {
    const response = await axiosInstance.get(`/api/users/${userId}`);
    return response.data;
  },

  // Update user (Admin only)
  updateUser: async (userId, userData) => {
    const response = await axiosInstance.put(`/api/users/${userId}`, userData);
    return response.data;
  },

  // Delete user (Admin only)
  deleteUser: async (userId) => {
    const response = await axiosInstance.delete(`/api/users/${userId}`);
    return response.data;
  },
};

// ==================== AI Service ====================
export const aiService = {
  // Generate tasks based on user requirement
  generateTasks: async (requirementData) => {
    const response = await axiosInstance.post('/api/ai/require', requirementData);
    return response.data;
  },

  // Get AI chat response
  getChatResponse: async (userInput) => {
    const response = await axiosInstance.post('/api/ai/chat', userInput);
    return response.data;
  },
};
// ===================== Stat ===========================
export const statService = {
  // Get user stats
  getUserStats: async () => {
    const response = await axiosInstance.get('/api/stats/');
    return response.data;
  } 
};
