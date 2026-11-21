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

const pathClassName =
  "orbit-path absolute aspect-square rounded-full [@media(max-width:580px)]:aspect-auto";
const pathDotClassName =
  "absolute top-1/2 -left-1 rounded-full [box-shadow:0_0_0_5px_var(--color-accent-soft)]";

export default function HeroOrbit({ paused, onToggleMotion }) {
  const { t } = useTranslation("account");
  const tilt = usePointerTilt({ maxTilt: 5, maxShift: 12 });
  return (
    <div
      className="hero-visual min-w-[0] relative [perspective:1000px] [@media(max-width:580px)]:w-[min(100%,360px)]"
      data-reveal="right"
      {...(paused ? {} : tilt)}
    >
      <div
        className="orbital-scene relative w-full aspect-[1] [transition:transform_0.35s_ease-out] [&:before]:absolute
        [&:before]:inset-[14%]
        [&:before]:[background:radial-gradient(_circle,color-mix(in_srgb,var(--color-accent)_13%,transparent),transparent_70%_)]
        [&:before]:rounded-[50%] [@media(max-width:580px)]:aspect-[1]"
        aria-hidden="true"
      >
        <div
          className="orbital-grid absolute inset-[-4%] bg-[radial-gradient(var(--color-line)_1px,transparent_1px)]
          [background-size:21px_21px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
        />
        <div className={`${pathClassName} path-outer`}>
          <span className={`${pathDotClassName} size-[6px] bg-[#22c5db]`} />
        </div>
        <div className={`${pathClassName} path-middle`}>
          <span
            className={`${pathDotClassName} size-[7px] bg-[var(--color-accent)]`}
          />
        </div>
        <div className={`${pathClassName} path-inner`}>
          <span className={`${pathDotClassName} size-[5px] bg-[#5153c7]`} />
        </div>
        <span className="orbit-cross absolute text-[var(--color-accent)] text-[18px] [font-weight:300] cross-one top-[14%] right-[19%]">
          +
        </span>
        <span className="orbit-cross absolute text-[var(--color-accent)] text-[18px] [font-weight:300] cross-two bottom-[19%] left-[19%]">
          +
        </span>
        <div
          className="orbit-core absolute [border:1px_solid_var(--color-line)] rounded-[50%] [background:var(--color-surface)]
          [box-shadow:0_12px_45px_color-mix(in_srgb,var(--color-accent)_12%,transparent)] flex items-center
          justify-center flex-col [&_>_span]:text-[var(--color-text-muted)] [&_>_span]:mt-[7px]
          [@media(max-width:800px)]:[&_>_span]:[display:none]"
        >
          <div className="core-halo absolute inset-[-12px] [border:1px_solid_var(--color-accent-soft)] rounded-[50%] animate-[orbit-breathe_5s_ease-in-out_infinite]" />
          <OrbitMark />
          <span>{t("yourCenterOfFocus")}</span>
        </div>
        <div
          className="satellite-card absolute items-center gap-[10px] [border:1px_solid_var(--color-line)] rounded-[10px]
          [box-shadow:var(--shadow-sm)] [&_strong]:[font-weight:550]
          [@media(max-width:1100px)]:gap-[8px] satellite-task [transform:rotate(-5deg)] [--float-rotation:-5deg]"
        >
          <span className="satellite-icon h-[32px] rounded-[8px] grid place-items-center shrink-0 [@media(max-width:800px)]:h-[26px]">
            <ListTodo size={18} />
          </span>
          <div>
            <small>{t("aClearerPlan")}</small>
            <strong>{t("oneThingAtATime")}</strong>
            <span
              className="satellite-line block mt-[10px] h-[3px] rounded-[3px] [background:var(--color-surface-muted)] [&_i]:block
              [&_i]:h-full [&_i]:w-[70%] [&_i]:[background:var(--color-accent)] [&_i]:rounded-[inherit]"
            >
              <i />
            </span>
          </div>
          <Check
            size={14}
            className="satellite-check ml-auto text-[var(--color-success)]"
          />
        </div>
        <div
          className="satellite-card absolute items-center gap-[10px] [border:1px_solid_var(--color-line)] rounded-[10px]
          [box-shadow:var(--shadow-sm)] [&_strong]:[font-weight:550]
          [@media(max-width:1100px)]:gap-[8px] satellite-calendar [transform:rotate(5deg)] [--float-rotation:5deg]"
        >
          <span className="satellite-icon h-[32px] rounded-[8px] grid place-items-center shrink-0 [@media(max-width:800px)]:h-[26px]">
            <CalendarDays size={17} />
          </span>
          <div>
            <small>{t("spaceForWhatMatters")}</small>
            <strong>{t("yourDayInBalance")}</strong>
            <div
              className="satellite-week flex mt-[10px] [&_span]:grid [&_span]:place-items-center [&_span]:text-[7px]
              [&_span]:rounded-[4px] [&_span]:text-[var(--color-text-muted)]
              [&_span]:[background:var(--color-surface-muted)] [&_.today]:[background:var(--color-accent)]
              [&_.today]:text-[var(--color-canvas)]"
            >
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
        <div
          className="satellite-card absolute items-center gap-[10px] [border:1px_solid_var(--color-line)] rounded-[10px]
          [box-shadow:var(--shadow-sm)] [&_strong]:[font-weight:550]
          [@media(max-width:1100px)]:gap-[8px] satellite-done [&_>_svg]:ml-auto"
        >
          <span className="satellite-icon h-[32px] rounded-[8px] grid place-items-center shrink-0 [@media(max-width:800px)]:h-[26px]">
            <Check size={17} />
          </span>
          <div>
            <strong>{t("aLittleProgress")}</strong>
            <small>{t("aLittleMorePossibility")}</small>
          </div>
          <Sparkles size={16} />
        </div>
        <div className="orbit-coordinate absolute top-[3%] right-[10%] text-[6px] [letter-spacing:1.8px] text-[var(--color-text-muted)] [@media(max-width:800px)]:[display:none]">
          {t("tasksProjectsCalendar")}
        </div>
      </div>
      <button
        className="motion-toggle flex items-center gap-[7px] [border:0] [background:transparent] p-[10px] relative z-2"
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
