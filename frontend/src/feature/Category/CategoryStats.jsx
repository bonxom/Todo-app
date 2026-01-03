const CategoryStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {stats.totalCategories}
        </div>
        <div className="text-sm text-gray-600 mt-1">Categories</div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          {stats.totalTasks}
        </div>
        <div className="text-sm text-gray-600 mt-1">Total Tasks</div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
          {stats.completedTasks}
        </div>
        <div className="text-sm text-gray-600 mt-1">Completed</div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-4 text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
          {stats.pendingTasks}
        </div>
        <div className="text-sm text-gray-600 mt-1">Pending</div>
      </div>
    </div>
  );
};

export default CategoryStats;
