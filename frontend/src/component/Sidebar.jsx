import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const drawerWidthExpanded = 304;
export const drawerWidthCollapsed = 80;

const Sidebar = ({ onWidthChange }) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);

  const currentDrawerWidth = isExpanded ? drawerWidthExpanded : drawerWidthCollapsed;

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      onWidthChange(currentDrawerWidth);
    }
  }, [currentDrawerWidth, onWidthChange]);

  const menuItems = [
    {
      path: '/',
      label: 'Todos',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      path: '/categories',
      label: 'Categories',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className="bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto overflow-x-hidden transition-all duration-300 z-20"
      style={{
        width: `${currentDrawerWidth}px`,
        padding: isExpanded ? '24px 20px' : '24px 12px',
      }}
    >
      <div className="flex flex-col gap-4 h-full">
        {/* Toggle Button */}
        <div className={`flex ${isExpanded ? 'justify-end' : 'justify-center'} mb-2`}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isExpanded ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Title */}
        {isExpanded && (
          <div className="text-center mb-4 mt-2">
            <h1 className="text-2xl font-bold text-purple-600 mb-2">My Todo App</h1>
            <p className="text-sm text-gray-500">Stay organized and productive</p>
          </div>
        )}

        {/* MENU */}
        {isExpanded && (
          <div className="text-xs font-semibold text-gray-500 mt-1 mb-[-4px]">Menu</div>
        )}

        <nav className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 p-2.5 cursor-pointer transition-all duration-200 rounded-lg ${
                  isExpanded ? 'justify-start' : 'justify-center'
                } ${
                  isActive
                    ? 'bg-purple-100 text-purple-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                title={!isExpanded ? item.label : ''}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {isExpanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;

