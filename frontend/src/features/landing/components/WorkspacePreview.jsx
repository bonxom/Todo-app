import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Folder,
  Plus,
  Sun,
  X,
} from "lucide-react";
import Brand from "./Brand";

const initialTasks = [
  {
    id: 1,
    title: "Make something worth sharing",
    category: "Website launch",
    time: "09:00",
    done: true,
  },
  {
    id: 2,
    title: "Give the homepage a little love",
    category: "Website launch",
    time: "10:30",
    done: false,
  },
  {
    id: 3,
    title: "Take a walk. Find a new idea.",
    category: "Personal",
    time: "12:00",
    done: false,
  },
  {
    id: 4,
    title: "Put the finishing touches on the pitch",
    category: "Brand refresh",
    time: "14:00",
    done: false,
  },
];

export default function WorkspacePreview() {
  const [view, setView] = useState("Today");
  const [tasks, setTasks] = useState(initialTasks);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("All tasks");
  const completed = tasks.filter((task) => task.done).length;
  const filteredTasks = tasks.filter(
    (task) => filter !== "To do" || !task.done,
  );
  function addTask(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    setTasks([
      ...tasks,
      {
        id: Date.now(),
        title: draft.trim(),
        category: "Personal",
        time: "Anytime",
        done: false,
      },
    ]);
    setDraft("");
    setAdding(false);
  }
  return (
    <div className="workspace-stage" id="preview">
      <div className="preview-caption" data-reveal="left">
        <span>
          <span className="live-dot" /> A LITTLE LESS CHAOS. A LOT MORE CLARITY.
        </span>
        <span>
          YOUR WORKSPACE, IN ORBIT <ArrowDown />
        </span>
      </div>
      <div className="workspace-window">
        <div className="window-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>One space for everything on your mind</span>
          <span className="demo-pill">Interactive demo</span>
        </div>
        <div className="workspace-layout">
          <aside className="demo-sidebar" data-reveal="left">
            <Brand />
            <div className="workspace-name">
              <span className="workspace-avatar">S</span> My workspace{" "}
              <ChevronDown size={13} />
            </div>
            <span className="sidebar-label">WORKSPACE</span>
            <nav aria-label="Demo workspace views">
              {[
                ["Today", Sun],
                ["Projects", Folder],
                ["Calendar", CalendarDays],
              ].map(([name, _Icon]) => (
                <button
                  key={name}
                  className={view === name ? "active" : ""}
                  onClick={() => setView(name)}
                  aria-pressed={view === name}
                >
                  <_Icon size={16} />
                  {name}
                  {name === "Today" && (
                    <small>{tasks.length - completed}</small>
                  )}
                </button>
              ))}
            </nav>
            <span className="sidebar-label project-label">MY PROJECTS</span>
            <div className="sidebar-project">
              <i />
              Website launch
            </div>
            <div className="sidebar-project">
              <i />
              Brand refresh
            </div>
            <div className="sidebar-project">
              <i />
              Personal
            </div>
            <div className="sidebar-bottom">
              <span className="user-avatar">S</span>
              <div>
                Sam’s space<small>A little more focused.</small>
              </div>
              <span className="online-dot" />
            </div>
          </aside>
          <div
            className="demo-main"
            data-reveal="right"
            style={{ "--reveal-delay": "120ms" }}
          >
            <div className="demo-breadcrumb">
              My workspace <span>/</span> <strong>{view}</strong>
              <span className="sample-date">Wednesday, October 7</span>
            </div>
            <div className="demo-heading">
              <div>
                <p>A FRESH START, EVERY DAY</p>
                <h2>
                  {view === "Today"
                    ? "Make room for good work."
                    : view === "Projects"
                      ? "The bigger picture."
                      : "A little space to plan."}
                  <span className="heading-sun">✳</span>
                </h2>
                <span>
                  {view === "Today"
                    ? "A clear head starts with a clear plan. You’ve got this."
                    : view === "Projects"
                      ? "A home for every idea, from first step to finish line."
                      : "Your week, with room for work and everything else."}
                </span>
              </div>
              <button
                className="demo-add"
                onClick={() => {
                  setView("Today");
                  setAdding(true);
                }}
              >
                <Plus size={15} /> Add task
              </button>
            </div>
            {view === "Today" && (
              <>
                <div className="demo-stats">
                  <div>
                    <span>
                      <Sun size={15} /> On your list
                    </span>
                    <strong>
                      {String(tasks.length).padStart(2, "0")}
                      <small>things worth doing</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <CircleCheck size={15} /> Done & dusted
                    </span>
                    <strong>
                      {String(completed).padStart(2, "0")}
                      <small>small wins count</small>
                    </strong>
                  </div>
                  <div className="progress-stat">
                    <span>
                      Your daily momentum{" "}
                      <span>
                        {Math.round((completed / tasks.length) * 100)}%
                      </span>
                    </span>
                    <div className="demo-progress">
                      <i
                        style={{
                          width: `${(completed / tasks.length) * 100}%`,
                        }}
                      />
                    </div>
                    <small>
                      {completed === tasks.length
                        ? "Everything done. Enjoy a little breathing room."
                        : "One thing at a time. You’re moving forward."}
                    </small>
                  </div>
                </div>
                <div className="task-list-header">
                  <h3>
                    Your focus today <span>{tasks.length - completed}</span>
                  </h3>
                  <div className="task-filters" aria-label="Filter demo tasks">
                    {["All tasks", "To do"].map((name) => (
                      <button
                        key={name}
                        aria-pressed={filter === name}
                        className={filter === name ? "selected" : ""}
                        onClick={() => setFilter(name)}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="demo-tasks">
                  {filteredTasks.map((task) => (
                    <div
                      className={`demo-task ${task.done ? "is-done" : ""}`}
                      key={task.id}
                    >
                      <button
                        className="task-checkbox"
                        aria-label={`${task.done ? "Mark incomplete" : "Complete"}: ${task.title}`}
                        aria-pressed={task.done}
                        onClick={() =>
                          setTasks(
                            tasks.map((item) =>
                              item.id === task.id
                                ? { ...item, done: !item.done }
                                : item,
                            ),
                          )
                        }
                      >
                        {task.done && <Check size={12} />}
                      </button>
                      <span className="task-title">{task.title}</span>
                      <span
                        className={`task-category ${task.category === "Personal" ? "personal" : task.category === "Brand refresh" ? "brand" : ""}`}
                      >
                        {task.category}
                      </span>
                      <span className="task-time">{task.time}</span>
                    </div>
                  ))}
                </div>
                {adding ? (
                  <form className="demo-task-form" onSubmit={addTask}>
                    <input
                      autoFocus
                      aria-label="New demo task"
                      placeholder="What’s on your mind?"
                      value={draft}
                      maxLength={100}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit" disabled={!draft.trim()}>
                      Add task <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label="Cancel new task"
                      onClick={() => setAdding(false)}
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <button
                    className="add-another"
                    onClick={() => setAdding(true)}
                  >
                    <Plus size={15} /> A new idea? Give it a place.
                  </button>
                )}
              </>
            )}
            {view === "Projects" && (
              <div className="demo-projects">
                {[
                  [
                    "Website launch",
                    "A thoughtful home for our next big thing.",
                    "blue",
                    65,
                  ],
                  [
                    "Brand refresh",
                    "Same big idea. A fresh perspective.",
                    "purple",
                    40,
                  ],
                  [
                    "Personal",
                    "Make time for life outside the list.",
                    "green",
                    25,
                  ],
                ].map(([name, description, color, progress]) => (
                  <article key={name} className={`demo-project ${color}`}>
                    <Folder size={22} />
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <div className="project-progress">
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span>
                      {progress}% complete <ArrowUpRight size={15} />
                    </span>
                  </article>
                ))}
              </div>
            )}
            {view === "Calendar" && (
              <div className="demo-calendar">
                <div className="calendar-title">
                  <strong>October 2026</strong>
                  <span>YOUR SAMPLE WEEK</span>
                </div>
                <div className="calendar-week">
                  {["MON", "TUE", "WED", "THU", "FRI"].map((day, index) => (
                    <div key={day} className={index === 2 ? "current-day" : ""}>
                      <span>{day}</span>
                      <strong>{index + 5}</strong>
                      {index === 2 && (
                        <>
                          <p>
                            Homepage polish<small>10:30 – 11:30</small>
                          </p>
                          <p className="green-event">
                            A little fresh air<small>12:00 – 12:30</small>
                          </p>
                        </>
                      )}
                      {index === 3 && (
                        <p className="purple-event">
                          Brand exploration<small>09:00 – 10:00</small>
                        </p>
                      )}
                      {index === 4 && (
                        <p>
                          Weekly wrap-up<small>15:00 – 15:30</small>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="demo-footnote" role="status">
              <span>
                <span className="live-dot" />{" "}
                {view === "Today"
                  ? ` ${completed} of ${tasks.length} done. Try checking off your next task.`
                  : "Explore the demo. Your real workspace starts with you."}
              </span>
              <span>Demo only · nothing is saved</span>
            </div>
          </div>
        </div>
      </div>
      <div
        className="floating-note"
        data-reveal="right"
        style={{ "--reveal-delay": "220ms" }}
      >
        <span className="note-icon">
          <Check size={17} />
        </span>
        <div>
          Less mental tabs.<strong>More headspace.</strong>
        </div>
        <span className="note-sparkle">✧</span>
      </div>
    </div>
  );
}

function ArrowDown() {
  return <ArrowRight size={13} className="arrow-down" aria-hidden="true" />;
}
