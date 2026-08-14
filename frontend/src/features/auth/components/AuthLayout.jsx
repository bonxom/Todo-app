import { Link } from 'react-router-dom';

const AuthLayout = ({ children, mode = 'login' }) => {
  const isRegister = mode === 'register';

  return (
    <main className="auth-page-shell">
      <a className="skip-link" href="#auth-form">Skip to account form</a>
      <div className="auth-page-container">
        <Link to="/" className="auth-home-link">
          <span className="ui-shell-brand-mark" aria-hidden="true">
            <img src="/ech.jpeg" alt="" className="brand-mark-image" />
          </span>
          <span>TodoApp</span>
        </Link>

        <section className="auth-shell ui-section-card">
          <aside className="auth-aside" aria-label="TodoApp workspace summary">
            <h1>{isRegister ? 'Build your task workspace.' : 'Welcome back to your workspace.'}</h1>
            <video
              className="auth-aside-video"
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
            >
              <source src="/robothihi1.mp4" type="video/mp4" />
            </video>
          </aside>

          <div className="auth-form-panel" id="auth-form">
            {children}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AuthLayout;
