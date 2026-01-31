import { useMemo } from 'react';

const CategoryPieChart = ({ dailyStats }) => {
  const chartData = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return {
        data: [],
        total: 0
      };
    }

    // Aggregate completed tasks by category across all days
    const categoryMap = new Map();

    dailyStats.forEach(day => {
      if (day.completedOfEachCategory && day.completedOfEachCategory.length > 0) {
        day.completedOfEachCategory.forEach(cat => {
          const existing = categoryMap.get(cat.categoryName);
          if (existing) {
            existing.count += cat.count;
          } else {
            categoryMap.set(cat.categoryName, {
              name: cat.categoryName,
              count: cat.count
            });
          }
        });
      }
    });

    const data = Array.from(categoryMap.values())
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    const total = data.reduce((sum, item) => sum + item.count, 0);

    // Assign colors
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ];

    data.forEach((item, index) => {
      item.color = colors[index % colors.length];
      item.percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : 0;
    });

    return { data, total };
  }, [dailyStats]);

  const { data, total } = chartData;

  // Calculate pie slices
  const getSlices = () => {
    let currentAngle = -90; // Start from top
    
    return data.map((item) => {
      const sliceAngle = (item.count / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      
      currentAngle = endAngle;

      // Calculate path for pie slice
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = 50 + 40 * Math.cos(startRad);
      const y1 = 50 + 40 * Math.sin(startRad);
      const x2 = 50 + 40 * Math.cos(endRad);
      const y2 = 50 + 40 * Math.sin(endRad);
      const largeArc = sliceAngle > 180 ? 1 : 0;

      const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

      return {
        ...item,
        path,
        startAngle,
        endAngle,
      };
    });
  };

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Completed Tasks by Category</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No completed tasks yet
        </div>
      </div>
    );
  }

  const slices = getSlices();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Completed Tasks by Category</h3>
      
      <div className="flex flex-col lg:flex-row items-center justify-center gap-8">
        {/* Pie Chart */}
        <svg viewBox="0 0 100 100" className="w-full max-w-[250px]">
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.path}
                fill={slice.color}
                className="transition-opacity hover:opacity-80 cursor-pointer"
              />
            </g>
          ))}
          
          {/* Center circle for donut effect */}
          <circle cx="50" cy="50" r="20" fill="white" />
          
          {/* Total in center */}
          <text
            x="50"
            y="48"
            textAnchor="middle"
            className="text-[8px] fill-gray-500"
          >
            Total
          </text>
          <text
            x="50"
            y="56"
            textAnchor="middle"
            className="text-[10px] font-bold fill-gray-700"
          >
            {total}
          </text>
        </svg>

        {/* Legend */}
        <div className="space-y-2 w-full lg:w-auto">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                ></div>
                <span className="text-gray-700 truncate max-w-[150px]">{slice.name}</span>
              </div>
              <span className="font-medium text-gray-900 whitespace-nowrap">
                {slice.count} ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryPieChart;
