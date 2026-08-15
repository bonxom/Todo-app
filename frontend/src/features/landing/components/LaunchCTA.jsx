import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const LaunchCTA = () => (
  <section className="launch-cta">
    <div className="launch-cta__portal" aria-hidden="true"><i /><i /><i /><b /></div>
    <div className="launch-cta__content">
      <p className="orbit-kicker">Ready / Launch</p>
      <h2>Start with a clear orbit.</h2>
      <p>Build a workspace that catches the work, protects your focus, and makes forward motion visible.</p>
      <Link className="orbit-button orbit-button--primary" to="/register">Launch your workspace <ArrowRight size={17} aria-hidden="true" /></Link>
    </div>
  </section>
);

export default LaunchCTA;
