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
          <div className="flex min-h-full items-center justify-center p-6">
            <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-sky-500" />
              <p className="text-lg font-semibold text-slate-900">Loading statistics</p>
              <p className="mt-2 text-sm text-slate-500">Preparing summaries, charts, and the last year of activity.</p>
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
          <div className="flex min-h-full items-center justify-center p-6">
            <div className="w-full max-w-4xl rounded-[2rem] border border-red-200 bg-white px-6 py-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-red-700">Unable to load statistics</p>
              <p className="mt-2 text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={fetchStats}
                className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl border border-red-300 bg-white px-5 text-sm font-medium text-red-700 transition-all hover:bg-red-50"
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
          <div className="flex min-h-full items-center justify-center p-6">
            <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-900">No statistics available yet</p>
              <p className="mt-2 text-sm text-slate-500">Create and complete tasks to populate the dashboard.</p>
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
