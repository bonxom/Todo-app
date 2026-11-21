import { useTranslation } from "react-i18next";
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
    titleKey: "makeSomethingWorthSharing",
    category: "Website launch",
    time: "09:00",
    done: true,
  },
  {
    id: 2,
    titleKey: "giveTheHomepageALittleLove",
    category: "Website launch",
    time: "10:30",
    done: false,
  },
  {
    id: 3,
    titleKey: "takeAWalkFindANewIdea",
    category: "Personal",
    time: "12:00",
    done: false,
  },
  {
    id: 4,
    titleKey: "putTheFinishingTouchesOnThePitch",
    category: "Brand refresh",
    time: "14:00",
    done: false,
  },
];

export default function WorkspacePreview() {
  const { t } = useTranslation("account");
  const viewKeys = {
    Today: "today",
    Projects: "projects",
    Calendar: "calendar",
    "All tasks": "allTasks",
    "To do": "toDo",
  };
  const taskTitle = (task) => (task.titleKey ? t(task.titleKey) : task.title);
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
    <div
      className="workspace-stage relative [background:var(--color-accent-soft)] [border:1px_solid_var(--color-line)]
      rounded-[16px] [box-shadow:0_20px_60px_-40px_var(--color-accent)]
      [@media(max-width:580px)]:rounded-[11px]"
      id="preview"
    >
      <div
        className="preview-caption flex items-center justify-between gap-[20px] mb-[17px] [letter-spacing:1.2px]
        [font-weight:600] text-[var(--color-accent)] [&_>_span]:items-center [&_>_span]:gap-[8px]
        [@media(max-width:580px)]:[letter-spacing:0.7px] [@media(max-width:580px)]:mb-[12px]
        [@media(max-width:580px)]:px-[4px]"
        data-reveal="left"
      >
        <span>
          <span className="live-dot inline-block shrink-0 rounded-[50%]" />{" "}
          {t("aLittleLessChaosALotMoreClarity")}
        </span>
        <span>
          {t("yourWorkspaceInOrbit")}
          <ArrowDown />
        </span>
      </div>
      <div className="workspace-window [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[10px] overflow-hidden [box-shadow:var(--shadow-xs)]">
        <div
          className="window-bar flex justify-between items-center p-[0_17px] h-[38px] [background:var(--color-surface-muted)]
          [border-bottom:1px_solid_var(--color-line)] text-[var(--color-text-muted)] text-[9px]
          [@media(max-width:580px)]:h-[30px] [@media(max-width:580px)]:px-[10px]
          [@media(max-width:580px)]:[&_>_span:not(.demo-pill)]:[display:none]"
        >
          <div className="window-dots flex gap-[5px] [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:[border:1px_solid_var(--color-text-muted)] [&_i]:opacity-[0.5] [&_i]:rounded-[50%]">
            <i />
            <i />
            <i />
          </div>
          <span>{t("oneSpaceForEverythingOnYourMind")}</span>
          <span className="demo-pill p-[3px_7px] [border:1px_solid_var(--color-line)] rounded-[4px] text-[8px]">
            {t("interactiveDemo")}
          </span>
        </div>
        <div className="workspace-layout grid [@media(max-width:580px)]:flex [@media(max-width:580px)]:flex-col">
          <aside
            className="demo-sidebar flex flex-col [background:var(--color-canvas)] [&_nav_button]:rounded-[6px]
            [&_nav_button]:text-left [&_nav_button]:[transition:background_0.2s,color_0.2s]
            [@media(max-width:580px)]:flex-row [@media(max-width:580px)]:[&_nav_button]:flex-1
            [@media(max-width:580px)]:[&_nav_button]:justify-center"
            data-reveal="left"
          >
            <Brand />
            <div
              className="workspace-name flex items-center gap-[7px] mt-[25px] [border:1px_solid_var(--color-line)] rounded-[6px]
              p-[8px] text-[10px] [&_>_svg]:ml-auto [@media(max-width:800px)]:text-[8px] [@media(max-width:800px)]:gap-[4px]
              [@media(max-width:800px)]:p-[5px] [@media(max-width:580px)]:[display:none]"
            >
              <span className="workspace-avatar grid place-items-center w-[22px] h-[22px] rounded-[5px] text-[9px] [background:var(--color-accent-soft)] text-[var(--color-accent)]">
                S
              </span>{" "}
              {t("myWorkspace")} <ChevronDown size={13} />
            </div>
            <span className="sidebar-label text-[8px] [letter-spacing:1.2px] text-[var(--color-text-muted)] m-[25px_10px_9px] [@media(max-width:800px)]:text-[7px] [@media(max-width:580px)]:[display:none]">
              {t("workspace")}
            </span>
            <nav aria-label={t("demoWorkspaceViews")}>
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
                  {t(viewKeys[name])}
                  {name === "Today" && (
                    <small>{tasks.length - completed}</small>
                  )}
                </button>
              ))}
            </nav>
            <span
              className="sidebar-label text-[8px] [letter-spacing:1.2px] text-[var(--color-text-muted)] m-[25px_10px_9px]
              [@media(max-width:800px)]:text-[7px] [@media(max-width:580px)]:[display:none] project-label"
            >
              {t("myProjects")}
            </span>
            <div
              className="sidebar-project flex items-center gap-[10px] m-[9px_10px] text-[10px] text-[var(--color-text-muted)]
              [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:rounded-[2px] [&_i]:[background:var(--color-accent)]
              [&:nth-last-of-type(3)_i]:[background:#6065b4] [&:nth-last-of-type(2)_i]:[background:var(--color-success)]
              [@media(max-width:800px)]:text-[8px] [@media(max-width:580px)]:[display:none]"
            >
              <i />
              {t("websiteLaunch")}
            </div>
            <div
              className="sidebar-project flex items-center gap-[10px] m-[9px_10px] text-[10px] text-[var(--color-text-muted)]
              [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:rounded-[2px] [&_i]:[background:var(--color-accent)]
              [&:nth-last-of-type(3)_i]:[background:#6065b4] [&:nth-last-of-type(2)_i]:[background:var(--color-success)]
              [@media(max-width:800px)]:text-[8px] [@media(max-width:580px)]:[display:none]"
            >
              <i />
              {t("brandRefresh")}
            </div>
            <div
              className="sidebar-project flex items-center gap-[10px] m-[9px_10px] text-[10px] text-[var(--color-text-muted)]
              [&_i]:w-[6px] [&_i]:h-[6px] [&_i]:rounded-[2px] [&_i]:[background:var(--color-accent)]
              [&:nth-last-of-type(3)_i]:[background:#6065b4] [&:nth-last-of-type(2)_i]:[background:var(--color-success)]
              [@media(max-width:800px)]:text-[8px] [@media(max-width:580px)]:[display:none]"
            >
              <i />
              {t("personal")}
            </div>
            <div
              className="sidebar-bottom items-center gap-[8px] [border-top:1px_solid_var(--color-line)] pt-[16px] mt-auto text-[10px]
              [&_small]:mt-[3px] [&_small]:text-[8px] [&_small]:text-[var(--color-text-muted)]"
            >
              <span className="user-avatar grid place-items-center w-[27px] h-[27px] rounded-[50%] [background:var(--color-accent-soft)] text-[var(--color-accent)]">
                S
              </span>
              <div>
                {t("samsSpace")}
                <small>{t("aLittleMoreFocused")}</small>
              </div>
              <span className="online-dot w-[5px] h-[5px] rounded-[50%] [background:var(--color-success)] ml-auto" />
            </div>
          </aside>
          <div
            className="demo-main min-w-[0]"
            data-reveal="right"
            style={{ "--reveal-delay": "120ms" }}
          >
            <div
              className="demo-breadcrumb flex items-center gap-[10px] [border-bottom:1px_solid_var(--color-line)] p-[17px_0] text-[9px]
              text-[var(--color-text-muted)] [&_strong]:[font-weight:500] [&_strong]:text-[var(--color-text)]
              [@media(max-width:580px)]:text-[7px] [@media(max-width:580px)]:py-[12px]"
            >
              {t("myWorkspace")}
              <span>/</span> <strong>{t(viewKeys[view])}</strong>
              <span className="sample-date ml-auto">
                {t("wednesdayOctober7")}
              </span>
            </div>
            <div
              className="demo-heading flex items-center justify-between gap-[12px] [&_p]:text-[var(--color-text-muted)]
              [&_p]:m-[0_0_8px] [&_h2]:m-[0_0_8px] [&_h2]:[font-weight:550] [&_h2]:[line-height:1.2]
              [&_>_div_>_span]:text-[var(--color-text-muted)] [@media(max-width:800px)]:flex-wrap
              [@media(max-width:580px)]:gap-[11px]"
            >
              <div>
                <p>{t("aFreshStartEveryDay")}</p>
                <h2>
                  {view === "Today"
                    ? t("makeRoomForGoodWork")
                    : view === "Projects"
                      ? t("theBiggerPicture")
                      : t("aLittleSpaceToPlan")}
                  <span className="heading-sun align-middle text-[var(--color-accent)] ml-[10px] [@media(max-width:580px)]:ml-[5px]">
                    ✳
                  </span>
                </h2>
                <span>
                  {view === "Today"
                    ? t("aClearHeadStartsWithAClearPlanYouveGotThis")
                    : view === "Projects"
                      ? t("aHomeForEveryIdeaFromFirstStepToFinishLine")
                      : t("yourWeekWithRoomForWorkAndEverythingElse")}
                </span>
              </div>
              <button
                className="demo-add flex items-center shrink-0 gap-[5px] p-[10px_12px] [border:0] rounded-[6px]
                  [background:var(--color-primary,var(--color-accent))]
                  [&:hover]:[background:var(--color-primary-hover,var(--color-accent-strong))]
                  [@media(max-width:580px)]:p-[10px_12px]"
                onClick={() => {
                  setView("Today");
                  setAdding(true);
                }}
              >
                <Plus size={15} /> {t("addTask")}
              </button>
            </div>
            {view === "Today" && (
              <>
                <div
                  className="demo-stats grid grid-cols-[1fr_1fr_1.45fr] [&_>_div]:[border:1px_solid_var(--color-line)]
                  [&_>_div]:rounded-[8px] [&_>_div_>_span]:items-center [&_>_div_>_span]:text-[var(--color-text-muted)]
                  [&_svg]:text-[var(--color-accent)] [&_strong]:items-baseline [&_strong]:[line-height:1]
                  [&_strong]:[font-weight:500] [&_strong]:mt-[11px] [&_small]:text-[var(--color-text-muted)]
                  [&_small]:[font-weight:400] [&_.progress-stat]:[background:var(--color-success-soft)]
                  [@media(max-width:800px)]:[&_>_div_>_span_>_svg]:w-[11px] [@media(max-width:580px)]:grid-cols-[1fr_1fr_1.3fr]"
                >
                  <div>
                    <span>
                      <Sun size={15} /> {t("onYourList")}
                    </span>
                    <strong>
                      {String(tasks.length).padStart(2, "0")}
                      <small>{t("thingsWorthDoing")}</small>
                    </strong>
                  </div>
                  <div>
                    <span>
                      <CircleCheck size={15} /> {t("doneDusted")}
                    </span>
                    <strong>
                      {String(completed).padStart(2, "0")}
                      <small>{t("smallWinsCount")}</small>
                    </strong>
                  </div>
                  <div className="progress-stat [&_>_span]:justify-between [&_>_span_>_span]:text-[var(--color-success)] [@media(max-width:800px)]:[&_small]:[display:none]">
                    <span>
                      {t("yourDailyMomentum")}{" "}
                      <span>
                        {Math.round((completed / tasks.length) * 100)}%
                      </span>
                    </span>
                    <div
                      className="demo-progress h-[5px] rounded-[8px] [background:color-mix(in_srgb,var(--color-success)_15%,transparent)]
                      m-[18px_0_7px] overflow-hidden [&_i]:block [&_i]:h-full [&_i]:rounded-[inherit]
                      [&_i]:[background:var(--color-success)] [&_i]:[transition:width_0.5s_cubic-bezier(0.2,0.8,0.2,1)]
                      [@media(max-width:580px)]:mt-[16px]"
                    >
                      <i
                        style={{
                          width: `${(completed / tasks.length) * 100}%`,
                        }}
                      />
                    </div>
                    <small>
                      {completed === tasks.length
                        ? t("everythingDoneEnjoyALittleBreathingRoom")
                        : t("oneThingAtATimeYoureMovingForward")}
                    </small>
                  </div>
                </div>
                <div
                  className="task-list-header flex justify-between items-center [&_h3]:flex [&_h3]:items-center [&_h3]:gap-[8px]
                  [&_h3]:[font-weight:550] [&_h3_>_span]:grid [&_h3_>_span]:place-items-center [&_h3_>_span]:w-[19px]
                  [&_h3_>_span]:h-[19px] [&_h3_>_span]:[border:1px_solid_var(--color-line)] [&_h3_>_span]:rounded-[4px]
                  [&_h3_>_span]:text-[var(--color-text-muted)]"
                >
                  <h3>
                    {t("yourFocusToday")}
                    <span>{tasks.length - completed}</span>
                  </h3>
                  <div
                    className="task-filters flex gap-[4px] [&_button]:[border:0] [&_button]:rounded-[5px] [&_button]:[background:transparent] [&_button.selected]:[background:var(--color-accent-soft)]"
                    aria-label={t("filterDemoTasks")}
                  >
                    {["All tasks", "To do"].map((name) => (
                      <button
                        key={name}
                        aria-pressed={filter === name}
                        className={filter === name ? "selected" : ""}
                        onClick={() => setFilter(name)}
                      >
                        {t(viewKeys[name])}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="demo-tasks">
                  {filteredTasks.map((task) => (
                    <div
                      className={`demo-task flex items-center gap-[10px] min-h-[51px] [border-bottom:1px_solid_var(--color-line)] text-[11px] [transition:background_0.2s] [&:hover]:[background:var(--color-canvas)] [@media(max-width:580px)]:min-h-[51px] [@media(max-width:580px)]:gap-[8px] ${task.done ? "is-done [&_.task-checkbox_svg]:animate-[orbit-check_0.35s_ease-out] [&_.task-title]:[text-decoration:line-through] [&_.task-title]:text-[var(--color-text-muted)]" : ""}`}
                      key={task.id}
                    >
                      <button
                        className="task-checkbox relative w-[20px] h-[20px] shrink-0 grid place-items-center p-[0] rounded-[5px]
                          [transition:background_0.2s,border-color_0.2s] [&:before]:absolute [&:before]:inset-[-4px]
                          [@media(max-width:580px)]:w-[24px] [@media(max-width:580px)]:h-[24px]"
                        aria-label={t(
                          task.done ? "markTaskIncomplete" : "completeTask",
                          { title: taskTitle(task) },
                        )}
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
                      <span className="task-title flex-1 wrap-anywhere">
                        {taskTitle(task)}
                      </span>
                      <span
                        className={`task-category [background:var(--color-accent-soft)] text-[var(--color-accent)] rounded-[4px] p-[4px_7px] text-[8px] whitespace-nowrap [&.personal]:[background:var(--color-success-soft)] [&.personal]:text-[var(--color-success)] [&.brand]:[background:var(--color-surface-muted)] [&.brand]:text-[var(--color-accent)] [@media(max-width:800px)]:[display:none] ${task.category === "Personal" ? "personal" : task.category === "Brand refresh" ? "brand" : ""}`}
                      >
                        {t(
                          {
                            Personal: "personal",
                            "Website launch": "websiteLaunch",
                            "Brand refresh": "brandRefresh",
                          }[task.category],
                        )}
                      </span>
                      <span className="task-time min-w-[36px] text-right text-[9px] text-[var(--color-text-muted)] [@media(max-width:580px)]:text-[8px]">
                        {task.time === "Anytime" ? t("anytime") : task.time}
                      </span>
                    </div>
                  ))}
                </div>
                {adding ? (
                  <form
                    className="demo-task-form flex gap-[6px] pt-[12px] [&_input]:flex-1 [&_input]:min-w-[0] [&_input]:p-[10px]
                    [&_input]:[border:1px_solid_var(--color-line)] [&_input]:rounded-[5px]
                    [&_input]:[background:var(--color-surface)] [&_button]:flex [&_button]:items-center [&_button]:gap-[5px]
                    [&_button]:[border:0] [&_button]:rounded-[5px] [&_button]:[background:var(--color-accent-soft)]
                    [&_button]:p-[8px]"
                    onSubmit={addTask}
                  >
                    <input
                      autoFocus
                      aria-label={t("newDemoTask")}
                      placeholder={t("whatsOnYourMind")}
                      value={draft}
                      maxLength={100}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <button type="submit" disabled={!draft.trim()}>
                      {t("addTask")}
                      <ArrowRight size={14} />
                    </button>
                    <button
                      type="button"
                      aria-label={t("cancelNewTask")}
                      onClick={() => setAdding(false)}
                    >
                      <X size={16} />
                    </button>
                  </form>
                ) : (
                  <button
                    className="add-another flex items-center gap-[9px] p-[16px_0] [border:0] [background:transparent]"
                    onClick={() => setAdding(true)}
                  >
                    <Plus size={15} /> {t("aNewIdeaGiveItAPlace")}
                  </button>
                )}
              </>
            )}
            {view === "Projects" && (
              <div
                className="demo-projects grid grid-cols-[repeat(3,1fr)] gap-[14px] min-h-[338px] p-[10px_0_40px]
                [@media(max-width:800px)]:grid-cols-[1fr] [@media(max-width:800px)]:gap-[8px]
                [@media(max-width:800px)]:pb-[10px]"
              >
                {[
                  [
                    t("websiteLaunch"),
                    t("aThoughtfulHomeForOurNextBigThing"),
                    "blue",
                    65,
                  ],
                  [
                    t("brandRefresh"),
                    t("sameBigIdeaAFreshPerspective"),
                    "purple",
                    40,
                  ],
                  [
                    t("personal"),
                    t("makeTimeForLifeOutsideTheList"),
                    "green",
                    25,
                  ],
                ].map(([name, description, color, progress]) => (
                  <article
                    key={name}
                    className={`demo-project p-[22px_16px] [border:1px_solid_var(--color-line)] rounded-[8px] [background:var(--color-canvas)] [&_>_svg]:text-[var(--color-accent)] [&_h3]:[font-weight:550] [&_p]:[line-height:1.8] [&_p]:text-[var(--color-text-muted)] [&_>_span]:flex [&_>_span]:justify-between [&_>_span]:text-[var(--color-text-muted)] [&.purple_.project-progress_i]:[background:#6065b4] [&.green_.project-progress_i]:[background:var(--color-success)] [@media(max-width:800px)]:p-[12px] [@media(max-width:800px)]:[&_>_svg]:[float:left] [@media(max-width:800px)]:[&_>_svg]:w-[16px] ${color}`}
                  >
                    <Folder size={22} />
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <div
                      className="project-progress h-[4px] rounded-[4px] [background:var(--color-line)] mt-[28px] overflow-hidden [&_i]:block
                      [&_i]:h-full [&_i]:[background:var(--color-accent)]
                      [@media(max-width:800px)]:mt-[8px]"
                    >
                      <i style={{ width: `${progress}%` }} />
                    </div>
                    <span>
                      {t("percentComplete", { percent: progress })}
                      <ArrowUpRight size={15} />
                    </span>
                  </article>
                ))}
              </div>
            )}
            {view === "Calendar" && (
              <div className="demo-calendar min-h-[348px]">
                <div
                  className="calendar-title flex justify-between items-center mb-[18px] [&_strong]:text-[12px] [&_strong]:[font-weight:550]
                  [&_>_span]:text-[8px] [&_>_span]:[letter-spacing:1px] [&_>_span]:text-[var(--color-text-muted)]"
                >
                  <strong>{t("october2026")}</strong>
                  <span>{t("yourSampleWeek")}</span>
                </div>
                <div
                  className="calendar-week grid grid-cols-[repeat(5,1fr)] [border:1px_solid_var(--color-line)] rounded-[7px]
                  overflow-hidden [&_>_div]:[border-right:1px_solid_var(--color-line)] [&_>_div:last-child]:[border:0]
                  [&_>_div_>_span]:block [&_>_div_>_span]:text-center [&_>_div_>_span]:text-[var(--color-text-muted)]
                  [&_strong]:block [&_strong]:text-center [&_strong]:[font-weight:500] [&_strong]:m-[7px_0_18px]
                  [&_.current-day]:[background:var(--color-canvas)] [&_p]:[border-left:2px_solid_var(--color-accent)]
                  [&_p]:[background:var(--color-accent-soft)] [&_p]:rounded-[3px] [&_p]:[line-height:1.6] [&_small]:block
                  [&_small]:mt-[7px] [&_small]:text-[var(--color-text-muted)] [&_p.green-event]:border-[var(--color-success)]
                  [&_p.green-event]:[background:var(--color-success-soft)] [&_p.purple-event]:border-[#6065b4]
                  [&_p.purple-event]:[background:var(--color-surface-muted)]"
                >
                  {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri")].map(
                    (day, index) => (
                      <div
                        key={day}
                        className={index === 2 ? "current-day" : ""}
                      >
                        <span>{day}</span>
                        <strong>{index + 5}</strong>
                        {index === 2 && (
                          <>
                            <p>
                              {t("homepagePolish")}
                              <small>10:30 – 11:30</small>
                            </p>
                            <p className="green-event">
                              {t("aLittleFreshAir")}
                              <small>12:00 – 12:30</small>
                            </p>
                          </>
                        )}
                        {index === 3 && (
                          <p className="purple-event">
                            {t("brandExploration")}
                            <small>09:00 – 10:00</small>
                          </p>
                        )}
                        {index === 4 && (
                          <p>
                            {t("weeklyWrapup")}
                            <small>15:00 – 15:30</small>
                          </p>
                        )}
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
            <div
              className="demo-footnote flex items-center justify-between gap-[10px] p-[20px_0] text-[8px]
              text-[var(--color-text-muted)] [&_>_span:first-child]:items-center [&_>_span:first-child]:gap-[6px]
              [@media(max-width:580px)]:p-[10px_0_15px] [@media(max-width:580px)]:text-[8px]
              [@media(max-width:580px)]:[line-height:1.7]"
              role="status"
            >
              <span>
                <span className="live-dot inline-block shrink-0 rounded-[50%]" />{" "}
                {view === "Today"
                  ? t("demoProgress", { completed, total: tasks.length })
                  : t("exploreTheDemoYourRealWorkspaceStartsWithYou")}
              </span>
              <span>{t("demoOnlyNothingIsSaved")}</span>
            </div>
          </div>
        </div>
      </div>
      <div
        className="floating-note absolute bottom-[33px] items-center gap-[10px] p-[14px_18px] [background:var(--color-surface)]
          [border:1px_solid_var(--color-line)] rounded-[9px] [box-shadow:var(--shadow-sm)] [transform:rotate(-4deg)]
          text-[var(--color-text-muted)] pointer-events-none [&_strong]:mt-[3px] [&_strong]:[font-weight:550]
          [&_strong]:text-[var(--color-text)] [@media(max-width:800px)]:bottom-[28px]
          [@media(max-width:800px)]:p-[10px_12px]"
        data-reveal="right"
        style={{ "--reveal-delay": "220ms" }}
      >
        <span className="note-icon grid place-items-center w-[31px] h-[31px] rounded-[50%] text-[var(--color-success)] [background:var(--color-success-soft)]">
          <Check size={17} />
        </span>
        <div>
          {t("lessMentalTabs")}
          <strong>{t("moreHeadspace")}</strong>
        </div>
        <span className="note-sparkle text-[28px] text-[var(--color-accent)] ml-[9px] [@media(max-width:800px)]:text-[22px]">
          ✧
        </span>
      </div>
    </div>
  );
}

function ArrowDown() {
  return (
    <ArrowRight
      size={13}
      className="arrow-down [transform:rotate(90deg)]"
      aria-hidden="true"
    />
  );
}
