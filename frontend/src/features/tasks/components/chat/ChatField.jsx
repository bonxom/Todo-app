import AttachmentComposer from "./AttachmentComposer";
import { FILE_ACCEPT, checkFiles } from "./attachmentFiles";
import AttachmentList from "./AttachmentList";
import { useState, useRef, useEffect, useContext, useCallback } from "react";
import { Send, ArrowUpRight, Sparkles } from "lucide-react";
import { AgentSessionContext } from "@/features/agent/agentSessionContext";
import ChatToolbar from "./ChatToolbar";
import InteractionCard from "./InteractionCard";
import RecentConversations from "./RecentConversations";
import MarkdownText from "./MarkdownText";
import ToolBadge from "./ToolBadge";
import SlashCommandMenu from "./SlashCommandMenu";
import { filterTools } from "./toolCatalog";
import { formatDateTime } from "@/shared/utils/dateTime";
import { TaskProposalMessage } from "./A2UI/TaskProposalMessage";
import { SkillReadBadge } from "@/features/agent/skills/SkillReadBadge";

const ChatField = ({
  messages,
  onSendMessage,
  isTyping = false,
  disabled = false,
  chat,
}) => {
  const agentSession = useContext(AgentSessionContext);
  const [localFiles, setLocalFiles] = useState([]);
  const [localInputValue, setLocalInputValue] = useState("");

  const files = agentSession ? agentSession.draft.files : localFiles;
  const setFiles = useCallback(
    (action) => {
      if (agentSession) {
        agentSession.setDraft((prev) => ({
          ...prev,
          files: typeof action === "function" ? action(prev.files) : action,
        }));
      } else {
        setLocalFiles(action);
      }
    },
    [agentSession],
  );

  const inputValue = agentSession ? agentSession.draft.text : localInputValue;
  const setInputValue = useCallback(
    (action) => {
      if (agentSession) {
        agentSession.setDraft((prev) => ({
          ...prev,
          text: typeof action === "function" ? action(prev.text) : action,
        }));
      } else {
        setLocalInputValue(action);
      }
    },
    [agentSession],
  );

  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const previousConversation = useRef(chat?.conversationId);
  useEffect(() => {
    if (
      previousConversation.current &&
      previousConversation.current !== chat?.conversationId
    ) {
      if (!agentSession) {
        setFiles([]);
        setInputValue("");
      }
      setFileError(null);
      setSelectedTool(null);
      setIsSlashMenuOpen(false);
    }
    previousConversation.current = chat?.conversationId;
  }, [chat?.conversationId, agentSession, setFiles, setInputValue]);
  const chooseFiles = (event) => {
    const next = [...files, ...Array.from(event.target.files || [])];
    event.target.value = "";
    const error = checkFiles(next);
    setFileError(error);
    if (!error) setFiles(next);
  };

  const handlePaste = (event) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    let pastedFiles = [];
    if (clipboardData.files && clipboardData.files.length > 0) {
      pastedFiles = Array.from(clipboardData.files).filter(
        (file) => file.type && file.type.startsWith("image/"),
      );
    } else if (clipboardData.items && clipboardData.items.length > 0) {
      const items = Array.from(clipboardData.items);
      const imageItems = items.filter(
        (item) => item.type && item.type.startsWith("image/"),
      );
      pastedFiles = imageItems
        .map((item) =>
          typeof item.getAsFile === "function" ? item.getAsFile() : null,
        )
        .filter(Boolean);
    }

    if (pastedFiles.length > 0) {
      event.preventDefault();
      const next = [...files, ...pastedFiles];
      const error = checkFiles(next);
      setFileError(error);
      if (!error) setFiles(next);
    }
  };
  const [selectedTool, setSelectedTool] = useState(null);
  const [slashQuery, setSlashQuery] = useState("");
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [selectedToolIndex, setSelectedToolIndex] = useState(0);
  const [messageInteractionId, setMessageInteractionId] = useState(null);
  const interactionId = chat?.interaction?.id;
  const showChatInput =
    Boolean(interactionId) && messageInteractionId === interactionId;
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const availableTools = filterTools(slashQuery);

  const userMessageStyle = {
    color: "var(--chat-user-text, #fff)",
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
    if (
      messagesEndRef.current?.closest(
        '.ui-assistant-presence[data-open="false"]',
      )
    )
      return;
    messagesEndRef.current?.scrollIntoView?.({
      behavior: "instant",
      block: "end",
    });
  };

  useEffect(() => {
    if (messages.length || isTyping) scrollToBottom();
  }, [messages, isTyping]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    // If no tool selected yet, check for slash trigger
    if (!selectedTool && !disabled) {
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

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    const trimmed = inputValue.trim();
    if (
      (trimmed || selectedTool) &&
      (!files.length || trimmed) &&
      !disabled &&
      !submitting
    ) {
      const fullMessage = selectedTool
        ? `[Skill: ${selectedTool.id}] ${trimmed}`
        : trimmed;

      if (!files.length) {
        setInputValue("");
        setSelectedTool(null);
        setIsSlashMenuOpen(false);
        const restoreDraft = () => {
          setInputValue((current) =>
            current ? `${trimmed}\n\n${current}` : trimmed,
          );
          setSelectedTool((current) => current ?? selectedTool);
        };
        try {
          if ((await onSendMessage(fullMessage)) === false) restoreDraft();
        } catch (error) {
          restoreDraft();
          setFileError(
            error instanceof Error
              ? error.message
              : "Unable to send. Please try again.",
          );
        }
        return;
      }
      setSubmitting(true);
      try {
        const accepted = files.length
          ? await onSendMessage(fullMessage, undefined, files)
          : await onSendMessage(fullMessage);
        if (accepted !== false) {
          setInputValue("");
          setFiles([]);
          setFileError(null);
          setSelectedTool(null);
          setIsSlashMenuOpen(false);
        }
      } catch (error) {
        setFileError(
          error instanceof Error
            ? error.message
            : "Unable to send. Please try again.",
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.nativeEvent.isComposing) return;
    if (isSlashMenuOpen && e.key === "Escape") {
      e.preventDefault();
      setIsSlashMenuOpen(false);
      return;
    }
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
      <div className="chat-messages min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
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
            <div className="chat-welcome">
              <div className="chat-welcome-icon">
                <Sparkles size={24} />
              </div>
              <h2>Let's make your day more manageable.</h2>
              <p>Plan your day, review your tasks, or break down a goal.</p>
              <div className="chat-starters">
                {[
                  ["Plan my day", "Help me plan my tasks for today."],
                  ["Review upcoming tasks", "Show me my upcoming tasks."],
                  [
                    "Break down a goal",
                    "Help me break down a goal into actionable steps.",
                  ],
                ].map(([label, prompt]) => (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setInputValue(prompt);
                      textareaRef.current?.focus();
                    }}
                  >
                    <span>{label}</span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
              <RecentConversations
                onOpen={chat.openConversation}
                disabled={chat.locked}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">
              Start with something you need help with.
            </div>
          )
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
                  className={`chat-message ${message.sender === "user" ? "chat-message--user" : "chat-message--bot"} rounded-2xl px-4 py-3 ${
                    message.sender === "user"
                      ? "rounded-br-sm border"
                      : "rounded-bl-sm border"
                  }`}
                  style={
                    message.sender === "user"
                      ? userMessageStyle
                      : botMessageStyle
                  }
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.proposal ? (
                      <TaskProposalMessage
                        key={`${chat?.conversationId}:${message.proposal.id}`}
                        envelope={{
                          proposal: message.proposal,
                          text: message.text,
                          a2ui: message.a2ui,
                        }}
                        onDirtyChange={chat?.setProposalDirty}
                        disabled={chat?.loading || chat?.sending}
                      />
                    ) : message.interaction ? (
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
                                        ? "bg-white/20 border-white/40 text-inherit"
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
                  {message.sender !== "user" &&
                    message.skillsRead &&
                    message.skillsRead.length > 0 && (
                      <div className="mt-2 mb-1 flex flex-wrap gap-1.5">
                        {message.skillsRead.map((skill) => (
                          <SkillReadBadge
                            key={`${skill.id}:${skill.version}`}
                            skill={skill}
                          />
                        ))}
                      </div>
                    )}
                  <AttachmentList
                    conversationId={chat?.conversationId}
                    files={message.attachments}
                  />
                  <time
                    className="chat-message-time"
                    dateTime={message.timestamp}
                    title={formatDateTime(message.timestamp)}
                  >
                    {new Date(message.timestamp).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
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
              <div
                className="flex items-center space-x-1"
                role="status"
                aria-label="Processing request"
              >
                <span className="mr-2 text-xs">Processing</span>
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

      <AttachmentComposer
        files={files}
        disabled={disabled || submitting}
        onRemove={(index) => {
          setFiles((current) => current.filter((_, i) => i !== index));
          setFileError(null);
        }}
      />
      {(fileError || chat?.uploadError) && (
        <p role="alert" className="px-4 pb-2 text-sm text-red-600">
          {fileError || chat.uploadError}
        </p>
      )}
      {chat?.uploadProgress && (
        <p
          role="status"
          className="px-4 pb-2 text-xs text-[var(--color-text-muted)]"
        >
          {chat.uploadProgress}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={FILE_ACCEPT}
        aria-label="Choose files"
        className="hidden"
        disabled={disabled || submitting}
        onChange={chooseFiles}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp"
        aria-label="Choose images"
        className="hidden"
        disabled={disabled || submitting}
        onChange={chooseFiles}
      />
      {selectedTool && (
        <div className="shrink-0 px-3 sm:px-4 py-1.5 flex items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 shadow-xs text-xs animate-in fade-in duration-150">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] select-none">
              Skills:
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

      <div
        className={`chat-composer ${chat?.interaction && !showChatInput ? "chat-composer--answer" : ""}`}
      >
        {chat?.error && (
          <div className="chat-error">
            <p role="alert">{chat.error}</p>
            <p className="text-xs">
              Your request is not complete. Try again or reload the
              conversation.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {chat.pending && (
                <button
                  type="button"
                  className="chat-recovery ui-focus-ring"
                  aria-label="Retry message"
                  disabled={chat.loading || chat.sending}
                  onClick={() => chat.send()}
                >
                  Retry message
                </button>
              )}
              <button
                type="button"
                className="chat-recovery ui-focus-ring"
                aria-label="Reload conversation"
                disabled={chat.loading || chat.sending}
                onClick={chat.reload}
              >
                Reload conversation
              </button>
            </div>
          </div>
        )}
        {chat?.pending && !chat.error && !chat.sending && (
          <div className="chat-pending" role="status">
            <span>
              Your request is processing. Check the result before sending
              another message.
            </span>
            <button
              type="button"
              aria-label="Reload conversation"
              className="chat-recovery ui-focus-ring"
              disabled={chat.loading}
              onClick={chat.reload}
            >
              Check result
            </button>
          </div>
        )}
        {chat?.interaction && showChatInput && (
          <div className="chat-answer-back">
            <button
              type="button"
              aria-label="← Back to question"
              onClick={() => setMessageInteractionId(null)}
              className="ui-focus-ring"
            >
              ← Back to question
            </button>
            <span>Your new message will replace the pending question.</span>
          </div>
        )}
        {chat?.interaction && !showChatInput && (
          <div className="flex flex-wrap gap-2">
            {(
              messages.find(
                (message) => message.interaction?.id === chat.interaction.id,
              )?.skillsRead ?? []
            ).map((skill) => (
              <SkillReadBadge
                key={`${skill.id}:${skill.version}`}
                skill={skill}
              />
            ))}
          </div>
        )}
        {chat?.interaction && !showChatInput && (
          <InteractionCard
            key={chat.interaction.id}
            interaction={chat.interaction}
            onAnswer={chat.answer}
            onCancel={() => chat.answer(undefined, true)}
            disabled={
              chat.loading ||
              chat.sending ||
              Boolean(chat.pending) ||
              Boolean(chat.error)
            }
            sending={chat.sending}
            docked
            onSwitchToMessage={() => setMessageInteractionId(interactionId)}
          />
        )}
        <form
          onSubmit={handleSubmit}
          hidden={Boolean(chat?.interaction && !showChatInput)}
          className="chat-input-form"
        >
          <ChatToolbar
            chat={chat}
            disabled={disabled || submitting}
            onFiles={() => fileInputRef.current?.click()}
            onImages={() => imageInputRef.current?.click()}
          />
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
              disabled={submitting}
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={
                chat?.interaction ? "New request…" : "Message Orbit…"
              }
              className="chat-input ui-focus-ring"
            />
          </div>
          <button
            type="submit"
            aria-label="Send message"
            title="Send message"
            disabled={
              disabled ||
              submitting ||
              (!inputValue.trim() && (files.length > 0 || !selectedTool))
            }
            className="chat-send ui-focus-ring"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatField;
