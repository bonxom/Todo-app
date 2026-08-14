import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import MarkdownText from './MarkdownText';
import { formatDateTime } from '@/shared/utils/dateTime';

const ChatField = ({ messages, onSendMessage, isTyping = false }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const userMessageStyle = {
    borderColor: 'var(--color-accent)',
    background: 'var(--color-accent)',
    boxShadow: 'var(--shadow-xs)',
  };
  const botMessageStyle = {
    borderColor: 'var(--color-line)',
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    boxShadow: 'var(--shadow-xs)',
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  message.sender === 'user'
                    ? 'rounded-br-sm border text-white'
                    : 'rounded-bl-sm border'
                }`}
                style={message.sender === 'user' ? userMessageStyle : botMessageStyle}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.sender === 'bot' ? (
                    <MarkdownText text={message.text} />
                  ) : (
                    message.text
                  )}
                </p>
                <span className="text-xs opacity-70 mt-1 block">
                  {formatDateTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}

        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm border px-4 py-3"
              style={botMessageStyle}
            >
              <div className="flex space-x-1">
                <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '0ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '150ms' }} />
                <div className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="ui-input min-w-0 flex-1 rounded-full px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="ui-btn-primary ui-focus-ring h-11 w-11 flex-shrink-0 rounded-full p-0 disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:bg-[var(--color-surface-muted)] disabled:text-[var(--color-text-muted)] disabled:shadow-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatField;
