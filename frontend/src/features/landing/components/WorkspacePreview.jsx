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
    <div className="workspace-stage" id="preview">
      <div className="preview-caption" data-reveal="left">
        <span>
          <span className="live-dot" /> {t("aLittleLessChaosALotMoreClarity")}
        </span>
        <span>
          {t("yourWorkspaceInOrbit")}
          <ArrowDown />
        </span>
      </div>
      <div className="workspace-window">
        <div className="window-bar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>{t("oneSpaceForEverythingOnYourMind")}</span>
          <span className="demo-pill">{t("interactiveDemo")}</span>
        </div>
        <div className="workspace-layout">
          <aside className="demo-sidebar" data-reveal="left">
            <Brand />
            <div className="workspace-name">
              <span className="workspace-avatar">S</span> {t("myWorkspace")}{" "}
              <ChevronDown size={13} />
            </div>
            <span className="sidebar-label">{t("workspace")}</span>
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
            <span className="sidebar-label project-label">
              {t("myProjects")}
            </span>
            <div className="sidebar-project">
              <i />
              {t("websiteLaunch")}
            </div>
            <div className="sidebar-project">
              <i />
              {t("brandRefresh")}
            </div>
            <div className="sidebar-project">
              <i />
              {t("personal")}
            </div>
            <div className="sidebar-bottom">
              <span className="user-avatar">S</span>
              <div>
                {t("samsSpace")}
                <small>{t("aLittleMoreFocused")}</small>
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
              {t("myWorkspace")}
              <span>/</span> <strong>{t(viewKeys[view])}</strong>
              <span className="sample-date">{t("wednesdayOctober7")}</span>
            </div>
            <div className="demo-heading">
              <div>
                <p>{t("aFreshStartEveryDay")}</p>
                <h2>
                  {view === "Today"
                    ? t("makeRoomForGoodWork")
                    : view === "Projects"
                      ? t("theBiggerPicture")
                      : t("aLittleSpaceToPlan")}
                  <span className="heading-sun">✳</span>
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
                className="demo-add"
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
                <div className="demo-stats">
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
                  <div className="progress-stat">
                    <span>
                      {t("yourDailyMomentum")}{" "}
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
                        ? t("everythingDoneEnjoyALittleBreathingRoom")
                        : t("oneThingAtATimeYoureMovingForward")}
                    </small>
                  </div>
                </div>
                <div className="task-list-header">
                  <h3>
                    {t("yourFocusToday")}
                    <span>{tasks.length - completed}</span>
                  </h3>
                  <div
                    className="task-filters"
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
                      className={`demo-task ${task.done ? "is-done" : ""}`}
                      key={task.id}
                    >
                      <button
                        className="task-checkbox"
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
                      <span className="task-title">{taskTitle(task)}</span>
                      <span
                        className={`task-category ${task.category === "Personal" ? "personal" : task.category === "Brand refresh" ? "brand" : ""}`}
                      >
                        {t(
                          {
                            Personal: "personal",
                            "Website launch": "websiteLaunch",
                            "Brand refresh": "brandRefresh",
                          }[task.category],
                        )}
                      </span>
                      <span className="task-time">
                        {task.time === "Anytime" ? t("anytime") : task.time}
                      </span>
                    </div>
                  ))}
                </div>
                {adding ? (
                  <form className="demo-task-form" onSubmit={addTask}>
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
                    className="add-another"
                    onClick={() => setAdding(true)}
                  >
                    <Plus size={15} /> {t("aNewIdeaGiveItAPlace")}
                  </button>
                )}
              </>
            )}
            {view === "Projects" && (
              <div className="demo-projects">
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
                  <article key={name} className={`demo-project ${color}`}>
                    <Folder size={22} />
                    <h3>{name}</h3>
                    <p>{description}</p>
                    <div className="project-progress">
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
              <div className="demo-calendar">
                <div className="calendar-title">
                  <strong>{t("october2026")}</strong>
                  <span>{t("yourSampleWeek")}</span>
                </div>
                <div className="calendar-week">
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
            <div className="demo-footnote" role="status">
              <span>
                <span className="live-dot" />{" "}
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
        className="floating-note"
        data-reveal="right"
        style={{ "--reveal-delay": "220ms" }}
      >
        <span className="note-icon">
          <Check size={17} />
        </span>
        <div>
          {t("lessMentalTabs")}
          <strong>{t("moreHeadspace")}</strong>
        </div>
        <span className="note-sparkle">✧</span>
      </div>
    </div>
  );
}

function ArrowDown() {
  return <ArrowRight size={13} className="arrow-down" aria-hidden="true" />;
}
