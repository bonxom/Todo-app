import { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layout/MainLayout';
import { statService } from '../api/apiService';
import LineChart from '../feature/Statics/LineChart';
import StatusPieChart from '../feature/Statics/StatusPieChart';
import CategoryPieChart from '../feature/Statics/CategoryPieChart';
import StatsSummary from '../feature/Statics/StatsSummary';
import ActivityHeatmap from '../feature/Statics/ActivityHeatmap';
import { normalizeDailyStats } from '../feature/Statics/statsUtils';
import ChatBubble from '../component/ChatBuble';

const StatisticsPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const normalizedDailyStats = useMemo(() => normalizeDailyStats(stats?.dailyStats || []), [stats]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await statService.getUserStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load statistics. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <MainLayout>
          <div className="flex justify-center items-center min-h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading statistics...</p>
            </div>
          </div>
        </MainLayout>
        <ChatBubble />
      </>
    );
  }

  if (error) {
    return (
      <>
        <MainLayout>
          <div className="flex justify-center items-center min-h-full">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">⚠️</div>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchStats}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
              >
                Try Again
              </button>
            </div>
          </div>
        </MainLayout>
        <ChatBubble />
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <MainLayout>
          <div className="flex justify-center items-center min-h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">📊</div>
              <p>No statistics available</p>
            </div>
          </div>
        </MainLayout>
        <ChatBubble />
      </>
    );
  }

  return (
    <>
      <MainLayout>
        <div className="flex justify-center items-start min-h-full p-6">
          <div className="w-full max-w-7xl mx-auto bg-gray-100/50 backdrop-blur-sm rounded-xl shadow-lg p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="flex justify-center text-3xl font-bold mb-3 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Statistics Dashboard
              </h1>
              <p className="flex justify-center text-gray-500 mb-2">
                Track task totals, completion trends, and the daily rhythm of finished work.
              </p>
            </div>

            {/* Summary Cards */}
            <StatsSummary stats={stats} />

            <div className="mb-6">
              <ActivityHeatmap dailyStats={normalizedDailyStats} />
            </div>

            {/* Line Chart - Full Width */}
            <div className="mb-6">
              <LineChart dailyStats={normalizedDailyStats} />
            </div>

            {/* Pie Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Pie Chart */}
              <StatusPieChart stats={stats} />
              
              {/* Category Pie Chart */}
              <CategoryPieChart dailyStats={normalizedDailyStats} />
            </div>
          </div>
        </div>
      </MainLayout>
      <ChatBubble />
    </>
  );
};

export default StatisticsPage;
