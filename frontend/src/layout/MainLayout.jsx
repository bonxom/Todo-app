import { useState } from "react";
import Sidebar, { drawerWidthCollapsed } from "../component/Sidebar";
import Topbar from "../component/Topbar";

const TOPBAR_HEIGHT = 64;

const MainLayout = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(drawerWidthCollapsed);

  return (
    <>
      <Sidebar onWidthChange={setSidebarWidth} />

      {/* Wrapper để share sidebar width cho Topbar */}
      <div style={{ "--sidebar-w": `${sidebarWidth}px` }}>
        <Topbar />

        {/* Main content: chừa chỗ cho topbar */}
        <main
          className="min-h-screen transition-all duration-300"
          style={{
            marginLeft: `var(--sidebar-w)`,
            paddingTop: `${TOPBAR_HEIGHT}px`, 
            backgroundColor: "rgba(255, 255, 255, 0.4)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        >
          <div className="p-6">{children}</div>
        </main>
      </div>
    </>
  );
};

export default MainLayout;
