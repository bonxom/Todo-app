import { useMemo } from 'react';
import DonutChartCard from './DonutChartCard';

const CATEGORY_COLORS = [
  '#456B8C',
  '#2F7D5A',
  '#A46A2A',
  '#7A7F87',
  '#6A7E93',
  '#8B9A74',
  '#B25547',
  '#9BA7B5',
];

const CategoryPieChart = ({ dailyStats }) => {
  const chartData = useMemo(() => {
    if (!dailyStats || dailyStats.length === 0) {
      return { items: [], total: 0 };
    }

    const categoryMap = new Map();

    dailyStats.forEach((day) => {
      if (!day.completedOfEachCategory || day.completedOfEachCategory.length === 0) {
        return;
      }

      day.completedOfEachCategory.forEach((category) => {
        const existing = categoryMap.get(category.categoryName);

        if (existing) {
          existing.value += category.count;
          return;
        }

        categoryMap.set(category.categoryName, {
          label: category.categoryName,
          value: category.count,
        });
      });
    });

    const items = Array.from(categoryMap.values())
      .filter((item) => item.value > 0)
      .sort((left, right) => right.value - left.value)
      .map((item, index) => ({
        ...item,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));

    const total = items.reduce((sum, item) => sum + item.value, 0);

    return {
      items: items.map((item) => ({
        ...item,
        percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0',
      })),
      total,
    };
  }, [dailyStats]);

  return (
    <DonutChartCard
      title="Completed Tasks by Category"
      total={chartData.total}
      totalLabel="Done"
      items={chartData.items}
      emptyMessage="No completed tasks yet."
    />
  );
};

export default CategoryPieChart;
