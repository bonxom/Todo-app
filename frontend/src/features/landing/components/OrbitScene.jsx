import { Check, CircleDot, Search, Sparkles } from 'lucide-react';
import { usePointerTilt } from '../hooks/usePointerTilt';

const OrbitScene = () => {
  const tilt = usePointerTilt();

  return (
    <div className="orbit-scene" aria-label="TodoApp command deck preview">
      <div className="orbit-scene__glow" aria-hidden="true" />
      <svg className="orbit-scene__tracks" viewBox="0 0 600 500" aria-hidden="true" focusable="false">
        <ellipse cx="300" cy="250" rx="264" ry="128" />
        <ellipse cx="300" cy="250" rx="204" ry="206" transform="rotate(-28 300 250)" />
        <ellipse cx="300" cy="250" rx="296" ry="80" transform="rotate(24 300 250)" />
        <circle className="orbit-scene__satellite" cx="86" cy="250" r="5" />
        <circle className="orbit-scene__satellite orbit-scene__satellite--cyan" cx="456" cy="88" r="5" />
      </svg>

      <div className="orbit-scene__deck-wrap" {...tilt}>
        <div className="orbit-scene__deck">
          <div className="orbit-scene__topbar">
            <span className="orbit-scene__window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>Orbit control</span>
            <Search size={14} aria-hidden="true" />
          </div>
          <div className="orbit-scene__dashboard">
            <aside className="orbit-scene__sidebar" aria-hidden="true">
              <span className="is-active" />
              <span />
              <span />
              <span />
            </aside>
            <div className="orbit-scene__main">
              <div className="orbit-scene__headline-row">
                <div>
                  <span className="orbit-scene__eyebrow">FOCUS QUEUE</span>
                  <strong>Wednesday orbit</strong>
                </div>
                <span className="orbit-scene__status">3 active</span>
              </div>
              <div className="orbit-scene__progress-card">
                <div>
                  <span>Project velocity</span>
                  <strong>68%</strong>
                </div>
                <div className="orbit-scene__progress-track" aria-hidden="true"><span /></div>
              </div>
              <div className="orbit-scene__tasks">
                <div><Check size={14} aria-hidden="true" /><span>Review category plan</span><small>Done</small></div>
                <div><CircleDot size={14} aria-hidden="true" /><span>Shape launch checklist</span><small>Now</small></div>
                <div><CircleDot size={14} aria-hidden="true" /><span>Schedule weekly review</span><small>Next</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="orbit-scene__floating-card orbit-scene__floating-card--ai" aria-hidden="true">
        <Sparkles size={15} />
        <span>AI assist</span>
      </div>
      <div className="orbit-scene__floating-card orbit-scene__floating-card--signal" aria-hidden="true">
        <span className="orbit-scene__signal-dot" />
        <span>On track</span>
      </div>
    </div>
  );
};

export default OrbitScene;
