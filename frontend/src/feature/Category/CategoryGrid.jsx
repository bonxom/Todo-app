import CategoryCard from './CategoryCard';

const CategoryGrid = ({ items, onTaskUpdated, onCreateCategory }) => {
  if (items.length === 0) {
    return (
      <div className="rounded-[2rem] border border-dashed border-violet-200 bg-white/85 px-6 py-14 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No categories to show</p>
        <p className="mt-2 text-sm text-gray-500">
          Create a category to keep related tasks grouped in one place.
        </p>
        <button
          type="button"
          onClick={onCreateCategory}
          className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 text-sm font-medium text-white shadow-md transition-all hover:from-violet-700 hover:to-fuchsia-700"
        >
          Add Category
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
