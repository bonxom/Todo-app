import { useMemo } from 'react';

const StatusPieChart = ({ stats }) => {
  const chartData = useMemo(() => {
    if (!stats) {
      return {
        data: [],
        total: 0
      };
    }

    const data = [
      { 
        label: 'Pending', 
        value: stats.pendingTasks || 0, 
        color: '#fbbf24',
        percentage: 0
      },
      { 
        label: 'In Progress', 
        value: stats.inProgressTasks || 0, 
        color: '#3b82f6',
        percentage: 0
      },
      { 
        label: 'Completed', 
        value: stats.completedTasks || 0, 
        color: '#10b981',
        percentage: 0
      },
      { 
        label: 'Given Up', 
        value: stats.givenUpTasks || 0, 
        color: '#ef4444',
        percentage: 0
      },
    ].filter(item => item.value > 0);

    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Calculate percentages
    data.forEach(item => {
      item.percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
    });

    return { data, total };
  }, [stats]);

  const { data, total } = chartData;

  // Calculate pie slices
  const getSlices = () => {
    let currentAngle = -90; // Start from top
    
    return data.map((item) => {
      const sliceAngle = (item.value / total) * 360;
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

  const slices = getSlices();

  if (total === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
        <div className="flex-1 flex items-center justify-center text-gray-400">
          No tasks yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
      
      <div className="flex-1 flex flex-col items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full max-w-[200px]">
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
        <div className="mt-4 space-y-2 w-full">
          {slices.map((slice, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: slice.color }}
                ></div>
                <span className="text-gray-700">{slice.label}</span>
              </div>
              <span className="font-medium text-gray-900">
                {slice.value} ({slice.percentage}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatusPieChart;
