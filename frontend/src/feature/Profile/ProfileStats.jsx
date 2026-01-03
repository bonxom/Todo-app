const ProfileStats = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Tasks',
      value: stats?.totalTasks || 0,
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Completed',
      value: stats?.completedTasks || 0,
      color: 'from-green-500 to-green-600',
    },
    {
      label: 'In Progress',
      value: stats?.inProgressTasks || 0,
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      label: 'Categories',
      value: stats?.totalCategories || 0,
      color: 'from-purple-500 to-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {statItems.map((item, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-6 text-center hover:shadow-lg transition-shadow"
        >
          <div className={`text-3xl font-bold mb-2 bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
            {item.value}
          </div>
          <div className="text-gray-600 text-sm">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
