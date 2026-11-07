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
      className="ui-assistant-bubble ui-focus-ring"
      aria-label={t("openAssistant")}
      data-assistant-trigger
    >
      <span className="ui-assistant-bubble__icon" aria-hidden="true">
        <video
          ref={hoverVideoRef}
          className="ui-assistant-bubble__hover-video"
          muted
          playsInline
          preload="metadata"
        >
          <source src="/pepe_zoom_jump_shake.mp4" type="video/mp4" />
        </video>
        <BotMessageSquare className="h-5 w-5" />
        {hasUnread && <span className="ui-assistant-bubble__dot" />}
      </span>
    </button>
  );
};

export default Bubble;
