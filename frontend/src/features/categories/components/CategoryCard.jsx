import { useState } from "react";
import { ArrowUpRight, Folder, Trash2 } from "lucide-react";
import CategoryTaskPreview from "./CategoryTaskPreview";
import CategoryDetailModal from "./CategoryDetailModal";
import TaskDetailButton from "@/features/tasks/components/TaskDetailButton";
import DeleteCategoryDialog from "@/features/tasks/components/dialogs/DeleteCategoryDialog";
import { useDeleteCategoryMutation } from "../api/categoryMutations";
import { useUpdateTaskMutation } from "@/features/tasks/api/taskMutations";
import { getTaskDragData } from "@/shared/utils/taskDrag";
import { getApiErrorMessage } from "@/shared/services/apiError";

const CategoryCard = ({
  category,
  description,
  tasks,
  onTaskUpdated,
  categoryId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const completedTasks = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const displayTasks = [...tasks]
    .sort(
      (a, b) =>
        Number(a.status === "completed") - Number(b.status === "completed"),
    )
    .slice(0, 2);

  const descriptionId = `category-${categoryId}-description`;

  const deleteCategoryMutation = useDeleteCategoryMutation();
  const updateTaskMutation = useUpdateTaskMutation();

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (event) => {
    event.stopPropagation();
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await deleteCategoryMutation.mutateAsync(categoryId);
      setIsDeleteDialogOpen(false);
      onTaskUpdated?.();
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert(
        getApiErrorMessage(
          error,
          "Failed to delete category. Please try again.",
        ),
      );
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOver(false);
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const { taskId, currentCategoryId } = getTaskDragData(event);

    if (!taskId || currentCategoryId === categoryId) {
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        payload: { categoryId },
      });
      onTaskUpdated?.();
    } catch (error) {
      console.error("Failed to move task:", error);
      alert(getApiErrorMessage(error, "Failed to move task to this category."));
    }
  };

  return (
    <>
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

      <CategoryDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={category}
        description={description}
        tasks={tasks}
        categoryId={categoryId}
        onTaskUpdated={onTaskUpdated}
      />

      <article
        className={`category-card ui-drop-zone ${isDragOver ? "category-card--drag" : ""}`}
        data-drag-active={isDragOver ? "true" : "false"}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="category-card-body">
          <div className="category-card-top">
            <span className="category-folder">
              <Folder size={22} />
            </span>
            <span className="category-task-count">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
            </span>
            {category !== "Uncategorized" && (
              <button
                type="button"
                className="category-delete"
                onClick={handleDeleteClick}
                aria-label={`Delete ${category}`}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <button
            className="category-card-title"
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-describedby={descriptionId}
          >
            <h2>{category}</h2>
            <ArrowUpRight size={19} />
          </button>
          <p id={descriptionId} className="category-card-description">
            {description ||
              (category === "Uncategorized"
                ? "A home for tasks still finding their place."
                : "Keep related tasks together and make space for what matters.")}
          </p>
          <div className="category-progress-label">
            <span>
              {totalTasks
                ? `${completedTasks} of ${totalTasks} completed`
                : "Ready for a fresh start"}
            </span>
            <strong>{completionRate}%</strong>
          </div>
          <div
            className="category-progress"
            role="progressbar"
            aria-label={`${category} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionRate}
          >
            <div style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="category-task-preview">
          <p className="category-preview-label">
            {displayTasks.length ? "A LOOK INSIDE" : "ROOM FOR SOMETHING GOOD"}
          </p>
          {displayTasks.length ? (
            displayTasks.map((task) => (
              <CategoryTaskPreview
                key={task._id || task.id}
                task={task}
                onOpen={handleTaskClick}
                onTaskUpdated={onTaskUpdated}
              />
            ))
          ) : (
            <p className="category-empty-hint">
              Assign a task to this category, or drag one here.
            </p>
          )}
        </div>
        <button
          className="category-card-footer"
          type="button"
          onClick={() => setIsModalOpen(true)}
        >
          <span>Explore category</span>
          <ArrowUpRight size={16} />
        </button>
      </article>

      <DeleteCategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        categoryName={category}
      />
    </>
  );
};

export default CategoryCard;
