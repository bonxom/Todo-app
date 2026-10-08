import CategoryCard from "./CategoryCard";

const CategoryGrid = ({ items, onTaskUpdated, onCreateCategory }) => {
  if (items.length === 0) {
    return (
      <section className="ui-section-card border-dashed px-6 py-14 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-text)]">
          No categories to show
        </p>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Create a category to keep related tasks grouped in one place.
        </p>
        <button
          type="button"
          onClick={onCreateCategory}
          className="ui-btn-primary ui-btn-opposite-corners mt-6"
        >
          Add Category
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
        <strong>A place for your next idea</strong>
        <p>Create a category and make it yours.</p>
        <b>Add Category ↗</b>
      </button>
    </div>
  );
};

export default CategoryGrid;
