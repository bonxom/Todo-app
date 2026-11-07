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
    <div className="category-grid">
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
        className="category-create-card"
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
