import FormDialog from "@/shared/components/FormDialog";
import { useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  LayoutGrid,
  Plus,
  Search,
  ArrowUpDown,
  Layers,
  X,
} from "lucide-react";
import "./categories.css";
import CategoryGrid from "./components/CategoryGrid";
import CategoryStats from "./components/CategoryStats";
import ProjectGrid from "@/features/tasks/components/project/ProjectGrid";
import AddCategoryForm from "@/features/tasks/components/Form/AddCategoryForm";
import AddProjectForm from "@/features/tasks/components/Form/AddProjectForm";
import { useCategoriesQuery } from "./api/categoryQueries";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import { useWorkspaceTasksQuery } from "./api/workspaceTasksQuery";
import { useVisibleTasks } from "@/stores/useTaskFilterStore";
import { filterProjectsByVisibility } from "@/shared/utils/projectStatus";
import { getApiErrorMessage } from "@/shared/services/apiError";

const VIEW_CONFIG = {
  categories: {
    label: "Categories",
    title: "Categories",
    addLabel: "Add Category",
    loadingLabel: "Loading categories & tasks…",
    Icon: LayoutGrid,
  },
  projects: {
    label: "Projects",
    title: "Projects",
    addLabel: "Add Project",
    loadingLabel: "Loading projects & tasks…",
    Icon: FolderOpen,
  },
};

const getRelationId = (value) => value?._id || value || null;

const CategoryPage = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [filter, setFilter] = useState("all");
  const [showCompletedProjects, setShowCompletedProjects] = useState(false);
  const [selectedView, setSelectedView] = useState("categories");
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);

  const createTriggerRef = useRef(null);
  const closeCreateDialog = () => {
    setIsAddCategoryModalOpen(false);
    setIsAddProjectModalOpen(false);
    requestAnimationFrame(() => createTriggerRef.current?.focus());
  };

  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const tasksQuery = useWorkspaceTasksQuery();

  const categories = useMemo(
    () => categoriesQuery.data || [],
    [categoriesQuery.data],
  );
  const projects = useMemo(
    () => projectsQuery.data || [],
    [projectsQuery.data],
  );
  const tasks = useMemo(
    () =>
      (Array.isArray(tasksQuery.data)
        ? tasksQuery.data
        : tasksQuery.data?.data) || [],
    [tasksQuery.data],
  );

  const isLoading =
    categoriesQuery.isLoading ||
    projectsQuery.isLoading ||
    tasksQuery.isLoading;
  const errorMessage = categoriesQuery.isError
    ? getApiErrorMessage(categoriesQuery.error, "Failed to load categories.")
    : projectsQuery.isError
      ? getApiErrorMessage(projectsQuery.error, "Failed to load projects.")
      : tasksQuery.isError
        ? getApiErrorMessage(tasksQuery.error, "Failed to load tasks.")
        : "";

  const refetchAll = () => {
    categoriesQuery.refetch();
    projectsQuery.refetch();
    tasksQuery.refetch();
  };

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
      description: category.description || "",
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

    const visibleProjects = filterProjectsByVisibility(
      projects,
      showCompletedProjects,
    );
    const items = visibleProjects.map((project) => ({
      ...project,
      tasks: groupedTasks.get(project._id) || [],
      completionTasks: groupedCompletionTasks.get(project._id) || [],
    }));

    return items;
  }, [projects, filteredTasks, showCompletedProjects, tasks]);

  const activeItems =
    selectedView === "categories" ? categoryItems : projectItems;
  const activeConfig = VIEW_CONFIG[selectedView];
  const visibleItems = useMemo(
    () =>
      activeItems
        .filter((item) => {
          const matches =
            `${item.category || item.name} ${item.description || ""}`
              .toLowerCase()
              .includes(search.trim().toLowerCase());
          return (
            matches &&
            (filter === "all" ||
              (filter === "active"
                ? item.tasks.some((task) =>
                    ["pending", "in-progress"].includes(task.status),
                  )
                : item.tasks.length === 0))
          );
        })
        .sort((a, b) =>
          sort === "tasks"
            ? b.tasks.length - a.tasks.length
            : (a.category || a.name).localeCompare(b.category || b.name),
        ),
    [activeItems, search, filter, sort],
  );
  const openCreate = () => {
    createTriggerRef.current = document.activeElement;
    if (selectedView === "categories") setIsAddCategoryModalOpen(true);
    else setIsAddProjectModalOpen(true);
  };

  const stats = useMemo(() => {
    const visibleTaskItems = activeItems.flatMap((item) => item.tasks);

    return {
      totalGroups: activeItems.length,
      totalTasks: visibleTaskItems.length,
      completedTasks: visibleTaskItems.filter(
        (task) => task.status === "completed",
      ).length,
    };
  }, [activeItems]);

  if (isLoading) {
    return (
      <div className="ui-page-shell">
        <section className="ui-section-card ui-card-padding flex min-h-[18rem] items-center justify-center">
          <p className="text-sm text-[color:var(--color-text-muted)]">
            {activeConfig.loadingLabel}
          </p>
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="ui-page-shell category-workspace">
        <header className="ui-workspace-heading">
          <h1 className="ui-page-title">{activeConfig.title}</h1>
          <button
            type="button"
            onClick={openCreate}
            className="ui-btn-primary ui-page-add-button"
          >
            <Plus size={17} />
            {activeConfig.addLabel}
          </button>
        </header>

        <CategoryStats stats={stats} entityLabel={activeConfig.label} />

        <section
          className="category-collection"
          aria-label="Workspace collection"
        >
          <div className="category-collection-top">
            <div className="category-tabs" aria-label="Workspace views">
              {Object.entries(VIEW_CONFIG).map(([id, config]) => {
                const { Icon, label } = config;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selectedView === id}
                    onClick={() => {
                      setSelectedView(id);
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    <Icon size={17} />
                    {label}
                    <span>
                      {id === "categories"
                        ? categories.length
                        : projects.length}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="category-collection-note">
              <Layers size={14} /> Everything in its place
            </span>
          </div>
          <div className="category-toolbar">
            <div className="category-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label={`Search ${activeConfig.label.toLowerCase()}`}
                placeholder={`Find a ${selectedView === "categories" ? "category" : "project"}…`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="category-filters" aria-label="Filter groups">
              {[
                ["all", "All"],
                ["active", "With active tasks"],
                ["empty", "Empty"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={filter === id}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="category-sort">
              <ArrowUpDown size={15} />
              <span className="sr-only">Sort groups</span>
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="name">Name A–Z</option>
                <option value="tasks">Most tasks</option>
              </select>
            </label>
          </div>
          <div className="category-results-meta">
            <p role="status">
              {visibleItems.length} {activeConfig.label.toLowerCase()}
              {search || filter !== "all"
                ? ` of ${activeItems.length}`
                : " in your workspace"}
            </p>
            {selectedView === "projects" ? (
              <label>
                <input
                  type="checkbox"
                  checked={showCompletedProjects}
                  onChange={(event) =>
                    setShowCompletedProjects(event.target.checked)
                  }
                />{" "}
                Include completed projects
              </label>
            ) : (
              <span>Open a category to explore its tasks</span>
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className="ui-section-card ui-card-padding text-center">
            <p className="text-lg font-semibold text-[color:var(--color-danger)]">
              Unable to load this workspace
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={refetchAll}
              className="ui-btn-secondary mt-6"
            >
              Try Again
            </button>
          </section>
        ) : visibleItems.length === 0 && (search || filter !== "all") ? (
          <section className="category-no-results">
            <Search size={28} />
            <h2>No {activeConfig.label.toLowerCase()} found</h2>
            <p>Try a different search or give your filters a fresh start.</p>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              Clear filters
            </button>
          </section>
        ) : selectedView === "categories" ? (
          <CategoryGrid
            items={visibleItems}
            onTaskUpdated={refetchAll}
            onCreateCategory={openCreate}
          />
        ) : (
          <ProjectGrid
            items={visibleItems}
            onTaskUpdated={refetchAll}
            onProjectUpdated={refetchAll}
            onCreateProject={openCreate}
          />
        )}
      </div>

      <FormDialog
        isOpen={isAddCategoryModalOpen}
        onClose={closeCreateDialog}
        title="Add Category"
        kind="category"
      >
        <AddCategoryForm
          onClose={closeCreateDialog}
          onCategoryCreated={() => {
            setIsAddCategoryModalOpen(false);
          }}
        />
      </FormDialog>

      <FormDialog
        isOpen={isAddProjectModalOpen}
        onClose={closeCreateDialog}
        title="Add Project"
        kind="project"
      >
        <AddProjectForm
          onClose={closeCreateDialog}
          onProjectCreated={() => {
            setIsAddProjectModalOpen(false);
          }}
        />
      </FormDialog>
    </>
  );
};

export default CategoryPage;
