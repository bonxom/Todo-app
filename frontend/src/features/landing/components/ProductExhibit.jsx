import { Check, CircleDot, Clock3 } from 'lucide-react';
import { useInView } from '../hooks/useInView';

const ProductExhibit = () => {
  const { ref, isVisible } = useInView({ threshold: 0.25 });

  return (
    <section id="focus" className="product-exhibit">
      <div ref={ref} className="product-exhibit__inner" data-visible={isVisible}>
        <header className="product-exhibit__copy">
          <p className="orbit-kicker">03 / Focus</p>
          <h2>Turn progress into momentum.</h2>
          <p>
            Keep the next decisions visible, measure the work already moving, and finish with a calmer view of what matters now.
          </p>
        </header>
        <div className="product-exhibit__panel" aria-label="Orbit launch focus dashboard preview">
          <div className="product-exhibit__panel-top">
            <div><span>PROJECT / ORBIT LAUNCH</span><strong>Execution window</strong></div>
            <span className="product-exhibit__live"><i />On track</span>
          </div>
          <div className="product-exhibit__metrics">
            <div className="product-exhibit__ring" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="48" /><circle className="product-exhibit__ring-progress" cx="60" cy="60" r="48" /></svg></div>
            <div><span>Project completion</span><strong>68%</strong><small>+12% this week</small></div>
            <div className="product-exhibit__next"><span>Next focus block</span><strong>14:30</strong><small>Launch review</small></div>
          </div>
          <div className="product-exhibit__body">
            <div className="product-exhibit__tasks"><span className="product-exhibit__label">FOCUS TASKS</span><p><Check size={15} />Review category plan <small>Done</small></p><p><CircleDot size={15} />Prepare launch checklist <small>Now</small></p><p><Clock3 size={15} />Schedule weekly review <small>Next</small></p></div>
            <div className="product-exhibit__timeline"><span className="product-exhibit__label">TIMELINE</span><div><i /><span>09:00</span><b>Scope aligned</b></div><div><i /><span>12:00</span><b>Review complete</b></div><div><i /><span>14:30</span><b>Launch review</b></div></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductExhibit;
