import { CheckSquare, LayoutDashboard, PlusCircle } from 'lucide-react';

const HowItWorks = () => {
  const steps = [
    {
      number: '01',
      Icon: LayoutDashboard,
      title: 'Open Your Workspace',
      description: 'Create an account and land in the same dashboard used for everyday planning.'
    },
    {
      number: '02',
      Icon: PlusCircle,
      title: 'Capture the Work',
      description: 'Add tasks with projects, categories, dates, and the details you need later.'
    },
    {
      number: '03',
      Icon: CheckSquare,
      title: 'Review Progress',
      description: 'Use calendar and statistics views to keep your next actions honest.'
    }
  ];

  return (
    <section className="landing-section" id="how-it-works">
      <div className="how-it-works-container">
        <header className="landing-section-header">
          <p className="ui-page-kicker">Workflow</p>
          <h2 className="how-it-works-title">How It Works</h2>
          <p className="how-it-works-subtitle">A short path from account setup to a working task system.</p>
        </header>
        <div className="steps-container">
          {steps.map((step) => {
            const StepIcon = step.Icon;

            return (
              <article key={step.number} className="step-card">
                <div className="step-number-row">
                  <span className="step-number ui-tabular">{step.number}</span>
                  <span className="step-icon">
                    <StepIcon className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
