const DeleteProjectDialog = ({ isOpen, onClose, onConfirm, projectName }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Delete Project</h2>
        </div>
        <div className="px-6 py-6">
          <p className="mb-3 text-gray-900">
            Delete <span className="font-semibold">"{projectName}"</span>?
          </p>
          <p className="mb-6 text-sm text-gray-500">
            Tasks will stay in your account and their project assignment will be cleared.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 text-gray-700 transition-all hover:bg-gray-50 h-11"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md transition-all hover:from-red-600 hover:to-red-700 h-11"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteProjectDialog;
