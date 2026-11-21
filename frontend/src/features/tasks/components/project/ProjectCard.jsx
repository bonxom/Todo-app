import { useTranslation } from "react-i18next";
import FormDialog from "@/shared/components/FormDialog";
import { useEffect, useState } from "react";
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
  const { t } = useTranslation("workspace");

  const [selectedTask, setSelectedTask] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  useEffect(() => {
    if (!isDeleteDialogOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isDeleteDialogOpen]);
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
        getApiErrorMessage(error, t("failedToDeleteProjectPleaseTryAgain")),
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
      alert(getApiErrorMessage(error, t("failedToMoveTaskToThisProject")));
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
      alert(getApiErrorMessage(error, t("failedToCompleteProject")));
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
      alert(getApiErrorMessage(error, t("failedToRestoreProject")));
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

      <FormDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t("editProject")}
        kind="project"
      >
        <AddProjectForm
          project={project}
          onClose={() => setIsEditModalOpen(false)}
          onProjectSaved={() => {
            setIsEditModalOpen(false);
            onProjectUpdated?.();
          }}
        />
      </FormDialog>

      <article
        className={`category-card [background:var(--color-surface)] overflow-hidden flex flex-col project-collection-card ui-drop-zone relative [&::after]:absolute [&::after]:inset-[0.5rem] [&::after]:pointer-events-none [&::after]:opacity-[0] [&[data-drag-active=true]::after]:opacity-[1] ${isDragOver ? "category-card--drag [outline:2px_solid_var(--color-accent)] [background:var(--color-accent-soft)]" : ""}`}
        data-drag-active={isDragOver ? "true" : "false"}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ "--project-color": projectColor }}
      >
        <div className="category-card-body p-[22px_22px_18px]">
          <div className="category-card-top flex items-center gap-[8px] mb-[18px]">
            <span className="category-folder w-[42px] h-[42px] grid place-items-center rounded-[12px] [background:var(--color-accent-soft)] text-[var(--color-accent)]">
              <FolderOpen size={22} />
            </span>
            <span className="project-state-label flex items-center gap-[5px] text-[10px] text-[var(--color-text-muted)] [&_i]:w-[5px] [&_i]:h-[5px] [&_i]:rounded-[50%] [&_i]:[background:var(--project-color)]">
              <i />
              {isProjectCompleted ? t("completed") : t("active")}
            </span>
            <div className="project-card-actions flex ml-auto gap-[2px]">
              {isCompletionEligible && (
                <button
                  type="button"
                  className="category-delete grid place-items-center w-[30px] h-[30px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-danger-soft)]"
                  onClick={handleCompleteProject}
                  disabled={updateProjectMutation.isPending}
                  aria-label={t("messages.completeAndHideV0", {
                    v0: project.name,
                  })}
                  title={t("completeProject")}
                >
                  <Check size={16} />
                </button>
              )}
              {isProjectCompleted && (
                <button
                  type="button"
                  className="category-delete grid place-items-center w-[30px] h-[30px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-danger-soft)]"
                  onClick={handleRestoreProject}
                  disabled={updateProjectMutation.isPending}
                  aria-label={t("messages.restoreV0", { v0: project.name })}
                  title={t("restoreProject")}
                >
                  <RotateCcw size={15} />
                </button>
              )}
              <button
                type="button"
                className="category-delete grid place-items-center w-[30px] h-[30px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-danger-soft)]"
                onClick={() => setIsEditModalOpen(true)}
                aria-label={t("messages.editV0", { v0: project.name })}
                title={t("editProject")}
              >
                <Pencil size={15} />
              </button>
              <button
                type="button"
                className="category-delete grid place-items-center w-[30px] h-[30px] rounded-[6px] cursor-pointer [&:hover]:[background:var(--color-danger-soft)]"
                onClick={() => setIsDeleteDialogOpen(true)}
                aria-label={t("messages.deleteV0", { v0: project.name })}
                title={t("deleteProject")}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
          <button
            type="button"
            className="category-card-title flex gap-[10px] items-center justify-between w-full text-left cursor-pointer
              [&_h2]:text-[20px] [&_h2]:[font-weight:600] [&_h2]:[letter-spacing:-0.025em] [&_h2]:wrap-anywhere
              [&_svg]:shrink-0 [&_svg]:text-[var(--color-text-muted)]"
            onClick={() => setIsDetailOpen(true)}
            aria-describedby={descriptionId}
          >
            <h2>{project.name}</h2>
            <ArrowUpRight size={19} />
          </button>
          <p
            className="category-card-description text-[var(--color-text-muted)] text-[13px] [line-height:1.7] mt-[8px] min-h-[44px]
            [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden wrap-anywhere
            [@media(max-width:600px)]:min-h-[0]"
            id={descriptionId}
          >
            {project.description ||
              "Bring the next steps of your bigger plan together."}
          </p>
          <div className="category-progress-label flex justify-between gap-[10px] text-[12px] text-[var(--color-text-muted)] m-[22px_0_8px] [&_strong]:text-[var(--color-accent)]">
            <span>
              {completedTasks} {t("of")} {totalTasks} {t("completed")}{" "}
            </span>
            <strong>{completionRate}%</strong>
          </div>
          <div
            className="category-progress h-[4px] rounded-[5px] overflow-hidden [&_>_div]:h-full [&_>_div]:[background:var(--color-accent)] [&_>_div]:rounded-[inherit] [&_>_div]:[transition:width_0.2s]"
            role="progressbar"
            aria-label={t("messages.v0Progress", { v0: project.name })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionRate}
          >
            <div style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="category-task-preview p-[16px_22px] [border-top:1px_solid_var(--color-line)] flex-1 min-h-[109px]">
          <p className="category-preview-label text-[10px] [font-weight:600] [letter-spacing:0.13em] text-[var(--color-text-muted)] mb-[8px]">
            {previewTasks.length
              ? t("aLookInside")
              : t("yourNextStepStartsHere")}
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
            <p className="category-empty-hint text-[12px] [line-height:1.8] text-[var(--color-text-muted)] max-w-[24ch]">
              {isProjectCompleted
                ? t("restoreThisProjectToAddNewTasks")
                : t("assignATaskToThisProjectOrDragOneHere")}
            </p>
          )}
        </div>
        <button
          type="button"
          className="category-card-footer flex items-center justify-between p-[13px_22px] [background:var(--color-surface-muted)] cursor-pointer [&:hover]:[background:var(--color-accent-soft)]"
          onClick={() => setIsDetailOpen(true)}
        >
          <span>
            {t("exploreProject")}{" "}
            <span className="project-footer-count text-[var(--color-text-muted)] [font-weight:400]">
              · {totalTasks} {t("tasks")}{" "}
            </span>
          </span>
          <ArrowUpRight size={16} />
        </button>
      </article>
    </>
  );
};

export default ProjectCard;
