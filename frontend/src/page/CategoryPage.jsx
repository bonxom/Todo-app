import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import MainLayout from '../layout/MainLayout';
import CategoryGrid from '../feature/Category/CategoryGrid';
import CategoryStats from '../feature/Category/CategoryStats';
import ProjectGrid from '../feature/Project/ProjectGrid';
import ChatBubble from '../component/ChatBuble';
import AddCategoryForm from '../feature/Todo/Form/AddCategoryForm';
import AddProjectForm from '../feature/Todo/Form/AddProjectForm';
import { categoryService, projectService, taskService } from '../api/apiService';
import { useTaskRefresh } from '../context/useTaskRefresh';

const VIEW_CONFIG = {
  categories: {
    eyebrow: 'Category Library',
    title: 'Map work by theme',
    description: 'Use categories for broad buckets of work, then switch to projects when a stream needs its own progress and task list.',
    accent: 'violet',
    addLabel: 'Add Category',
    loadingLabel: 'Loading categories and tasks...',
  },
  projects: {
    eyebrow: 'Project Desk',
    title: 'Track work by outcome',
    description: 'Projects keep multi-step work focused, measurable, and easy to reopen without mixing it into every category.',
    accent: 'sky',
    addLabel: 'Add Project',
    loadingLabel: 'Loading projects and tasks...',
  },
};

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Tasks', activeClassName: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md', idleClassName: 'hover:border-violet-300' },
  { id: 'pending', label: 'Pending', activeClassName: 'border-2 border-violet-500 bg-violet-100 text-violet-700 shadow-md', idleClassName: 'hover:border-violet-300' },
  { id: 'in-progress', label: 'In Progress', activeClassName: 'border-2 border-sky-500 bg-sky-100 text-sky-700 shadow-md', idleClassName: 'hover:border-sky-300' },
  { id: 'completed', label: 'Completed', activeClassName: 'border-2 border-emerald-500 bg-emerald-100 text-emerald-700 shadow-md', idleClassName: 'hover:border-emerald-300' },
  { id: 'given-up', label: 'Given Up', activeClassName: 'border-2 border-gray-400 bg-gray-200 text-gray-700 shadow-md', idleClassName: 'hover:border-gray-300' },
];

const getRelationId = (value) => value?._id || value || null;

const CategoryPage = () => {
  const { refreshTrigger } = useTaskRefresh();
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
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

  const filteredTasks = useMemo(() => {
    return selectedStatus === 'all'
      ? tasks
      : tasks.filter((task) => task.status === selectedStatus);
  }, [tasks, selectedStatus]);

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

    filteredTasks.forEach((task) => {
      const projectId = getRelationId(task.projectId);
      if (!projectId) return;

      if (!groupedTasks.has(projectId)) {
        groupedTasks.set(projectId, []);
      }

      groupedTasks.get(projectId).push(task);
    });

    const items = projects.map((project) => ({
      ...project,
      tasks: groupedTasks.get(project._id) || [],
    }));

    return selectedStatus === 'all'
      ? items
      : items.filter((item) => item.tasks.length > 0);
  }, [projects, filteredTasks, selectedStatus]);

  const activeItems = selectedView === 'categories' ? categoryItems : projectItems;
  const activeConfig = VIEW_CONFIG[selectedView];

  const stats = useMemo(() => {
    const visibleTasks = activeItems.flatMap((item) => item.tasks);

    return {
      totalGroups: activeItems.length,
      totalTasks: visibleTasks.length,
      completedTasks: visibleTasks.filter((task) => task.status === 'completed').length,
      pendingTasks: visibleTasks.filter((task) => task.status === 'pending').length,
    };
  }, [activeItems]);

  if (isInitialLoad && isLoading) {
    return (
      <>
        <MainLayout>
          <div className="flex min-h-full items-center justify-center">
            <div className="text-gray-500">{activeConfig.loadingLabel}</div>
          </div>
        </MainLayout>
        <ChatBubble key="chat-bubble-stable" />
      </>
    );
  }

  return (
    <>
      <MainLayout>
        <div className="flex min-h-full justify-center p-6">
          <div className="mx-auto w-full max-w-7xl">
            <section className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
              <div className={`border-b px-6 py-6 ${selectedView === 'categories' ? 'border-violet-100 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50' : 'border-sky-100 bg-gradient-to-br from-sky-50 via-white to-cyan-50'}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                  <div className="max-w-3xl">
                    <p className={`text-xs font-semibold uppercase tracking-[0.28em] ${selectedView === 'categories' ? 'text-violet-600' : 'text-sky-600'}`}>
                      {activeConfig.eyebrow}
                    </p>
                    <h1 className="mt-3 text-3xl font-semibold text-gray-900">{activeConfig.title}</h1>
                    <p className="mt-3 text-sm text-gray-600">{activeConfig.description}</p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="inline-flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-200">
                      {Object.keys(VIEW_CONFIG).map((viewId) => {
                        const isSelected = selectedView === viewId;
                        const count = viewId === 'categories' ? categories.length : projects.length;

                        return (
                          <button
                            key={viewId}
                            type="button"
                            onClick={() => setSelectedView(viewId)}
                            className={`inline-flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                              isSelected
                                ? viewId === 'categories'
                                  ? 'bg-violet-600 text-white shadow-md'
                                  : 'bg-sky-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <span>{viewId === 'categories' ? 'Categories' : 'Projects'}</span>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedView === 'categories') {
                          setIsAddCategoryModalOpen(true);
                        } else {
                          setIsAddProjectModalOpen(true);
                        }
                      }}
                      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-medium text-white shadow-md transition-all ${
                        selectedView === 'categories'
                          ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700'
                          : 'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{activeConfig.addLabel}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-b border-gray-100 px-6 py-5">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = selectedStatus === option.id;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedStatus(option.id)}
                        className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
                          isSelected
                            ? option.activeClassName
                            : `border-gray-200 bg-white text-gray-700 ${option.idleClassName}`
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-6 py-6">
                <CategoryStats
                  stats={stats}
                  entityLabel={selectedView === 'categories' ? 'Categories' : 'Projects'}
                  accent={activeConfig.accent}
                />

                {errorMessage ? (
                  <div className="rounded-[2rem] border border-red-200 bg-red-50/80 px-6 py-10 text-center">
                    <p className="text-lg font-semibold text-red-700">Unable to load this page</p>
                    <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                    <button
                      type="button"
                      onClick={fetchWorkspaceData}
                      className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-medium text-red-700 transition-all hover:bg-red-50"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    {!isLoading && activeItems.length === 0 && selectedStatus !== 'all' ? (
                      <div className="mt-6 rounded-[2rem] border border-dashed border-gray-200 bg-gray-50/70 px-6 py-10 text-center">
                        <p className="text-lg font-semibold text-gray-900">No matches for this status filter</p>
                        <p className="mt-2 text-sm text-gray-500">
                          Switch the status filter to see the rest of your {selectedView}.
                        </p>
                      </div>
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
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </MainLayout>

      {isAddCategoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsAddCategoryModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Add Category</h2>
            </div>
            <div className="p-6">
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsAddProjectModalOpen(false)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-sky-600 to-cyan-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Add Project</h2>
            </div>
            <div className="p-6">
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
