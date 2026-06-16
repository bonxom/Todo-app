import { useRef } from 'react';
import { BotMessageSquare } from 'lucide-react';

const Bubble = ({ onClick, hasUnread = false }) => {
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
      aria-label="Open assistant"
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
      <span className="ui-assistant-bubble__copy">
        <span className="ui-assistant-bubble__label">Assistant</span>
        <span className="ui-assistant-bubble__meta">Chat or generate tasks</span>
      </span>
    </button>
  );
};

export default Bubble;
