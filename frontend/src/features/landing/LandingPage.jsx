import LanguageSelect from "@/shared/components/LanguageSelect";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  Check,
  Circle,
  CircleCheck,
  Folder,
  ListTodo,
  Menu,
  Sparkles,
  X,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
} from "lucide-react";
import Brand from "./components/Brand";
import HeroOrbit from "./components/HeroOrbit";
import Reveal from "./components/Reveal";
import OrbitMark from "@/shared/components/OrbitMark";
import ThemeToggle from "@/shared/components/ThemeToggle";
import WorkspacePreview from "./components/WorkspacePreview";
import "@/styles/landing.css";

export default function LandingPage() {
  const { t } = useTranslation("account");
  const features = [
    {
      icon: ListTodo,
      title: t("outOfYourHeadIntoAPlan"),
      text: t(
        "captureTheLittleThingsAndTheBigIdeasGiveEveryTaskAPriorityADueDateAndAPlaceToLand",
      ),
      label: t("tasksWithoutTheTangle"),
      className: "capture",
    },
    {
      icon: Folder,
      title: t("everythingInItsRightPlace"),
      text: t(
        "bringRelatedWorkTogetherWithProjectsAndCategoriesLessSearchingMoreMovingThingsForward",
      ),
      label: t("aHomeForEveryProject"),
      className: "organize",
    },
    {
      icon: ChartNoAxesColumnIncreasing,
      title: t("seeHowFarYouveCome"),
      text: t(
        "turnFinishedTasksIntoVisibleProgressFindYourRhythmAndMakeALittleMoreRoomForWhatsNext",
      ),
      label: t("progressYouCanFeel"),
      className: "progress",
    },
  ];
  const [menuOpen, setMenuOpen] = useState(false);
  const [motionPaused, setMotionPaused] = useState(false);
  return (
    <div
      className="landing-page"
      data-motion={motionPaused ? "paused" : "playing"}
    >
      <a className="landing-skip" href="#landing-main">
        {t("skipToMainContent")}
      </a>
      <header className="landing-navbar">
        <div className="landing-container nav-inner">
          <Link to="/" aria-label={t("orbitHome")}>
            <Brand />
          </Link>
          <nav
            id="landing-navigation"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setMenuOpen(false);
                document.getElementById("landing-menu-toggle")?.focus();
              }
            }}
            className={
              menuOpen ? "landing-nav-links is-open" : "landing-nav-links"
            }
            aria-label={t("mainNavigation")}
          >
            <a href="#features" onClick={() => setMenuOpen(false)}>
              {t("whyOrbit")}
            </a>
            <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
              {t("howItWorks")}
            </a>
            <a href="#preview" onClick={() => setMenuOpen(false)}>
              {t("takeALook")}
              <ArrowUpRight size={13} />
            </a>
            <Link className="mobile-sign-in" to="/login">
              {t("signInCasedSignin")}
            </Link>
          </nav>
          <div className="nav-actions">
            <LanguageSelect />
            <ThemeToggle />
            <Link className="sign-in" to="/login">
              {t("signInCasedSignin")}
            </Link>
            <Link className="landing-button button-dark nav-cta" to="/register">
              {t("getStarted")}
              <ArrowUpRight size={15} />
            </Link>
            <button
              id="landing-menu-toggle"
              aria-controls="landing-navigation"
              className="mobile-menu"
              aria-label={menuOpen ? t("closeNavigation") : t("openNavigation")}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="landing-main">
        <Reveal>
          <section className="landing-hero landing-container">
            <div className="hero-copy" data-reveal="left">
              <div className="hero-eyebrow">
                <span className="live-dot" />{" "}
                {t("aLittleClarityALotOfPossibility")}
              </div>
              <h1>
                {t("everythingToDo")}
                <br />
                <span>
                  {t("onePlace")}
                  <br />
                  {t("toFocus")}
                </span>
              </h1>
              <p>
                {t("bringYourTasksProjectsAndCalendarIntoOrbit")}
                <br className="desktop-break" />{" "}
                {t("lessOnYourMindMoreRoomToMoveForward")}
              </p>
              <div className="hero-actions">
                <Link className="landing-button button-primary" to="/register">
                  {t("findYourFocus")}
                  <ArrowUpRight size={18} />
                </Link>
                <a className="hero-demo-link" href="#preview">
                  <span className="play-icon">▶</span> {t("seeOrbitInAction")}
                </a>
              </div>
              <div className="hero-footnote">
                <Check size={14} /> {t("yourIdeasYourPaceYourSpace")}
              </div>
            </div>
            <HeroOrbit
              paused={motionPaused}
              onToggleMotion={() => setMotionPaused((value) => !value)}
            />
          </section>
        </Reveal>
        <Reveal className="landing-container">
          <WorkspacePreview />
        </Reveal>
        <Reveal>
          <div className="benefit-strip landing-container">
            <span data-reveal="left">{t("builtForYourEverydayOrbit")}</span>
            <div data-reveal="right">
              <span>
                <ListTodo size={17} /> {t("thoughtfulTaskManagement")}
              </span>
              <span>
                <CalendarDays size={17} /> {t("aClearerCalendar")}
              </span>
              <span>
                <Sparkles size={17} /> {t("aLittleHelpFromAi")}
              </span>
            </div>
          </div>
        </Reveal>
        <Reveal>
          <section className="features-section landing-container" id="features">
            <div className="section-heading">
              <div data-reveal="left">
                <p className="section-eyebrow">
                  <span /> {t("roomToThinkSpaceToDo")}
                </p>
                <h2>
                  {t("lifeHasEnoughMovingParts")}
                  <br />
                  <span>{t("keepYourWorkSimple")}</span>
                </h2>
              </div>
              <p data-reveal="right" style={{ "--reveal-delay": "100ms" }}>
                {t("fromTheFirstWhatIfToTheFinalCheckmark")}
                <br />
                {t("aLittleClarityGoesALongWay")}
              </p>
            </div>
            <div className="feature-grid">
              {features.map((feature, index) => (
                <article
                  key={feature.className}
                  data-reveal={index % 2 === 0 ? "left" : "right"}
                  style={{ "--reveal-delay": `${index * 110}ms` }}
                  className={`feature-card feature-${feature.className}`}
                >
                  <div className="feature-icon">
                    <feature.icon size={21} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <div className="feature-art" aria-hidden="true">
                    {index === 0 ? (
                      <div className="mini-task-stack">
                        <div>
                          <Circle size={14} /> {t("theNextBigIdea")}{" "}
                          <span>{t("today")}</span>
                        </div>
                        <div>
                          <CircleCheck size={14} /> {t("oneSmallStepForward")}{" "}
                          <Check size={13} />
                        </div>
                        <div>
                          <Plus size={14} /> {t("makeRoomForSomethingNew")}
                        </div>
                      </div>
                    ) : index === 1 ? (
                      <div className="mini-folders">
                        <div>
                          <Folder /> <span>{t("work")}</span>
                          <small>{t("spaceToBuild")}</small>
                        </div>
                        <div>
                          <Folder /> <span>{t("life")}</span>
                          <small>{t("roomToBreathe")}</small>
                        </div>
                      </div>
                    ) : (
                      <div className="mini-chart">
                        <div className="chart-top">
                          <span>{t("littleWinsAddUp")}</span>
                          <strong>↗</strong>
                        </div>
                        <div className="chart-bars">
                          {[28, 46, 37, 62, 54, 79, 95].map((height, i) => (
                            <i key={i} style={{ height: `${height}%` }} />
                          ))}
                        </div>
                        <div className="chart-days">
                          <span>{t("mon")}</span>
                          <span>{t("tue")}</span>
                          <span>{t("wed")}</span>
                          <span>{t("thu")}</span>
                          <span>{t("fri")}</span>
                          <span>{t("sat")}</span>
                          <span>{t("sun")}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="feature-label">{feature.label}</span>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section className="how-section" id="how-it-works">
            <div className="landing-container how-inner">
              <div className="how-copy" data-reveal="left">
                <p className="section-eyebrow">
                  <span /> {t("smallStepsBigDifference")}
                </p>
                <h2>
                  {t("findYourRhythm")}
                  <br />
                  <span>{t("makeItYourOwn")}</span>
                </h2>
                <p>
                  {t("youDontNeedAWholeNewSystem")}
                  <br />
                  {t("justAGoodPlaceToStart")}
                </p>
                <Link className="text-link" to="/register">
                  {t("letsMakeSomeRoom")}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="how-steps">
                {[
                  [
                    t("getItOutOfYourHead"),
                    t(
                      "aTaskAReminderAHalfformedIdeaCaptureItBeforeItSlipsAway",
                    ),
                  ],
                  [
                    t("giveItALittleDirection"),
                    t("pickAProjectSetAPriorityMakeTheNextStepALittleClearer"),
                  ],
                  [
                    t("doYourThingThenTakeABreath"),
                    t(
                      "checkItOffSeeYourProgressAndKeepGoingAtAPaceThatWorksForYou",
                    ),
                  ],
                ].map(([title, text], i) => (
                  <div
                    className="how-step"
                    key={title}
                    data-reveal="right"
                    style={{ "--reveal-delay": `${i * 100}ms` }}
                  >
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                    {i === 2 && (
                      <span className="step-star" aria-hidden="true">
                        ✳
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section className="closing-section landing-container">
            <div
              className="closing-orbit"
              aria-hidden="true"
              data-reveal="left"
            >
              <OrbitMark />
            </div>
            <p className="section-eyebrow" data-reveal="right">
              {t("aLittleClarityChangesEverything")}
            </p>
            <h2 data-reveal="left" style={{ "--reveal-delay": "80ms" }}>
              {t("goodThingsStart")}
              <br />
              {t("withALittle")}
              <em>{t("space")}</em>
            </h2>
            <p data-reveal="right" style={{ "--reveal-delay": "140ms" }}>
              {t("yourNextIdeaDeservesAPlaceToGrow")}
              <br />
              {t("letsPutItInOrbit")}
            </p>
            <Link
              data-reveal="left"
              style={{ "--reveal-delay": "200ms" }}
              className="landing-button button-primary"
              to="/register"
            >
              {t("createYourWorkspace")}
              <ArrowUpRight size={18} />
            </Link>
            <span
              className="closing-note"
              data-reveal="right"
              style={{ "--reveal-delay": "240ms" }}
            >
              {t("startSmallMakeItYours")}
            </span>
          </section>
        </Reveal>
      </main>
      <Reveal>
        <footer className="landing-footer landing-container">
          <div className="footer-top" data-reveal="left">
            <Link to="/" aria-label={t("orbitHome")}>
              <Brand />
            </Link>
            <p>{t("aCalmerSpaceForAFullerLife")}</p>
            <a href="#landing-main">
              {t("backToTheTop")}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="footer-bottom" data-reveal="right">
            <span>
              © {new Date().getFullYear()} {t("orbitMakeSpaceForWhatMatters")}
            </span>
            <span>
              {t("madeForHumansWithALotOnTheirMinds")}{" "}
              <span className="footer-star">✳</span>
            </span>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}
