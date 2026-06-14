import { BotMessageSquare } from 'lucide-react';

const Bubble = ({ onClick, hasUnread = false }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="ui-assistant-bubble ui-focus-ring"
      aria-label="Open assistant"
    >
      <span className="ui-assistant-bubble__icon" aria-hidden="true">
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
