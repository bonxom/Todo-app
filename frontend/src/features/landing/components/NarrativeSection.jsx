import { useInView } from '../hooks/useInView';

const NarrativeSection = ({ id, chapter, kicker, title, description, visual, reverse = false }) => {
  const { ref, isVisible } = useInView({ threshold: 0.18 });

  return (
    <section id={id} className={`narrative-section${reverse ? ' narrative-section--reverse' : ''}`}>
      <div ref={ref} className="narrative-section__inner" data-visible={isVisible}>
        <div className="narrative-section__copy">
          <p className="orbit-kicker">{chapter} / {kicker}</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="narrative-section__visual">{visual}</div>
      </div>
    </section>
  );
};

export default NarrativeSection;
