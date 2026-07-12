import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, LayoutGrid, Plus, X } from 'lucide-react';
import MainLayout from '../layout/MainLayout';
import CategoryGrid from '../feature/Category/CategoryGrid';
import CategoryStats from '../feature/Category/CategoryStats';
import ProjectGrid from '../feature/Project/ProjectGrid';
import ChatBubble from '../component/ChatBuble';
import AddCategoryForm from '../feature/Todo/Form/AddCategoryForm';
import AddProjectForm from '../feature/Todo/Form/AddProjectForm';
import { categoryService, projectService, taskService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';
import { useVisibleTasks } from '../context/useTaskFilter';
import { filterProjectsByVisibility } from '../utils/projectStatus';

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

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'given-up', label: 'Given Up' },
];

const getRelationId = (value) => value?._id || value || null;

const CategoryPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedView, setSelectedView] = useState('categories');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const fetchWorkspaceData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');

      const [categoryResponse, projectResponse, taskResponse] = await Promise.all([
        categoryService.getAllCategories(),
        projectService.getAllProjects(),
        taskService.getAllTasks(),
      ]);

      setCategories(categoryResponse || []);
      setProjects(projectResponse || []);
      setTasks(taskResponse || []);
    } catch (error) {
      console.error('Error fetching category page data:', error);
      setErrorMessage(error.response?.data?.message || 'Failed to load categories, projects, or tasks.');
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchWorkspaceData();
    }
  }, [fetchWorkspaceData, refreshTrigger]);

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

  const filteredTasks = useMemo(() => {
    return selectedStatus === 'all'
      ? globallyVisibleTasks
      : globallyVisibleTasks.filter((task) => task.status === selectedStatus);
  }, [globallyVisibleTasks, selectedStatus]);

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

    return selectedStatus === 'all'
      ? items
      : items.filter((item) => item.tasks.length > 0);
  }, [categories, filteredTasks, selectedStatus]);

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

    return selectedStatus === 'all'
      ? items
      : items.filter((item) => item.tasks.length > 0);
  }, [projects, filteredTasks, selectedStatus, showCompletedProjects, tasks]);

  const activeItems = selectedView === 'categories' ? categoryItems : projectItems;
  const activeConfig = VIEW_CONFIG[selectedView];
  const ActiveIcon = activeConfig.Icon;

  const stats = useMemo(() => {
    const visibleTasks = activeItems.flatMap((item) => item.tasks);

    return {
      totalGroups: activeItems.length,
      totalTasks: visibleTasks.length,
      completedTasks: visibleTasks.filter((task) => task.status === 'completed').length,
      pendingTasks: visibleTasks.filter((task) => task.status === 'pending').length,
    };
  }, [activeItems]);

  const activeStatusLabel = STATUS_OPTIONS.find((option) => option.id === selectedStatus)?.label || 'All Tasks';

  if (isInitialLoad && isLoading) {
    return (
      <>
        <MainLayout>
          <div className="ui-main-content">
            <div className="ui-page-shell">
              <section className="ui-section-card ui-card-padding flex min-h-[18rem] items-center justify-center">
                <p className="text-sm text-[color:var(--color-text-muted)]">{activeConfig.loadingLabel}</p>
              </section>
            </div>
          </div>
        </MainLayout>
        <ChatBubble key="chat-bubble-stable" />
      </>
    );
  }

  return (
    <>
      <MainLayout>
        <div className="ui-main-content">
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
                    <span className="ui-chip">{activeStatusLabel}</span>
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

              <div className="mt-5 border-t border-[color:var(--color-line)] pt-5">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = selectedStatus === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedStatus(option.id)}
                        className={`inline-flex items-center rounded-full border px-3.5 py-2 text-sm font-medium transition-[background-color,border-color,color] duration-150 ${
                          isSelected
                            ? 'border-transparent bg-[var(--color-accent-soft)] text-[color:var(--color-accent)]'
                            : 'border-[color:var(--color-line)] bg-[var(--color-surface)] text-[color:var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[color:var(--color-text)]'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
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
                  onClick={fetchWorkspaceData}
                  className="ui-btn-secondary mt-6"
                >
                  Try Again
                </button>
              </section>
            ) : !isLoading && activeItems.length === 0 && selectedStatus !== 'all' ? (
              <section className="ui-section-card border-dashed px-6 py-12 text-center">
                <p className="text-lg font-semibold text-[color:var(--color-text)]">No matches for this status filter</p>
                <p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--color-text-muted)]">
                  Switch the task filter to see the rest of your {selectedView}.
                </p>
              </section>
            ) : selectedView === 'categories' ? (
              <CategoryGrid
                items={categoryItems}
                onTaskUpdated={fetchWorkspaceData}
                onCreateCategory={() => setIsAddCategoryModalOpen(true)}
              />
            ) : (
              <ProjectGrid
                items={projectItems}
                onTaskUpdated={fetchWorkspaceData}
                onProjectUpdated={fetchWorkspaceData}
                onCreateProject={() => setIsAddProjectModalOpen(true)}
              />
            )}
          </div>
        </div>
      </MainLayout>

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
                  fetchWorkspaceData();
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
                  fetchWorkspaceData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      <ChatBubble key="chat-bubble-stable" />
    </>
  );
};

export default CategoryPage;
