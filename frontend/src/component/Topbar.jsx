const Topbar = () => {
  return (
    <header
      className="h-16 bg-white border-b border-gray-200 fixed top-0 right-0 z-40 flex items-center justify-between px-6"
      style={{ left: "var(--sidebar-w)" }}
    >
      <h2 className="text-lg font-semibold text-gray-800">Dashboard</h2>
      {/* ... */}
    </header>
  );
};

export default Topbar;
