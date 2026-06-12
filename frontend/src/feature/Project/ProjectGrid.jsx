import ProjectCard from './ProjectCard';

const ProjectGrid = ({ items, onTaskUpdated, onProjectUpdated, onCreateProject }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-sky-200 bg-white/85 px-6 py-14 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No projects to show</p>
        <p className="mt-2 text-sm text-gray-500">
          Create a project to track multi-step work with its own progress and task list.
        </p>
        <button
          type="button"
          onClick={onCreateProject}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-sky-700 hover:to-cyan-700"
        >
          Add Project
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <ProjectCard
          key={item._id}
          project={item}
          tasks={item.tasks}
          onTaskUpdated={onTaskUpdated}
          onProjectUpdated={onProjectUpdated}
        />
      ))}
    </div>
  );
};

export default ProjectGrid;
