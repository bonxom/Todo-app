import MainLayout from "../shared/layouts/MainLayout";
import { AgentChatBubble } from "../features/agent/AgentChatBubble";
import { AgentSessionProvider } from "../features/agent/AgentSessionProvider";

export default function V1RouteLayout() {
  return (
    <AgentSessionProvider>
      <MainLayout assistant={<AgentChatBubble />} />
    </AgentSessionProvider>
  );
}
