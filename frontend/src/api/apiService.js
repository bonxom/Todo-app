import axiosInstance from './axiosInstance';

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
    console.log('authService.login called with:', credentials);
    console.log('API URL:', '/api/auth/login');
    
    const response = await axiosInstance.post('/api/auth/login', credentials);
    console.log('Login API response:', response.data);
    
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      console.log('Token saved to localStorage');
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
  logout: () => {
    const response = axiosInstance.post('/api/auth/logout');
    localStorage.removeItem('token');
    return response.data;
  },
};

// ==================== Task Service ====================
export const taskService = {
  // Create new task
  createTask: async (taskData) => {
    const response = await axiosInstance.post('/api/tasks', taskData);
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
    const response = await axiosInstance.put(`/api/tasks/${taskId}`, taskData);
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
}