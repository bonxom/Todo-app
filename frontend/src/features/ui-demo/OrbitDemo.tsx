import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Command,
  Folder,
  LayoutGrid,
  ListFilter,
  Menu,
  Plus,
  Search,
  Target,
  X,
} from "lucide-react";
import Orbit from "@/assets/Orbit";
import "./orbit-demo.css";

type View = "Today" | "Projects" | "Calendar";
type Task = {
  id: number;
  title: string;
  project: string;
  time: string;
  group: string;
  done: boolean;
  priority?: boolean;
};
const projects = [
  {
    name: "Website refresh",
    color: "indigo",
    note: "A clearer home for the product",
    deadline: "Oct 09",
    progress: 64,
  },
  {
    name: "Product launch",
    color: "blue",
    note: "Make the first impression count",
    deadline: "Oct 16",
    progress: 38,
  },
  {
    name: "Personal",
    color: "cyan",
    note: "Room for everything else",
    deadline: "Ongoing",
    progress: 75,
  },
];
const initialTasks: Task[] = [
  {
    id: 1,
    title: "Review the homepage wireframes",
    project: "Website refresh",
    time: "09:30",
    group: "Morning",
    done: false,
    priority: true,
  },
  {
    id: 2,
    title: "Write the launch announcement",
    project: "Product launch",
    time: "11:00",
    group: "Morning",
    done: false,
  },
  {
    id: 3,
    title: "Collect references for the visual direction",
    project: "Website refresh",
    time: "10:00",
    group: "Morning",
    done: true,
  },
  {
    id: 4,
    title: "Refine the onboarding flow",
    project: "Website refresh",
    time: "14:00",
    group: "Afternoon",
    done: false,
    priority: true,
  },
  {
    id: 5,
    title: "Plan next week’s priorities",
    project: "Personal",
    time: "16:30",
    group: "Afternoon",
    done: false,
  },
  {
    id: 6,
    title: "Read a chapter of Creative Selection",
    project: "Personal",
    time: "Anytime",
    group: "Whenever you have room",
    done: false,
  },
];
const palette = [
  ["Steel blue", "#456B8C"],
  ["Orbit indigo", "#6065B4"],
  ["Signal cyan", "#22C5DB"],
  ["Midnight", "#111827"],
];

export default function OrbitDemo() {
  const [view, setView] = useState<View>("Today");
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("All projects");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [modal, setModal] = useState<"task" | "brand" | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 700);
  const sidebarRef = useRef<HTMLElement>(null);
  const [selectedDay, setSelectedDay] = useState(3);
  const [focusRunning, setFocusRunning] = useState(false);
  const [seconds, setSeconds] = useState(25 * 60);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const completed = tasks.filter((t) => t.done).length;
  const visibleTasks = tasks.filter(
    (t) =>
      t.title.toLowerCase().includes(query.toLowerCase()) &&
      (project === "All projects" || t.project === project) &&
      (!hideCompleted || !t.done),
  );
  const focusTask =
    tasks.find((t) => !t.done && t.priority) || tasks.find((t) => !t.done);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 700px)");
    const sync = () => {
      setIsMobile(media.matches);
      setNavOpen(false);
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (!navOpen || !isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      document.querySelector<HTMLButtonElement>(".od-mobile-menu")?.focus();
    };
  }, [navOpen, isMobile]);
  useEffect(() => {
    if (modal) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [modal]);
  useEffect(() => {
    if (!focusRunning) return;
    const interval = window.setInterval(
      () => setSeconds((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [focusRunning]);
  const navigate = (next: View) => {
    setView(next);
    setNavOpen(false);
  };
  const toggleTask = (id: number) =>
    setTasks((current) =>
      current.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    );
  const openProject = (name: string) => {
    setProject(name);
    navigate("Today");
  };

  return (
    <div className="od-app">
      <a className="od-skip" href="#od-main">
        Skip to workspace
      </a>
      {navOpen && (
        <button
          className="od-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className="od-sidebar"
        data-open={navOpen}
        inert={isMobile && !navOpen}
      >
        <a className="od-brand" href="/ui-demo">
          <Orbit />
          <span>
            Orbit<span className="od-brand-period">.</span>
          </span>
        </a>
        <button className="od-workspace" onClick={() => setModal("brand")}>
          <span className="od-avatar">S</span>
          <span>
            Studio workspace<small>Personal workspace</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <p className="od-nav-label">WORKSPACE</p>
        <nav aria-label="Demo navigation">
          {(
            [
              { name: "Today", icon: LayoutGrid },
              { name: "Projects", icon: Folder },
              { name: "Calendar", icon: CalendarDays },
            ] as const
          ).map(({ name, icon: Icon }) => (
            <button
              key={name}
              className="od-nav-item"
              aria-current={view === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              {name}
              {name === "Today" && <span>{tasks.length - completed}</span>}
            </button>
          ))}
        </nav>
        <div className="od-project-label">
          <p className="od-nav-label">YOUR PROJECTS</p>
          <button
            aria-label="View projects"
            onClick={() => navigate("Projects")}
          >
            <Plus size={14} />
          </button>
        </div>
        {projects.map((p) => (
          <button
            key={p.name}
            className="od-project-link"
            onClick={() => openProject(p.name)}
          >
            <i className={`od-dot od-dot--${p.color}`} />
            {p.name}
          </button>
        ))}
        <div className="od-sidebar-bottom">
          <div className="od-demo-note">
            <span>DESIGN PREVIEW / 01</span>
            <p>
              A little less noise.
              <br />A little more focus.
            </p>
            <button onClick={() => setModal("brand")}>
              Explore the brand <ArrowRight size={14} />
            </button>
          </div>
          <button className="od-profile" onClick={() => setModal("brand")}>
            <span className="od-avatar od-avatar--profile">AL</span>
            <span>
              Alex Lee<small>Orbit UI demo</small>
            </span>
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="od-workspace-shell" inert={isMobile && navOpen}>
        <header className="od-topbar">
          <div>
            <button
              className="od-mobile-menu"
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div>
            <span className="od-preview-label">LOCAL DEMO</span>
            <button
              className="od-brand-button"
              onClick={() => setModal("brand")}
            >
              Brand direction <ArrowRight size={14} />
            </button>
          </div>
        </header>
        <main id="od-main" className="od-main" tabIndex={-1}>
          <div className="od-heading">
            <div>
              <p className="od-eyebrow">SATURDAY, OCTOBER 03, 2026</p>
              <h1>
                {view === "Today"
                  ? "Make room for good work."
                  : view === "Projects"
                    ? "Keep the bigger picture."
                    : "Give your work a little space."}
              </h1>
              <p>
                {view === "Today"
                  ? "A clear view of today. One thing at a time."
                  : view === "Projects"
                    ? "Three projects. A few meaningful next steps."
                    : "Your plans, with enough room to breathe."}
              </p>
            </div>
            <button className="od-primary" onClick={() => setModal("task")}>
              <Plus size={17} />
              Add task
            </button>
          </div>
          {view === "Today" && (
            <>
              <section className="od-day-strip" aria-label="Daily progress">
                <div>
                  <span className="od-live-dot" />
                  Your day, in orbit
                </div>
                <p>
                  <strong>{completed.toString().padStart(2, "0")}</strong>
                  <span>
                    {" "}
                    / {tasks.length.toString().padStart(2, "0")} tasks complete
                  </span>
                </p>
                <div className="od-day-progress">
                  <span
                    style={{ width: `${(completed / tasks.length) * 100}%` }}
                  />
                </div>
                <span className="od-progress-percent">
                  {Math.round((completed / tasks.length) * 100)}%
                </span>
              </section>
              <div className="od-content-grid">
                <section className="od-task-section" aria-label="Task list">
                  <div className="od-list-header">
                    <div>
                      <h2>
                        Today’s tasks <span>{tasks.length - completed}</span>
                      </h2>
                      <p>Small steps, steady progress.</p>
                    </div>
                    <button
                      className="od-filter"
                      aria-pressed={hideCompleted}
                      onClick={() => setHideCompleted((s) => !s)}
                    >
                      <ListFilter size={15} />
                      {hideCompleted ? "Show all" : "Hide done"}
                    </button>
                  </div>
                  <div className="od-tools">
                    <label className="od-search">
                      <Search size={16} />
                      <input
                        aria-label="Search tasks"
                        placeholder="Find a task…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <Command size={13} />
                    </label>
                    <select
                      aria-label="Filter by project"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                    >
                      <option>All projects</option>
                      {projects.map((p) => (
                        <option key={p.name}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  {["Morning", "Afternoon", "Whenever you have room"].map(
                    (group) => {
                      const items = visibleTasks.filter(
                        (t) => t.group === group,
                      );
                      return (
                        items.length > 0 && (
                          <div className="od-task-group" key={group}>
                            <h3>
                              {group}
                              <span>{items.length}</span>
                            </h3>
                            {items.map((t) => (
                              <div
                                className="od-task-row"
                                key={t.id}
                                data-done={t.done}
                              >
                                <button
                                  className="od-checkbox"
                                  aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
                                  aria-pressed={t.done}
                                  onClick={() => toggleTask(t.id)}
                                >
                                  {t.done && <Check size={13} />}
                                </button>
                                <div className="od-task-copy">
                                  <span>{t.title}</span>
                                  <small>
                                    <i
                                      className={`od-dot od-dot--${projects.find((p) => p.name === t.project)?.color}`}
                                    />
                                    {t.project}
                                  </small>
                                </div>
                                {t.priority && !t.done && (
                                  <span
                                    className="od-priority"
                                    title="High priority"
                                    aria-label="High priority"
                                  >
                                    ↑
                                  </span>
                                )}
                                <time>{t.time}</time>
                              </div>
                            ))}
                          </div>
                        )
                      );
                    },
                  )}
                  {visibleTasks.length === 0 && (
                    <div className="od-empty">
                      <Search size={24} />
                      <h3>No tasks in this view.</h3>
                      <p>Try another search or project filter.</p>
                      <button
                        onClick={() => {
                          setQuery("");
                          setProject("All projects");
                          setHideCompleted(false);
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                  <button
                    className="od-inline-add"
                    onClick={() => setModal("task")}
                  >
                    <Plus size={16} />
                    Add a task to your day
                  </button>
                  <div className="od-list-footer">
                    <span>
                      Plan with intention. Leave room for the unexpected.
                    </span>
                    <ArrowDown size={14} />
                  </div>
                </section>
                <aside className="od-rail">
                  <section className="od-focus">
                    <div className="od-rail-kicker">
                      <Target size={15} />
                      ONE THING AT A TIME
                    </div>
                    <div className="od-focus-orbit" aria-hidden="true">
                      <svg viewBox="0 0 200 170">
                        <ellipse
                          cx="100"
                          cy="85"
                          rx="85"
                          ry="38"
                          transform="rotate(-25 100 85)"
                        />
                        <circle cx="100" cy="85" r="53" />
                        <circle
                          className="od-orbit-point"
                          cx="147"
                          cy="59"
                          r="5"
                        />
                      </svg>
                      <span>
                        {Math.floor(seconds / 60)
                          .toString()
                          .padStart(2, "0")}
                        <small>
                          :{(seconds % 60).toString().padStart(2, "0")}
                        </small>
                      </span>
                    </div>
                    <h2>{focusTask?.title || "Everything is done."}</h2>
                    <p>
                      {focusTask
                        ? "One focused session. A meaningful step forward."
                        : "Take a break. You’ve earned it."}
                    </p>
                    <button
                      className="od-focus-action"
                      disabled={!focusTask || seconds === 0}
                      onClick={() => setFocusRunning((r) => !r)}
                    >
                      {seconds === 0
                        ? "Session complete"
                        : focusRunning
                          ? "Pause session"
                          : "Start focus session"}
                      <ArrowRight size={15} />
                    </button>
                    <button
                      className="od-reset"
                      onClick={() => {
                        setFocusRunning(false);
                        setSeconds(1500);
                      }}
                    >
                      Reset · 25 minutes
                    </button>
                  </section>
                  <section className="od-project-summary">
                    <div>
                      <h2>In motion</h2>
                      <button
                        aria-label="See all projects"
                        onClick={() => navigate("Projects")}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </div>
                    {projects.slice(0, 2).map((p) => (
                      <button
                        key={p.name}
                        className="od-mini-project"
                        onClick={() => openProject(p.name)}
                      >
                        <span>
                          <i className={`od-dot od-dot--${p.color}`} />
                          {p.name}
                          <small>{p.progress}%</small>
                        </span>
                        <div
                          className={`od-project-track od-project-track--${p.color}`}
                        >
                          <i style={{ width: `${p.progress}%` }} />
                        </div>
                      </button>
                    ))}
                  </section>
                  <p className="od-rail-note">Less juggling. More doing.</p>
                </aside>
              </div>
            </>
          )}
          {view === "Projects" && (
            <section className="od-projects-view" aria-label="Projects">
              {projects.map((p, i) => (
                <button
                  key={p.name}
                  className="od-project-tile"
                  onClick={() => openProject(p.name)}
                >
                  <span className="od-tile-index">
                    0{i + 1}
                    <Folder size={21} />
                  </span>
                  <i className={`od-dot od-dot--${p.color}`} />
                  <h2>{p.name}</h2>
                  <p>{p.note}</p>
                  <div
                    className={`od-project-track od-project-track--${p.color}`}
                  >
                    <i style={{ width: `${p.progress}%` }} />
                  </div>
                  <footer>
                    <span>{p.progress}% complete</span>
                    <span>
                      {p.deadline}
                      <ArrowRight size={15} />
                    </span>
                  </footer>
                </button>
              ))}
              <p className="od-view-note">
                Project percentages are sample data. Select a project to explore
                its tasks.
              </p>
            </section>
          )}
          {view === "Calendar" && (
            <section className="od-calendar">
              <div className="od-calendar-heading">
                <h2>October 2026</h2>
                <span>Select a day to see its agenda</span>
              </div>
              <div className="od-calendar-grid">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span className="od-weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <div className="od-calendar-blank" key={`blank${i}`} />
                ))}
                {Array.from({ length: 31 }, (_, i) => (
                  <button
                    key={i}
                    aria-label={`October ${i + 1}`}
                    aria-pressed={selectedDay === i + 1}
                    onClick={() => setSelectedDay(i + 1)}
                  >
                    {i + 1}
                    {i === 2 && <small>{tasks.length} tasks</small>}
                    {i === 8 && <small>Website refresh</small>}
                    {i === 15 && <small>Product launch</small>}
                  </button>
                ))}
              </div>
              <div className="od-agenda">
                <h3>October {selectedDay}</h3>
                {selectedDay === 3 ? (
                  tasks.map((t) => (
                    <p key={t.id}>
                      <time>{t.time}</time>
                      <span>{t.title}</span>
                      {t.done && <Check size={15} />}
                    </p>
                  ))
                ) : (
                  <p>
                    {selectedDay === 9
                      ? "Website refresh · project deadline"
                      : selectedDay === 16
                        ? "Product launch · project deadline"
                        : "Nothing planned. A little breathing room."}
                  </p>
                )}
              </div>
            </section>
          )}
          <footer className="od-page-footer">
            <span>ORBIT / A SPACE FOR WHAT MATTERS</span>
            <span>Interactive preview · Changes reset on refresh</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="od-dialog"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setModal(null);
        }}
      >
        <div className="od-dialog-heading">
          <span>
            {modal === "task" ? "A new next step" : "The Orbit palette"}
          </span>
          <button aria-label="Close dialog" onClick={() => setModal(null)}>
            <X size={20} />
          </button>
        </div>
        {modal === "task" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const title = String(form.get("title")).trim();
              if (!title) {
                titleRef.current?.focus();
                return;
              }
              setTasks((t) => [
                ...t,
                {
                  id: Date.now(),
                  title,
                  project: String(form.get("project")),
                  time: "Anytime",
                  group: "Whenever you have room",
                  done: false,
                },
              ]);
              setQuery("");
              setProject("All projects");
              navigate("Today");
              setModal(null);
              e.currentTarget.reset();
            }}
          >
            <h2>What needs doing?</h2>
            <label>
              Task name
              <input
                ref={titleRef}
                autoFocus
                name="title"
                required
                maxLength={160}
                placeholder="A small, concrete next step"
              />
            </label>
            <label>
              Project
              <select
                name="project"
                defaultValue={
                  project === "All projects" ? projects[0].name : project
                }
              >
                {projects.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </label>
            <p>Added to today’s demo. Stored in memory for this preview.</p>
            <button className="od-primary" type="submit">
              <Plus size={16} />
              Add task
            </button>
          </form>
        ) : (
          <div className="od-brand-detail">
            <Orbit />
            <h2>Grounded in the logo.</h2>
            <p>
              Steel blue anchors the identity. Indigo connects projects. Cyan
              signals action. Midnight gives everything room to stand out.
            </p>
            <div className="od-swatches">
              {palette.map(([name, hex]) => (
                <div key={hex}>
                  <i style={{ background: hex }} />
                  <strong>{name}</strong>
                  <code>{hex}</code>
                </div>
              ))}
            </div>
            <p>
              The logo’s cyan glow is an accent, reserved for the mark. Task
              rows use quiet dividers, with a single orbit motif in the focus
              panel.
            </p>
            <a href="/logo.png" target="_blank" rel="noreferrer">
              View source logo <ArrowLeft size={14} />
            </a>
          </div>
        )}
      </dialog>
    </div>
  );
}
