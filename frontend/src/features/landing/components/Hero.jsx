import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Sparkles } from 'lucide-react';
import OrbitScene from './OrbitScene';

const Hero = () => {
  return (
    <section className="orbit-hero">
      <div className="orbit-hero__content">
        <p className="orbit-kicker">Orbit Control / Daily planning</p>
        <h1 className="orbit-hero__title">Control the day. Keep work in orbit.</h1>
        <p className="orbit-hero__description">
          Capture the next action, shape a working system, and turn steady progress into momentum.
        </p>
        <div className="orbit-hero__actions">
          <Link className="orbit-button orbit-button--primary" to="/register">
            Start your orbit
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link className="orbit-button orbit-button--secondary" to="/login">Sign in</Link>
        </div>
        <div className="orbit-hero__proof" aria-label="Product highlights">
          <span><Sparkles size={15} aria-hidden="true" />AI task assist</span>
          <span><CalendarDays size={15} aria-hidden="true" />Calendar planning</span>
          <span>Progress clarity</span>
        </div>
      </div>
      <OrbitScene />
    </section>
  );
};

export default Hero;
