const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      title: 'Create an Account',
      description: 'Sign up in seconds and get started with your personal task manager.'
    },
    {
      number: '02',
      title: 'Add Your Tasks',
      description: 'Quickly add tasks with details, priorities, and categories.'
    },
    {
      number: '03',
      title: 'Stay Organized',
      description: 'Track progress, complete tasks, and boost your productivity.'
    }
  ];

  return (
    <section className="how-it-works-section">
      <div className="how-it-works-container">
        <h2 className="how-it-works-title">How It Works</h2>
        <p className="how-it-works-subtitle">Get started in three simple steps</p>
        <div className="steps-container">
          {steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">{step.number}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
              {index < steps.length - 1 && <div className="step-connector"></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
