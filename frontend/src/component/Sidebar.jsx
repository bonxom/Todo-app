import { useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { authService } from '../api/apiService';
import { useAuth } from '../context/useAuth';

export const DESKTOP_BREAKPOINT = 1024;
export const drawerWidthExpanded = 272;
export const drawerWidthCollapsed = 88;

const menuItems = [
  {
    path: '/dashboard',
    label: 'Todos',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    path: '/categories',
    label: 'Categories',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
        />
      </svg>
    ),
  },
  {
    path: '/calendar',
    label: 'Calendar',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    path: '/statistics',
    label: 'Statistics',
    icon: (
      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
];

const Sidebar = ({
  isDesktop,
  isExpanded,
  isOpen,
  onClose,
  onToggleExpand,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearSession } = useAuth();
  const previousPathnameRef = useRef(location.pathname);
  const showLabels = !isDesktop || isExpanded;
  const currentDrawerWidth = isDesktop
    ? isExpanded
      ? drawerWidthExpanded
      : drawerWidthCollapsed
    : 'min(18rem, calc(100vw - 1rem))';
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  useEffect(() => {
    if (!isDesktop && isOpen && previousPathnameRef.current !== location.pathname) {
      onClose?.();
    }

    previousPathnameRef.current = location.pathname;
  }, [isDesktop, location.pathname, isOpen, onClose]);

  useEffect(() => {
    if (isDesktop || !isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDesktop, isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
      navigate('/');
    }
  };

  return (
    <>
      {!isDesktop && isOpen && (
        <button
          type="button"
          className="ui-shell-overlay"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className="ui-shell-sidebar"
        data-desktop={isDesktop}
        data-open={isOpen}
        aria-hidden={!isDesktop && !isOpen}
        style={{
          width: currentDrawerWidth,
          padding: showLabels ? '1rem' : '1rem 0.75rem',
        }}
      >
        <div className={`flex ${showLabels ? 'justify-end' : 'justify-center'}`}>
          <button
            type="button"
            onClick={isDesktop ? onToggleExpand : onClose}
            className="ui-icon-button ui-focus-ring"
            aria-label={
              isDesktop
                ? isExpanded
                  ? 'Collapse navigation'
                  : 'Expand navigation'
                : 'Close navigation'
            }
            title={
              isDesktop
                ? isExpanded
                  ? 'Collapse navigation'
                  : 'Expand navigation'
                : 'Close navigation'
            }
          >
            {isDesktop ? (
              isExpanded ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              )
            ) : (
              <X className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <div className={`ui-shell-brand ${showLabels ? '' : 'justify-center'}`}>
          <div className="ui-shell-brand-mark" aria-hidden="true">
            <img src="/ech.jpeg" alt="" className="brand-mark-image" />
          </div>
          {showLabels && (
            <div className="ui-shell-brand-copy">
              <p className="text-sm font-semibold text-[var(--color-text)]">TodoApp</p>
              <p className="ui-tabular text-xs text-[var(--color-text-muted)]">{todayLabel}</p>
            </div>
          )}
        </div>

        {showLabels && (
          <p className="ui-shell-section-label px-1">Workspace</p>
        )}

        <nav className="ui-shell-nav" aria-label="Primary navigation">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`ui-shell-nav-link ui-focus-ring ${showLabels ? '' : 'justify-center'}`}
                data-active={isActive}
                aria-current={isActive ? 'page' : undefined}
                onClick={!isDesktop ? onClose : undefined}
                title={!showLabels ? item.label : undefined}
              >
                <span className="flex-shrink-0" aria-hidden="true">
                  {item.icon}
                </span>
                {showLabels && <span className="ui-shell-nav-label">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--color-line)] pt-3">
          <button
            type="button"
            onClick={handleLogout}
            className={`ui-shell-nav-link ui-focus-ring w-full ${showLabels ? '' : 'justify-center'}`}
            title={!showLabels ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {showLabels && <span className="ui-shell-nav-label">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
