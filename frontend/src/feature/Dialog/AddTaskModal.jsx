import AddTaskForm from '../Todo/Form/AddTaskForm';

const AddTaskModal = ({ isOpen, onClose, onTaskCreated, initialDueDate }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-100 rounded-t-2xl">
          <h2 className="text-xl font-semibold text-gray-900">Add Task</h2>
        </div>
        <div className="px-6 py-5">
          <AddTaskForm 
            onClose={onClose}
            onTaskCreated={onTaskCreated}
            initialDueDate={initialDueDate}
          />
        </div>
      </div>
    </div>
  );
};

export default AddTaskModal;
