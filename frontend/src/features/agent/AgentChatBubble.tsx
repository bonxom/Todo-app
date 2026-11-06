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
            : "/agent",
        )
      }
    />
  );
}
