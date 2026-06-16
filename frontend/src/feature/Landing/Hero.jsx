import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, FolderKanban, Sparkles } from 'lucide-react';

const Hero = () => {
  return (
    <section className="hero-section">
      <div className="hero-content">
        <p className="ui-page-kicker">Personal Task Workspace</p>
        <h1 className="hero-title">
          Plan the day, track the work, and keep projects moving.
        </h1>
        <p className="hero-description">
          TodoApp brings tasks, categories, calendars, and progress into the same calm workspace
          your dashboard already uses every day.
        </p>
        <div className="hero-buttons">
          <Link className="ui-btn-primary" to="/register">
            Create Workspace
          </Link>
          <Link className="ui-btn-secondary" to="/login">
            Sign In
          </Link>
        </div>
        <div className="hero-meta" aria-label="Product highlights">
          <span className="ui-chip ui-chip--accent">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI task help
          </span>
          <span className="ui-chip">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
            Calendar ready
          </span>
          <span className="ui-chip">Progress stats</span>
        </div>
      </div>

      <div className="hero-preview" aria-label="TodoApp dashboard preview">
        <div className="hero-preview-header">
          <div>
            <p className="ui-page-kicker">Today</p>
            <h2>Focus List</h2>
          </div>
          <span className="ui-chip ui-chip--success">3 active</span>
        </div>

        <div className="hero-progress">
          <div className="hero-progress-copy">
            <span>Project Completion</span>
            <strong className="ui-tabular">68%</strong>
          </div>
          <div className="hero-progress-track" aria-hidden="true">
            <span />
          </div>
        </div>

        <div className="hero-task-list">
          <article className="hero-task-card is-complete">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <div>
              <h3>Review category plan</h3>
              <p>Completed this morning</p>
            </div>
          </article>
          <article className="hero-task-card">
            <FolderKanban className="h-5 w-5" aria-hidden="true" />
            <div>
              <h3>Prepare launch checklist</h3>
              <p>Project - In progress</p>
            </div>
          </article>
          <article className="hero-task-card">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
            <div>
              <h3>Schedule weekly review</h3>
              <p>Calendar - Tomorrow</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default Hero;
