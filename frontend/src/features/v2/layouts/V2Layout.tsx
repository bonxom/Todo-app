import { useCallback, useState, type CSSProperties } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RoutePendingIndicator from "@/app/RoutePendingIndicator";
import { AgentSessionProvider } from "@/features/agent/AgentSessionProvider";
import { useSettingsStore } from "@/stores/useSettingsStore";
import V2Sidebar from "../components/V2Sidebar";
import V2Topbar from "../components/V2Topbar";
import V2Dialog from "../components/V2Dialog";
import V2AgentChatBubble from "../components/V2AgentChatBubble";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "orbit.v2-sidebar-collapsed";

function readInitialSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export default function V2Layout() {
  const { t } = useTranslation("v2");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    readInitialSidebarCollapsed,
  );
  const [assistantTarget, setAssistantTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const [dock, setDock] = useState({ open: false, width: 420 });
  const showFloatingBubble = useSettingsStore(
    (state) => state.agent.showFloatingBubble,
  );
  const handleDockChange = useCallback(
    (open: boolean, width: number) => setDock({ open, width }),
    [],
  );
  const toggleSidebarCollapsed = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        /* Ignore storage errors in restricted contexts. */
      }
      return next;
    });
  }, []);
  const isDockActive = showFloatingBubble && dock.open;

  return (
    <AgentSessionProvider>
      <div
        className="v2-app"
        data-ui-version="v2"
        data-dock={isDockActive ? "open" : "closed"}
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
          <div
            className="v2-sidebar-desktop [display:none] sticky [@media(min-width:1024px)]:block"
            data-collapsed={sidebarCollapsed ? "true" : "false"}
          >
            <V2Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapsed}
            />
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

        {showFloatingBubble && (
          <V2AgentChatBubble
            onDockChange={handleDockChange}
            triggerContainer={assistantTarget}
          />
        )}
      </div>
    </AgentSessionProvider>
  );
}
