import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  Check,
  Circle,
  CircleCheck,
  Folder,
  ListTodo,
  Menu,
  Sparkles,
  X,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import Brand from "./components/Brand";
import HeroOrbit from "./components/HeroOrbit";
import Reveal from "./components/Reveal";
import OrbitMark from "@/shared/components/OrbitMark";
import ThemeToggle from "@/shared/components/ThemeToggle";
import WorkspacePreview from "./components/WorkspacePreview";
import "@/styles/landing.css";

const features = [
  {
    icon: ListTodo,
    title: "Out of your head. Into a plan.",
    text: "Capture the little things and the big ideas. Give every task a priority, a due date, and a place to land.",
    label: "TASKS, WITHOUT THE TANGLE",
    className: "capture",
  },
  {
    icon: Folder,
    title: "Everything in its right place.",
    text: "Bring related work together with projects and categories. Less searching. More moving things forward.",
    label: "A HOME FOR EVERY PROJECT",
    className: "organize",
  },
  {
    icon: ChartNoAxesColumnIncreasing,
    title: "See how far you’ve come.",
    text: "Turn finished tasks into visible progress. Find your rhythm and make a little more room for what’s next.",
    label: "PROGRESS YOU CAN FEEL",
    className: "progress",
  },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  return (
    <div
      className="landing-page"
      data-motion={motionPaused ? "paused" : "playing"}
    >
      <a className="landing-skip" href="#landing-main">
        Skip to main content
      </a>
      <header className="landing-navbar">
        <div className="landing-container nav-inner">
          <Link to="/" aria-label="Orbit home">
            <Brand />
          </Link>
          <nav
            id="landing-navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                document.getElementById("landing-menu-toggle")?.focus();
              }
            }}
            className={
              menuOpen ? "landing-nav-links is-open" : "landing-nav-links"
            }
            aria-label="Main navigation"
          >
            <a href="#features" onClick={() => setMenuOpen(false)}>
              Why Orbit
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              How it works
            </a>
            <a href="#preview" onClick={() => setMenuOpen(false)}>
              Take a look <ArrowUpRight size={13} />
            </a>
            <Link className="mobile-sign-in" to="/login">
              Sign in
            </Link>
          </nav>
          <div className="nav-actions">
            <ThemeToggle />
            <Link className="sign-in" to="/login">
              Sign in
            </Link>
            <Link className="landing-button button-dark nav-cta" to="/register">
              Get started <ArrowUpRight size={15} />
            </Link>
            <button
              id="landing-menu-toggle"
              aria-controls="landing-navigation"
              className="mobile-menu"
              aria-label={menuOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="landing-main">
        <Reveal>
          <section className="landing-hero landing-container">
            <div className="hero-copy" data-reveal="left">
              <div className="hero-eyebrow">
                <span className="live-dot" /> A LITTLE CLARITY. A LOT OF
                POSSIBILITY.
              </div>
              <h1>
                Everything to do.
                <br />
                <span>
                  One place
                  <br />
                  to focus.
                </span>
              </h1>
              <p>
                Bring your tasks, projects, and calendar into Orbit.
                <br className="desktop-break" /> Less on your mind. More room to
                move forward.
              </p>
              <div className="hero-actions">
                <Link className="landing-button button-primary" to="/register">
                  Find your focus <ArrowUpRight size={18} />
                </Link>
                <a className="hero-demo-link" href="#preview">
                  <span className="play-icon">▶</span> See Orbit in action
                </a>
              </div>
              <div className="hero-footnote">
                <Check size={14} /> Your ideas. Your pace. Your space.
              </div>
            </div>
            <HeroOrbit
              paused={motionPaused}
              onToggleMotion={() => setMotionPaused((value) => !value)}
            />
          </section>
        </Reveal>
        <Reveal className="landing-container">
          <WorkspacePreview />
        </Reveal>
        <Reveal>
          <div className="benefit-strip landing-container">
            <span data-reveal="left">Built for your everyday orbit.</span>
            <div data-reveal="right">
              <span>
                <ListTodo size={17} /> Thoughtful task management
              </span>
              <span>
                <CalendarDays size={17} /> A clearer calendar
              </span>
              <span>
                <Sparkles size={17} /> A little help from AI
              </span>
            </div>
          </div>
        </Reveal>
        <Reveal>
          <section className="features-section landing-container" id="features">
            <div className="section-heading">
              <div data-reveal="left">
                <p className="section-eyebrow">
                  <span /> ROOM TO THINK. SPACE TO DO.
                </p>
                <h2>
                  Life has enough moving parts.
                  <br />
                  <span>Keep your work simple.</span>
                </h2>
              </div>
              <p data-reveal="right" style={{ "--reveal-delay": "100ms" }}>
                From the first “what if” to the final checkmark,
                <br />a little clarity goes a long way.
              </p>
            </div>
            <div className="feature-grid">
              {features.map((feature, index) => (
                <article
                  key={feature.className}
                  data-reveal={index % 2 === 0 ? "left" : "right"}
                  style={{ "--reveal-delay": `${index * 110}ms` }}
                  className={`feature-card feature-${feature.className}`}
                >
                  <div className="feature-icon">
                    <feature.icon size={21} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <div className="feature-art" aria-hidden="true">
                    {index === 0 ? (
                      <div className="mini-task-stack">
                        <div>
                          <Circle size={14} /> The next big idea{" "}
                          <span>Today</span>
                        </div>
                        <div>
                          <CircleCheck size={14} /> One small step forward{" "}
                          <Check size={13} />
                        </div>
                        <div>
                          <Plus size={14} /> Make room for something new
                        </div>
                      </div>
                    ) : index === 1 ? (
                      <div className="mini-folders">
                        <div>
                          <Folder /> <span>Work</span>
                          <small>Space to build</small>
                        </div>
                        <div>
                          <Folder /> <span>Life</span>
                          <small>Room to breathe</small>
                        </div>
                      </div>
                    ) : (
                      <div className="mini-chart">
                        <div className="chart-top">
                          <span>Little wins add up.</span>
                          <strong>↗</strong>
                        </div>
                        <div className="chart-bars">
                          {[28, 46, 37, 62, 54, 79, 95].map((height, i) => (
                            <i key={i} style={{ height: `${height}%` }} />
                          ))}
                        </div>
                        <div className="chart-days">
                          <span>M</span>
                          <span>T</span>
                          <span>W</span>
                          <span>T</span>
                          <span>F</span>
                          <span>S</span>
                          <span>S</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="feature-label">{feature.label}</span>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section className="how-section" id="how-it-works">
            <div className="landing-container how-inner">
              <div className="how-copy" data-reveal="left">
                <p className="section-eyebrow">
                  <span /> SMALL STEPS. BIG DIFFERENCE.
                </p>
                <h2>
                  Find your rhythm.
                  <br />
                  <span>Make it your own.</span>
                </h2>
                <p>
                  You don’t need a whole new system.
                  <br />
                  Just a good place to start.
                </p>
                <Link className="text-link" to="/register">
                  Let’s make some room <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="how-steps">
                {[
                  [
                    "Get it out of your head.",
                    "A task, a reminder, a half-formed idea. Capture it before it slips away.",
                  ],
                  [
                    "Give it a little direction.",
                    "Pick a project. Set a priority. Make the next step a little clearer.",
                  ],
                  [
                    "Do your thing. Then take a breath.",
                    "Check it off, see your progress, and keep going at a pace that works for you.",
                  ],
                ].map(([title, text], i) => (
                  <div
                    className="how-step"
                    key={title}
                    data-reveal="right"
                    style={{ "--reveal-delay": `${i * 100}ms` }}
                  >
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    {i === 2 && (
                      <span className="step-star" aria-hidden="true">
                        ✳
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section className="closing-section landing-container">
            <div
              className="closing-orbit"
              aria-hidden="true"
              data-reveal="left"
            >
              <OrbitMark />
            </div>
            <p className="section-eyebrow" data-reveal="right">
              A LITTLE CLARITY CHANGES EVERYTHING.
            </p>
            <h2 data-reveal="left" style={{ "--reveal-delay": "80ms" }}>
              Good things start
              <br />
              with a little <em>space.</em>
            </h2>
            <p data-reveal="right" style={{ "--reveal-delay": "140ms" }}>
              Your next idea deserves a place to grow.
              <br />
              Let’s put it in Orbit.
            </p>
            <Link
              data-reveal="left"
              style={{ "--reveal-delay": "200ms" }}
              className="landing-button button-primary"
              to="/register"
            >
              Create your workspace <ArrowUpRight size={18} />
            </Link>
            <span
              className="closing-note"
              data-reveal="right"
              style={{ "--reveal-delay": "240ms" }}
            >
              Start small. Make it yours.
            </span>
          </section>
        </Reveal>
      </main>
      <Reveal>
        <footer className="landing-footer landing-container">
          <div className="footer-top" data-reveal="left">
            <Link to="/" aria-label="Orbit home">
              <Brand />
            </Link>
            <p>A calmer space for a fuller life.</p>
            <a href="#landing-main">
              Back to the top <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="footer-bottom" data-reveal="right">
            <span>
              © {new Date().getFullYear()} Orbit. Make space for what matters.
            </span>
            <span>
              Made for humans with a lot on their minds.{" "}
              <span className="footer-star">✳</span>
            </span>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}
