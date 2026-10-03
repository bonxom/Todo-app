import Navbar from './components/Navbar';
import Hero from './components/Hero';
import NarrativeSection from './components/NarrativeSection';
import CaptureScene from './components/CaptureScene';
import OrganizeScene from './components/OrganizeScene';
import ProductExhibit from './components/ProductExhibit';
import LaunchCTA from './components/LaunchCTA';
import Footer from './components/Footer';
import { useInView } from './hooks/useInView';
import '@/styles/landing.css';

const LandingPage = () => {
  const { ref: heroRef, isVisible: heroVisible } = useInView({ threshold: 0.1, once: false });

  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-main">Skip to main content</a>
      <Navbar heroPassed={!heroVisible} />
      <main id="landing-main">
        <div ref={heroRef}><Hero /></div>
        <NarrativeSection
          id="capture"
          chapter="01"
          kicker="Capture"
          title="Add tasks while they’re fresh."
          description="Write down the next step, set a due date, and come back when you’re ready."
          visual={<CaptureScene />}
        />
        <NarrativeSection
          id="organize"
          chapter="02"
          kicker="Organize"
          title="Keep related work together."
          description="Group tasks by project and category. Use priority and due dates to decide what comes next."
          visual={<OrganizeScene />}
          reverse
        />
        <ProductExhibit />
        <LaunchCTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
