import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="landing-navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h2 className="bg-gradient-to-r from-pink-700 via-purple-700 to-pink-700 bg-clip-text text-transparent">TodoApp</h2>
        </div>
        <div className="navbar-menu">
          <a href="#features" className="navbar-link">Features</a>
          <a href="#how-it-works" className="navbar-link">How It Works</a>
        </div>
        <div className="navbar-actions">
          <button 
            className="btn btn-text"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
          <button 
            className="bg-gradient-to-r from-blue-600 to-purple-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate('/register')}
          >
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
