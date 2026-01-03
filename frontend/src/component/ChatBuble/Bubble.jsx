import { MessageCircle, BotMessageSquare } from 'lucide-react';
import { useState } from 'react';

const Bubble = ({ onClick, hasUnread = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40 group"
        aria-label="Open chat"
      >
        <BotMessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          </span>
        )}
      </button>

      {isHovered && (
        <video
          className="fixed bottom-6 right-6 w-32 h-32 z-30 shadow-bottom"
          style={{
            transform: 'translate(calc(-50% + 80px), calc(50% - 32px))'
          }}
          autoPlay
          loop
          muted
        >
          <source src="/robothihi1.mp4" type="video/mp4" />
        </video>
      )}
    </>
  );
};

export default Bubble;
