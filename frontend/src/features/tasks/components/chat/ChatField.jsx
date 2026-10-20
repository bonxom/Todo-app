import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import InteractionCard from "./InteractionCard";
import MarkdownText from "./MarkdownText";
import { formatDateTime } from "@/shared/utils/dateTime";

const ChatField = ({
  messages,
  onSendMessage,
  isTyping = false,
  disabled = false,
  chat,
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const userMessageStyle = {
    borderColor: "var(--color-accent)",
    background: "var(--color-accent)",
    boxShadow: "var(--shadow-xs)",
  };
  const botMessageStyle = {
    borderColor: "var(--color-line)",
    background: "var(--color-surface)",
    color: "var(--color-text)",
    boxShadow: "var(--shadow-xs)",
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && !disabled) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat?.before && (
          <button
            type="button"
            className="ui-focus-ring text-sm underline"
            disabled={chat.loading}
            onClick={chat.loadEarlier}
          >
            Load earlier messages
          </button>
        )}
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages
            .filter(
              (message) =>
                message.interaction?.id !== chat?.interaction?.id ||
                !message.interaction,
            )
            .map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    message.sender === "user"
                      ? "rounded-br-sm border text-white"
                      : "rounded-bl-sm border"
                  }`}
                  style={
                    message.sender === "user"
                      ? userMessageStyle
                      : botMessageStyle
                  }
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.interaction ? (
                      <InteractionCard
                        interaction={message.interaction}
                        disabled
                      />
                    ) : message.sender === "bot" ? (
                      <MarkdownText text={message.text} />
                    ) : (
                      message.text
                    )}
                  </div>
                  <span className="text-xs opacity-70 mt-1 block">
                    {formatDateTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))
        )}

        {chat?.interaction && (
          <InteractionCard
            key={chat.interaction.id}
            interaction={chat.interaction}
            onAnswer={chat.answer}
            onCancel={() => chat.answer(undefined, true)}
            disabled={chat.loading || chat.sending || Boolean(chat.pending)}
          />
        )}
        {chat?.interaction && !chat.sending && !chat.pending && (
          <p role="status" className="text-sm">
            Waiting for your answer
          </p>
        )}
        {chat?.error && (
          <div role="alert" className="text-sm text-red-600">
            {chat.error}
          </div>
        )}
        {chat && (chat.error || chat.pending) && (
          <div className="flex gap-3 text-sm">
            {chat.pending && (
              <button
                type="button"
                disabled={chat.loading || chat.sending}
                onClick={() => chat.send()}
              >
                Check reply / Retry
              </button>
            )}
            <button
              type="button"
              disabled={chat.loading || chat.sending}
              onClick={chat.reload}
            >
              Reload conversation
            </button>
          </div>
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl rounded-bl-sm border px-4 py-3"
              style={botMessageStyle}
            >
              <div className="flex space-x-1">
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-[var(--color-text-muted)]"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4">
        {chat && (
          <label className="mb-2 flex items-center gap-2 text-sm">
            Agent mode
            <select
              aria-label="Agent mode"
              className="ui-input"
              value={chat.mode}
              disabled={chat.locked}
              onChange={(event) => chat.setMode(event.target.value)}
            >
              <option value="auto">Auto</option>
              <option value="ask">Ask</option>
            </select>
          </label>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            rows={1}
            aria-label="Message"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="ui-input min-w-0 flex-1 resize-none rounded-2xl px-4 py-2 text-sm"
            style={{
              fieldSizing: "content",
              minHeight: "2.75rem",
              maxHeight: "calc(2lh + 1rem + 2px)",
              paddingBlock: "0.5rem",
              overflowY: "auto",
              resize: "none",
            }}
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={disabled || !inputValue.trim()}
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
