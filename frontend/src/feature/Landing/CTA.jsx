import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const CTA = () => {
  return (
    <section className="landing-section landing-cta-section">
      <div className="cta-container ui-section-card ui-card-padding">
        <p className="ui-page-kicker">Ready</p>
        <h2 className="cta-title">Ready to Get Organized?</h2>
        <p className="cta-description">
          Start with the same clean workspace shown here, then build your categories, projects,
          calendar, and progress views as your task list grows.
        </p>
        <Link className="ui-btn-primary cta-button" to="/register">
          Create Workspace
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
};

export default CTA;
