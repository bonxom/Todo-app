import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const LaunchCTA = () => (
  <section className="launch-cta">
    <div className="launch-cta__content">
      <p className="orbit-kicker">Get started</p>
      <h2>Start with your first task.</h2>
      <p>Create an account to save your tasks and organize your projects.</p>
      <Link className="orbit-button orbit-button--primary" to="/register">
        Create an account <ArrowRight size={17} aria-hidden="true" />
      </Link>
    </div>
  </section>
);

export default LaunchCTA;
