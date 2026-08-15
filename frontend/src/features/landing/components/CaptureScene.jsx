import { Inbox, Plus } from 'lucide-react';

const CaptureScene = () => (
  <div className="capture-scene" aria-hidden="true">
    <div className="capture-scene__pulse" />
    <div className="capture-scene__inbox">
      <div className="capture-scene__header"><Inbox size={16} /><span>Incoming orbit</span><b>04</b></div>
      <div className="capture-scene__add"><Plus size={14} /><span>Capture the next action</span></div>
      <div className="capture-scene__task capture-scene__task--one"><i />Reply to design notes</div>
      <div className="capture-scene__task capture-scene__task--two"><i />Outline sprint scope</div>
      <div className="capture-scene__task capture-scene__task--three"><i />Book review time</div>
    </div>
  </div>
);

export default CaptureScene;
