import { useState } from "react";
import Bubble from "./Bubble";
import SmallChat from "./SmallChat";

const ChatBubble = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

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
        <SmallChat onClose={handleCloseChat} />
      </div>
    </>
  );
};

export default ChatBubble;
