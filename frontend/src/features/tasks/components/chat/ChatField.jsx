import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
import ChatAvatar from "./ChatAvatar";
import { useAuthStore } from "@/stores/useAuthStore";
import AttachmentComposer from "./AttachmentComposer";
import { FILE_ACCEPT, checkFiles } from "./attachmentFiles";
import AttachmentList from "./AttachmentList";
import {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useContext,
  useCallback,
  memo,
} from "react";
import { Send, ArrowRight, Sparkles, Square, Loader2 } from "lucide-react";
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
import { UiSurfaceMessage } from "./A2UI/UiSurfaceMessage";
import { SkillReadBadge } from "@/features/agent/skills/SkillReadBadge";
import { ChatRunStatus } from "./ChatRunStatus";
import AgentProcessPanel from "./AgentProcessPanel";

const USER_MESSAGE_STYLE = {
  color: "var(--chat-user-text, #fff)",
  borderColor: "var(--color-accent)",
  background: "var(--color-accent)",
  boxShadow: "var(--shadow-xs)",
};

const BOT_MESSAGE_STYLE = {
  borderColor: "var(--color-line)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  boxShadow: "var(--shadow-xs)",
};

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  userAvatar,
  avatarAppearance,
  conversationId,
  setProposalDirty,
  disabled,
  wideTranscript,
  isStreamingMessage = false,
}) {
  const { t } = useTranslation("agent");
  const isUser = message.sender === "user";
  const openReply = wideTranscript && !isUser;
  const hasA2ui = Boolean(message.surface || message.proposal);
  const companionText = isUser
    ? undefined
    : message.companionText?.trim() ||
      (hasA2ui
        ? t(message.proposal ? "proposalIntro" : "surfaceIntro")
        : undefined);
  const hasVisibleBody = Boolean(
    message.surface ||
    message.proposal ||
    message.interaction ||
    companionText ||
    (message.text && message.text.length > 0),
  );
  const processPanel = !isUser && (
    <AgentProcessPanel
      toolProgress={message.toolProgress}
      reasoningBlocks={message.reasoningBlocks}
      isLive={isStreamingMessage}
      hasResponseText={Boolean(message.text?.trim() || companionText)}
      compact={!wideTranscript}
    />
  );
  const skillsRead = !isUser && message.skillsRead?.length > 0 && (
    <div className="mt-2 mb-1 flex flex-wrap gap-1.5">
      {message.skillsRead.map((skill) => (
        <SkillReadBadge key={skill.id + ":" + skill.version} skill={skill} />
      ))}
    </div>
  );
  const timestamp = (!isStreamingMessage || hasVisibleBody) && (
    <time
      className="chat-message-time block opacity-[0.75]"
      dateTime={message.timestamp}
      title={formatDateTime(message.timestamp)}
    >
      {new Date(message.timestamp).toLocaleTimeString(getLocale(), {
        hour: "2-digit",
        minute: "2-digit",
      })}
    </time>
  );

  if (
    message.interaction?.kind === "clarification" &&
    message.interaction.status !== "pending"
  ) {
    return (
      <div className="chat-message-row chat-message-row--agent min-w-0 pl-9">
        <InteractionCard interaction={message.interaction}>
          {processPanel}
          {skillsRead}
          {timestamp}
        </InteractionCard>
      </div>
    );
  }

  return (
    <div
      className={`chat-message-row flex items-start gap-[8px] ${isUser ? "chat-message-row--user flex-row-reverse" : "chat-message-row--agent"}`}
    >
      <ChatAvatar
        key={isUser ? userAvatar || "default" : "agent"}
        appearance={avatarAppearance}
        isUser={isUser}
        src={isUser ? userAvatar : undefined}
      />
      <div
        className={`chat-message min-w-0 ${
          openReply
            ? "chat-message--bot w-full max-w-[min(calc(100%_-_36px),88ch)]! pt-0.5 text-base"
            : isUser
              ? "chat-message--user rounded-2xl rounded-br-sm border px-4 py-3"
              : "chat-message--bot w-fit rounded-2xl rounded-bl-sm border px-4 py-3"
        }`}
        style={
          isUser
            ? USER_MESSAGE_STYLE
            : openReply
              ? undefined
              : BOT_MESSAGE_STYLE
        }
      >
        {openReply && (
          <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">
            {t("orbitAgent")}
          </p>
        )}
        {processPanel}
        {hasVisibleBody && (
          <div
            className={`whitespace-pre-wrap ${
              openReply
                ? "wrap-anywhere text-[15px] leading-relaxed [&>h1]:text-[19px] [&>h2]:text-[17px] [&>:is(h3,h4,ol,ul)]:[font-size:inherit] [&>:is(ol,ul)]:[line-height:inherit]"
                : wideTranscript
                  ? "wrap-anywhere text-[15px] leading-normal"
                  : "text-sm break-words"
            }`}
          >
            {hasA2ui && companionText && (
              <div className="mb-3">
                <MarkdownText text={companionText} />
              </div>
            )}
            {message.surface ? (
              <UiSurfaceMessage
                key={`${conversationId}:${message.proposal?.id ?? message.surface.a2ui?.surfaceId ?? message.id}`}
                surface={message.surface}
                conversationId={conversationId}
                turnId={message.turnId}
                actionBindings={message.actionBindings}
                uiActionOutcomes={message.uiActionOutcomes}
                proposalEnvelope={
                  message.proposal
                    ? {
                        proposal: message.proposal,
                        text: message.text,
                        a2ui: message.a2ui,
                        surface: message.surface,
                      }
                    : undefined
                }
                onDirtyChange={setProposalDirty}
                disabled={disabled}
              />
            ) : message.proposal ? (
              <TaskProposalMessage
                key={`${conversationId}:${message.proposal.id}`}
                envelope={{
                  proposal: message.proposal,
                  text: message.text,
                  a2ui: message.a2ui,
                }}
                onDirtyChange={setProposalDirty}
                disabled={disabled}
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
                              isUser
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
        )}
        {skillsRead}
        {message.turnStatus && (
          <ChatRunStatus run={null} status={message.turnStatus} />
        )}
        <AttachmentList
          conversationId={conversationId}
          files={message.attachments}
        />
        {timestamp}
      </div>
    </div>
  );
});

const ChatField = ({
  messages,
  onSendMessage,
  isTyping = false,
  disabled = false,
  chat,
  avatarAppearance = "default",
  showWelcome = true,
  workspaceComposer = false,
  startHeading = /** @type {string | undefined} */ (undefined),
  starters = /** @type {import("react").ReactNode} */ (undefined),
}) => {
  const { t } = useTranslation("agent");
  const wideTranscript = workspaceComposer && !startHeading;

  const userAvatar = useAuthStore((state) => state.user?.avatarUrl);
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
  const [stoppingTurn, setStoppingTurn] = useState(null);
  const [stopErrorTurn, setStopErrorTurn] = useState(null);
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
  const waitingForAnswer = Boolean(interactionId && !showChatInput);
  const interactionBusy = Boolean(
    chat?.loading ||
    chat?.sending ||
    chat?.pending ||
    chat?.error ||
    chat?.isStreaming,
  );
  const interactionFocusRef = useRef(null);
  const interactionContainerRef = useRef(null);

  const handleSwitchToMessage = () => {
    interactionFocusRef.current = "message";
    setMessageInteractionId(interactionId);
  };

  const handleBackToQuestion = () => {
    interactionFocusRef.current = "answer";
    setMessageInteractionId(null);
  };
  const run = chat?.runStream?.snapshot ?? chat?.activeRun;
  const activeRun =
    run?.status === "processing" || run?.status === "stopping" ? run : null;
  const showStop = Boolean(activeRun && chat?.stop);
  const stopping =
    showStop &&
    (activeRun.status === "stopping" || stoppingTurn === activeRun.turnId);
  const actionLabel = t(
    showStop ? (stopping ? "stopping" : "stop") : "sendMessage",
  );

  const stopResponse = async () => {
    if (!showStop || stopping) return;
    const turnId = activeRun.turnId;
    setStoppingTurn(turnId);
    setStopErrorTurn(null);
    try {
      await chat.stop();
    } catch {
      setStopErrorTurn(turnId);
    } finally {
      setStoppingTurn((current) => (current === turnId ? null : current));
    }
  };
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useLayoutEffect(() => {
    const target = interactionFocusRef.current;
    interactionFocusRef.current = null;
    if (target === "message" && showChatInput) {
      textareaRef.current?.focus();
    }
    if (target === "answer" && waitingForAnswer) {
      const card = interactionContainerRef.current?.querySelector("form");
      const answer =
        card?.querySelector("textarea:enabled") ??
        card?.querySelector("input:checked:enabled") ??
        card?.querySelector("input:enabled, button:enabled");
      answer?.focus();
    }
  }, [showChatInput, waitingForAnswer]);

  const availableTools = filterTools(slashQuery);

  const scrollContainerRef = useRef(null);
  const isUserScrolledUp = useRef(false);
  const scrollRafId = useRef(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUp.current = distanceFromBottom > 100;
  };

  const scrollToBottom = useCallback(() => {
    if (isUserScrolledUp.current) return;
    if (
      messagesEndRef.current?.closest(
        '.ui-assistant-presence[data-open="false"]',
      )
    )
      return;

    if (scrollRafId.current !== null) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      messagesEndRef.current?.scrollIntoView?.({
        behavior: "instant",
        block: "end",
      });
    });
  }, []);

  useEffect(() => {
    if (messages.length || isTyping) scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (scrollRafId.current !== null) {
        cancelAnimationFrame(scrollRafId.current);
        scrollRafId.current = null;
      }
    };
  }, []);

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
              : t("unableToSendPleaseTryAgain"),
          );
        }
        return;
      }
      setSubmitting(true);
      isUserScrolledUp.current = false;
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
            : t("unableToSendPleaseTryAgain"),
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
    <div
      className={`flex h-full min-h-0 flex-col ${startHeading ? "overflow-y-auto overscroll-contain" : ""}`}
    >
      {startHeading && (
        <h3 className="mx-auto mt-auto mb-5 w-full max-w-[760px] px-4 pt-6 text-center text-[clamp(1.45rem,3.5vw,2.25rem)] leading-tight font-semibold tracking-tight text-[var(--v2-ink)]">
          {startHeading}
        </h3>
      )}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`chat-messages min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin] [scroll-padding-block:16px] [&>_*]:w-full ${
          wideTranscript
            ? "space-y-6 px-1 py-4 sm:space-y-8"
            : "space-y-4 p-4 [&>_*]:max-w-[760px]"
        } ${startHeading ? "hidden" : ""}`}
      >
        {chat?.before && (
          <button
            type="button"
            className="ui-focus-ring text-sm underline"
            disabled={chat.loading}
            onClick={chat.loadEarlier}
          >
            {t("loadEarlierMessages")}
          </button>
        )}
        {messages.length === 0 ? (
          !showWelcome ? null : chat && !chat.loading && !chat.interaction ? (
            <div
              className="chat-welcome [&_>_h2]:text-[23px] [&_>_h2]:[line-height:1.3] [&_>_h2]:[font-weight:650]
              [&_>_h2]:[letter-spacing:-0.5px] [&_>_h2]:max-w-[320px] [&_>_p]:text-[14px] [&_>_p]:[line-height:1.65]
              [&_>_p]:text-[var(--color-text-muted)] [&_>_p]:mt-[12px] [&_>_p]:max-w-[340px]"
            >
              <div className="chat-welcome-icon grid place-items-center rounded-[16px] text-[var(--color-accent)] [background:var(--color-accent-soft)]">
                <Sparkles size={24} />
              </div>
              <h2>{t("letSMakeYourDayMoreManageable")}</h2>
              <p>{t("planYourDayReviewYourTasksOrBreakDownAGoal")}</p>
              <div
                className="chat-starters grid gap-[8px] [&_button]:flex [&_button]:items-center [&_button]:justify-between
                [&_button]:gap-[12px] [&_button]:rounded-[12px] [&_button]:p-[13px_14px]
                [&_button]:[background:var(--color-surface)] [&_button]:text-left [&_button]:cursor-pointer"
              >
                {[
                  [t("planMyDay"), "Help me plan my tasks for today."],
                  [t("reviewUpcomingTasks"), "Show me my upcoming tasks."],
                  [
                    t("breakDownAGoal"),
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
                    <ArrowRight size={16} aria-hidden="true" />
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
              {t("startWithSomethingYouNeedHelpWith")}
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
              <ChatMessageItem
                key={message.id}
                message={message}
                userAvatar={userAvatar}
                avatarAppearance={avatarAppearance}
                conversationId={chat?.conversationId}
                setProposalDirty={chat?.setProposalDirty}
                disabled={chat?.loading || chat?.sending}
                wideTranscript={wideTranscript}
                isStreamingMessage={Boolean(
                  activeRun && message.id === `${activeRun.turnId}:bot`,
                )}
              />
            ))
        )}

        {isTyping && !activeRun && !chat?.runStream?.streamingMessage && (
          <div className="chat-message-row flex items-start gap-[8px] chat-message-row--agent">
            <ChatAvatar appearance={avatarAppearance} />
            <div
              className={
                wideTranscript
                  ? "chat-message chat-message--bot min-w-0 w-full max-w-[min(calc(100%_-_36px),88ch)]! pt-0.5 text-base"
                  : "chat-message chat-message--bot min-w-0 w-fit rounded-2xl rounded-bl-sm border px-4 py-3"
              }
              style={wideTranscript ? undefined : BOT_MESSAGE_STYLE}
            >
              {wideTranscript && (
                <p className="mb-2 text-sm font-semibold text-[var(--color-text)]">
                  {t("orbitAgent")}
                </p>
              )}
              <AgentProcessPanel
                toolProgress={[]}
                isLive
                hasResponseText={false}
                compact={!wideTranscript}
              />
            </div>
          </div>
        )}

        <ChatRunStatus
          run={activeRun}
          connection={chat?.runStream?.connection ?? chat?.connection ?? "idle"}
          hideToolProgress
          onStop={undefined}
          onReconnect={chat?.reconnect}
        />

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
        aria-label={t("chooseFiles")}
        className="hidden"
        disabled={disabled || submitting}
        onChange={chooseFiles}
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.gif,.webp"
        aria-label={t("chooseImages")}
        className="hidden"
        disabled={disabled || submitting}
        onChange={chooseFiles}
      />
      {selectedTool && (
        <div className="shrink-0 px-3 sm:px-4 py-1.5 flex items-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 shadow-xs text-xs animate-in fade-in duration-150">
            <span className="text-[11px] font-medium text-[var(--color-text-muted)] select-none">
              {t("skillsLabel")}
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
        className={`chat-composer relative shrink-0 ${workspaceComposer ? "agent-workspace-composer mx-auto w-full" : ""} ${startHeading ? "max-w-[760px]" : ""} [&_>_.chat-error]:shrink-0 [&_>_.chat-error]:mb-[10px] ${chat?.interaction && !showChatInput ? "chat-composer--answer flex flex-col min-h-[0] [&_>_form]:min-h-[0]" : ""}`}
      >
        {chat?.error && (
          <div
            className="chat-error [border:1px_solid_var(--color-danger)] [background:var(--color-danger-soft)]
            text-[var(--color-text)] p-[12px] [line-height:1.5] [&_[role=alert]]:mb-[4px] [&_[role=alert]]:max-h-[60px]
            [&_[role=alert]]:overflow-y-auto [@media(max-height:550px)]:[&_>_.text-xs]:[display:none]"
          >
            <p role="alert">{chat.error}</p>
            <p className="text-xs">
              {t("yourRequestIsNotCompleteTryAgainOrReloadTheConversation")}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {chat.pending && (
                <button
                  type="button"
                  className="chat-recovery [border:1px_solid_var(--color-line)] p-[7px_10px] rounded-[8px] [background:var(--color-surface)] cursor-pointer ui-focus-ring"
                  aria-label={t("retryMessage")}
                  disabled={chat.loading || chat.sending}
                  onClick={() => chat.send()}
                >
                  {t("retryMessage")}
                </button>
              )}
              <button
                type="button"
                className="chat-recovery [border:1px_solid_var(--color-line)] p-[7px_10px] rounded-[8px] [background:var(--color-surface)] cursor-pointer ui-focus-ring"
                aria-label={t("reloadConversation")}
                disabled={chat.loading || chat.sending}
                onClick={chat.reload}
              >
                {t("reloadConversation")}
              </button>
            </div>
          </div>
        )}
        {chat?.pending && !chat.error && !chat.sending && (
          <div
            className="chat-pending flex flex-wrap items-center gap-[8px] text-[12px] mb-[10px] text-[var(--color-text-muted)]"
            role="status"
          >
            <span>
              {t(
                "yourRequestIsProcessingCheckTheResultBeforeSendingAnotherMessage",
              )}
            </span>
            <button
              type="button"
              aria-label={t("reloadConversation")}
              className="chat-recovery [border:1px_solid_var(--color-line)] p-[7px_10px] rounded-[8px] [background:var(--color-surface)] cursor-pointer ui-focus-ring"
              disabled={chat.loading}
              onClick={chat.reload}
            >
              {t("checkResult")}
            </button>
          </div>
        )}
        {chat?.interaction && showChatInput && (
          <div className="mb-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <button
                type="button"
                onClick={handleBackToQuestion}
                disabled={chat.sending}
                className="ui-focus-ring min-h-11 rounded-md px-1 font-medium text-[var(--color-accent-strong)] disabled:opacity-60"
              >
                {t("backToQuestion")}
              </button>
              <button
                type="button"
                onClick={() => chat.answer(undefined, true)}
                disabled={interactionBusy}
                className="ui-focus-ring min-h-11 rounded-md px-1 font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-60"
              >
                {t("skipQuestion")}
              </button>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {t("yourNewMessageWillReplaceThePendingQuestion")}
            </span>
          </div>
        )}
        {chat?.interaction && (
          <div
            ref={interactionContainerRef}
            hidden={showChatInput}
            className={showChatInput ? "hidden" : "contents"}
          >
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
            <InteractionCard
              key={chat.interaction.id}
              interaction={chat.interaction}
              onAnswer={chat.answer}
              onCancel={() => chat.answer(undefined, true)}
              disabled={interactionBusy}
              sending={chat.sending}
              docked
              onSwitchToMessage={handleSwitchToMessage}
            />
          </div>
        )}
        {showStop && stopErrorTurn === activeRun.turnId && (
          <p
            role="alert"
            className="mb-2 px-2 text-sm text-[var(--color-danger)]"
          >
            {t("stopFailed")}
          </p>
        )}
        <form
          onSubmit={handleSubmit}
          hidden={waitingForAnswer && !showStop}
          className={`chat-input-form mx-auto [&[hidden]]:[display:none] ${wideTranscript ? "w-full" : "max-w-[760px]"} ${workspaceComposer ? "grid grid-cols-[minmax(0,1fr)_auto] items-center px-1" : "flex items-end"}`}
        >
          {(!workspaceComposer || !waitingForAnswer) && (
            <ChatToolbar
              chat={chat}
              workspace={workspaceComposer}
              disabled={disabled || submitting}
              onFiles={() => fileInputRef.current?.click()}
              onImages={() => imageInputRef.current?.click()}
            />
          )}
          <div
            hidden={workspaceComposer && waitingForAnswer}
            className={`relative min-w-0 flex-1 ${workspaceComposer ? "col-span-2 row-start-1" : ""}`}
          >
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
              aria-label={t("message")}
              disabled={submitting}
              value={inputValue}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={
                chat?.interaction ? t("newRequest") : t("messageOrbit")
              }
              className={`chat-input block w-full resize-none [field-sizing:content] [&:placeholder-shown]:whitespace-nowrap
                [&:placeholder-shown]:overflow-hidden [&:placeholder-shown]:text-ellipsis ui-focus-ring ${startHeading ? "agent-start-input" : wideTranscript ? "agent-active-input" : ""}`}
            />
          </div>
          <button
            type={showStop ? "button" : "submit"}
            aria-label={actionLabel}
            title={actionLabel}
            onClick={showStop ? stopResponse : undefined}
            disabled={
              showStop
                ? stopping
                : disabled ||
                  submitting ||
                  (!inputValue.trim() && (files.length > 0 || !selectedTool))
            }
            className={`chat-send grid size-11 shrink-0 cursor-pointer place-items-center border border-transparent bg-[var(--color-accent)] ui-focus-ring disabled:border-[var(--color-line)] ${workspaceComposer ? "col-start-2 self-end rounded-full!" : ""}`}
          >
            {showStop ? (
              stopping ? (
                <Loader2
                  size={18}
                  className="motion-safe:animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Square size={16} className="fill-current" aria-hidden="true" />
              )
            ) : (
              <Send size={18} aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
      {starters && <div className="mt-4 mb-auto px-0.5 pb-8">{starters}</div>}
    </div>
  );
};

export default memo(ChatField);
