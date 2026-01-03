const Features = () => {
  const features = [
    {
      icon: '📝',
      title: 'Easy Task Management',
      description: 'Create, edit, and organize your tasks effortlessly. Keep track of everything you need to do in one place.'
    },
    {
      icon: '🗂️',
      title: 'Smart Categories',
      description: 'Organize tasks into custom categories. Work, personal, shopping - keep everything neatly separated.'
    },
    {
      icon: '⭐',
      title: 'Priority System',
      description: 'Mark tasks as important and set priorities. Focus on what matters most and never miss a deadline.'
    },
    {
      icon: '📊',
      title: 'Progress Tracking',
      description: 'Visualize your productivity with intuitive progress bars and statistics. See how much you accomplish.'
    },
    {
      icon: '🔍',
      title: 'Quick Search',
      description: 'Find any task instantly with powerful search and filtering. Save time and stay organized.'
    },
    {
      icon: '🎨',
      title: 'Beautiful Interface',
      description: 'Enjoy a clean, modern design that makes task management a pleasure. Work in an interface you love.'
    }
  ];

  return (
    <section className="features-section">
      <div className="features-container">
        <div className="features-header">
          <h2 className="features-title">Everything You Need to Stay Productive</h2>
          <p className="features-subtitle">
            Powerful features designed to help you manage tasks efficiently
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
