import MainLayout from "../shared/layouts/MainLayout";
import { AgentChatBubble } from "../features/agent/AgentChatBubble";
import { AgentSessionProvider } from "../features/agent/AgentSessionProvider";
import { useSettingsStore } from "../stores/useSettingsStore";

export default function V1RouteLayout() {
  const showFloatingBubble = useSettingsStore(
    (state) => state.agent.showFloatingBubble,
  );

  return (
    <AgentSessionProvider>
      <MainLayout assistant={showFloatingBubble ? <AgentChatBubble /> : null} />
    </AgentSessionProvider>
  );
}
