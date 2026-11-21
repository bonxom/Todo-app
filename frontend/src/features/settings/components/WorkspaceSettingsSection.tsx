import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowUpRight, Plus, Tag, Trash2 } from "lucide-react";
import CustomSelect from "@/shared/components/CustomSelect";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useCategoriesQuery } from "@/features/categories/api/categoryQueries";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/features/categories/api/categoryMutations";
import { useProjectsQuery } from "@/features/tasks/api/projectQueries";
import { getApiErrorMessage } from "@/shared/services/apiError";
import type { TaskStatus } from "@/shared/types/domain";
import type { SettingsVersion } from "../types";
import {
  SettingsCard,
  SettingsFeedbackBanner,
  SettingsSegmentedControl,
} from "./SettingsPrimitives";
import {
  settingsBorderClass,
  settingsInputClass,
  settingsPrimaryButtonClass,
  settingsSecondaryButtonClass,
  settingsTextClass,
} from "./settingsStyles";

export default function WorkspaceSettingsSection({
  version,
}: {
  version: SettingsVersion;
}) {
  const { t } = useTranslation("settings");
  const isV2 = version === "v2";
  const workspace = useSettingsStore((state) => state.workspace);
  const updateWorkspace = useSettingsStore((state) => state.updateWorkspace);
  const categoriesQuery = useCategoriesQuery();
  const projectsQuery = useProjectsQuery();
  const createCategoryMutation = useCreateCategoryMutation();
  const deleteCategoryMutation = useDeleteCategoryMutation();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryFeedback, setCategoryFeedback] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const categories = categoriesQuery.data ?? [];
  const projectsCount = projectsQuery.data?.length ?? 0;

  const handleCreateCategory = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    setCategoryFeedback(null);
    try {
      await createCategoryMutation.mutateAsync({ name: trimmed });
      setNewCategoryName("");
      setCategoryFeedback({
        tone: "success",
        message: t("workspace.categoryAdded"),
      });
    } catch (error) {
      setCategoryFeedback({
        tone: "error",
        message: getApiErrorMessage(error, t("workspace.categoryError")),
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setCategoryFeedback(null);
    try {
      await deleteCategoryMutation.mutateAsync(categoryId);
      setCategoryFeedback({
        tone: "success",
        message: t("workspace.categoryDeleted"),
      });
    } catch (error) {
      setCategoryFeedback({
        tone: "error",
        message: getApiErrorMessage(error, t("workspace.categoryError")),
      });
    }
  };

  return (
    <div className="space-y-5">
      <SettingsCard
        version={version}
        title={t("workspace.heading")}
        description={t("workspace.description")}
      >
        <div className="space-y-5">
          {/* Default Task Status */}
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b ${settingsBorderClass(version)}`}
          >
            <div className="space-y-0.5">
              <label
                htmlFor="settings-default-task-status"
                className={`block text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("workspace.defaultStatusLabel")}
              </label>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("workspace.defaultStatusHint")}
              </p>
            </div>
            <div className="w-full sm:w-52">
              <CustomSelect
                id="settings-default-task-status"
                value={workspace.defaultTaskStatus}
                onChange={(event) =>
                  updateWorkspace({
                    defaultTaskStatus: event.target.value as TaskStatus | "",
                  })
                }
                className={version === "v1" ? settingsInputClass(version) : ""}
              >
                <option value="">{t("workspace.statusAll")}</option>
                <option value="pending">{t("workspace.statusPending")}</option>
                <option value="in-progress">
                  {t("workspace.statusInProgress")}
                </option>
                <option value="completed">
                  {t("workspace.statusCompleted")}
                </option>
                <option value="given-up">{t("workspace.statusGivenUp")}</option>
              </CustomSelect>
            </div>
          </div>

          {/* Default Calendar View */}
          <div
            className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-5 border-b ${settingsBorderClass(version)}`}
          >
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("workspace.defaultCalendarViewLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("workspace.defaultCalendarViewHint")}
              </p>
            </div>
            <SettingsSegmentedControl
              version={version}
              label={t("workspace.defaultCalendarViewLabel")}
              value={workspace.defaultCalendarView}
              onChange={(defaultCalendarView) =>
                updateWorkspace({ defaultCalendarView })
              }
              options={[
                { value: "month", label: t("workspace.calendarMonth") },
                { value: "week", label: t("workspace.calendarWeek") },
              ]}
            />
          </div>

          {/* Week Starts On */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p
                className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
              >
                {t("workspace.weekStartsOnLabel")}
              </p>
              <p
                className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
              >
                {t("workspace.weekStartsOnHint")}
              </p>
            </div>
            <SettingsSegmentedControl
              version={version}
              label={t("workspace.weekStartsOnLabel")}
              value={workspace.weekStartsOn}
              onChange={(weekStartsOn) => updateWorkspace({ weekStartsOn })}
              options={[
                { value: "sunday", label: t("workspace.sunday") },
                { value: "monday", label: t("workspace.monday") },
              ]}
            />
          </div>
        </div>
      </SettingsCard>

      {/* Categories & Projects Quick Management */}
      <SettingsCard
        version={version}
        title={t("workspace.categoriesHeading")}
        description={t("workspace.categoriesHint")}
      >
        <form
          onSubmit={(e) => void handleCreateCategory(e)}
          className="flex flex-col gap-2.5 sm:flex-row mb-4"
        >
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder={t("workspace.newCategoryPlaceholder")}
            aria-label={t("workspace.newCategoryPlaceholder")}
            maxLength={60}
            className={`${settingsInputClass(version)} flex-1`}
          />
          <button
            type="submit"
            disabled={
              createCategoryMutation.isPending || !newCategoryName.trim()
            }
            className={`${settingsPrimaryButtonClass(version)} shrink-0`}
          >
            <Plus size={16} aria-hidden="true" />
            <span>
              {createCategoryMutation.isPending
                ? t("workspace.addingCategory")
                : t("workspace.addCategory")}
            </span>
          </button>
        </form>

        {categoryFeedback && (
          <div className="mb-4">
            <SettingsFeedbackBanner
              version={version}
              tone={categoryFeedback.tone}
              message={categoryFeedback.message}
            />
          </div>
        )}

        <ul className="m-0 p-0 list-none flex flex-wrap gap-2">
          {categories.map((category) => {
            const categoryId = String(category._id ?? "");
            const isProtected =
              category.name.trim().toLowerCase() === "uncategorized";
            const pillClass = isV2
              ? "inline-flex items-center gap-2 rounded-full border border-[var(--v2-border)] bg-[var(--v2-shell-fill)] pl-3 pr-2 py-1.5 text-sm text-[var(--v2-ink)]"
              : "inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] pl-3 pr-2 py-1.5 text-sm text-[var(--color-text)]";

            return (
              <li key={categoryId || category.name} className={pillClass}>
                <Tag
                  size={13}
                  className={settingsTextClass(version, "muted")}
                  aria-hidden="true"
                />
                <span className="font-medium">{category.name}</span>
                {isProtected ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${settingsTextClass(version, "muted")}`}
                  >
                    {t("workspace.protectedCategory")}
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={deleteCategoryMutation.isPending}
                    onClick={() => void handleDeleteCategory(categoryId)}
                    aria-label={t("workspace.deleteCategory", {
                      name: category.name,
                    })}
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent cursor-pointer transition-colors ${settingsTextClass(version, "muted")} hover:text-red-500`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        <div
          className={`mt-5 pt-4 border-t ${settingsBorderClass(version)} flex flex-wrap items-center justify-between gap-3`}
        >
          <div>
            <p
              className={`m-0 text-sm font-semibold ${settingsTextClass(version, "primary")}`}
            >
              {t("workspace.projectsHeading")}
            </p>
            <p
              className={`m-0 text-xs sm:text-sm ${settingsTextClass(version, "muted")}`}
            >
              {t("workspace.projectsCount", { count: projectsCount })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {version === "v1" && (
              <Link
                to="/categories"
                className={`${settingsSecondaryButtonClass(version)} [text-decoration:none]`}
              >
                <span>{t("workspace.openCategories")}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            )}
            <Link
              to={version === "v2" ? "/v2/calendar" : "/calendar"}
              className={`${settingsSecondaryButtonClass(version)} [text-decoration:none]`}
            >
              <span>{t("workspace.openCalendar")}</span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
