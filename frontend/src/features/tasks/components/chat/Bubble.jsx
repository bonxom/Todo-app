import { useTranslation } from "react-i18next";
import { useRef } from "react";
import { BotMessageSquare } from "lucide-react";

const Bubble = ({ onClick, hasUnread = false }) => {
  const { t } = useTranslation("agent");

  const hoverVideoRef = useRef(null);

  const handlePointerEnter = () => {
    const video = hoverVideoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.play().catch(() => {});
  };

  const handlePointerLeave = () => {
    const video = hoverVideoRef.current;
    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="ui-assistant-bubble fixed right-[max(1rem,env(safe-area-inset-right))]
        bottom-[max(1rem,env(safe-area-inset-bottom))] z-45 inline-flex w-[3rem] h-[3rem] items-center justify-center
        p-[0.375rem] [border:1px_solid_var(--color-line)] rounded-[999px]
        [background:color-mix(in_srgb,var(--color-surface)_94%,var(--color-canvas))]
        [transition:background-color_160ms_ease,border-color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
        [&:hover]:border-[color-mix(_in_srgb,var(--color-line)_72%,var(--color-text-muted)_)]
        [&:hover]:[background:var(--color-surface)] [&:hover_.ui-assistant-bubble\_\_hover-video]:opacity-[1]
        ui-focus-ring"
      aria-label={t("openAssistant")}
      data-assistant-trigger
    >
      <span
        className="ui-assistant-bubble__icon relative grid w-[2.25rem] h-[2.25rem] place-items-center isolate rounded-[999px]
        [background:var(--color-accent-soft)] text-[var(--color-accent)] [&_>_svg]:relative [&_>_svg]:z-2"
        aria-hidden="true"
      >
        <video
          ref={hoverVideoRef}
          className="ui-assistant-bubble__hover-video absolute inset-[50%_auto_auto_50%] z-1 w-[10rem] h-[10rem] object-contain pointer-events-none [transition:opacity_120ms_ease,transform_160ms_ease]"
          muted
          playsInline
          preload="metadata"
        >
          <source src="/pepe_zoom_jump_shake.mp4" type="video/mp4" />
        </video>
        <BotMessageSquare className="h-5 w-5" />
        {hasUnread && (
          <span
            className="ui-assistant-bubble__dot absolute top-[-0.125rem] right-[-0.125rem] z-3 w-[0.625rem] h-[0.625rem]
          [border:2px_solid_var(--color-surface)] rounded-[999px] [background:var(--color-danger)]"
          />
        )}
      </span>
    </button>
  );
};

export default Bubble;
