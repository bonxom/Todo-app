import { CalendarDays, FolderKanban, Layers3, Tag } from 'lucide-react';

const OrganizeScene = () => (
  <div className="organize-scene" aria-hidden="true">
    <div className="organize-scene__module organize-scene__module--category"><Tag size={17} /><span>Work</span><small>Category</small></div>
    <div className="organize-scene__module organize-scene__module--project"><FolderKanban size={17} /><span>Orbit launch</span><small>Project</small></div>
    <div className="organize-scene__module organize-scene__module--calendar"><CalendarDays size={17} /><span>Thursday</span><small>Calendar</small></div>
    <div className="organize-scene__module organize-scene__module--priority"><Layers3 size={17} /><span>High priority</span><small>Priority</small></div>
  </div>
);

export default OrganizeScene;
