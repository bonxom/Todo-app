import { useState } from "react";
import { X, Maximize2, Minimize2, MessageSquare, Sparkles } from "lucide-react";
import { useConversationChat } from "../../hooks/useConversationChat";
import ChatField from "./ChatField";
import { useGenerateTasksMutation } from "../../api/aiMutations";
import { formatDateTime } from "@/shared/utils/dateTime";

const SmallChat = ({ onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const chat = useConversationChat();
  const generateTasksMutation = useGenerateTasksMutation();
  const [mode, setMode] = useState("chat"); // 'chat' or 'taskAssistant'
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "bot",
      text: "Hi! Describe a goal and I can generate tasks for you.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleModeChange = (newMode) => setMode(newMode);

  const handleSendMessage = async (text) => {
    if (mode === "chat") {
      await chat.send(text);
      return;
    }
    if (isTyping) return;
    const newMessage = {
      id: Date.now().toString(),
      sender: "user",
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMessage]);

    setIsTyping(true);
    try {
        // Task Assistant mode - generate tasks
        const response = await generateTasksMutation.mutateAsync({
          userRequirement: text,
        });

        console.log("AI generateTasks response:", response);

        // Validate response structure before processing
        if (
          response &&
          response.success === true &&
          Array.isArray(response.data) &&
          response.data.length > 0
        ) {
          const tasksText = `Great! I've created **${response.data.length} task${response.data.length > 1 ? "s" : ""}** for you:\n\n${response.data
            .map(
              (task, index) =>
                `**${index + 1}. ${task.title}**\n${task.description || ""}\nPriority: ${task.priority || "Medium"}${task.dueDate ? `\nDue: ${formatDateTime(task.dueDate)}` : ""}`,
            )
            .join("\n\n")}\n\nCheck your todo list to see them!`;

          const botResponse = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: tasksText,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, botResponse]);
        } else {
          // More specific error message for task generation
          console.log("Task generation failed. Response:", response);
          const errorMessage =
            response && response.message
              ? response.message
              : "Sorry, I couldn't generate tasks from your description. Please try to be more specific about what you want to accomplish.";

          const errorResponse = {
            id: (Date.now() + 1).toString(),
            sender: "bot",
            text: errorMessage,
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errorResponse]);
        }
    } catch (error) {
      console.error("Error getting AI response:", error);

      // Provide more helpful error messages based on error type
      let errorMessage = "Sorry, something went wrong. Please try again.";

      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        errorMessage =
          "The request took too long. Please try again with a shorter message.";
      } else if (error.response) {
        // Server responded with error
        if (error.response.status === 500) {
          errorMessage =
            "The AI service is having issues. Please try again in a moment.";
        } else if (error.response.status === 401) {
          errorMessage = "Authentication error. Please log in again.";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.request) {
        // Request made but no response
        errorMessage =
          "Cannot connect to the AI service. Please check your internet connection.";
      }

      const errorResponse = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: errorMessage,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div
      className={`ui-assistant-panel${isExpanded ? " ui-assistant-panel--expanded" : ""}`}
      role="region"
      aria-label="Assistant chat"
    >
      <div className="ui-assistant-header">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="ui-assistant-status">
            <div className="ui-assistant-status-dot" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--color-text)]">
                {mode === "chat" ? "Assistant" : "Task assistant"}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {mode === "chat"
                  ? "Ask questions and get planning help"
                  : "Describe a goal and generate tasks"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsExpanded((expanded) => !expanded)}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label={isExpanded ? "Restore chat size" : "Expand chat"}
              title={isExpanded ? "Restore chat size" : "Expand chat"}
              aria-pressed={isExpanded}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ui-icon-button ui-focus-ring h-8 w-8"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="ui-assistant-toggle"
          role="group"
          aria-label="Assistant mode"
        >
          <button
            type="button"
            onClick={() => handleModeChange("chat")}
            className="ui-assistant-toggle-button ui-focus-ring"
            data-active={mode === "chat"}
            aria-pressed={mode === "chat"}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("taskAssistant")}
            className="ui-assistant-toggle-button ui-focus-ring"
            data-active={mode === "taskAssistant"}
            aria-pressed={mode === "taskAssistant"}
          >
            <Sparkles className="h-4 w-4" />
            Tasks
          </button>
        </div>
      </div>

      {mode === "chat" && (chat.loading || chat.error || chat.pending || chat.before) && (
        <div className="border-b border-[var(--color-line)] p-3 text-sm" aria-live="polite">
          {chat.loading && <p>Loading conversation…</p>}
          {chat.error && <p role="alert">{chat.error}</p>}
          {chat.pending && <button type="button" disabled={chat.sending || chat.loading} onClick={() => chat.send()} className="ui-focus-ring underline">Check reply / Retry</button>}
          {chat.error && !chat.pending && <button type="button" disabled={chat.loading} onClick={chat.reload} className="ui-focus-ring underline">Reload conversation</button>}
          {chat.before && <button type="button" disabled={chat.loading || chat.sending} onClick={chat.loadEarlier} className="ui-focus-ring ml-2 underline">Load earlier messages</button>}
        </div>
      )}
      <div className="flex-1 overflow-hidden bg-[var(--color-canvas)]">
        <ChatField
          key={mode === "chat" ? chat.conversationId ?? "new" : "tasks"}
          messages={mode === "chat" ? chat.messages : messages}
          onSendMessage={handleSendMessage}
          isTyping={mode === "chat" ? chat.sending : isTyping}
          disabled={mode === "chat" ? chat.loading || chat.sending || Boolean(chat.pending) || Boolean(chat.error) : isTyping}
        />
      </div>
    </div>
  );
};

export default SmallChat;
