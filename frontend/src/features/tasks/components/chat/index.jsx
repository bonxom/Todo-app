import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import Bubble from "./Bubble";
import SmallChat from "./SmallChat";

/** @param {{ onOpenInAgent?: () => void }} props */
const ChatBubble = ({ onOpenInAgent = undefined }) => {
  const sessionRevision = useAuthStore((state) => state.sessionRevision);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !isChatOpen) {
      document.querySelector("[data-assistant-trigger]")?.focus();
    }
    wasOpen.current = isChatOpen;
  }, [isChatOpen]);

  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      {!isChatOpen && <Bubble onClick={handleOpenChat} />}

      <div
        className="ui-assistant-presence"
        data-open={isChatOpen}
        inert={!isChatOpen}
        aria-hidden={!isChatOpen}
      >
        <SmallChat
          key={sessionRevision}
          onClose={handleCloseChat}
          isOpen={isChatOpen}
          onOpenInAgent={onOpenInAgent}
        />
      </div>
    </>
  );
};

export default ChatBubble;
