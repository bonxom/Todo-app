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
          <div className="ui-main-content">
            <div className="ui-page-shell">
              <section className="ui-section-card ui-card-padding text-center">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-[color:var(--color-line)] border-t-[color:var(--color-accent)]" />
                <p className="text-lg font-semibold text-[color:var(--color-text)]">Loading statistics…</p>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                  Preparing summaries, charts, and the last year of activity.
                </p>
              </section>
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
          <div className="ui-main-content">
            <div className="ui-page-shell">
              <section className="ui-section-card ui-card-padding text-center">
                <p className="text-lg font-semibold text-[color:var(--color-danger)]">Unable to load statistics</p>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">{error}</p>
                <button
                  type="button"
                  onClick={fetchStats}
                  className="ui-btn-secondary mt-6"
                >
                  Try Again
                </button>
              </section>
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
          <div className="ui-main-content">
            <div className="ui-page-shell">
              <section className="ui-section-card ui-card-padding text-center">
                <p className="text-lg font-semibold text-[color:var(--color-text)]">No statistics available yet</p>
                <p className="mt-2 text-sm text-[color:var(--color-text-muted)]">
                  Create and complete tasks to populate this page.
                </p>
              </section>
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
        <div className="ui-main-content">
          <div className="ui-page-shell">
            <header className="ui-page-header">
              <p className="ui-page-kicker">Statistics</p>
              <h1 className="ui-page-title">Statistics</h1>
            </header>

            <StatsSummary stats={stats} />

            <ActivityHeatmap dailyStats={normalizedDailyStats} />

            <LineChart dailyStats={normalizedDailyStats} />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <StatusPieChart stats={stats} />
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
