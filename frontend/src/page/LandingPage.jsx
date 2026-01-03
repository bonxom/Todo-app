import Navbar from '../feature/Landing/Navbar';
import Hero from '../feature/Landing/Hero';
import Features from '../feature/Landing/Features';
import HowItWorks from '../feature/Landing/HowItWorks';
import CTA from '../feature/Landing/CTA';
import Footer from '../feature/Landing/Footer';
import '../styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
