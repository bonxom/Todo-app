import { useTranslation } from "react-i18next";
import FormDialog from "@/shared/components/FormDialog";
import CustomSelect from "@/shared/components/CustomSelect";
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

const getViewConfig = (t) => ({
  categories: {
    label: t("categories"),
    title: t("categories"),
    addLabel: t("addCategory"),
    loadingLabel: t("loadingCategoriesTasks"),
    Icon: LayoutGrid,
  },
  projects: {
    label: t("projects"),
    title: t("projects"),
    addLabel: t("addProject"),
    loadingLabel: t("loadingProjectsTasks"),
    Icon: FolderOpen,
  },
});

const getRelationId = (value) => value?._id || value || null;

const CategoryPage = () => {
  const { t } = useTranslation("workspace");
  const VIEW_CONFIG = getViewConfig(t);

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
    ? getApiErrorMessage(categoriesQuery.error, t("failedToLoadCategories"))
    : projectsQuery.isError
      ? getApiErrorMessage(projectsQuery.error, t("failedToLoadProjects"))
      : tasksQuery.isError
        ? getApiErrorMessage(tasksQuery.error, t("failedToLoadTasks"))
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
          aria-label={t("workspaceCollection")}
        >
          <div className="category-collection-top">
            <div className="category-tabs" aria-label={t("workspaceViews")}>
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
              <Layers size={14} /> {t("everythingInItsPlace")}
            </span>
          </div>
          <div className="category-toolbar">
            <div className="category-search">
              <Search size={17} aria-hidden="true" />
              <input
                aria-label={t("messages.searchV0", {
                  v0: activeConfig.label.toLowerCase(),
                })}
                placeholder={t("messages.findAV0", {
                  v0:
                    selectedView === "categories"
                      ? t("category")
                      : t("project"),
                })}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label={t("clearSearch")}
                  onClick={() => setSearch("")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="category-filters" aria-label={t("filterGroups")}>
              {[
                ["all", t("all")],
                ["active", t("withActiveTasks")],
                ["empty", t("empty")],
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
              <span className="sr-only">{t("sortGroups")}</span>
              <CustomSelect
                aria-label={t("sortGroups")}
                value={sort}
                wrapperClassName="ui-custom-select--inline"
                className="!min-h-8 h-8 !w-auto !py-1 !px-2.5 text-xs"
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="name">{t("nameAZ")}</option>
                <option value="tasks">{t("mostTasks")}</option>
              </CustomSelect>
            </label>
          </div>
          <div className="category-results-meta">
            <p role="status">
              {visibleItems.length} {activeConfig.label.toLowerCase()}
              {search || filter !== "all"
                ? t("messages.ofV0", { v0: activeItems.length })
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
                {t("includeCompletedProjects")}
              </label>
            ) : (
              <span>{t("openACategoryToExploreItsTasks")}</span>
            )}
          </div>
        </section>

        {errorMessage ? (
          <section className="ui-section-card ui-card-padding text-center">
            <p className="text-lg font-semibold text-[color:var(--color-danger)]">
              {t("unableToLoadThisWorkspace")}
            </p>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-[color:var(--color-text-muted)]">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={refetchAll}
              className="ui-btn-secondary mt-6"
            >
              {t("tryAgain")}
            </button>
          </section>
        ) : visibleItems.length === 0 && (search || filter !== "all") ? (
          <section className="category-no-results">
            <Search size={28} />
            <h2>
              {t("noGroupsFound", { groups: activeConfig.label.toLowerCase() })}
            </h2>
            <p>{t("tryADifferentSearchOrGiveYourFiltersAFreshStart")}</p>
            <button
              type="button"
              className="ui-btn-secondary"
              onClick={() => {
                setSearch("");
                setFilter("all");
              }}
            >
              {t("clearFilters")}
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
        title={t("addCategory")}
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
        title={t("addProject")}
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
