import { Calendar as CalendarIcon } from 'lucide-react';
import TaskCard from '../Category/TaskCard';

const TaskListPanel = ({ selectedDate, tasks, onTaskUpdated }) => {
  const isToday = selectedDate && 
    selectedDate.toDateString() === new Date().toDateString();

  const formatDate = (date) => {
    if (!date) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    // Sort by priority (High > Medium > Low) then by status
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const statusOrder = { 'in-progress': 0, pending: 1, completed: 2, 'given-up': 3 };
    
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    
    return statusOrder[a.status] - statusOrder[b.status];
  });

  const tasksByStatus = {
    'in-progress': sortedTasks.filter(t => t.status === 'in-progress'),
    pending: sortedTasks.filter(t => t.status === 'pending'),
    completed: sortedTasks.filter(t => t.status === 'completed'),
    'given-up': sortedTasks.filter(t => t.status === 'given-up'),
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CalendarIcon className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">
            {isToday ? 'Today\'s Tasks' : 'Tasks'}
          </h2>
        </div>
        {selectedDate && (
          <p className="text-sm text-gray-600">
            {formatDate(selectedDate)}
          </p>
        )}
        <div className="mt-3 flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            Total: <span className="font-semibold text-gray-900">{tasks.length}</span>
          </span>
          {tasksByStatus['in-progress'].length > 0 && (
            <span className="text-blue-600">
              In Progress: <span className="font-semibold">{tasksByStatus['in-progress'].length}</span>
            </span>
          )}
          {tasksByStatus.pending.length > 0 && (
            <span className="text-purple-600">
              Pending: <span className="font-semibold">{tasksByStatus.pending.length}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {tasks.length > 0 ? (
          sortedTasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onTaskUpdated={onTaskUpdated}
            />
          ))
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
    </div>
  );
};

export default TaskListPanel;
