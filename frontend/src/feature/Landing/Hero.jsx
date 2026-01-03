import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <h1 className="hero-title">
          Organize Your Life,<br />
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">One Task at a Time</span>
        </h1>
        <p className="hero-description">
          A powerful yet simple task management app to help you stay organized,
          focused, and productive. Track your tasks, set priorities, and achieve your goals.
        </p>
        <div className="hero-buttons">
          <button 
            className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate('/register')}
          >
            Get Started Free
          </button>
          <button 
            className="bg-white text-purple-600 font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl border-2 border-purple-600 hover:bg-purple-50 transform hover:-translate-y-0.5 transition-all duration-200"
            onClick={() => navigate('/login')}
          >
            Sign In
          </button>
        </div>
      </div>
      <div className="hero-image">
        <div className="hero-illustration">
          <div className="floating-card card-1">
            <div className="card-icon">✓</div>
            <div className="card-text">Complete Project</div>
          </div>
          <div className="floating-card card-2">
            <div className="card-icon">📋</div>
            <div className="card-text">Daily Tasks</div>
          </div>
          <div className="floating-card card-3">
            <div className="card-icon">🎯</div>
            <div className="card-text">Goals</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
