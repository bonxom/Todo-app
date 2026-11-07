import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  Check,
  ListTodo,
  Pause,
  Play,
  Sparkles,
} from "lucide-react";
import OrbitMark from "@/shared/components/OrbitMark";
import { usePointerTilt } from "../hooks/usePointerTilt";

export default function HeroOrbit({ paused, onToggleMotion }) {
  const { t } = useTranslation("account");
  const tilt = usePointerTilt({ maxTilt: 5, maxShift: 12 });
  return (
    <div className="hero-visual" data-reveal="right" {...(paused ? {} : tilt)}>
      <div className="orbital-scene" aria-hidden="true">
        <div className="orbital-grid" />
        <div className="orbit-path path-outer">
          <span />
        </div>
        <div className="orbit-path path-middle">
          <span />
        </div>
        <div className="orbit-path path-inner">
          <span />
        </div>
        <span className="orbit-cross cross-one">+</span>
        <span className="orbit-cross cross-two">+</span>
        <div className="orbit-core">
          <div className="core-halo" />
          <OrbitMark />
          <span>{t("yourCenterOfFocus")}</span>
        </div>
        <div className="satellite-card satellite-task">
          <span className="satellite-icon">
            <ListTodo size={18} />
          </span>
          <div>
            <small>{t("aClearerPlan")}</small>
            <strong>{t("oneThingAtATime")}</strong>
            <span className="satellite-line">
              <i />
            </span>
          </div>
          <Check size={14} className="satellite-check" />
        </div>
        <div className="satellite-card satellite-calendar">
          <span className="satellite-icon">
            <CalendarDays size={17} />
          </span>
          <div>
            <small>{t("spaceForWhatMatters")}</small>
            <strong>{t("yourDayInBalance")}</strong>
            <div className="satellite-week">
              {[t("mon"), t("tue"), t("wed"), t("thu"), t("fri")].map(
                (day, index) => (
                  <span key={index} className={index === 2 ? "today" : ""}>
                    {day}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
        <div className="satellite-card satellite-done">
          <span className="satellite-icon">
            <Check size={17} />
          </span>
          <div>
            <strong>{t("aLittleProgress")}</strong>
            <small>{t("aLittleMorePossibility")}</small>
          </div>
          <Sparkles size={16} />
        </div>
        <div className="orbit-coordinate">{t("tasksProjectsCalendar")}</div>
      </div>
      <button
        className="motion-toggle"
        onClick={onToggleMotion}
        aria-label={paused ? t("playAnimations") : t("pauseAnimations")}
        aria-pressed={paused}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
        <span>{paused ? t("motionPaused") : t("aLittleMomentum")}</span>
      </button>
    </div>
  );
}
