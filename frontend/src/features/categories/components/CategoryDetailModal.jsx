import GroupDetailModal from "./GroupDetailModal";

export default function CategoryDetailModal({
  isOpen,
  category,
  description,
  tasks,
  onClose,
  onTaskUpdated,
}) {
  return isOpen ? (
    <GroupDetailModal
      kind="category"
      name={category}
      description={description}
      tasks={tasks}
      onClose={onClose}
      onTaskUpdated={onTaskUpdated}
    />
  ) : null;
}
