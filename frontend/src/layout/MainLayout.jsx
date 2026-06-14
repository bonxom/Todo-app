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
          className="ui-main-shell"
          style={{
            marginLeft: `var(--sidebar-w)`,
            paddingTop: `${TOPBAR_HEIGHT}px`, 
          }}
        >
          <div className="ui-main-content">{children}</div>
        </main>
      </div>
    </>
  );
};

export default MainLayout;
