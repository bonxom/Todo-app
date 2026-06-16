import { BarChart3, CalendarCheck, FolderTree, ListChecks, Search, WandSparkles } from 'lucide-react';

const Features = () => {
  const features = [
    {
      Icon: ListChecks,
      title: 'Task Command Center',
      description: 'Create, edit, filter, and complete tasks from a focused workspace built for daily use.'
    },
    {
      Icon: FolderTree,
      title: 'Categories & Projects',
      description: 'Group related work by theme or outcome so every list stays easy to scan.'
    },
    {
      Icon: CalendarCheck,
      title: 'Calendar Planning',
      description: 'See due work in context and keep weekly commitments visible before they drift.'
    },
    {
      Icon: BarChart3,
      title: 'Progress Tracking',
      description: 'Track completions, active work, and status patterns with the same visual language as the app.'
    },
    {
      Icon: Search,
      title: 'Quick Search',
      description: 'Find the right task quickly with compact search and filtering controls.'
    },
    {
      Icon: WandSparkles,
      title: 'AI Task Assist',
      description: 'Use assistant support when a project needs to become a clear set of next actions.'
    }
  ];

  return (
    <section className="landing-section landing-section--muted" id="features">
      <div className="features-container">
        <header className="landing-section-header">
          <p className="ui-page-kicker">Features</p>
          <h2 className="features-title">Everything You Need to Stay Productive</h2>
          <p className="features-subtitle">
            The public pages now introduce the same focused workspace users see after signing in.
          </p>
        </header>
        <div className="features-grid">
          {features.map((feature) => {
            const FeatureIcon = feature.Icon;

            return (
              <article key={feature.title} className="feature-card">
                <div className="feature-icon">
                  <FeatureIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
