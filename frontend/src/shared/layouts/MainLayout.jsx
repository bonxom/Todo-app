import { useEffect, useState } from "react";
import Sidebar, {
  DESKTOP_BREAKPOINT,
  drawerWidthCollapsed,
  drawerWidthExpanded,
} from "../components/Sidebar";
import Topbar from "../components/Topbar";

const TOPBAR_HEIGHT = 64;

const MainLayout = ({ children }) => {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") {
      return true;
    }

    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const syncViewport = (event) => {
      setIsDesktop(event.matches);
      if (event.matches) {
        setIsSidebarOpen(false);
      }
    };

    syncViewport(mediaQuery);
    mediaQuery.addEventListener("change", syncViewport);

    return () => {
      mediaQuery.removeEventListener("change", syncViewport);
    };
  }, []);

  const sidebarWidth = isDesktop
    ? isSidebarExpanded
      ? drawerWidthExpanded
      : drawerWidthCollapsed
    : 0;

  return (
    <div style={{ "--sidebar-w": `${sidebarWidth}px` }}>
      <Sidebar
        isDesktop={isDesktop}
        isExpanded={isSidebarExpanded}
        isOpen={isDesktop || isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onToggleExpand={() => setIsSidebarExpanded((current) => !current)}
      />

      <Topbar
        isDesktop={isDesktop}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      <main
        className="ui-main-shell"
        style={{
          marginLeft: isDesktop ? "var(--sidebar-w)" : 0,
          paddingTop: `${TOPBAR_HEIGHT}px`,
        }}
      >
        <div className="ui-main-content">{children}</div>
      </main>
    </div>
  );
};

export default MainLayout;
