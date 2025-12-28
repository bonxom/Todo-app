import { useState } from 'react';
import MainLayout from '../layout/MainLayout';
import ActionButtons from '../feature/Todo/GenTaskButton';
import AddTaskButton from '../feature/Todo/AddTaskButton';
import TaskDetailButton from '../feature/Todo/TaskDetailButton';
import SearchBar from '../feature/Todo/SearchBar';
import FilterBar from '../feature/Todo/FilterBar';
import TaskList from '../feature/Todo/TaskList';
import ProgressBar from '../feature/Todo/ProgressBar';
import ChatBubble from '../component/ChatBuble';

const TodoPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [tasks, setTasks] = useState([
    {
      id: '1',
      title: 'Complete project presentation',
      category: 'Work',
      priority: 'High',
      completed: false,
    },
    {
      id: '2',
      title: 'Buy groceries for the week',
      category: 'Shopping',
      priority: 'Medium',
      completed: false,
    },
    {
      id: '3',
      title: 'Go for a morning run',
      category: 'Health',
      priority: 'Low',
      completed: true,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['Work', 'Personal', 'Shopping', 'Health'];

  const handleToggleComplete = (taskId) => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDelete = (taskId) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  return (
    <>
    <MainLayout>
      <AddTaskButton
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
      />
      
      <div className="flex justify-center items-start min-h-full p-6">
        <div className="w-full max-w-4xl mx-auto bg-gray-100/50 backdrop-blur-sm rounded-xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="flex justify-center text-3xl font-bold mb-3 bg-gradient-to-r bg-linear-to-br from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Todo App
            </h1> 
            <p className="flex justify-center text-gray-500 mb-2">Stay organized and productive</p>
            <div className="flex justify-center gap-2 text-sm text-gray-500">
              <span>{completedCount} completed</span>
              <span>·</span>
              <span>{totalCount} total tasks</span>
            </div>
          </div>

          <ActionButtons 
            onAddTask={() => setIsModalOpen(true)} 
            onAutoGenerate={() => console.log('Generate tasks')}
          />

          <div className="flex flex-col sm:flex-row gap-4 my-6">
            <div className="flex-1">
              <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
            </div>
            <div className="sm:w-auto">
              <FilterBar
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                categories={categories}
              />
            </div>
          </div>

          <TaskList
            tasks={filteredTasks}
            onToggleComplete={handleToggleComplete}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          <div className="mt-6">
            <ProgressBar completed={completedCount} total={totalCount} />
          </div>
        </div>
      </div>
    </MainLayout>
    
    <ChatBubble />
  </>
  );
};

export default TodoPage;

