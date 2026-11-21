import { useTranslation } from "react-i18next";
import {
  Fragment,
  useContext,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GalleryHorizontalEnd,
  List,
} from "lucide-react";
import { TaskProposalEditorContext } from "./taskProposalEditorContext";
import { TaskProposalSlideCard } from "./TaskProposalSlideCard";
import { TaskProposalCompactList } from "./TaskProposalCompactList";

type TaskListProps = {
  bare?: boolean;
};

type ViewMode = "slide" | "list";

const MAX_DOT_INDICATORS = 7;

export function TaskList({ bare = false }: TaskListProps) {
  const { t } = useTranslation("agent");
  const editor = useContext(TaskProposalEditorContext);
  if (!editor) {
    throw new Error("Missing task proposal editor context");
  }

  const {
    draft,
    locked,
    terminal,
    choices,
    validation,
    updateItem,
    toggleItemSelection,
    toggleAllSelection,
  } = editor;

  const items = draft.items;
  const totalCount = items.length;
  const selectedCount = draft.selectedItemIds.length;
  const allSelected = totalCount > 0 && selectedCount === totalCount;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const hasMultiple = totalCount > 1;

  const [viewMode, setViewMode] = useState<ViewMode>("slide");
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const safeIndex = totalCount > 0 ? Math.min(activeIndex, totalCount - 1) : 0;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const activeEditingId = terminal ? null : editingItemId;

  const invalidIndices = !terminal
    ? validation.reduce<number[]>((acc, message, idx) => {
        if (message) acc.push(idx);
        return acc;
      }, [])
    : [];
  const errorCount = invalidIndices.length;
  const firstInvalidIndex = invalidIndices[0] ?? -1;

  const goToSlide = (nextIndex: number, openEdit = false) => {
    const clamped = Math.max(0, Math.min(totalCount - 1, nextIndex));
    setActiveIndex(clamped);
    setViewMode("slide");
    if (openEdit && !locked && !terminal && items[clamped]) {
      setEditingItemId(items[clamped].id);
    } else {
      setEditingItemId(null);
    }
  };

  const handleNavKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft" && safeIndex > 0) {
      event.preventDefault();
      goToSlide(safeIndex - 1);
    } else if (event.key === "ArrowRight" && safeIndex < totalCount - 1) {
      event.preventDefault();
      goToSlide(safeIndex + 1);
    }
  };

  const currentItem = items[safeIndex];
  const effectiveViewMode: ViewMode = hasMultiple ? viewMode : "slide";
  const showToolbar = hasMultiple || errorCount > 0;

  const slideNavFooter = hasMultiple ? (
    <nav
      aria-label={t("proposalSlideNavigation")}
      onKeyDown={handleNavKeyDown}
      className="flex items-center justify-between gap-2 border-t border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[color-mix(in_srgb,var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))_60%,transparent)] px-2 py-1.5"
    >
      <button
        type="button"
        disabled={safeIndex === 0}
        onClick={() => goToSlide(safeIndex - 1)}
        aria-label={t("proposalPreviousTask")}
        title={t("proposalPreviousTask")}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent !text-[var(--v2-ink,var(--color-text,#1f2328))] transition-colors duration-150 hover:bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5">
        <span className="text-[0.74rem] font-semibold tabular-nums text-[var(--v2-muted,var(--color-text-muted,#667085))]">
          {safeIndex + 1} / {totalCount}
        </span>

        {totalCount <= MAX_DOT_INDICATORS ? (
          <div className="flex items-center gap-1.5">
            {items.map((dotItem, idx) => {
              const isDotActive = idx === safeIndex;
              const isDotInvalid = !terminal && Boolean(validation[idx]);
              const isDotSelected = draft.selectedItemIds.includes(dotItem.id);
              return (
                <button
                  key={dotItem.id}
                  type="button"
                  onClick={() => goToSlide(idx)}
                  aria-label={t("proposalGoToTask", { index: idx + 1 })}
                  aria-current={isDotActive ? "step" : undefined}
                  className={`h-1.5 cursor-pointer rounded-full border-0 p-0 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))] ${
                    isDotActive ? "w-5" : "w-1.5"
                  } ${
                    isDotInvalid
                      ? "bg-[var(--color-danger,#b25547)]"
                      : isDotActive
                        ? "bg-[var(--v2-accent,var(--color-accent,#456b8c))]"
                        : isDotSelected
                          ? "bg-[color-mix(in_srgb,var(--v2-muted,var(--color-text-muted,#667085))_48%,transparent)] hover:bg-[var(--v2-muted,var(--color-text-muted,#667085))]"
                          : "bg-[color-mix(in_srgb,var(--v2-border,var(--color-line,#d9dee5))_90%,transparent)]"
                  }`}
                />
              );
            })}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="h-1.5 w-24 flex-1 max-w-[120px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--v2-border,var(--color-line,#d9dee5))_75%,transparent)]"
          >
            <div
              className="h-full min-w-[10px] rounded-full bg-[var(--v2-accent,var(--color-accent,#456b8c))] transition-[width] duration-200"
              style={{
                width: `${((safeIndex + 1) / totalCount) * 100}%`,
              }}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={safeIndex >= totalCount - 1}
        onClick={() => goToSlide(safeIndex + 1)}
        aria-label={t("proposalNextTask")}
        title={t("proposalNextTask")}
        className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-0 bg-transparent !text-[var(--v2-ink,var(--color-text,#1f2328))] transition-colors duration-150 hover:bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] disabled:cursor-default disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))]"
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  ) : null;

  const content = (
    <Fragment>
      {showToolbar && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!terminal && hasMultiple && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] px-2.5 py-1 text-[0.73rem] font-semibold text-[var(--v2-ink,var(--color-text,#1f2328))] select-none">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={locked}
                  aria-label={
                    allSelected
                      ? t("proposalDeselectAll")
                      : t("proposalSelectAll")
                  }
                  onChange={toggleAllSelection}
                  className="h-3.5 w-3.5 cursor-pointer rounded-[3px] accent-[var(--v2-accent,var(--color-accent,#456b8c))] disabled:cursor-default disabled:opacity-50"
                />
                <span className="tabular-nums">
                  {selectedCount}/{totalCount}
                </span>
              </label>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {errorCount > 0 && (
              <button
                type="button"
                onClick={() => goToSlide(firstInvalidIndex, true)}
                aria-label={t("proposalJumpToIssue")}
                title={t("proposalJumpToIssue")}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-danger,#b25547)_35%,transparent)] bg-[var(--color-danger-soft,#f9ecea)] px-2.5 py-1 text-[0.72rem] font-semibold !text-[var(--color-danger,#b25547)] transition-opacity duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-danger,#b25547)]"
              >
                <AlertCircle size={12} aria-hidden="true" />
                <span>{t("proposalErrorCount", { count: errorCount })}</span>
              </button>
            )}

            {hasMultiple && (
              <div
                role="group"
                aria-label={t("proposalViewMode")}
                className="inline-flex items-center rounded-[10px] border border-[var(--v2-border,var(--color-line,#d9dee5))] bg-[var(--v2-input-fill,var(--color-surface-muted,#f1f3f5))] p-0.5"
              >
                <button
                  type="button"
                  aria-label={t("proposalSlideView")}
                  title={t("proposalSlideView")}
                  aria-pressed={effectiveViewMode === "slide"}
                  onClick={() => {
                    setViewMode("slide");
                  }}
                  className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))] ${
                    effectiveViewMode === "slide"
                      ? "bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] !text-[var(--v2-accent,var(--color-accent,#456b8c))] shadow-[var(--v2-shadow-sm,var(--shadow-xs))]"
                      : "bg-transparent !text-[var(--v2-muted,var(--color-text-muted,#667085))] hover:!text-[var(--v2-ink,var(--color-text,#1f2328))]"
                  }`}
                >
                  <GalleryHorizontalEnd size={14} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label={t("proposalListView")}
                  title={t("proposalListView")}
                  aria-pressed={effectiveViewMode === "list"}
                  onClick={() => {
                    setEditingItemId(null);
                    setViewMode("list");
                  }}
                  className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[7px] border-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--v2-accent,var(--color-accent,#456b8c))] ${
                    effectiveViewMode === "list"
                      ? "bg-[var(--v2-surface-solid,var(--color-surface,#ffffff))] !text-[var(--v2-accent,var(--color-accent,#456b8c))] shadow-[var(--v2-shadow-sm,var(--shadow-xs))]"
                      : "bg-transparent !text-[var(--v2-muted,var(--color-text-muted,#667085))] hover:!text-[var(--v2-ink,var(--color-text,#1f2328))]"
                  }`}
                >
                  <List size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {effectiveViewMode === "slide" && currentItem ? (
        <TaskProposalSlideCard
          item={currentItem}
          index={safeIndex}
          isSelected={draft.selectedItemIds.includes(currentItem.id)}
          isEditing={activeEditingId === currentItem.id}
          locked={locked}
          terminal={terminal}
          choices={choices}
          validationError={validation[safeIndex] ?? ""}
          onToggleSelect={toggleItemSelection}
          onStartEdit={(id) => setEditingItemId(id)}
          onDoneEdit={() => setEditingItemId(null)}
          onUpdateItem={updateItem}
          footer={slideNavFooter}
        />
      ) : (
        <TaskProposalCompactList
          items={items}
          selectedItemIds={draft.selectedItemIds}
          activeIndex={safeIndex}
          locked={locked}
          terminal={terminal}
          choices={choices}
          validation={validation}
          onToggleSelect={toggleItemSelection}
          onSelectSlide={(idx) => goToSlide(idx, false)}
          onEditSlide={(idx) => goToSlide(idx, true)}
        />
      )}
    </Fragment>
  );

  if (bare) {
    return content;
  }

  return <div className="task-proposal">{content}</div>;
}
