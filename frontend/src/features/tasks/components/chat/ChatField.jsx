import { useState, useRef, useEffect } from "react";
import { Send, Bot, ChevronRight, Image as ImageIcon, Paperclip } from "lucide-react";
import InteractionCard from "./InteractionCard";
import RecentConversations from "./RecentConversations";
import MarkdownText from "./MarkdownText";
import ToolBadge from "./ToolBadge";
import SlashCommandMenu from "./SlashCommandMenu";
import { filterTools } from "./toolCatalog";
import { formatDateTime } from "@/shared/utils/dateTime";

const ChatField = ({
  messages,
  onSendMessage,
  isTyping = false,
  disabled = false,
  chat,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [selectedTool, setSelectedTool] = useState(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [messageInteractionId, setMessageInteractionId] = useState(null);
  const interactionId = chat?.interaction?.id;
  const showChatInput = Boolean(interactionId) && messageInteractionId === interactionId;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const availableTools = filterTools(slashQuery);

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
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // If no tool selected yet, check for slash trigger
    if (!selectedTool) {
      const slashMatch = value.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/);
      if (slashMatch) {
        setSlashQuery(slashMatch[1]);
        setIsSlashMenuOpen(true);
        setSelectedToolIndex(0);
        return;
      }
    }
    setIsSlashMenuOpen(false);
  };

  const handleSelectTool = (tool) => {
    setSelectedTool(tool);
    const cleaned = inputValue.replace(/(?:^|\s)\/[a-zA-Z0-9_-]*$/, "").trim();
    setInputValue(cleaned);
    setIsSlashMenuOpen(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    const trimmed = inputValue.trim();
    if ((trimmed || selectedTool) && !disabled) {
      const fullMessage = selectedTool
        ? `[Skill: ${selectedTool.id}] ${trimmed}`
        : trimmed;
      onSendMessage(fullMessage);
      setInputValue("");
      setSelectedTool(null);
      setIsSlashMenuOpen(false);
    }
  };

  const handleKeyDown = (e) => {
    if (isSlashMenuOpen && availableTools.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedToolIndex((prev) => (prev + 1) % availableTools.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedToolIndex(
          (prev) => (prev - 1 + availableTools.length) % availableTools.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectTool(availableTools[selectedToolIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsSlashMenuOpen(false);
        return;
      }
    }

    if (e.key === "Backspace" && selectedTool && inputValue === "") {
      e.preventDefault();
      setSelectedTool(null);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
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
          chat && !chat.loading && !chat.interaction ? (
            <RecentConversations onOpen={chat.openConversation} disabled={chat.locked} />
          ) : <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages
            .filter(
              (message) =>
                !(message.sender === "user" && message.replyToInteractionId) &&
                (message.interaction?.id !== chat?.interaction?.id ||
                  !message.interaction),
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
                        embedded
                      />
                    ) : (
                      <>
                        {(() => {
                          const match = message.text?.match(
                            /^\[(?:Skill|Tool):\s*([a-zA-Z0-9_-]+)\]\s*([\s\S]*)$/,
                          );
                          if (match) {
                            return (
                              <>
                                <div className="mb-1.5">
                                  <ToolBadge
                                    tool={match[1]}
                                    size="sm"
                                    className={
                                      message.sender === "user"
                                        ? "bg-white/20 border-white/40 text-white"
                                        : ""
                                    }
                                  />
                                </div>
                                <MarkdownText text={match[2]} />
                              </>
                            );
                          }
                          return <MarkdownText text={message.text} />;
                        })()}
                      </>
                    )}
                  </div>
                  <span className="text-xs opacity-70 mt-1 block">
                    {formatDateTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))
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

      {selectedTool && (
        <div className="shrink-0 px-3 sm:px-4 py-1.5 flex items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 shadow-xs text-xs animate-in fade-in duration-150">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] select-none">
              Skill:
            </span>
            <ToolBadge
              tool={selectedTool}
              size="sm"
              onRemove={() => {
                setSelectedTool(null);
                textareaRef.current?.focus();
              }}
            />
          </div>
        </div>
      )}

      <div className={`min-h-0 shrink-0 border-t border-[var(--color-line)] bg-[var(--color-surface)] p-3 ${chat?.interaction && !showChatInput ? "flex max-h-[75%] flex-col" : "sm:p-4"}`}>
        {chat?.interaction && showChatInput && (
          <div className="mb-2 flex items-center justify-end text-sm">
            <button
              type="button"
              onClick={() => setMessageInteractionId(showChatInput ? null : interactionId)}
              className="ui-focus-ring text-xs text-[var(--color-accent)] hover:underline cursor-pointer"
            >
              {showChatInput ? "← Back to question" : "Message instead of choosing →"}
            </button>
          </div>
        )}

        {chat?.interaction && !showChatInput && (
          <InteractionCard
            key={chat.interaction.id}
            interaction={chat.interaction}
            onAnswer={chat.answer}
            onCancel={() => chat.answer(undefined, true)}
            disabled={chat.loading || chat.sending || Boolean(chat.pending)}
            docked
            onSwitchToMessage={() => setMessageInteractionId(interactionId)}
          />
        )}

        <form
          onSubmit={handleSubmit}
          className={
            chat?.interaction && !showChatInput
              ? "sr-only"
              : "flex items-center gap-2"
          }
        >
          {/* Options Menu Toggle and Expanding Toolbar */}
          <div className="flex h-11 items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className={`ui-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                isMenuOpen
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] dark:text-[var(--color-accent)] shadow-xs"
                  : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
              title={isMenuOpen ? "Collapse options" : "Expand options"}
              aria-label={isMenuOpen ? "Collapse options" : "Expand options"}
              aria-expanded={isMenuOpen}
            >
              <ChevronRight
                className={`h-4 w-4 transition-transform duration-200 ${
                  isMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Expanding toolbar */}
            <div
              className={`flex items-center gap-1.5 overflow-hidden transition-all duration-200 ease-out ${
                isMenuOpen
                  ? "max-w-[160px] opacity-100"
                  : "max-w-0 opacity-0 pointer-events-none"
              }`}
            >
              {/* Attach image */}
              <button
                type="button"
                className="ui-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                title="Attach image"
                aria-label="Attach image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              {/* Attach file */}
              <button
                type="button"
                className="ui-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
                title="Attach file"
                aria-label="Attach file"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Agent mode Robot toggle */}
              {chat && (
                <button
                  type="button"
                  aria-label={`Agent mode: ${chat.mode}`}
                  onClick={() => chat.setMode(chat.mode === "auto" ? "ask" : "auto")}
                  disabled={chat.locked}
                  title={
                    chat.mode === "auto"
                      ? "Auto mode - Click to switch to Ask"
                      : "Ask mode - Click to switch to Auto"
                  }
                  className={`ui-focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                    chat.mode === "auto"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:bg-emerald-500/20 shadow-xs"
                      : "border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  } ${chat.locked ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Bot
                    className={`h-4 w-4 transition-transform ${
                      chat.mode === "auto"
                        ? "fill-emerald-600/20 text-emerald-600 dark:text-emerald-400 dark:fill-emerald-400/20"
                        : "fill-none text-[var(--color-text-muted)]"
                    }`}
                  />
                </button>
              )}
            </div>
          </div>

          {chat && (
            <label className="sr-only">
              Agent mode
              <select
                aria-label="Agent mode"
                value={chat.mode}
                disabled={chat.locked}
                onChange={(event) => chat.setMode(event.target.value)}
              >
                <option value="auto">Auto</option>
                <option value="ask">Ask</option>
              </select>
            </label>
          )}

          <div className="relative min-w-0 flex-1">
            {isSlashMenuOpen && (
              <SlashCommandMenu
                query={slashQuery}
                selectedIndex={selectedToolIndex}
                onSelect={handleSelectTool}
                onHoverIndex={setSelectedToolIndex}
              />
            )}
            <textarea
              ref={textareaRef}
              rows={1}
              aria-label="Message"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => setIsMenuOpen(false)}
              onClick={() => setIsMenuOpen(false)}
              onKeyDown={handleKeyDown}
              placeholder={
                chat?.interaction
                  ? "Type a message to skip question…"
                  : selectedTool
                    ? `Type a prompt for ${selectedTool.name}…`
                    : "Type a message or '/' for skills…"
              }
              className="ui-input block min-w-0 w-full resize-none rounded-2xl px-4 text-sm transition-all duration-200"
              style={{
                fieldSizing: "content",
                minHeight: "2.75rem",
                maxHeight: "calc(2lh + 1.375rem + 2px)",
                paddingTop: "0.6875rem",
                paddingBottom: "0.6875rem",
                lineHeight: "1.25rem",
                overflowY: "auto",
                resize: "none",
              }}
            />
          </div>
          <button
            type="submit"
            aria-label="Send message"
            disabled={disabled || (!inputValue.trim() && !selectedTool)}
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
