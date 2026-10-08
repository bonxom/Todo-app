import GroupDetailModal from "@/features/categories/components/GroupDetailModal";

export default function ProjectDetailModal({
  isOpen,
  onClose,
  project,
  tasks,
  onTaskUpdated,
  onProjectEdit,
  onProjectDelete,
}) {
  return isOpen && project ? (
    <GroupDetailModal
      kind="project"
      name={project.name}
      description={project.description}
      tasks={tasks}
      onClose={onClose}
      onTaskUpdated={onTaskUpdated}
      onEdit={onProjectEdit}
      onDelete={onProjectDelete}
      projectCompleted={project.status === "completed"}
    />
  ) : null;
}
