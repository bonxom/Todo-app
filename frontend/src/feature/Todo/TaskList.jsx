import TaskItem from './TaskItem';

const TaskList = ({ tasks, onToggleComplete, onEdit, onGiveUp, onDelete }) => {
  if (tasks.length === 0) {
    return (
      <div className="bg-white/80 rounded-2xl shadow-sm p-8 text-center text-gray-500">
        <p>No tasks found. Add a new task to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
          onEdit={onEdit}
          onGiveUp={onGiveUp}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default TaskList;

