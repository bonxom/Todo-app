import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="landing-navbar" aria-label="Landing navigation">
      <div className="navbar-container">
        <Link to="/" className="landing-brand" aria-label="TodoApp home">
          <span className="landing-brand-mark" aria-hidden="true">
            <img src="/ech.jpeg" alt="" className="brand-mark-image" />
          </span>
          <span>TodoApp</span>
        </Link>
        <div className="navbar-menu">
          <a href="#features" className="navbar-link">Features</a>
          <a href="#how-it-works" className="navbar-link">How It Works</a>
        </div>
        <div className="navbar-actions">
          <Link className="ui-btn-tertiary landing-nav-action" to="/login">
            Sign In
          </Link>
          <Link className="ui-btn-primary landing-nav-action" to="/register">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
