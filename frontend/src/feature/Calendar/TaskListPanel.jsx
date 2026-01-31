import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Plus, Sparkles } from 'lucide-react';
import TaskCard from '../Category/TaskCard';
import TaskDetailButton from '../Todo/TaskDetailButton';
import TaskListDetailModal from './TaskListDetailModal';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';

const TaskListPanel = ({ selectedDate, tasks, onTaskUpdated }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  // Cache today's date to prevent unnecessary re-renders
  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const isToday = selectedDate && selectedDate.toDateString() === today.toDateString();

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by priority (High > Medium > Low) then by status
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const statusOrder = { 'in-progress': 0, pending: 1, completed: 2, 'given-up': 3 };
    
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const MAX_DISPLAY_TASKS = 5;
  const displayTasks = sortedTasks.slice(0, MAX_DISPLAY_TASKS);
  const hasMore = sortedTasks.length > MAX_DISPLAY_TASKS;

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <TaskDetailButton
        isOpen={isEditModalOpen}
        task={selectedTask}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={onTaskUpdated}
      />

      <TaskListDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDate={selectedDate}
        tasks={sortedTasks}
        onTaskUpdated={onTaskUpdated}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {isToday ? 'Today\'s Tasks' : 'Tasks'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddTaskModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg shadow-md transition-all text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-lg shadow-md transition-all text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Generate
            </button>
          </div>
        </div>
        {selectedDate && (
          <p className="text-sm text-gray-600">
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Total: <span className="font-semibold text-gray-900">{tasks.length}</span>
          </span>
          {tasks.filter(t => t.status === 'in-progress').length > 0 && (
            <span className="text-blue-600">
              In Progress: <span className="font-semibold">{tasks.filter(t => t.status === 'in-progress').length}</span>
            </span>
          )}
          {tasks.filter(t => t.status === 'pending').length > 0 && (
            <span className="text-purple-600">
              Pending: <span className="font-semibold">{tasks.filter(t => t.status === 'pending').length}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {tasks.length > 0 ? (
          <>
            {displayTasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onClick={handleTaskClick}
                quickActions={true}
                onTaskUpdated={onTaskUpdated}
              />
            ))}
            
            {isHovering ? (
              <button
                onClick={() => setIsDetailModalOpen(true)}
                className="w-full p-3 rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-400 hover:bg-purple-50 transition-all text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center justify-center gap-2"
              >
                <ChevronDown className="w-4 h-4" />
                <span>View all </span>
              </button>
            ) : hasMore ? (
              <div className="text-center py-2 text-gray-400 text-sm">
                •••
              </div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <CalendarIcon className="w-16 h-16 mb-3 opacity-50" />
            <p className="text-lg font-medium">No tasks for this day</p>
            <p className="text-sm mt-1">
              {isToday ? 'You\'re all caught up!' : 'Select another date to view tasks'}
            </p>
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''}
      />

      {/* Generate Tasks Modal */}
      <DetailRequestModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDate={selectedDate}
        onTasksGenerated={onTaskUpdated}
      />
    </div>
  );
};

export default TaskListPanel;
