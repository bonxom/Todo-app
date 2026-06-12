import { useState } from 'react';
import { ChevronRight, Folder, Pencil, Trash2 } from 'lucide-react';
import ProgressBar from '../Todo/ProgressBar';
import ProjectDetailModal from './ProjectDetailModal';
import AddProjectForm from '../Todo/Form/AddProjectForm';
import DeleteProjectDialog from './DeleteProjectDialog';
import { projectService } from '../../api/apiService';

const ProjectCard = ({ project, tasks, onTaskUpdated, onProjectUpdated }) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const totalTasks = tasks.length;
  const previewTasks = tasks.slice(0, 3);

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

      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Edit Project</h2>
            </div>
            <div className="p-6">
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
      )}

      <article className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-lg">
        <div className="border-b border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setIsDetailOpen(true)} className="min-w-0 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                  <Folder className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">Project</p>
                  <h3 className="truncate text-lg font-semibold text-gray-900">{project.name}</h3>
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="rounded-xl p-2 text-sky-600 transition-colors hover:bg-white hover:text-sky-700"
                aria-label={`Edit ${project.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                className="rounded-xl p-2 text-red-500 transition-colors hover:bg-white hover:text-red-600"
                aria-label={`Delete ${project.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="mt-4 min-h-[2.75rem] text-sm text-gray-600">
            {project.description || 'No project description yet. Add one to clarify what belongs in this stream.'}
          </p>

          <div className="mt-5">
            <ProgressBar
              compact
              title={`${project.name} progress`}
              completed={completedTasks}
              total={totalTasks}
              accentClassName="from-sky-500 to-cyan-600"
              emptyLabel="No tasks in this project yet"
            />
          </div>
        </div>

        <div className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
              {completedTasks} completed / {totalTasks} total
            </div>
            <button
              type="button"
              onClick={() => setIsDetailOpen(true)}
              className="inline-flex items-center gap-1 text-sm font-medium text-sky-700 transition-colors hover:text-sky-800"
            >
              View tasks
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {previewTasks.length > 0 ? (
            <div className="space-y-2">
              {previewTasks.map((task) => (
                <button
                  key={task._id || task.id}
                  type="button"
                  onClick={() => setIsDetailOpen(true)}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 text-left transition-all hover:border-sky-200 hover:bg-sky-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{task.title}</p>
                    <p className="mt-1 text-xs text-gray-500">{task.status}</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 shadow-sm">
                    {task.priority}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-700">No tasks match this view yet</p>
              <p className="mt-1 text-xs text-gray-500">Assign tasks to this project from the Todo page.</p>
            </div>
          )}
        </div>
      </article>
    </>
  );
};

export default ProjectCard;
