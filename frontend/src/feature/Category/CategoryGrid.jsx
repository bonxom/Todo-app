import CategoryCard from './CategoryCard';

const CategoryGrid = ({ categorizedTasks, onTaskUpdated }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(categorizedTasks).map(([category, data]) => (
        <CategoryCard 
          key={category} 
          category={category} 
          categoryId={data.categoryId}
          tasks={data.tasks}
          onTaskUpdated={onTaskUpdated}
        />
      ))}
    </div>
  );
};

export default CategoryGrid;
