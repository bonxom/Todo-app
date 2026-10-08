import { useEffect, useRef, useState } from "react";
import {
  Check,
  ArrowUpRight,
  FolderOpen,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import ProjectDetailModal from "./ProjectDetailModal";
import AddProjectForm from "../Form/AddProjectForm";
import DeleteProjectDialog from "./DeleteProjectDialog";
import CategoryTaskPreview from "@/features/categories/components/CategoryTaskPreview";
import TaskDetailButton from "../TaskDetailButton";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import {
  useDeleteProjectMutation,
  useUpdateProjectMutation,
} from "../../api/projectMutations";
import { useUpdateTaskMutation } from "../../api/taskMutations";
import { getTaskDragData } from "@/shared/utils/taskDrag";
import { getProjectColor } from "@/shared/utils/projectColor";
import {
  PROJECT_STATUS,
  canCompleteProject,
  isCompletedProject,
} from "@/shared/utils/projectStatus";
import { getApiErrorMessage } from "@/shared/services/apiError";

const ProjectCard = ({ project, tasks, onTaskUpdated, onProjectUpdated }) => {
  const [selectedTask, setSelectedTask] = useState(null);
  const editRef = useRef(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  useModalKeyboard(isEditModalOpen, editRef, () => setIsEditModalOpen(false));
  useEffect(() => {
    if (!isEditModalOpen && !isDeleteDialogOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isEditModalOpen, isDeleteDialogOpen]);
  const deleteProjectMutation = useDeleteProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();
  const updateTaskMutation = useUpdateTaskMutation();

  const completedTasks = tasks.filter(
    (task) => task.status === "completed",
  ).length;
  const totalTasks = tasks.length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previewTasks = [...tasks]
    .sort(
      (a, b) =>
        Number(["completed", "given-up"].includes(a.status)) -
        Number(["completed", "given-up"].includes(b.status)),
    )
    .slice(0, 2);
  const descriptionId = `project-${project._id}-description`;
  const projectColor = getProjectColor(project);
  const isProjectCompleted = isCompletedProject(project);
  const completionTasks = project.completionTasks || tasks;
  const isCompletionEligible =
    !isProjectCompleted && canCompleteProject(completionTasks);

  const handleConfirmDelete = async () => {
    try {
      await deleteProjectMutation.mutateAsync(project._id);
      setIsDeleteDialogOpen(false);
      setIsDetailOpen(false);
      onProjectUpdated?.();
    } catch (error) {
      console.error("Failed to delete project:", error);
      alert(
        getApiErrorMessage(
          error,
          "Failed to delete project. Please try again.",
        ),
      );
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProjectCompleted) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    setIsDragOver(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProjectCompleted) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    event.dataTransfer.dropEffect = "move";
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

    if (isProjectCompleted) {
      return;
    }

    const { taskId, currentProjectId } = getTaskDragData(event);

    if (!taskId || currentProjectId === project._id) {
      return;
    }

    try {
      await updateTaskMutation.mutateAsync({
        taskId,
        payload: { projectId: project._id },
      });
      onTaskUpdated?.();
    } catch (error) {
      console.error("Failed to move task to project:", error);
      alert(getApiErrorMessage(error, "Failed to move task to this project."));
    }
  };

  const handleCompleteProject = async () => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId: project._id,
        payload: { status: PROJECT_STATUS.COMPLETED },
      });
      onProjectUpdated?.();
    } catch (error) {
      console.error("Failed to complete project:", error);
      alert(getApiErrorMessage(error, "Failed to complete project."));
    }
  };

  const handleRestoreProject = async () => {
    try {
      await updateProjectMutation.mutateAsync({
        projectId: project._id,
        payload: { status: PROJECT_STATUS.ACTIVE },
      });
      onProjectUpdated?.();
    } catch (error) {
      console.error("Failed to restore project:", error);
      alert(getApiErrorMessage(error, "Failed to restore project."));
    }
  };

  return (
    <>
      {selectedTask && (
        <TaskDetailButton
          isOpen
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={onTaskUpdated}
          onProjectCreated={onProjectUpdated}
        />
      )}
      <ProjectDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        project={project}
        tasks={tasks}
        onTaskUpdated={onTaskUpdated}
        onProjectEdit={() => {
          setIsDetailOpen(false);
          setIsEditModalOpen(true);
        }}
        onProjectDelete={() => {
          setIsDetailOpen(false);
          setIsDeleteDialogOpen(true);
        }}
      />

      <DeleteProjectDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        projectName={project.name}
      />

      {isEditModalOpen ? (
        <div
          className="ui-modal-overlay fixed inset-0 z-[60] flex items-center justify-center p-4"
          onClick={() => setIsEditModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg max-h-[90dvh] overflow-y-auto animate-fadeIn"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-project-${project._id}`}
            ref={editRef}
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Edit</p>
                <h2
                  id={`edit-project-${project._id}`}
                  className="text-xl font-semibold text-[color:var(--color-text)]"
                >
                  Edit Project
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
                aria-label="Close edit project dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                project={project}
                onClose={() => setIsEditModalOpen(false)}
                onProjectSaved={() => {
                  setIsEditModalOpen(false);
                  onProjectUpdated?.();
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      <article
        className={`category-card project-collection-card ui-drop-zone ${isDragOver ? "category-card--drag" : ""}`}
        data-drag-active={isDragOver ? "true" : "false"}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ "--project-color": projectColor }}
      >
        <div className="category-card-body">
          <div className="category-card-top">
            <span className="category-folder">
              <FolderOpen size={22} />
            </span>
            <span className="project-state-label">
              <i />
              {isProjectCompleted ? "Completed" : "Active"}
            </span>
            <div className="project-card-actions">
              {isCompletionEligible && (
                <button
                  type="button"
                  className="category-delete"
                  onClick={handleCompleteProject}
                  disabled={updateProjectMutation.isPending}
                  aria-label={`Complete and hide ${project.name}`}
                  title="Complete project"
                >
                  <Check size={16} />
                </button>
              )}
              {isProjectCompleted && (
                <button
                  type="button"
                  className="category-delete"
                  onClick={handleRestoreProject}
                  disabled={updateProjectMutation.isPending}
                  aria-label={`Restore ${project.name}`}
                  title="Restore project"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                type="button"
                className="category-delete"
                onClick={() => setIsEditModalOpen(true)}
                aria-label={`Edit ${project.name}`}
                title="Edit project"
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="category-delete"
                onClick={() => setIsDeleteDialogOpen(true)}
                aria-label={`Delete ${project.name}`}
                title="Delete project"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="category-card-title"
            onClick={() => setIsDetailOpen(true)}
            aria-describedby={descriptionId}
          >
            <h2>{project.name}</h2>
            <ArrowUpRight size={19} />
          </button>
          <p className="category-card-description" id={descriptionId}>
            {project.description ||
              "Bring the next steps of your bigger plan together."}
          </p>
          <div className="category-progress-label">
            <span>
              {completedTasks} of {totalTasks} completed
            </span>
            <strong>{completionRate}%</strong>
          </div>
          <div
            className="category-progress"
            role="progressbar"
            aria-label={`${project.name} progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionRate}
          >
            <div style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="category-task-preview">
          <p className="category-preview-label">
            {previewTasks.length
              ? "A LOOK INSIDE"
              : "YOUR NEXT STEP STARTS HERE"}
          </p>
          {previewTasks.length ? (
            previewTasks.map((task) => (
              <CategoryTaskPreview
                key={task._id || task.id}
                task={task}
                onOpen={setSelectedTask}
                onTaskUpdated={onTaskUpdated}
              />
            ))
          ) : (
            <p className="category-empty-hint">
              {isProjectCompleted
                ? "Restore this project to add new tasks."
                : "Assign a task to this project, or drag one here."}
            </p>
          )}
        </div>
        <button
          type="button"
          className="category-card-footer"
          onClick={() => setIsDetailOpen(true)}
        >
          <span>
            Explore project{" "}
            <span className="project-footer-count">· {totalTasks} tasks</span>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </article>
    </>
  );
};

export default ProjectCard;
