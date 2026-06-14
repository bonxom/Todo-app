import { useState } from 'react';
import { ChevronRight, FolderOpen, Pencil, Trash2, X } from 'lucide-react';
import ProjectDetailModal from './ProjectDetailModal';
import AddProjectForm from '../Todo/Form/AddProjectForm';
import DeleteProjectDialog from './DeleteProjectDialog';
import TaskCard from '../Category/TaskCard';
import { projectService } from '../../api/apiService';

const ProjectCard = ({ project, tasks, onTaskUpdated, onProjectUpdated }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const previewTasks = tasks.slice(0, 3);
  const descriptionId = `project-${project._id}-description`;

  const handleConfirmDelete = async () => {
    try {
      await projectService.deleteProject(project._id);
      setIsDeleteDialogOpen(false);
      setIsDetailOpen(false);
      onProjectUpdated?.();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(error.response?.data?.message || 'Failed to delete project. Please try again.');
    }
  };

  return (
    <>
      <ProjectDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        project={project}
        tasks={tasks}
        onTaskUpdated={onTaskUpdated}
        onProjectEdit={() => setIsEditModalOpen(true)}
        onProjectDelete={() => setIsDeleteDialogOpen(true)}
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
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-project-${project._id}`}
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Edit</p>
                <h2 id={`edit-project-${project._id}`} className="text-xl font-semibold text-[color:var(--color-text)]">
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

      <article className="ui-section-card flex h-full flex-col overflow-hidden transition-[border-color,box-shadow] duration-200 hover:border-[color:var(--color-accent)]">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => setIsDetailOpen(true)}
              className="ui-focus-ring min-w-0 flex-1 rounded-[10px] text-left"
              aria-describedby={descriptionId}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[color:var(--color-line)] bg-[var(--color-surface-muted)] text-[color:var(--color-accent)]">
                  <FolderOpen className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--color-text-muted)]">
                    Project
                  </p>
                  <h3 className="truncate text-lg font-semibold text-[color:var(--color-text)]">{project.name}</h3>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-text-muted)] transition-[background-color,border-color,color] duration-150 hover:border-[color:var(--color-accent)] hover:bg-[var(--color-accent-soft)] hover:text-[color:var(--color-accent)]"
                aria-label={`Edit ${project.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-danger)] transition-[background-color,border-color,color] duration-150 hover:border-[color:var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
                aria-label={`Delete ${project.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p
            id={descriptionId}
            className="mt-4 min-h-[3rem] break-words text-sm leading-6 text-[color:var(--color-text-muted)]"
          >
            {project.description || 'No project description yet. Add one to clarify what belongs in this workstream.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="ui-chip ui-tabular">{totalTasks} tasks</span>
            <span className="ui-chip ui-chip--success ui-tabular">{completedTasks} completed</span>
            <span className="ui-chip ui-tabular">{pendingTasks} pending</span>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-[color:var(--color-text-muted)]">
              <span>Progress</span>
              <span className="ui-tabular">{completionRate}%</span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
              role="progressbar"
              aria-label={`${project.name} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completionRate}
            >
              <div
                className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-200"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col border-t border-[color:var(--color-line)] px-5 pb-5 pt-4">
          {previewTasks.length > 0 ? (
            <div className="space-y-2.5">
              {previewTasks.map((task) => (
                <TaskCard
                  key={task._id || task.id}
                  task={task}
                  onClick={() => setIsDetailOpen(true)}
                  onTaskUpdated={onTaskUpdated}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[12px] border border-dashed border-[color:var(--color-line)] bg-[var(--color-surface-muted)] px-4 py-8 text-center">
              <p className="text-sm font-medium text-[color:var(--color-text)]">No tasks match this view yet</p>
              <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
                Assign tasks to this project from the Todo page or from task edit forms.
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-[color:var(--color-text-muted)]">
              {tasks.length > 3 ? `${tasks.length - 3} more tasks available` : 'Recent tasks shown above'}
            </div>
            <button
              type="button"
              onClick={() => setIsDetailOpen(true)}
              className="ui-btn-tertiary shrink-0 px-0"
            >
              <span>{tasks.length > 3 ? 'View All Tasks' : 'Open Details'}</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </article>
    </>
  );
};

export default ProjectCard;
