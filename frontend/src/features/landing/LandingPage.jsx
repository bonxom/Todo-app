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
      <a
        className="landing-skip fixed top-[-100px] left-[20px] z-100 p-[12px_20px] [background:var(--color-surface)] [border:1px_solid_var(--color-line)] rounded-[8px] [&:focus]:top-[12px]"
        href="#landing-main"
      >
        {t("skipToMainContent")}
      </a>
      <header className="landing-navbar sticky top-[0] z-30 [border-bottom:1px_solid_var(--color-line)] [background:color-mix(in_srgb,var(--color-canvas)_90%,transparent)] [backdrop-filter:blur(20px)]">
        <div className="landing-container nav-inner flex items-center justify-between">
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
            className={`landing-nav-links items-center [&_a]:items-center [&_a]:[transition:color_0.2s]
              [@media(max-width:580px)]:[&.is-open]:absolute [@media(max-width:580px)]:[&.is-open]:top-[70px]
              [@media(max-width:580px)]:[&.is-open]:left-[0] [@media(max-width:580px)]:[&.is-open]:w-full
              [@media(max-width:580px)]:[&.is-open]:justify-between
              [@media(max-width:580px)]:[&.is-open]:[border-bottom:1px_solid_var(--color-line)]
              [@media(max-width:580px)]:[&.is-open]:[background:var(--color-canvas)]
              ${menuOpen ? "is-open" : ""}`}
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
          <div className="nav-actions flex items-center text-[12px]">
            <LanguageSelect />
            <ThemeToggle />
            <Link
              className="sign-in [@media(max-width:580px)]:[display:none]"
              to="/login"
            >
              {t("signInCasedSignin")}
            </Link>
            <Link
              className="landing-button inline-flex items-center justify-center rounded-[var(--radius-md)]
              [transition:transform_0.2s,background_0.2s,box-shadow_0.2s] [&_svg]:[transition:transform_0.2s]
              [&:hover]:[box-shadow:var(--shadow-sm)] button-dark [background:var(--color-primary,var(--color-accent))]
              [&:hover]:[background:var(--color-primary-hover,var(--color-accent-strong))] nav-cta"
              to="/register"
            >
              {t("getStarted")}
              <ArrowUpRight size={15} />
            </Link>
            <button
              id="landing-menu-toggle"
              aria-controls="landing-navigation"
              className="mobile-menu [display:none] [background:none] [border:0] p-[8px] [@media(max-width:580px)]:grid [@media(max-width:580px)]:place-items-center"
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
          <section className="landing-hero relative grid items-center [&_h1]:[font-weight:550] [&_h1_>_span]:text-[var(--color-accent)] landing-container">
            <div
              className="hero-copy relative z-2 [&_>_p]:text-[var(--color-text-muted)] [@media(max-width:580px)]:[&_>_p]:max-w-[340px]"
              data-reveal="left"
            >
              <div
                className="hero-eyebrow flex items-center gap-[9px] [font-weight:600] text-[var(--color-accent)] m-[0_0_27px]
                [&_.live-dot]:[box-shadow:0_0_0_4px_var(--color-accent-soft)]
                [@media(max-width:580px)]:mb-[25px]"
              >
                <span className="live-dot inline-block shrink-0 rounded-[50%]" />{" "}
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
                <br className="desktop-break [@media(max-width:800px)]:[display:none]" />{" "}
                {t("lessOnYourMindMoreRoomToMoveForward")}
              </p>
              <div className="hero-actions flex items-center [@media(max-width:360px)]:[&_.landing-button]:whitespace-nowrap">
                <Link
                  className="landing-button inline-flex items-center justify-center rounded-[var(--radius-md)]
                  [transition:transform_0.2s,background_0.2s,box-shadow_0.2s] [&_svg]:[transition:transform_0.2s]
                  [&:hover]:[box-shadow:var(--shadow-sm)] button-primary [background:var(--color-primary,var(--color-accent))]
                  [&:hover]:[background:var(--color-primary-hover,var(--color-accent-strong))]"
                  to="/register"
                >
                  {t("findYourFocus")}
                  <ArrowUpRight size={18} />
                </Link>
                <a
                  className="hero-demo-link flex items-center gap-[9px] [@media(max-width:580px)]:gap-[7px] [@media(max-width:360px)]:whitespace-nowrap"
                  href="#preview"
                >
                  <span
                    className="play-icon grid place-items-center w-[29px] h-[29px] [border:1px_solid_var(--color-line)] rounded-[50%]
                    text-[8px] pl-[2px] shrink-0 [@media(max-width:580px)]:w-[24px] [@media(max-width:580px)]:h-[24px]"
                  >
                    ▶
                  </span>{" "}
                  {t("seeOrbitInAction")}
                </a>
              </div>
              <div className="hero-footnote flex items-center gap-[7px] text-[var(--color-text-muted)] mt-[18px] [&_svg]:text-[var(--color-success)] [@media(max-width:580px)]:mt-[17px]">
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
          <div
            className="benefit-strip flex justify-between [border-bottom:1px_solid_var(--color-line)] text-[var(--color-text-muted)]
            [&_>_div]:flex [&_>_div_>_span]:flex [&_svg]:text-[var(--color-accent)]
            [@media(max-width:800px)]:flex-col [@media(max-width:580px)]:[&_>_div]:flex-wrap
            [@media(max-width:580px)]:[&_>_div]:justify-center landing-container"
          >
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
            <div
              className="section-heading flex items-end justify-between [&_h2]:[font-weight:550] [&_h2]:[line-height:1.2]
              [&_h2_>_span]:text-[var(--color-text-muted)] [&_>_p]:[line-height:1.8] [&_>_p]:text-[var(--color-text-muted)]
              [@media(max-width:800px)]:flex-col [@media(max-width:800px)]:items-start
              [@media(max-width:800px)]:[&_>_p_br]:[display:none] [@media(max-width:580px)]:[&_>_p]:max-w-[270px]"
            >
              <div data-reveal="left">
                <p
                  className="section-eyebrow flex items-center gap-[9px] [font-weight:600] text-[var(--color-accent)] [&_>_span]:w-[6px]
                  [&_>_span]:h-[6px] [&_>_span]:[border:1px_solid_var(--color-accent)] [&_>_span]:rounded-[50%]"
                >
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
            <div className="feature-grid grid grid-cols-[repeat(3,1fr)] [@media(max-width:800px)]:grid-cols-[1fr]">
              {features.map((feature, index) => (
                <article
                  key={feature.className}
                  data-reveal={index % 2 === 0 ? "left" : "right"}
                  style={{ "--reveal-delay": `${index * 110}ms` }}
                  className={`feature-card [border:1px_solid_var(--color-line)] rounded-[12px] [background:var(--color-surface)] overflow-hidden [transition:transform_0.3s,border-color_0.3s,box-shadow_0.3s] [&:hover]:border-[var(--color-accent)] [&:hover]:[box-shadow:var(--shadow-sm)] [&_h3]:[font-weight:550] [&_h3]:[letter-spacing:-0.6px] [&_h3]:m-[0_0_13px] [&_>_p]:[line-height:1.85] [&_>_p]:text-[var(--color-text-muted)] [&_>_p]:m-[0] [&.is-revealed_.chart-bars_i]:animate-[orbit-bar-grow_0.9s_both] [@media(max-width:800px)]:grid-cols-[1fr_1fr] [@media(max-width:800px)]:gap-x-[30px] feature-${feature.className}`}
                >
                  <div
                    className="feature-icon flex items-center justify-between text-[var(--color-accent)]
                    [&_>_span]:[font:10px_var(--font-mono)] [&_>_span]:text-[var(--color-text-muted)]
                    [@media(max-width:800px)]:col-1"
                  >
                    <feature.icon size={21} />
                    <span>0{index + 1}</span>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.text}</p>
                  <div
                    className="feature-art h-[170px] flex items-center justify-center
                    [@media(max-width:800px)]:col-2 [@media(max-width:800px)]:row-[1_/_5] [@media(max-width:800px)]:self-center
                    [@media(max-width:580px)]:max-w-[280px] [@media(max-width:580px)]:h-[163px]"
                    aria-hidden="true"
                  >
                    {index === 0 ? (
                      <div
                        className="mini-task-stack w-full [transition:transform_0.4s] [&_>_div]:flex [&_>_div]:items-center [&_>_div]:gap-[8px]
                        [&_>_div]:p-[14px_10px] [&_>_div]:[border:1px_solid_var(--color-line)] [&_>_div]:rounded-[6px]
                        [&_>_div]:[background:var(--color-canvas)] [&_>_div]:text-[var(--color-text-muted)] [&_>_div]:text-[9px]
                        [&_>_div]:[box-shadow:var(--shadow-xs)] [&_>_div_+_div]:mt-[7px]
                        [&_>_div:nth-child(2)]:[transform:translateX(6px)] [&_>_div:nth-child(2)]:text-[var(--color-success)]
                        [&_>_div:nth-child(3)]:[background:transparent] [&_>_div:nth-child(3)]:[border-style:dashed]
                        [&_>_div_>_span]:ml-auto [&_>_div_>_span]:text-[7px] [&_>_div_>_span]:[background:var(--color-accent-soft)]
                        [&_>_div_>_span]:text-[var(--color-accent)] [&_>_div_>_span]:p-[3px] [&_>_div_>_span]:rounded-[3px]"
                      >
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
                      <div
                        className="mini-folders flex gap-[12px] w-full justify-center pt-[8px] [&_>_div]:flex [&_>_div]:flex-col
                        [&_>_div]:gap-[7px] [&_>_div]:w-[44%] [&_>_div]:p-[20px_14px] [&_>_div]:[border:1px_solid_var(--color-line)]
                        [&_>_div]:rounded-[7px] [&_>_div]:[background:var(--color-accent-soft)] [&_>_div]:[transform:rotate(-6deg)]
                        [&_>_div]:[transition:transform_0.4s] [&_>_div_+_div]:[transform:rotate(7deg)_translateY(9px)]
                        [&_>_div_+_div]:[background:var(--color-surface-muted)] [&_svg]:text-[var(--color-accent)]
                        [&_span]:text-[12px] [&_span]:mt-[5px] [&_small]:text-[8px] [&_small]:text-[var(--color-text-muted)]"
                      >
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
                      <div className="mini-chart w-full p-[15px_17px_10px] [border:1px_solid_var(--color-line)] rounded-[7px] [background:var(--color-canvas)]">
                        <div className="chart-top flex items-center justify-between text-[9px] text-[var(--color-text-muted)] [&_strong]:text-[17px] [&_strong]:text-[var(--color-success)]">
                          <span>{t("littleWinsAddUp")}</span>
                          <strong>↗</strong>
                        </div>
                        <div
                          className="chart-bars flex items-end gap-[9px] h-[85px] [border-bottom:1px_solid_var(--color-line)] mt-[8px] [&_i]:flex-1
                          [&_i]:[background:color-mix(in_srgb,var(--color-accent)_35%,var(--color-surface))] [&_i]:rounded-[3px_3px_0_0]
                          [&_i]:[transform-origin:bottom] [&_i:nth-child(6)]:[background:var(--color-accent)]
                          [&_i:last-child]:[background:var(--color-success)] [&_i:nth-child(2n)]:[animation-delay:0.1s]
                          [&_i:nth-child(3n)]:[animation-delay:0.2s]"
                        >
                          {[28, 46, 37, 62, 54, 79, 95].map((height, i) => (
                            <i key={i} style={{ height: `${height}%` }} />
                          ))}
                        </div>
                        <div className="chart-days flex justify-around mt-[6px] text-[7px] text-[var(--color-text-muted)]">
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
                  <span
                    className="feature-label block [border-top:1px_solid_var(--color-line)] pt-[17px] mt-[15px]
                    text-[var(--color-text-muted)] [letter-spacing:1.2px]
                    [@media(max-width:800px)]:col-1 [@media(max-width:580px)]:mt-[22px]"
                  >
                    {feature.label}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
        <Reveal>
          <section
            className="how-section [border-block:1px_solid_var(--color-line)] [background:var(--color-surface-muted)]"
            id="how-it-works"
          >
            <div className="landing-container how-inner grid grid-cols-[1fr_1fr] [@media(max-width:580px)]:grid-cols-[1fr]">
              <div
                className="how-copy [&_h2]:[font-weight:550] [&_h2]:[line-height:1.2] [&_h2]:[letter-spacing:-1.7px]
                [&_h2_>_span]:text-[var(--color-text-muted)] [&_>_p:not(.section-eyebrow)]:text-[var(--color-text-muted)]
                [&_>_p:not(.section-eyebrow)]:[line-height:1.8]"
                data-reveal="left"
              >
                <p
                  className="section-eyebrow flex items-center gap-[9px] [font-weight:600] text-[var(--color-accent)] [&_>_span]:w-[6px]
                  [&_>_span]:h-[6px] [&_>_span]:[border:1px_solid_var(--color-accent)] [&_>_span]:rounded-[50%]"
                >
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
                <Link
                  className="text-link inline-flex items-center gap-[17px] [border-bottom:1px_solid_var(--color-accent)] pb-[8px]"
                  to="/register"
                >
                  {t("letsMakeSomeRoom")}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
              <div className="how-steps flex flex-col justify-center">
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
                    className="how-step relative flex [border-bottom:1px_solid_var(--color-line)] [&:last-child]:[border:0]
                      [&_>_span:first-child]:grid [&_>_span:first-child]:place-items-center [&_>_span:first-child]:shrink-0
                      [&_>_span:first-child]:w-[30px] [&_>_span:first-child]:h-[30px]
                      [&_>_span:first-child]:[border:1px_solid_var(--color-line)]
                      [&_>_span:first-child]:[background:var(--color-surface)] [&_>_span:first-child]:rounded-[50%]
                      [&_>_span:first-child]:text-[var(--color-accent)] [&_h3]:[font-weight:550] [&_h3]:[letter-spacing:-0.3px]
                      [&_h3]:m-[2px_0_7px] [&_p]:[line-height:1.8] [&_p]:text-[var(--color-text-muted)] [&_p]:m-[0]"
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
                      <span
                        className="step-star absolute right-[-20px] top-[12px] text-[var(--color-accent)] text-[46px] [transform:rotate(-15deg)] [@media(max-width:800px)]:[display:none]"
                        aria-hidden="true"
                      >
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
          <section
            className="closing-section relative text-center [&_.section-eyebrow]:justify-center [&_h2]:[font-weight:550]
            [&_h2]:[line-height:1.12] [&_h2_em]:text-[var(--color-accent)] [&_h2_em]:[font-style:normal]
            [&_>_p:not(.section-eyebrow)]:[line-height:1.8] [&_>_p:not(.section-eyebrow)]:text-[var(--color-text-muted)]
            landing-container"
          >
            <div
              className="closing-orbit absolute left-[5%] top-[140px] [@media(max-width:1100px)]:left-[1%] [@media(max-width:800px)]:[display:none]"
              aria-hidden="true"
              data-reveal="left"
            >
              <OrbitMark />
            </div>
            <p
              className="section-eyebrow flex items-center gap-[9px] [font-weight:600] text-[var(--color-accent)] [&_>_span]:w-[6px]
              [&_>_span]:h-[6px] [&_>_span]:[border:1px_solid_var(--color-accent)] [&_>_span]:rounded-[50%]"
              data-reveal="right"
            >
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
              className="landing-button inline-flex items-center justify-center rounded-[var(--radius-md)]
                [transition:transform_0.2s,background_0.2s,box-shadow_0.2s] [&_svg]:[transition:transform_0.2s]
                [&:hover]:[box-shadow:var(--shadow-sm)] button-primary [background:var(--color-primary,var(--color-accent))]
                [&:hover]:[background:var(--color-primary-hover,var(--color-accent-strong))]"
              to="/register"
            >
              {t("createYourWorkspace")}
              <ArrowUpRight size={18} />
            </Link>
            <span
              className="closing-note block text-[10px] text-[var(--color-text-muted)] mt-[16px]"
              data-reveal="right"
              style={{ "--reveal-delay": "240ms" }}
            >
              {t("startSmallMakeItYours")}
            </span>
          </section>
        </Reveal>
      </main>
      <Reveal>
        <footer className="landing-footer [border-top:1px_solid_var(--color-line)] py-[30px_25px] landing-container">
          <div
            className="footer-top flex items-center [&_>_p]:text-[var(--color-text-muted)] [&_>_a:last-child]:flex
            [&_>_a:last-child]:items-center [@media(max-width:580px)]:flex-wrap [@media(max-width:580px)]:[&_>_p]:order-3
            [@media(max-width:580px)]:[&_>_p]:w-full"
            data-reveal="left"
          >
            <Link to="/" aria-label={t("orbitHome")}>
              <Brand />
            </Link>
            <p>{t("aCalmerSpaceForAFullerLife")}</p>
            <a href="#landing-main">
              {t("backToTheTop")}
              <ArrowUpRight size={15} />
            </a>
          </div>
          <div
            className="footer-bottom flex justify-between [border-top:1px_solid_var(--color-line)] mt-[30px] pt-[20px] text-[9px]
            text-[var(--color-text-muted)] [@media(max-width:580px)]:flex-col [@media(max-width:580px)]:gap-[8px]
            [@media(max-width:580px)]:mt-[24px] [@media(max-width:580px)]:text-[8px]"
            data-reveal="right"
          >
            <span>
              © {new Date().getFullYear()} {t("orbitMakeSpaceForWhatMatters")}
            </span>
            <span>
              {t("madeForHumansWithALotOnTheirMinds")}{" "}
              <span className="footer-star text-[var(--color-accent)] text-[16px] align-middle ml-[7px]">
                ✳
              </span>
            </span>
          </div>
        </footer>
      </Reveal>
    </div>
  );
}
