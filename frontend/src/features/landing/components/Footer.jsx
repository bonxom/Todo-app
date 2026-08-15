import { Link } from 'react-router-dom';
import OrbitMark from '@/shared/components/OrbitMark';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="landing-footer">
      <div className="landing-footer__inner">
        <div className="landing-footer__brand">
          <div><OrbitMark /><strong>TodoApp</strong></div>
          <p>A focused task workspace for lists, projects, calendars, and steady progress.</p>
        </div>
        <div className="landing-footer__section"><h3>Orbit</h3><a href="#capture">Capture</a><a href="#organize">Organize</a><a href="#focus">Focus</a></div>
        <div className="landing-footer__section"><h3>Account</h3><Link to="/login">Sign in</Link><Link to="/register">Create workspace</Link></div>
      </div>
      <p className="landing-footer__bottom">© {year} TodoApp. All rights reserved.</p>
    </footer>
  );
};

export default Footer;
