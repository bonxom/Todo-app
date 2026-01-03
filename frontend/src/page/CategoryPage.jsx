import { useState } from 'react';
import MainLayout from '../layout/MainLayout';
import CategoryGrid from '../feature/Category/CategoryGrid';
import CategoryStats from '../feature/Category/CategoryStats';
import ChatBubble from '../component/ChatBuble';

const CategoryPage = () => {
  // Mock tasks data - replace with actual API call
  const [tasks] = useState([
    {
      id: '1',
      title: 'Complete project presentation',
      category: 'Work',
      priority: 'High',
      completed: false,
    },
    {
      id: '2',
      title: 'Prepare meeting agenda',
      category: 'Work',
      priority: 'Medium',
      completed: false,
    },
    {
      id: '3',
      title: 'Review code changes',
      category: 'Work',
      priority: 'Low',
      completed: true,
    },
    {
      id: '4',
      title: 'Buy groceries for the week',
      category: 'Shopping',
      priority: 'Medium',
      completed: false,
    },
    {
      id: '5',
      title: 'Buy birthday gift',
      category: 'Shopping',
      priority: 'High',
      completed: false,
    },
    {
      id: '6',
      title: 'Go for a morning run',
      category: 'Health',
      priority: 'Low',
      completed: true,
    },
    {
      id: '7',
      title: 'Drink 8 glasses of water',
      category: 'Health',
      priority: 'Medium',
      completed: false,
    },
    {
      id: '8',
      title: 'Read a book chapter',
      category: 'Personal',
      priority: 'Low',
      completed: false,
    },
    {
      id: '9',
      title: 'Call family',
      category: 'Personal',
      priority: 'High',
      completed: true,
    },
    {
      id: '10',
      title: 'Learn new programming concept',
      category: 'Personal',
      priority: 'Medium',
      completed: false,
    },
  ]);

  // Group tasks by category
  const categorizedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {});

  // Calculate stats
  const stats = {
    totalCategories: Object.keys(categorizedTasks).length,
    totalTasks: tasks.length,
    completedTasks: tasks.filter(task => task.completed).length,
    pendingTasks: tasks.filter(task => !task.completed).length,
  };

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

            {/* Category Grid */}
            <CategoryGrid categorizedTasks={categorizedTasks} />
          </div>
        </div>
      </MainLayout>

      <ChatBubble />
    </>
  );
};

export default CategoryPage;
