import { useState } from 'react';
import Bubble from './Bubble';
import SmallChat from './SmallChat';

const ChatBubble = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleOpenChat = () => {
    setIsChatOpen(true);
    setHasUnread(false);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleMinimizeChat = () => {
    setIsChatOpen(false);
    setHasUnread(true);
  };

  return (
    <>
      {!isChatOpen && (
        <Bubble onClick={handleOpenChat} hasUnread={hasUnread} />
      )}
      
      {isChatOpen && (
        <SmallChat
          onClose={handleCloseChat}
          onMinimize={handleMinimizeChat}
        />
      )}
    </>
  );
};

export default ChatBubble;
