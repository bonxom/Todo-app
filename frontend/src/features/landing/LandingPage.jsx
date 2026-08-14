import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import CTA from './components/CTA';
import Footer from './components/Footer';
import '@/styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-main">Skip to main content</a>
      <Navbar />
      <main id="landing-main">
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
