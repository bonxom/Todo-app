import { useState, useEffect } from 'react';
import MainLayout from '../layout/MainLayout';
import CategoryGrid from '../feature/Category/CategoryGrid';
import CategoryStats from '../feature/Category/CategoryStats';
import ChatBubble from '../component/ChatBuble';
import { categoryService, taskService } from '../api/apiService';

const CategoryPage = () => {
  const [categorizedTasks, setCategorizedTasks] = useState({});
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTasks, setAllTasks] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    fetchCategoriesAndTasks();
  }, []);

  const fetchCategoriesAndTasks = async () => {
    try {
      setIsLoading(true);

      // Fetch all categories
      const categoriesData = await categoryService.getAllCategories();
      setCategories(categoriesData);

      // Fetch tasks for each category
      const tasksByCategory = {};
      let allTasksArray = [];

      for (const category of categoriesData) {
        const tasks = await taskService.getTaskByCategory(category._id);
        tasksByCategory[category.name] = tasks;
        allTasksArray = [...allTasksArray, ...tasks];
      }

      setCategorizedTasks(tasksByCategory);
      setAllTasks(allTasksArray);
    } catch (error) {
      console.error('Error fetching categories and tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tasks by status
  const getFilteredTasksByCategory = () => {
    if (selectedStatus === 'all') {
      return categorizedTasks;
    }

    const filtered = {};
    Object.entries(categorizedTasks).forEach(([categoryName, tasks]) => {
      const filteredTasks = tasks.filter(task => task.status === selectedStatus);
      if (filteredTasks.length > 0) {
        filtered[categoryName] = filteredTasks;
      }
    });
    return filtered;
  };

  // Calculate stats (based on filtered tasks)
  const filteredCategorizedTasks = getFilteredTasksByCategory();
  const filteredAllTasks = selectedStatus === 'all' 
    ? allTasks 
    : allTasks.filter(task => task.status === selectedStatus);

  const stats = {
    totalCategories: Object.keys(filteredCategorizedTasks).length,
    totalTasks: filteredAllTasks.length,
    completedTasks: filteredAllTasks.filter(task => task.status === 'completed').length,
    pendingTasks: filteredAllTasks.filter(task => task.status === 'pending').length,
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-full">
          <div className="text-gray-500">Loading categories...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      <MainLayout>
        <div className="flex justify-center items-start min-h-full p-6">
          <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Categories
              </h1>
              <p className="text-gray-500 mb-2">Organize your tasks by category</p>
            </div>

            {/* Stats */}
            <CategoryStats stats={stats} />

            {/* Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedStatus('all')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === 'all'
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setSelectedStatus('pending')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === 'pending'
                    ? 'bg-purple-100 text-purple-700 border-2 border-purple-500 shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-purple-300'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setSelectedStatus('in-progress')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === 'in-progress'
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-500 shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
              >
                In Progress
              </button>
              <button
                onClick={() => setSelectedStatus('completed')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === 'completed'
                    ? 'bg-green-100 text-green-700 border-2 border-green-500 shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-green-300'
                }`}
              >
                Completed
              </button>
              <button
                onClick={() => setSelectedStatus('given-up')}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedStatus === 'given-up'
                    ? 'bg-gray-200 text-gray-700 border-2 border-gray-400 shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300'
                }`}
              >
                Given Up
              </button>
            </div>

            {/* Category Grid */}
            <CategoryGrid 
              categorizedTasks={filteredCategorizedTasks}
              onTaskUpdated={fetchCategoriesAndTasks}
            />
          </div>
        </div>
      </MainLayout>

      <ChatBubble />
    </>
  );
};

export default CategoryPage;
