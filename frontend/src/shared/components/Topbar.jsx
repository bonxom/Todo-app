import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ListFilter, Menu, User } from 'lucide-react';
import { useAuth } from '@/context/useAuth';
import { useTaskFilter } from '@/context/useTaskFilter';

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
  const { user } = useAuth();
  const { onlyInProgress, toggleOnlyInProgress } = useTaskFilter();
  const avatarUrl = getAvatarUrl(user);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState('');
  const showAvatar = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;
  const pageContext = getTopbarContext(location.pathname);
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
        <button
          type="button"
          onClick={toggleOnlyInProgress}
          className="ui-global-task-filter ui-focus-ring"
          aria-pressed={onlyInProgress}
          data-active={onlyInProgress ? 'true' : 'false'}
        >
          <ListFilter className="h-4 w-4" aria-hidden="true" />
          <span>Only show in-progress</span>
        </button>

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
