import { useCallback, useState, type CSSProperties } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RoutePendingIndicator from "@/app/RoutePendingIndicator";
import { AgentSessionProvider } from "@/features/agent/AgentSessionProvider";
import V2Sidebar from "../components/V2Sidebar";
import V2Topbar from "../components/V2Topbar";
import V2Dialog from "../components/V2Dialog";
import V2AgentChatBubble from "../components/V2AgentChatBubble";

export default function V2Layout() {
  const { t } = useTranslation("v2");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get("conversation") || undefined;
  const [assistantTarget, setAssistantTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [dock, setDock] = useState({ open: false, width: 420 });
  const handleDockChange = useCallback(
    (open: boolean, width: number) => setDock({ open, width }),
    [],
  );

  return (
    <AgentSessionProvider initialConversationId={initialConversationId}>
      <div
        className="v2-app"
        data-ui-version="v2"
        data-dock={dock.open ? "open" : "closed"}
        data-testid="v2-layout"
        style={{ "--v2-dock-width": `${dock.width}px` } as CSSProperties}
      >
        <a
          href="#v2-main-content"
          className="v2-skip-link fixed left-[24px] top-[-100px] z-2200 p-[12px_20px] [background:var(--v2-surface-solid)] rounded-[12px] [&:focus]:top-[12px]"
        >
          {t("skipToMain")}
        </a>
        <RoutePendingIndicator />

        <div className="v2-shell-container flex items-start mx-auto">
          {/* Desktop Sidebar */}
          <div className="v2-sidebar-desktop [display:none] sticky [@media(min-width:1024px)]:block">
            <V2Sidebar />
          </div>

          {/* Mobile Navigation Drawer */}
          <V2Dialog
            open={isDrawerOpen}
            title={t("orbitV2")}
            onClose={() => setIsDrawerOpen(false)}
            className="max-w-xs p-4"
          >
            <V2Sidebar onNavigate={() => setIsDrawerOpen(false)} />
          </V2Dialog>

          {/* Main Content Area */}
          <div className="v2-main-area flex-1 min-w-[0] [transition:margin-right_160ms_ease] [@media(prefers-reduced-motion:reduce)]:[transition:none]">
            <V2Topbar
              onOpenNavigation={() => setIsDrawerOpen(true)}
              assistantSlotRef={setAssistantTarget}
            />
            <main
              id="v2-main-content"
              className="v2-content-wrapper m-auto min-w-[0] [container-type:inline-size] [container-name:workspace]"
              tabIndex={-1}
            >
              <Outlet />
            </main>
          </div>
        </div>

        <V2AgentChatBubble
          onDockChange={handleDockChange}
          triggerContainer={assistantTarget}
        />
      </div>
    </AgentSessionProvider>
  );
}
