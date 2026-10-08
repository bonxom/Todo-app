import ProjectCard from "./ProjectCard";

const ProjectGrid = ({
  items,
  onTaskUpdated,
  onProjectUpdated,
  onCreateProject,
}) => {
  if (items.length === 0) {
    return (
      <section className="ui-section-card border-dashed px-6 py-14 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-text)]">
          No projects to show
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Create a project to track multi-step work with its own progress and
          task list.
        </p>
        <button
          type="button"
          onClick={onCreateProject}
          className="ui-btn-primary ui-btn-opposite-corners mt-6"
        >
          Add Project
        </button>
      </section>
    );
  }

  return (
    <div className="category-grid">
      {items.map((item) => (
        <ProjectCard
          key={item._id}
          project={item}
          tasks={item.tasks}
          onTaskUpdated={onTaskUpdated}
          onProjectUpdated={onProjectUpdated}
        />
      ))}
      <button
        type="button"
        className="category-create-card"
        onClick={onCreateProject}
      >
        <span aria-hidden="true">+</span>
        <strong>Make room for a bigger plan</strong>
        <p>Bring your next project to life.</p>
        <b>Add Project ↗</b>
      </button>
    </div>
  );
};

export default ProjectGrid;
