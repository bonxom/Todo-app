import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ListFilter, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useTaskFilterStore } from '@/stores/useTaskFilterStore';

const STATUS_OPTIONS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'given-up', label: 'Given Up' },
];

const getAvatarUrl = (user) => {
  const avatarFields = [
    user?.avatarUrl,
    user?.avatar,
    user?.photoURL,
    user?.image,
    user?.profilePicture,
  ];

  return avatarFields.find((value) => typeof value === 'string' && value.trim()) ?? '';
};

const getTopbarContext = (pathname) => {
  if (pathname.startsWith('/dashboard')) {
    return {
      title: 'Today',
      subtitle: 'Tasks and focus for the day',
    };
  }

  if (pathname.startsWith('/categories')) {
    return {
      title: 'Projects',
      subtitle: 'Categories and work streams',
    };
  }

  if (pathname.startsWith('/calendar')) {
    return {
      title: 'Calendar',
      subtitle: 'Deadlines, plans, and schedule',
    };
  }

  if (pathname.startsWith('/statistics')) {
    return {
      title: 'Statistics',
      subtitle: 'Progress and completion trends',
    };
  }

  if (pathname.startsWith('/profile')) {
    return {
      title: 'Account',
      subtitle: 'Profile and settings',
    };
  }

  return {
    title: 'Workspace',
    subtitle: 'Plan, review, and adjust',
  };
};

const Topbar = ({ isDesktop, onOpenSidebar }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const selectedStatuses = useTaskFilterStore((state) => state.selectedStatuses);
  const setSelectedStatuses = useTaskFilterStore((state) => state.setSelectedStatuses);
  const avatarUrl = getAvatarUrl(user);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState('');
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);
  const showAvatar = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;
  const pageContext = getTopbarContext(location.pathname);
  const selectedStatusLabels = STATUS_OPTIONS
    .filter((option) => selectedStatuses.includes(option.id))
    .map((option) => option.label);
  const statusFilterLabel = selectedStatusLabels.length === 0
    ? 'All tasks'
    : selectedStatusLabels.length === 1
      ? selectedStatusLabels[0]
      : `${selectedStatusLabels.length} statuses`;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!statusMenuRef.current?.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleStatusToggle = (status) => {
    setSelectedStatuses(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((selectedStatus) => selectedStatus !== status)
        : [...selectedStatuses, status]
    );
  };

  const handleClearStatuses = () => {
    setSelectedStatuses([]);
  };
  const todayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <header
      className="ui-topbar"
      style={{ left: isDesktop ? 'var(--sidebar-w)' : 0 }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {!isDesktop && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="ui-icon-button ui-focus-ring"
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={handleBack}
          className="ui-icon-button ui-focus-ring"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="ui-topbar-meta">
          <p className="ui-topbar-title">{pageContext.title}</p>
          <p className="ui-topbar-subtitle">
            {pageContext.subtitle} · <span className="ui-tabular">{todayLabel}</span>
          </p>
        </div>
      </div>

      <div className="ui-topbar-actions">
        <div className="ui-global-task-filter" ref={statusMenuRef} data-open={isStatusMenuOpen ? 'true' : 'false'}>
          <button
            type="button"
            onClick={() => setIsStatusMenuOpen((isOpen) => !isOpen)}
            className="ui-global-task-filter__trigger ui-focus-ring"
            aria-expanded={isStatusMenuOpen}
            aria-haspopup="menu"
          >
            <ListFilter className="h-4 w-4" aria-hidden="true" />
            <span>{statusFilterLabel}</span>
            <ChevronDown className="ui-global-task-filter__chevron h-4 w-4" aria-hidden="true" />
          </button>

          {isStatusMenuOpen ? (
            <div className="ui-global-task-filter__menu" role="menu" aria-label="Filter tasks by status">
              <div className="ui-global-task-filter__menu-header">
                <span>Task status</span>
                {selectedStatuses.length > 0 ? (
                  <button
                    type="button"
                    onClick={handleClearStatuses}
                    className="ui-global-task-filter__clear ui-focus-ring"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="ui-global-task-filter__options">
                {STATUS_OPTIONS.map((option) => {
                  const isSelected = selectedStatuses.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={isSelected}
                      onClick={() => handleStatusToggle(option.id)}
                      className="ui-global-task-filter__option ui-focus-ring"
                      data-selected={isSelected ? 'true' : 'false'}
                    >
                      <span className="ui-global-task-filter__check" aria-hidden="true">
                        {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="ui-avatar-button ui-focus-ring"
          aria-label="Go to profile"
        >
          {showAvatar ? (
            <img
              src={avatarUrl}
              alt={user?.name ? `${user.name} avatar` : 'User avatar'}
              className="h-full w-full rounded-full object-cover"
              width={40}
              height={40}
              onError={() => setBrokenAvatarUrl(avatarUrl)}
            />
          ) : (
            <User className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
};

export default Topbar;
