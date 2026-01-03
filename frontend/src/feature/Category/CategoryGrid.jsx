import CategoryCard from './CategoryCard';

const CategoryGrid = ({ categorizedTasks }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(categorizedTasks).map(([category, tasks]) => (
        <CategoryCard key={category} category={category} tasks={tasks} />
      ))}
    </div>
  );
};

export default CategoryGrid;
