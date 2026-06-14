import CategoryCard from './CategoryCard';

const CategoryGrid = ({ items, onTaskUpdated, onCreateCategory }) => {
  if (items.length === 0) {
    return (
      <section className="ui-section-card border-dashed px-6 py-14 text-center">
        <p className="text-lg font-semibold text-[color:var(--color-text)]">No categories to show</p>
        <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
          Create a category to keep related tasks grouped in one place.
        </p>
        <button
          type="button"
          onClick={onCreateCategory}
          className="ui-btn-primary mt-6"
        >
          Add Category
        </button>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
    </div>
  );
};

export default CategoryGrid;
