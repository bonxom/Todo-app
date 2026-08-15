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
          title="Bring work into orbit."
          description="Turn passing ideas into clear next actions before they scatter across the day."
          visual={<CaptureScene />}
        />
        <NarrativeSection
          id="organize"
          chapter="02"
          kicker="Organize"
          title="Shape the workspace."
          description="Layer categories, projects, due dates, and priority into a system that stays easy to scan."
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
