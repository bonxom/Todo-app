import { Link } from 'react-router-dom';
import OrbitMark from '@/shared/components/OrbitMark';

const Navbar = ({ heroPassed = false }) => {
  return (
    <nav className="landing-navbar" aria-label="Landing navigation" data-scrolled={heroPassed}>
      <div className="landing-navbar__inner">
        <Link to="/" className="landing-brand" aria-label="TodoApp home">
          <OrbitMark />
          <span>TodoApp</span>
        </Link>
        <div className="landing-navbar__links">
          <a href="#capture">Capture</a>
          <a href="#organize">Organize</a>
          <a href="#focus">Focus</a>
        </div>
        <div className="landing-navbar__actions">
          <Link to="/login">Sign in</Link>
          <Link className="landing-navbar__start" to="/register">Start free</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
