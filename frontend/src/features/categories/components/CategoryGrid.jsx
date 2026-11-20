import { useTranslation } from "react-i18next";
import CategoryCard from "./CategoryCard";

const CategoryGrid = ({ items, onTaskUpdated, onCreateCategory }) => {
  const { t } = useTranslation("workspace");

  if (items.length === 0) {
    return (
      <section className="ui-section-card border-dashed px-6 py-14 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-text)]">
          {t("noCategoriesToShow")}
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          {t("createACategoryToKeepRelatedTasksGroupedInOnePlace")}
        </p>
        <button
          type="button"
          onClick={onCreateCategory}
          className="ui-btn-primary ui-btn-opposite-corners mt-6"
        >
          {t("addCategory")}
        </button>
      </section>
    );
  }

  return (
    <div className="category-grid grid gap-[20px] mt-[-10px] [@media(max-width:600px)]:gap-[16px]">
      {items.map((item) => (
        <CategoryCard
          key={item.categoryId}
          category={item.category}
          description={item.description}
          categoryId={item.categoryId}
          tasks={item.tasks}
          onTaskUpdated={onTaskUpdated}
        />
      ))}
      <button
        type="button"
        className="category-create-card min-h-[260px] p-[30px] [border:1px_dashed_var(--color-line)] rounded-[14px] flex flex-col
          items-center justify-center text-center cursor-pointer [&_>_span]:w-[44px] [&_>_span]:h-[44px]
          [&_>_span]:rounded-[50%] [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:text-[var(--color-accent)]
          [&_>_span]:text-[25px] [&_>_span]:mb-[18px] [&_strong]:text-[14px] [&_strong]:[font-weight:500]
          [&_p]:text-[11px] [&_p]:text-[var(--color-text-muted)] [&_p]:m-[7px_0_23px] [&_b]:text-[var(--color-accent)]
          [&_b]:text-[11px] [&_b]:[font-weight:600] [&:hover]:[background:var(--color-accent-soft)]
          [@media(max-width:600px)]:min-h-[240px]"
        onClick={onCreateCategory}
      >
        <span aria-hidden="true">+</span>
        <strong>{t("aPlaceForYourNextIdea")}</strong>
        <p>{t("createACategoryAndMakeItYours")}</p>
        <b>{t("addCategory")}</b>
      </button>
    </div>
  );
};

export default CategoryGrid;
