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
    <div
      className="od-app [--od-bg:#111827] [--od-sidebar:#0d1421] [--od-surface:#172131] [--od-line:#2a3546]
      [--od-muted:#9caec3] [--od-text:#eef2f6] [--od-blue:#456b8c] [--od-indigo:#6065b4] [--od-cyan:#22c5db]
      min-h-screen [background:var(--od-bg)] text-[var(--od-text)] text-[14px] [line-height:1.5]
      [&_button]:[-webkit-tap-highlight-color:transparent] [&_button]:cursor-pointer
      [&_a]:[-webkit-tap-highlight-color:transparent] [&_input]:[-webkit-tap-highlight-color:transparent]
      [&_input]:[color-scheme:dark] [&_select]:[-webkit-tap-highlight-color:transparent]
      [&_select]:[color-scheme:dark] [&_button:disabled]:cursor-default [&_button:disabled]:opacity-[0.5]
      [&_button:focus-visible]:[outline:2px_solid_var(--od-cyan)] [&_button:focus-visible]:outline-offset-[4px]
      [&_a:focus-visible]:[outline:2px_solid_var(--od-cyan)] [&_a:focus-visible]:outline-offset-[4px]
      [&_input:focus-visible]:[outline:2px_solid_var(--od-cyan)] [&_input:focus-visible]:outline-offset-[4px]
      [&_select:focus-visible]:[outline:2px_solid_var(--od-cyan)] [&_select:focus-visible]:outline-offset-[4px]
      [&_p]:m-[0] [&_h1]:m-[0] [&_h2]:m-[0] [&_h3]:m-[0]"
    >
      <a
        className="od-skip fixed top-[10px] left-[10px] z-50 p-[12px] [background:var(--od-cyan)] [transform:translateY(-200%)] [&:focus]:[transform:translateY(0)]"
        href="#od-main"
      >
        Skip to workspace
      </a>
      {navOpen && (
        <button
          className="od-backdrop [display:none] [@media(max-width:700px)]:block [@media(max-width:700px)]:fixed
            [@media(max-width:700px)]:inset-[0] [@media(max-width:700px)]:z-25
            [@media(max-width:700px)]:[background:#050b16b8] [@media(max-width:700px)]:[border:none]"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        className="od-sidebar fixed inset-[0_auto_0_0] [background:var(--od-sidebar)] [border-right:1px_solid_var(--od-line)]
          p-[28px_20px_16px] flex flex-col z-30 overflow-y-auto [&_nav]:grid [&_nav]:gap-[5px] [&_nav]:mt-[12px]
          [@media(max-width:1150px)]:px-[14px] [@media(max-width:700px)]:[transition:transform_0.2s]"
        data-open={navOpen}
        inert={isMobile && !navOpen}
      >
        <a
          className="od-brand flex items-center gap-[5px] [text-decoration:none] [letter-spacing:-1.1px] w-[fit-content] [&_svg]:w-[47px] [&_svg]:h-[42px]"
          href="/ui-demo"
        >
          <Orbit />
          <span>
            Orbit
            <span className="od-brand-period text-[var(--od-cyan)]">.</span>
          </span>
        </a>
        <button
          className="od-workspace flex gap-[10px] items-center w-full [background:#172131] [border:1px_solid_var(--od-line)]
          rounded-[6px] p-[11px_9px] m-[31px_0_28px] text-left [&_>_svg]:ml-auto [&_>_svg]:text-[var(--od-muted)]
          [&_small]:block [&_small]:text-[var(--od-muted)] [&_small]:text-[10px] [&_small]:mt-[2px]"
          onClick={() => setModal("brand")}
        >
          <span className="od-avatar w-[30px] h-[30px] grid place-items-center shrink-0">
            S
          </span>
          <span>
            Studio workspace<small>Personal workspace</small>
          </span>
          <ChevronRight size={14} />
        </button>
        <p className="od-nav-label text-[#879ab1] text-[10px] [letter-spacing:1.6px] p-[0_11px] [font-weight:600]">
          WORKSPACE
        </p>
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
              className="od-nav-item flex items-center gap-[12px] min-h-[43px] p-[0_12px] text-left [border:1px_solid_transparent]
                rounded-[5px] [background:transparent] w-full [&[aria-current=page]]:border-[#334e68] [&_>_span]:ml-auto
                [&_>_span]:text-[11px]"
              aria-current={view === name ? "page" : undefined}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              {name}
              {name === "Today" && <span>{tasks.length - completed}</span>}
            </button>
          ))}
        </nav>
        <div
          className="od-project-label flex items-center justify-between m-[31px_0_12px] [&_button]:grid
          [&_button]:place-items-center [&_button]:p-[5px] [&_button]:[background:none] [&_button]:[border:none]"
        >
          <p className="od-nav-label text-[#879ab1] text-[10px] [letter-spacing:1.6px] p-[0_11px] [font-weight:600]">
            YOUR PROJECTS
          </p>
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
            className="od-project-link [&:hover]:[background:#172131] flex items-center gap-[12px] w-full min-h-[36px] p-[0_12px] [border:none] rounded-[5px] [background:none] text-left"
            onClick={() => openProject(p.name)}
          >
            <i
              className={`od-dot inline-block rounded-[2px] shrink-0 od-dot--${p.color}`}
            />
            {p.name}
          </button>
        ))}
        <div className="od-sidebar-bottom mt-auto pt-[64px]">
          <div
            className="od-demo-note p-[17px_12px_20px] [border-top:1px_solid_var(--od-line)] [&_>_span]:text-[9px]
            [&_>_span]:[letter-spacing:1.4px] [&_>_span]:text-[#8496ac] [&_p]:text-[#cad5e1] [&_p]:text-[16px]
            [&_p]:[line-height:1.65] [&_p]:m-[13px_0] [&_p]:[letter-spacing:-0.3px] [&_button]:flex [&_button]:gap-[14px]
            [&_button]:items-center [&_button]:[background:none] [&_button]:[border:none] [&_button]:p-[0]"
          >
            <span>DESIGN PREVIEW / 01</span>
            <p>
              A little less noise.
              <br />A little more focus.
            </p>
            <button onClick={() => setModal("brand")}>
              Explore the brand <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="od-profile [&_small]:block [&_small]:text-[var(--od-muted)] [&_small]:text-[10px] [&_small]:mt-[2px] flex
            items-center gap-[11px] p-[16px_6px_0] text-left w-full [background:none] [&_>_svg]:ml-auto
            [&_>_svg]:text-[var(--od-muted)]"
            onClick={() => setModal("brand")}
          >
            <span className="od-avatar w-[30px] h-[30px] grid place-items-center shrink-0 od-avatar--profile text-[10px]">
              AL
            </span>
            <span>
              Alex Lee<small>Orbit UI demo</small>
            </span>
            <CircleHelp size={17} />
          </button>
        </div>
      </aside>
      <div className="od-workspace-shell" inert={isMobile && navOpen}>
        <header
          className="od-topbar h-[72px] flex justify-between items-center [border-bottom:1px_solid_var(--od-line)] [&_>_div]:flex
          [&_>_div]:items-center [&_>_div]:text-[12px] [&_>_div]:text-[var(--od-muted)] [&_strong]:[font-weight:500]
          [&_strong]:text-[#d4deeb] [@media(max-width:700px)]:h-[60px]"
        >
          <div>
            <button
              className="od-mobile-menu [display:none] [background:none] [border:none] [@media(max-width:700px)]:grid [@media(max-width:700px)]:place-items-center [@media(max-width:700px)]:p-[4px]"
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
            <span className="od-preview-label text-[9px] [letter-spacing:1.4px] pr-[18px] [border-right:1px_solid_var(--od-line)] [@media(max-width:900px)]:[display:none]">
              LOCAL DEMO
            </span>
            <button
              className="od-brand-button flex items-center gap-[13px] [background:none] [border:none] p-[5px_0] [@media(max-width:700px)]:gap-[7px]"
              onClick={() => setModal("brand")}
            >
              Brand direction <ArrowRight size={14} />
            </button>
          </div>
        </header>
        <main id="od-main" className="od-main" tabIndex={-1}>
          <div
            className="od-heading flex justify-between items-center gap-[24px] [&_h1]:[font-weight:500] [&_h1]:[line-height:1.2]
            [&_>_div_>_p:last-child]:text-[var(--od-muted)] [@media(max-width:900px)]:items-start
            [@media(max-width:700px)]:flex-col [@media(max-width:700px)]:gap-[15px]"
          >
            <div>
              <p className="od-eyebrow [font:10px/1.5_var(--font-mono)] text-[var(--od-muted)] [letter-spacing:1.5px] [@media(max-width:700px)]:text-[9px]">
                SATURDAY, OCTOBER 03, 2026
              </p>
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
            <button
              className="od-primary inline-flex gap-[9px] items-center justify-center p-[10px_16px] [background:var(--od-cyan)]
              [border:1px_solid_var(--od-cyan)] rounded-[5px] whitespace-nowrap [&:hover]:[background:#63d9e9]
              [&:hover]:border-[#63d9e9] [@media(max-width:900px)]:mt-[5px]"
              onClick={() => setModal("task")}
            >
              <Plus size={17} />
              Add task
            </button>
          </div>
          {view === "Today" && (
            <>
              <section
                className="od-day-strip flex items-center p-[16px_21px] [border:1px_solid_var(--od-line)] rounded-[6px]
                [background:#172131] mb-[35px] [&_>_div:first-child]:flex [&_>_div:first-child]:items-center
                [&_>_div:first-child]:text-[#c9d6e3] [&_p]:ml-auto [&_p]:whitespace-nowrap [&_strong]:[font-weight:500]
                [&_p_>_span]:text-[var(--od-muted)] [@media(max-width:700px)]:p-[14px] [@media(max-width:700px)]:flex-wrap
                [@media(max-width:700px)]:mb-[28px]"
                aria-label="Daily progress"
              >
                <div>
                  <span className="od-live-dot w-[6px] h-[6px] rounded-[50%] [background:var(--od-cyan)]" />
                  Your day, in orbit
                </div>
                <p>
                  <strong>{completed.toString().padStart(2, "0")}</strong>
                  <span>
                    {" "}
                    / {tasks.length.toString().padStart(2, "0")} tasks complete
                  </span>
                </p>
                <div
                  className="od-day-progress w-[120px] h-[4px] [background:#2b384b] overflow-hidden rounded-[2px] [&_span]:h-full
                  [&_span]:[background:var(--od-cyan)] [&_span]:[transition:width_0.2s]
                  [@media(max-width:1150px)]:w-[60px]"
                >
                  <span
                    style={{ width: `${(completed / tasks.length) * 100}%` }}
                  />
                </div>
                <span className="od-progress-percent [font:11px_var(--font-mono)] text-[var(--od-muted)] [@media(max-width:700px)]:[display:none]">
                  {Math.round((completed / tasks.length) * 100)}%
                </span>
              </section>
              <div className="od-content-grid grid">
                <section className="od-task-section" aria-label="Task list">
                  <div
                    className="od-list-header flex items-center justify-between gap-[12px] mb-[21px] [&_h2]:text-[18px]
                    [&_h2]:[font-weight:500] [&_h2]:[letter-spacing:-0.4px] [&_h2_>_span]:text-[var(--od-muted)]
                    [&_h2_>_span]:text-[12px] [&_h2_>_span]:ml-[9px] [&_p]:text-[var(--od-muted)] [&_p]:text-[11px] [&_p]:mt-[5px]"
                  >
                    <div>
                      <h2>
                        Today’s tasks <span>{tasks.length - completed}</span>
                      </h2>
                      <p>Small steps, steady progress.</p>
                    </div>
                    <button
                      className="od-filter flex items-center gap-[7px] p-[7px_10px] [background:transparent] [border:1px_solid_var(--od-line)]
                        rounded-[4px] [&[aria-pressed=true]]:border-[var(--od-blue)] [&[aria-pressed=true]]:[background:#22354b]"
                      aria-pressed={hideCompleted}
                      onClick={() => setHideCompleted((s) => !s)}
                    >
                      <ListFilter size={15} />
                      {hideCompleted ? "Show all" : "Hide done"}
                    </button>
                  </div>
                  <div className="od-tools flex gap-[12px] mb-[25px] [&_select]:[background:#111827] [&_select]:[border:none] [@media(max-width:700px)]:gap-[8px]">
                    <label className="od-search flex items-center gap-[9px] text-[#8496ac] min-w-[0] flex-1 [&_input]:w-full [&_input]:min-w-[0] [&_input]:[background:none] [&_input]:[border:none] [&_input]:p-[8px_0]">
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
                          <div
                            className="od-task-group mb-[24px] [&_>_h3]:flex [&_>_h3]:items-center [&_>_h3]:gap-[11px] [&_>_h3]:text-[10px]
                            [&_>_h3]:[font-weight:500] [&_>_h3]:uppercase [&_>_h3]:[letter-spacing:1.4px] [&_>_h3]:text-[#a3b3c7]
                            [&_>_h3]:[border-bottom:1px_solid_var(--od-line)] [&_>_h3]:p-[0_0_11px]
                            [&_h3_>_span]:[font:9px_var(--font-mono)] [&_h3_>_span]:text-[#a3b3c7] [&_h3_>_span]:[letter-spacing:0]"
                            key={group}
                          >
                            <h3>
                              {group}
                              <span>{items.length}</span>
                            </h3>
                            {items.map((t) => (
                              <div
                                className="od-task-row flex items-center gap-[12px] min-h-[77px] [border-bottom:1px_solid_#222d3e] p-[14px_0]
                                  [&[data-done=true]_.od-task-copy_>_span]:text-[#97a6b9]
                                  [&[data-done=true]_.od-task-copy_>_span]:[text-decoration:line-through] [&_>_time]:text-right
                                  [&_>_time]:text-[#a3b3c7] [@media(min-width:1500px)]:min-h-[86px] [@media(max-width:700px)]:gap-[10px]"
                                key={t.id}
                                data-done={t.done}
                              >
                                <button
                                  className="od-checkbox [border:1px_solid_#5a6c82] [background:none] rounded-[50%] w-[19px] h-[19px] grid place-items-center shrink-0 p-[0]"
                                  aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
                                  aria-pressed={t.done}
                                  onClick={() => toggleTask(t.id)}
                                >
                                  {t.done && <Check size={13} />}
                                </button>
                                <div
                                  className="od-task-copy min-w-[0] flex-1 [&_>_span]:block [&_>_span]:text-[#e0e7ef] [&_>_span]:wrap-anywhere
                                  [&_small]:flex [&_small]:items-center [&_small]:gap-[6px] [&_small]:mt-[6px] [&_small]:text-[#9caec3]"
                                >
                                  <span>{t.title}</span>
                                  <small>
                                    <i
                                      className={`od-dot inline-block rounded-[2px] shrink-0 od-dot--${projects.find((p) => p.name === t.project)?.color}`}
                                    />
                                    {t.project}
                                  </small>
                                </div>
                                {t.priority && !t.done && (
                                  <span
                                    className="od-priority text-[#e3b989] text-[15px] p-[0_2px]"
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
                    <div
                      className="od-empty text-center p-[50px_10px] text-[var(--od-muted)] [&_button]:[background:none]
                      [&_button]:[border:1px_solid_var(--od-line)] [&_button]:p-[8px_12px] [&_button]:mt-[18px]
                      [&_button]:rounded-[4px]"
                    >
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
                    className="od-inline-add flex gap-[12px] items-center p-[8px_0] [background:none] [border:none]"
                    onClick={() => setModal("task")}
                  >
                    <Plus size={16} />
                    Add a task to your day
                  </button>
                  <div className="od-list-footer flex items-center justify-between text-[#91a2b8] text-[10px] [border-top:1px_solid_var(--od-line)] mt-[25px] pt-[17px]">
                    <span>
                      Plan with intention. Leave room for the unexpected.
                    </span>
                    <ArrowDown size={14} />
                  </div>
                </section>
                <aside className="od-rail [@media(max-width:900px)]:grid [@media(max-width:900px)]:gap-[24px]">
                  <section
                    className="od-focus [border:1px_solid_#35465b] [background:#1a2739] rounded-[7px] p-[21px] [&_h2]:text-[16px]
                    [&_h2]:[font-weight:500] [&_h2]:[line-height:1.5] [&_h2]:[letter-spacing:-0.2px] [&_p]:text-[11px]
                    [&_p]:text-[#a9bdd1] [&_p]:[line-height:1.8]"
                  >
                    <div className="od-rail-kicker flex gap-[8px] items-center text-[9px] [letter-spacing:1.3px] text-[#a9bed2] [&_svg]:text-[#80accb]">
                      <Target size={15} />
                      ONE THING AT A TIME
                    </div>
                    <div
                      className="od-focus-orbit relative h-[177px] grid place-items-center [&_svg]:w-[210px] [&_svg]:max-w-full
                      [&_svg]:absolute [&_svg_ellipse]:fill-none [&_svg_ellipse]:stroke-[#6065b4] [&_svg_ellipse]:[stroke-width:1]
                      [&_svg_ellipse]:opacity-[0.65] [&_svg_circle]:fill-none [&_svg_circle]:stroke-[#456b8c]
                      [&_svg_circle]:[stroke-width:1] [&_svg_.od-orbit-point]:fill-[var(--od-cyan)]
                      [&_svg_.od-orbit-point]:stroke-[#1a2739] [&_svg_.od-orbit-point]:[stroke-width:3]
                      [&_>_span]:[font:36px_var(--font-mono)] [&_>_span]:text-[#eef4fb] [&_>_span]:[letter-spacing:-2px]
                      [&_>_span]:z-1 [&_small]:text-[#b0c3d7] [&_small]:text-[27px]
                      [@media(max-width:700px)]:h-[180px]"
                      aria-hidden="true"
                    >
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
                      className="od-focus-action flex items-center justify-between w-full min-h-[38px] p-[0_12px] [background:#456b8c] [border:1px_solid_#5b83a5] rounded-[4px] [&:hover]:[background:#527c9f]"
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
                      className="od-reset block m-[12px_auto_0] [background:none] [border:none] p-[4px]"
                      onClick={() => {
                        setFocusRunning(false);
                        setSeconds(1500);
                      }}
                    >
                      Reset · 25 minutes
                    </button>
                  </section>
                  <section
                    className="od-project-summary [&_>_div_button]:grid [&_>_div_button]:place-items-center [&_>_div_button]:p-[5px]
                    [&_>_div_button]:[background:none] [&_>_div_button]:[border:none] mt-[26px] [&_>_div]:flex
                    [&_>_div]:items-center [&_>_div]:justify-between [&_>_div]:mb-[6px] [&_h2]:text-[13px]
                    [&_h2]:[font-weight:500] [@media(max-width:700px)]:mt-[0]"
                  >
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
                        className="od-mini-project block w-full [background:none] p-[17px_0] text-left [&_>_span]:flex [&_>_span]:items-center
                          [&_>_span]:gap-[8px] [&_>_span]:text-[#c0cfe0] [&_>_span]:text-[11px] [&_small]:ml-auto
                          [&_small]:text-[#9caec3] [&_small]:[font:10px_var(--font-mono)]"
                        onClick={() => openProject(p.name)}
                      >
                        <span>
                          <i
                            className={`od-dot inline-block rounded-[2px] shrink-0 od-dot--${p.color}`}
                          />
                          {p.name}
                          <small>{p.progress}%</small>
                        </span>
                        <div
                          className={`od-project-track h-[3px] w-full [background:#293447] [&_i]:h-full [&_i]:block [&_i]:[background:#456b8c] od-project-track--${p.color}`}
                        >
                          <i style={{ width: `${p.progress}%` }} />
                        </div>
                      </button>
                    ))}
                  </section>
                  <p className="od-rail-note text-[#9caec3] text-center text-[11px] [@media(max-width:900px)]:[display:none]">
                    Less juggling. More doing.
                  </p>
                </aside>
              </div>
            </>
          )}
          {view === "Projects" && (
            <section
              className="od-projects-view grid grid-cols-[repeat(3,minmax(0,1fr))] gap-[20px] [@media(max-width:1150px)]:grid-cols-[1fr]"
              aria-label="Projects"
            >
              {projects.map((p, i) => (
                <button
                  key={p.name}
                  className="od-project-tile [background:var(--od-surface)] [border:1px_solid_var(--od-line)] rounded-[7px] p-[25px]
                    text-left [&:hover]:border-[#6481a0] [&_h2]:text-[20px] [&_h2]:[font-weight:500] [&_p]:text-[var(--od-muted)]
                    [&_p]:text-[12px] [&_p]:min-h-[40px] [&_footer]:flex [&_footer]:justify-between [&_footer]:gap-[12px]
                    [&_footer]:text-[10px] [&_footer]:text-[#b3c2d4] [&_footer]:mt-[17px] [&_footer_>_span:last-child]:flex
                    [&_footer_>_span:last-child]:items-center [&_footer_>_span:last-child]:gap-[8px]"
                  onClick={() => openProject(p.name)}
                >
                  <span className="od-tile-index flex justify-between text-[#9caec3] [font:12px_var(--font-mono)] mb-[45px]">
                    0{i + 1}
                    <Folder size={21} />
                  </span>
                  <i
                    className={`od-dot inline-block rounded-[2px] shrink-0 od-dot--${p.color}`}
                  />
                  <h2>{p.name}</h2>
                  <p>{p.note}</p>
                  <div
                    className={`od-project-track h-[3px] w-full [background:#293447] [&_i]:h-full [&_i]:block [&_i]:[background:#456b8c] od-project-track--${p.color}`}
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
              <p className="od-view-note col-[1_/_-1] text-[var(--od-muted)] text-[12px] pt-[10px]">
                Project percentages are sample data. Select a project to explore
                its tasks.
              </p>
            </section>
          )}
          {view === "Calendar" && (
            <section className="od-calendar [border:1px_solid_var(--od-line)] rounded-[7px] overflow-hidden">
              <div
                className="od-calendar-heading flex justify-between items-center p-[22px] [background:var(--od-surface)] gap-[12px]
                [&_h2]:text-[18px] [&_h2]:[font-weight:500] [&_>_span]:text-[var(--od-muted)] [&_>_span]:text-[11px]
                [@media(max-width:700px)]:items-start [@media(max-width:700px)]:flex-col [@media(max-width:700px)]:p-[15px]"
              >
                <h2>October 2026</h2>
                <span>Select a day to see its agenda</span>
              </div>
              <div
                className="od-calendar-grid grid grid-cols-[repeat(7,minmax(0,1fr))] [&_>_button]:text-left
                [&_>_button[aria-pressed=true]]:[box-shadow:inset_0_0_0_1px_#456b8c] [&_small]:block [&_small]:text-[#b5c4dc]
                [@media(max-width:700px)]:[&_small]:wrap-anywhere"
              >
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                  <span
                    className="od-weekday p-[13px] text-[10px] text-[var(--od-muted)] [border-top:1px_solid_var(--od-line)] [@media(max-width:700px)]:p-[10px_6px]"
                    key={d}
                  >
                    {d}
                  </span>
                ))}
                {Array.from({ length: 3 }, (_, i) => (
                  <div
                    className="od-calendar-blank min-h-[99px] p-[12px] [background:none] text-left [font:12px_var(--font-mono)]
                    [@media(max-width:700px)]:min-h-[66px] [@media(max-width:700px)]:p-[7px] [@media(max-width:700px)]:text-[11px]"
                    key={`blank${i}`}
                  />
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
              <div
                className="od-agenda [border-top:1px_solid_var(--od-line)] [&_h3]:text-[16px] [&_h3]:[font-weight:500] [&_p]:flex
                [&_p]:text-[#bacbdf] [&_p]:text-[12px] [&_time]:min-w-[60px] [&_time]:[font-family:var(--font-mono)]"
              >
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
          <footer
            className="od-page-footer flex justify-between flex-wrap gap-[10px] mt-[48px] pt-[19px]
            [border-top:1px_solid_var(--od-line)] text-[#91a2b8] text-[9px] [&_>_span:first-child]:[letter-spacing:1.2px]
            [@media(max-width:700px)]:mt-[30px]"
          >
            <span>ORBIT / A SPACE FOR WHAT MATTERS</span>
            <span>Interactive preview · Changes reset on refresh</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialogRef}
        className="od-dialog [background:var(--od-bg)] text-[var(--od-text)] w-[min(540px,calc(100%_-_32px))]
          max-h-[calc(100dvh_-_40px)] [border:1px_solid_#456b8c] rounded-[10px] p-[26px]
          [&::backdrop]:[background:#050b16b8] [&_h2]:text-[26px] [&_h2]:[font-weight:500]
          [&_h2]:[letter-spacing:-0.6px] [&_h2]:mb-[18px] [&_form_label]:grid [&_form_label]:gap-[8px]
          [&_form_label]:m-[18px_0] [&_form_label]:text-[#b6c7da] [&_form_label]:text-[12px] [&_input]:w-full
          [&_input]:p-[12px] [&_input]:[border:1px_solid_#3a4b61] [&_input]:rounded-[5px] [&_input]:[background:#172131]
          [&_select]:w-full [&_select]:p-[12px] [&_select]:[border:1px_solid_#3a4b61] [&_select]:rounded-[5px]
          [&_select]:[background:#172131] [&_form_p]:text-[11px] [&_form_p]:text-[var(--od-muted)] [&_form_p]:m-[20px_0]"
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === dialogRef.current) setModal(null);
        }}
      >
        <div
          className="od-dialog-heading [&_button]:grid [&_button]:place-items-center [&_button]:p-[5px]
          [&_button]:[background:none] [&_button]:[border:none] flex justify-between items-center text-[var(--od-muted)]
          text-[12px] mb-[25px]"
        >
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
            <button
              className="od-primary inline-flex gap-[9px] items-center justify-center p-[10px_16px] [background:var(--od-cyan)]
              [border:1px_solid_var(--od-cyan)] rounded-[5px] whitespace-nowrap [&:hover]:[background:#63d9e9]
              [&:hover]:border-[#63d9e9] [@media(max-width:900px)]:mt-[5px]"
              type="submit"
            >
              <Plus size={16} />
              Add task
            </button>
          </form>
        ) : (
          <div
            className="od-brand-detail [&_>_svg]:w-[100px] [&_>_svg]:h-[85px] [&_>_svg]:mb-[15px] [&_>_p]:text-[#b6c7da]
            [&_>_p]:text-[13px] [&_>_p]:[line-height:1.9] [&_a]:inline-flex [&_a]:gap-[10px] [&_a]:items-center
            [&_a]:mt-[20px]"
          >
            <Orbit />
            <h2>Grounded in the logo.</h2>
            <p>
              Steel blue anchors the identity. Indigo connects projects. Cyan
              signals action. Midnight gives everything room to stand out.
            </p>
            <div
              className="od-swatches grid grid-cols-[repeat(4,1fr)] gap-[12px] m-[24px_0] [&_i]:block [&_i]:h-[60px]
              [&_i]:rounded-[4px] [&_i]:[border:1px_solid_#4b5b73] [&_i]:mb-[10px] [&_strong]:block [&_code]:block
              [&_code]:mt-[4px] [&_code]:text-[var(--od-muted)] [@media(max-width:700px)]:gap-[8px]"
            >
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
