import { useEffect, useMemo, useState } from 'react';
import { FolderOpen, LayoutGrid, Plus, X } from 'lucide-react';
import CategoryGrid from './components/CategoryGrid';
import CategoryStats from './components/CategoryStats';
import ProjectGrid from '@/features/tasks/components/project/ProjectGrid';
import AddCategoryForm from '@/features/tasks/components/Form/AddCategoryForm';
import AddProjectForm from '@/features/tasks/components/Form/AddProjectForm';
import { useCategoriesQuery } from './api/categoryQueries';
import { useProjectsQuery } from '@/features/tasks/api/projectQueries';
import { useTasksQuery } from '@/features/tasks/api/taskQueries';
import { useVisibleTasks } from '@/stores/useTaskFilterStore';
import { filterProjectsByVisibility } from '@/shared/utils/projectStatus';
import { getApiErrorMessage } from '@/shared/services/apiError';

const VIEW_CONFIG = {
  categories: {
    label: 'Categories',
    title: 'Categories',
    description: 'Group tasks by theme so related work stays easy to scan, review, and reorganize.',
    addLabel: 'Add Category',
    loadingLabel: 'Loading categories & tasks…',
    Icon: LayoutGrid,
  },
  projects: {
    label: 'Projects',
    title: 'Projects',
    description: 'Track outcome-based workstreams with their own progress, recent tasks, and next steps.',
    addLabel: 'Add Project',
    loadingLabel: 'Loading projects & tasks…',
    Icon: FolderOpen,
  },
};

const getRelationId = (value) => value?._id || value || null;

const CategoryPage = () => {
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [selectedView, setSelectedView] = useState('categories');
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const tasksQuery = useTasksQuery({ pageSize: 100 });

  const categories = useMemo(() => categoriesQuery.data || [], [categoriesQuery.data]);
  const projects = useMemo(() => projectsQuery.data || [], [projectsQuery.data]);
  const tasks = useMemo(() => (Array.isArray(tasksQuery.data) ? tasksQuery.data : tasksQuery.data?.data) || [], [tasksQuery.data]);

  const isLoading = categoriesQuery.isLoading || projectsQuery.isLoading || tasksQuery.isLoading;
  const errorMessage = categoriesQuery.isError
    ? getApiErrorMessage(categoriesQuery.error, 'Failed to load categories.')
    : projectsQuery.isError
    ? getApiErrorMessage(projectsQuery.error, 'Failed to load projects.')
    : tasksQuery.isError
    ? getApiErrorMessage(tasksQuery.error, 'Failed to load tasks.')
    : '';

  const refetchAll = () => {
    categoriesQuery.refetch();
    projectsQuery.refetch();
    tasksQuery.refetch();
  };

  useEffect(() => {
    if (isAddCategoryModalOpen || isAddProjectModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddCategoryModalOpen, isAddProjectModalOpen]);

  const globallyVisibleTasks = useVisibleTasks(tasks);

  const filteredTasks = globallyVisibleTasks;

  const categoryItems = useMemo(() => {
    const groupedTasks = new Map();

    filteredTasks.forEach((task) => {
      const categoryId = getRelationId(task.categoryId);
      if (!categoryId) return;

      if (!groupedTasks.has(categoryId)) {
        groupedTasks.set(categoryId, []);
      }

      groupedTasks.get(categoryId).push(task);
    });

    const items = categories.map((category) => ({
      categoryId: category._id,
      category: category.name,
      description: category.description || '',
      tasks: groupedTasks.get(category._id) || [],
    }));

    return items;
  }, [categories, filteredTasks]);

  const projectItems = useMemo(() => {
    const groupedTasks = new Map();
    const groupedCompletionTasks = new Map();

    filteredTasks.forEach((task) => {
      const projectId = getRelationId(task.projectId);
      if (!projectId) return;

      if (!groupedTasks.has(projectId)) {
        groupedTasks.set(projectId, []);
      }

      groupedTasks.get(projectId).push(task);
    });

    tasks.forEach((task) => {
      const projectId = getRelationId(task.projectId);
      if (!projectId) return;

      if (!groupedCompletionTasks.has(projectId)) {
        groupedCompletionTasks.set(projectId, []);
      }

      groupedCompletionTasks.get(projectId).push(task);
    });

    const visibleProjects = filterProjectsByVisibility(projects, showCompletedProjects);
    const items = visibleProjects.map((project) => ({
      ...project,
      tasks: groupedTasks.get(project._id) || [],
      completionTasks: groupedCompletionTasks.get(project._id) || [],
    }));

    return items;
  }, [projects, filteredTasks, showCompletedProjects, tasks]);

  const activeItems = selectedView === 'categories' ? categoryItems : projectItems;
  const activeConfig = VIEW_CONFIG[selectedView];
  const ActiveIcon = activeConfig.Icon;

  const stats = useMemo(() => {
    const visibleTaskItems = activeItems.flatMap((item) => item.tasks);

    return {
      totalGroups: activeItems.length,
      totalTasks: visibleTaskItems.length,
      completedTasks: visibleTaskItems.filter((task) => task.status === 'completed').length,
      pendingTasks: visibleTaskItems.filter((task) => task.status === 'pending').length,
    };
  }, [activeItems]);

  if (isLoading) {
    return (
      <div className="ui-page-shell">
        <section className="ui-section-card ui-card-padding flex min-h-[18rem] items-center justify-center">
          <p className="text-sm text-[color:var(--color-text-muted)]">{activeConfig.loadingLabel}</p>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="ui-page-shell">
        <header className="ui-page-header">
              <p className="ui-page-kicker">Workspace</p>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                  <h1 className="ui-page-title">{activeConfig.title}</h1>
                  <p className="ui-page-description">{activeConfig.description}</p>
                </div>
              </div>
            </header>

            <section className="ui-section-card ui-card-padding">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="inline-flex flex-wrap gap-2 rounded-[14px] border border-[color:var(--color-line)] bg-[var(--color-surface)] p-1.5">
                    {Object.keys(VIEW_CONFIG).map((viewId) => {
                      const isSelected = selectedView === viewId;
                      const count = viewId === 'categories' ? categories.length : projects.length;
                      const { Icon, label } = VIEW_CONFIG[viewId];

                      return (
                        <button
                          key={viewId}
                          type="button"
                          onClick={() => setSelectedView(viewId)}
                          className={`inline-flex items-center gap-3 rounded-[10px] border px-4 py-3 text-sm font-medium transition-[background-color,border-color,color,box-shadow] duration-150 ${
                            isSelected
                              ? 'border-transparent bg-[var(--color-accent-soft)] text-[color:var(--color-accent)] shadow-[var(--shadow-xs)]'
                              : 'border-transparent bg-transparent text-[color:var(--color-text-muted)] hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]'
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                          <span>{label}</span>
                          <span className={`ui-chip ui-tabular ${isSelected ? 'ui-chip--accent' : ''}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-text-muted)]">
                    <span className="ui-chip">
                      <ActiveIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {activeConfig.label} View
                    </span>
                    <span className="ui-chip ui-tabular">{activeItems.length} groups</span>
                    <span className="ui-chip ui-tabular">{stats.totalTasks} visible tasks</span>
                    {isLoading ? <span className="ui-chip">Refreshing…</span> : null}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  {selectedView === 'projects' ? (
                    <label className="inline-flex min-h-[2.5rem] items-center gap-2 rounded-[var(--radius-md)] border border-[color:var(--color-line)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[color:var(--color-text-muted)]">
                      <input
                        type="checkbox"
                        checked={showCompletedProjects}
                        onChange={(event) => setShowCompletedProjects(event.target.checked)}
                        className="h-4 w-4 rounded border-[color:var(--color-line)] accent-[var(--color-accent)]"
                      />
                      Show Completed Projects
                    </label>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedView === 'categories') {
                        setIsAddCategoryModalOpen(true);
                      } else {
                        setIsAddProjectModalOpen(true);
                      }
                    }}
                    className="ui-btn-primary w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>{activeConfig.addLabel}</span>
                  </button>
                </div>
              </div>
            </section>

            <CategoryStats
              stats={stats}
              entityLabel={selectedView === 'categories' ? 'Categories' : 'Projects'}
            />

            {errorMessage ? (
              <section className="ui-section-card ui-card-padding text-center">
                <p className="text-lg font-semibold text-[color:var(--color-danger)]">Unable to load this workspace</p>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">{errorMessage}</p>
                <button
                  type="button"
                  onClick={refetchAll}
                  className="ui-btn-secondary mt-6"
                >
                  Try Again
                </button>
              </section>
            ) : selectedView === 'categories' ? (
              <CategoryGrid
                items={categoryItems}
                onTaskUpdated={refetchAll}
                onCreateCategory={() => setIsAddCategoryModalOpen(true)}
              />
            ) : (
              <ProjectGrid
                items={projectItems}
                onTaskUpdated={refetchAll}
                onProjectUpdated={refetchAll}
                onCreateProject={() => setIsAddProjectModalOpen(true)}
              />
            )}
          </div>

      {isAddCategoryModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddCategoryModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-category-title" className="text-xl font-semibold text-[color:var(--color-text)]">Add Category</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
                aria-label="Close add category dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddCategoryForm
                onClose={() => setIsAddCategoryModalOpen(false)}
                onCategoryCreated={() => {
                  setIsAddCategoryModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {isAddProjectModalOpen && (
        <div
          className="ui-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setIsAddProjectModalOpen(false)}
          role="presentation"
        >
          <div
            className="ui-modal-shell w-full max-w-lg animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-project-title"
          >
            <div className="ui-modal-header flex items-start justify-between gap-4">
              <div>
                <p className="ui-page-kicker">Create</p>
                <h2 id="add-project-title" className="text-xl font-semibold text-[color:var(--color-text)]">Add Project</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProjectModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[color:var(--color-text-muted)] transition-[background-color,color,border-color] duration-150 hover:border-[color:var(--color-line)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]"
                aria-label="Close add project dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="ui-modal-body">
              <AddProjectForm
                onClose={() => setIsAddProjectModalOpen(false)}
                onProjectCreated={() => {
                  setIsAddProjectModalOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CategoryPage;
