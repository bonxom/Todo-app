import { useNavigate } from "react-router-dom";
import ChatBubble from "@/features/tasks/components/chat";
import { useAgentSession } from "./agentSessionContext";
export function AgentChatBubble() {
  const navigate = useNavigate();
  const { chat } = useAgentSession();
  return (
    <ChatBubble
      onOpenInAgent={() =>
        navigate(
          chat.conversationId
            ? `/agent?conversation=${chat.conversationId}`
            : chat.context?.projectId
              ? `/agent?project=${encodeURIComponent(chat.context.projectId)}`
              : "/agent",
          { state: { assistantHandoff: true } },
        )
      }
    />
  );
}
