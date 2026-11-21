import { useTranslation } from "react-i18next";
import FormDialog from "@/shared/components/FormDialog";
import CustomSelect from "@/shared/components/CustomSelect";
import { useMemo, useRef, useState } from "react";
import DescriptionEditor from "./DescriptionEditor";
import AddCategoryForm from "./AddCategoryForm";
import AddProjectForm from "./AddProjectForm";
import { useUpdateTaskMutation } from "../../api/taskMutations";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";
import { useProjectsQuery } from "../../api/projectQueries";
import {
  toDateTimeLocalValue,
  toISOStringLocal,
} from "@/shared/utils/dateTime";
import DateTimeInput from "@/shared/components/DateTimeInput";
import {
  isActiveProject,
  isCompletedProject,
} from "@/shared/utils/projectStatus";
import { getApiErrorMessage } from "@/shared/services/apiError";

const TaskDetailForm = ({ task, onClose, onTaskUpdated, onProjectCreated }) => {
  const { t } = useTranslation("workspace");

  const [title, setTitle] = useState(task?.title || "");
  const [categoryId, setCategoryId] = useState(
    task?.categoryId?._id || task?.categoryId || "",
  );
  const [projectId, setProjectId] = useState(
    task?.projectId?._id || task?.projectId || "",
  );
  const [priority, setPriority] = useState(task?.priority || "Medium");
  const [startDate, setStartDate] = useState(
    toDateTimeLocalValue(task?.startDate || ""),
  );
  const [dueDate, setDueDate] = useState(
    toDateTimeLocalValue(task?.dueDate || ""),
  );
  const [submitError, setSubmitError] = useState("");
  const formRef = useRef(null);
  const [description, setDescription] = useState(task?.description || "");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddProject, setShowAddProject] = useState(false);

  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const updateTaskMutation = useUpdateTaskMutation();

  const categories = useMemo(
    () => categoriesQuery.data || [],
    [categoriesQuery.data],
  );
  const projects = useMemo(
    () => projectsQuery.data || [],
    [projectsQuery.data],
  );
  const activeProjects = useMemo(
    () => projects.filter(isActiveProject),
    [projects],
  );
  const taskProjectId = task?.projectId?._id || task?.projectId || "";
  const currentCompletedProject = useMemo(
    () =>
      projects.find(
        (project) =>
          project._id === taskProjectId && isCompletedProject(project),
      ) || null,
    [projects, taskProjectId],
  );

  const isSubmitting = updateTaskMutation.isPending;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    try {
      const updatedTask = {
        title,
        categoryId: categoryId || categories[0]?._id || undefined,
        projectId: projectId || null,
        priority,
        startDate: toISOStringLocal(startDate) || undefined,
        dueDate: toISOStringLocal(dueDate) || undefined,
        description,
      };

      await updateTaskMutation.mutateAsync({
        taskId: task._id || task.id,
        payload: updatedTask,
      });

      if (onTaskUpdated) {
        onTaskUpdated();
      }

      onClose();
    } catch (error) {
      console.error("Failed to update task:", error);
      setSubmitError(
        getApiErrorMessage(error, t("failedToUpdateTaskPleaseTryAgain")),
      );
    }
  };

  return (
    <>
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="workspace-form flex flex-col gap-[20px] [&_label]:[font-weight:600] [&_label]:mb-[8px]
        [&_legend]:[font-weight:600] [&_legend]:mb-[8px] [&_.ui-input::placeholder]:opacity-[0.7]
        [@media(max-width:600px)]:gap-[17px]"
      >
        <div>
          <label
            htmlFor="edit-title"
            className="mb-2 block text-sm font-medium text-[var(--color-text)]"
          >
            {t("taskTitle")}
            <span className="text-[var(--color-danger)]">*</span>
          </label>
          <input
            id="edit-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("enterTaskTitle")}
            className="ui-input"
            required
          />
        </div>

        <div className="workspace-form-details grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[14px] [@media(max-width:600px)]:grid-cols-[1fr] [@media(max-width:600px)]:gap-[17px]">
          <div>
            <label
              htmlFor="edit-category"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              {t("category")}
            </label>
            <CustomSelect
              id="edit-category"
              value={categoryId || categories[0]?._id || ""}
              onChange={(e) => {
                if (e.target.value === "__add_more__") {
                  setShowAddCategory(true);
                } else {
                  setCategoryId(e.target.value);
                }
              }}
              className="ui-input"
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
              <option value="__add_more__">{t("addMore")}</option>
            </CustomSelect>
          </div>

          <div>
            <label
              htmlFor="edit-project"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              {t("project")}
            </label>
            <CustomSelect
              id="edit-project"
              value={projectId}
              onChange={(e) => {
                if (e.target.value === "__add_project__") {
                  setShowAddProject(true);
                } else {
                  setProjectId(e.target.value);
                }
              }}
              className="ui-input"
            >
              <option value="">{t("noProject")}</option>
              {currentCompletedProject ? (
                <option value={currentCompletedProject._id} disabled>
                  {currentCompletedProject.name} {t("completed")}{" "}
                </option>
              ) : null}
              {activeProjects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))}
              <option value="__add_project__">{t("addProject")}</option>
            </CustomSelect>
          </div>

          <div>
            <label
              htmlFor="edit-priority"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              {t("priority")}
            </label>
            <CustomSelect
              id="edit-priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="ui-input"
            >
              <option value="Low">{t("low")}</option>
              <option value="Medium">{t("medium")}</option>
              <option value="High">{t("high")}</option>
            </CustomSelect>
          </div>
        </div>

        <div className="workspace-form-dates grid grid-cols-[repeat(2,minmax(0,1fr))] gap-[14px] [@media(max-width:600px)]:grid-cols-[1fr] [@media(max-width:600px)]:gap-[17px]">
          <div>
            <label
              htmlFor="edit-startDate"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              {t("startDate")}
            </label>
            <DateTimeInput
              id="edit-startDate"
              value={startDate}
              onChange={(val) => setStartDate(val)}
              className="ui-input"
            />
          </div>

          <div>
            <label
              htmlFor="edit-dueDate"
              className="mb-2 block text-sm font-medium text-[var(--color-text)]"
            >
              {t("dueDate")}
              <span className="text-[var(--color-danger)]">*</span>
            </label>
            <DateTimeInput
              id="edit-dueDate"
              value={dueDate}
              onChange={(val) => setDueDate(val)}
              className="ui-input"
              required
            />
          </div>
        </div>

        <DescriptionEditor
          value={description}
          onChange={setDescription}
          onSave={() => formRef.current?.requestSubmit()}
          busy={isSubmitting}
          error={submitError}
        />

        {submitError && (
          <p
            className="workspace-form-error text-[var(--color-danger)] [background:var(--color-danger-soft)] rounded-[9px] p-[11px_13px] text-[12px] [line-height:1.6]"
            role="alert"
          >
            {submitError}
          </p>
        )}
        <div
          className="workspace-form-actions flex justify-end items-center gap-[10px] m-[4px_-28px_0]
          [background:var(--color-surface)] [border-top:1px_solid_var(--color-line)] sticky bottom-[0] z-1
          [&_button]:flex-[initial] [&_button]:rounded-[9px] [&_button]:min-h-[40px]
          [&_button[type=submit]]:min-w-[120px] [@media(max-width:600px)]:mx-[-20px]"
        >
          <button
            type="button"
            onClick={onClose}
            className="ui-btn-secondary flex-1"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ui-btn-primary flex-1 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </form>

      <FormDialog
        isOpen={showAddCategory}
        onClose={() => setShowAddCategory(false)}
        title={t("addCategory")}
        kind="category"
      >
        <AddCategoryForm
          onClose={() => setShowAddCategory(false)}
          onCategoryCreated={(newCategory) => {
            setCategoryId(newCategory?._id || newCategory?.category?._id || "");
          }}
        />
      </FormDialog>

      <FormDialog
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        title={t("addProject")}
        kind="project"
      >
        <AddProjectForm
          onClose={() => setShowAddProject(false)}
          onProjectCreated={(newProject) => {
            setProjectId(newProject?._id || "");
            onProjectCreated?.(newProject);
          }}
        />
      </FormDialog>
    </>
  );
};

export default TaskDetailForm;
