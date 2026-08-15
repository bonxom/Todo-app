import { CalendarDays, FolderKanban, Layers3, Tag } from 'lucide-react';

const OrganizeScene = () => (
  <div className="organize-scene" aria-hidden="true">
    <svg className="organize-scene__links" viewBox="0 0 500 330" focusable="false">
      <path d="M105 80 C210 105 270 130 375 165" />
      <path d="M105 250 C220 225 290 200 375 165" />
      <path d="M235 55 C270 90 315 125 375 165" />
    </svg>
    <div className="organize-scene__module organize-scene__module--category"><Tag size={17} /><span>Work</span><small>Category</small></div>
    <div className="organize-scene__module organize-scene__module--project"><FolderKanban size={17} /><span>Orbit launch</span><small>Project</small></div>
    <div className="organize-scene__module organize-scene__module--calendar"><CalendarDays size={17} /><span>Thursday</span><small>Calendar</small></div>
    <div className="organize-scene__module organize-scene__module--priority"><Layers3 size={17} /><span>High priority</span><small>Focus layer</small></div>
  </div>
);

export default OrganizeScene;
