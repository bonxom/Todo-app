import { useCallback, useState, type CSSProperties } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RoutePendingIndicator from "@/app/RoutePendingIndicator";
import { AgentSessionProvider } from "@/features/agent/AgentSessionProvider";
import V2Sidebar from "../components/V2Sidebar";
import V2Topbar from "../components/V2Topbar";
import V2Dialog from "../components/V2Dialog";
import V2AgentChatBubble from "../components/V2AgentChatBubble";
import "../styles/tokens.css";
import "../styles/v2.css";

export default function V2Layout() {
  const { t } = useTranslation("v2");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialConversationId = searchParams.get("conversation") || undefined;
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
        <a href="#v2-main-content" className="v2-skip-link">
          {t("skipToMain")}
        </a>
        <RoutePendingIndicator />

        <div className="v2-shell-container">
          {/* Desktop Sidebar */}
          <div className="v2-sidebar-desktop">
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
          <div className="v2-main-area">
            <V2Topbar onOpenNavigation={() => setIsDrawerOpen(true)} />
            <main
              id="v2-main-content"
              className="v2-content-wrapper"
              tabIndex={-1}
            >
              <Outlet />
            </main>
          </div>
        </div>

        <V2AgentChatBubble onDockChange={handleDockChange} />
      </div>
    </AgentSessionProvider>
  );
}
