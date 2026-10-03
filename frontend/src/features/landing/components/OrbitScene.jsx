import { Check, CircleDot, Search } from 'lucide-react';

const OrbitScene = () => {
  return (
    <div className="orbit-scene" aria-label="Task workspace preview">
      <div className="orbit-scene__deck-wrap">
        <div className="orbit-scene__deck">
          <div className="orbit-scene__topbar">
            <span className="orbit-scene__window-dots" aria-hidden="true"><i /><i /><i /></span>
            <span>Orbit · Workspace</span>
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
                  <span className="orbit-scene__eyebrow">YOUR TASKS</span>
                  <strong>Today</strong>
                </div>
                <span className="orbit-scene__status">3 active</span>
              </div>
              <div className="orbit-scene__progress-card">
                <div>
                  <span>Project completion</span>
                  <strong>68%</strong>
                </div>
                <div className="orbit-scene__progress-track" aria-hidden="true"><span /></div>
              </div>
              <div className="orbit-scene__tasks">
                <div><Check size={14} aria-hidden="true" /><span>Review category plan</span><small>Done</small></div>
                <div><CircleDot size={14} aria-hidden="true" /><span>Prepare launch checklist</span><small>Now</small></div>
                <div><CircleDot size={14} aria-hidden="true" /><span>Schedule weekly review</span><small>Next</small></div>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default OrbitScene;
