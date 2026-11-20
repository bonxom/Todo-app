import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("workspace");

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
        getApiErrorMessage(error, t("failedToDeleteCategoryPleaseTryAgain")),
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
      alert(getApiErrorMessage(error, t("failedToMoveTaskToThisCategory")));
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
        className={`category-card [background:var(--color-surface)] overflow-hidden flex flex-col ui-drop-zone relative [&::after]:absolute [&::after]:inset-[0.5rem] [&::after]:pointer-events-none [&::after]:opacity-[0] [&[data-drag-active=true]::after]:opacity-[1] ${isDragOver ? "category-card--drag [outline:2px_solid_var(--color-accent)] [background:var(--color-accent-soft)]" : ""}`}
        data-drag-active={isDragOver ? "true" : "false"}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="category-card-body p-[22px_22px_18px]">
          <div className="category-card-top flex items-center gap-[8px] mb-[18px]">
            <span className="category-folder w-[42px] h-[42px] grid place-items-center rounded-[12px] [background:var(--color-accent-soft)] text-[var(--color-accent)]">
              <Folder size={22} />
            </span>
            <span className="category-task-count ml-auto text-[11px] text-[var(--color-text-muted)]">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"}
            </span>
            {category !== "Uncategorized" && (
              <button
                type="button"
                className="category-delete grid place-items-center w-[30px] h-[30px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-danger-soft)]"
                onClick={handleDeleteClick}
                aria-label={t("messages.deleteV0", { v0: category })}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <button
            className="category-card-title flex gap-[10px] items-center justify-between w-full text-left cursor-pointer
              [&_h2]:text-[20px] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.025em] [&_h2]:wrap-anywhere
              [&_svg]:shrink-0 [&_svg]:text-[var(--color-text-muted)]"
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-describedby={descriptionId}
          >
            <h2>{category}</h2>
            <ArrowUpRight size={19} />
          </button>
          <div className="category-progress-label flex justify-between gap-[10px] text-[12px] text-[var(--color-text-muted)] m-[22px_0_8px] [&_strong]:text-[var(--color-accent)]">
            <span>
              {totalTasks
                ? t("messages.v0OfV1Completed", {
                    v0: completedTasks,
                    v1: totalTasks,
                  })
                : t("readyForAFreshStart")}
            </span>
            <strong>{completionRate}%</strong>
          </div>
          <div
            className="category-progress h-[4px] rounded-[5px] overflow-hidden [&_>_div]:h-full [&_>_div]:[background:var(--color-accent)] [&_>_div]:rounded-[inherit] [&_>_div]:[transition:width_0.2s]"
            role="progressbar"
            aria-label={t("messages.v0Progress", { v0: category })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionRate}
          >
            <div style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="category-task-preview p-[16px_22px] [border-top:1px_solid_var(--color-line)] flex-1 min-h-[109px]">
          <p className="category-preview-label text-[10px] [font-weight:600] [letter-spacing:0.13em] text-[var(--color-text-muted)] mb-[8px]">
            {displayTasks.length ? t("aLookInside") : t("roomForSomethingGood")}
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
            <p className="category-empty-hint text-[12px] [line-height:1.8] text-[var(--color-text-muted)] max-w-[24ch]">
              {t("assignATaskToThisCategoryOrDragOneHere")}
            </p>
          )}
        </div>
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
