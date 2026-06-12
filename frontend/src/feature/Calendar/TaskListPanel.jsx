import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDown, Plus, Sparkles } from 'lucide-react';
import TaskDetailButton from '../Todo/TaskDetailButton';
import TaskListDetailModal from './TaskListDetailModal';
import DetailRequestModal from './DetailRequestModal';
import AddTaskModal from '../Dialog/AddTaskModal';
import CalendarTaskDetailCard from './CalendarTaskDetailCard';

const TaskListPanel = ({ selectedDate, tasks, onTaskUpdated }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const today = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const isToday = selectedDate && selectedDate.toDateString() === today.toDateString();

  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    const statusOrder = { 'in-progress': 0, pending: 1, completed: 2, 'given-up': 3 };

    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    return statusOrder[a.status] - statusOrder[b.status];
  });

  const MAX_DISPLAY_TASKS = 4;
  const displayTasks = sortedTasks.slice(0, MAX_DISPLAY_TASKS);
  const hasMore = sortedTasks.length > MAX_DISPLAY_TASKS;

  return (
    <div
      className="flex h-full flex-col rounded-[2rem] border border-gray-200 bg-white p-6 shadow-lg"
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
        onProjectCreated={onTaskUpdated}
      />

      <TaskListDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDate={selectedDate}
        tasks={sortedTasks}
        onTaskUpdated={onTaskUpdated}
      />

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarIcon className="h-6 w-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {isToday ? 'Today\'s Tasks' : 'Day Detail'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddTaskModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-blue-700"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsGenerateModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:from-emerald-600 hover:to-teal-700"
            >
              <Sparkles className="h-4 w-4" />
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
              day: 'numeric',
            })}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="text-gray-600">
            Total: <span className="font-semibold text-gray-900">{tasks.length}</span>
          </span>
          {tasks.filter((task) => task.status === 'in-progress').length > 0 && (
            <span className="text-blue-600">
              In Progress: <span className="font-semibold">{tasks.filter((task) => task.status === 'in-progress').length}</span>
            </span>
          )}
          {tasks.filter((task) => task.status === 'pending').length > 0 && (
            <span className="text-purple-600">
              Pending: <span className="font-semibold">{tasks.filter((task) => task.status === 'pending').length}</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {tasks.length > 0 ? (
          <>
            {displayTasks.map((task) => (
              <CalendarTaskDetailCard
                key={task._id || task.id}
                task={task}
                mode="panel"
                onClick={(clickedTask) => {
                  setSelectedTask(clickedTask);
                  setIsEditModalOpen(true);
                }}
                onTaskUpdated={onTaskUpdated}
              />
            ))}

            {isHovering ? (
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 p-3 text-sm font-medium text-purple-600 transition-all hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
              >
                <ChevronDown className="h-4 w-4" />
                <span>View all</span>
              </button>
            ) : hasMore ? (
              <div className="py-2 text-center text-sm text-gray-400">•••</div>
            ) : null}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
            <CalendarIcon className="mb-3 h-16 w-16 opacity-50" />
            <p className="text-lg font-medium text-gray-700">No tasks for this day</p>
            <p className="mt-1 text-sm text-gray-500">
              {isToday ? 'You are all caught up.' : 'Select another date to view its exact-day workload.'}
            </p>
          </div>
        )}
      </div>

      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        onTaskCreated={onTaskUpdated}
        initialDueDate={selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : ''}
      />

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
