import { useTranslation } from "react-i18next";
import { getLocale } from "../i18n";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import LanguageSelect from "./LanguageSelect";
import ThemeToggle from "./ThemeToggle";
import VersionSwitcher from "./VersionSwitcher";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ListFilter,
  Menu,
  User,
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useTaskFilterStore } from "@/stores/useTaskFilterStore";

const STATUS_OPTIONS = [
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
  { id: "given-up", label: "Given Up" },
];

const getAvatarUrl = (user) => {
  const avatarFields = [
    user?.avatarUrl,
    user?.avatar,
    user?.photoURL,
    user?.image,
    user?.profilePicture,
  ];

  return (
    avatarFields.find((value) => typeof value === "string" && value.trim()) ??
    ""
  );
};

const getTopbarTitle = (pathname) => {
  const routes = {
    agent: "agent",
    dashboard: "todos",
    categories: "categories",
    calendar: "calendar",
    statistics: "statistics",
    settings: "settings",
    profile: "settings",
    notifications: "notifications",
  };
  return `navigation.${routes[pathname.split("/")[1]] || "workspace"}`;
};

const Topbar = ({ isDesktop, onOpenSidebar }) => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const selectedStatuses = useTaskFilterStore(
    (state) => state.selectedStatuses,
  );
  const setSelectedStatuses = useTaskFilterStore(
    (state) => state.setSelectedStatuses,
  );
  const avatarUrl = getAvatarUrl(user);
  const [brokenAvatarUrl, setBrokenAvatarUrl] = useState("");
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef(null);
  const showAvatar = Boolean(avatarUrl) && brokenAvatarUrl !== avatarUrl;
  const pageTitle = t(getTopbarTitle(location.pathname));
  const isAgentPage = location.pathname.startsWith("/agent");
  const selectedStatusLabels = STATUS_OPTIONS.filter((option) =>
    selectedStatuses.includes(option.id),
  ).map((option) => t(`status.${option.id}`));
  const statusFilterLabel =
    selectedStatusLabels.length === 0
      ? t("status.all")
      : selectedStatusLabels.length === 1
        ? selectedStatusLabels[0]
        : t("status.count", { count: selectedStatusLabels.length });

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!statusMenuRef.current?.contains(event.target)) {
        setIsStatusMenuOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsStatusMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleStatusToggle = (status) => {
    setSelectedStatuses(
      selectedStatuses.includes(status)
        ? selectedStatuses.filter((selectedStatus) => selectedStatus !== status)
        : [...selectedStatuses, status],
    );
  };

  const handleClearStatuses = () => {
    setSelectedStatuses([]);
  };
  const todayLabel = new Intl.DateTimeFormat(getLocale(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/dashboard");
  };

  return (
    <header
      className="ui-topbar fixed top-[0] right-[0] z-35 flex h-[4rem] items-center justify-between
        [border-bottom:1px_solid_var(--color-line)]
        [background:color-mix(in_srgb,var(--color-surface)_92%,var(--color-canvas))] [transition:left_220ms_ease]
        [@media(max-width:600px)]:h-[var(--topbar-height)] [@media(max-width:600px)]:content-center
        [@media(max-width:600px)]:flex-wrap"
      style={{ left: isDesktop ? "var(--sidebar-w)" : 0 }}
    >
      <div className="ui-topbar-navigation [@media(max-width:600px)]:shrink-0 [@media(max-width:600px)]:w-full flex min-w-0 items-center gap-3">
        {!isDesktop && (
          <button
            type="button"
            onClick={onOpenSidebar}
            className="ui-icon-button items-center justify-center
              [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
              [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
            aria-label={t("navigation.open")}
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <button
          type="button"
          onClick={handleBack}
          className="ui-icon-button items-center justify-center
            [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
            [&:hover]:[transform:translateY(-1px)] ui-focus-ring ui-topbar-back"
          aria-label={t("navigation.back")}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="ui-topbar-meta min-w-[0] [&_p]:m-[0]">
          <p className="ui-topbar-title overflow-hidden text-ellipsis whitespace-nowrap text-[var(--color-text)] text-[0.95rem] [font-weight:600] [line-height:1.2]">
            {pageTitle}
          </p>
          <p className="ui-topbar-subtitle text-[var(--color-text-muted)] text-[0.75rem] [line-height:1.2] [@media(max-width:640px)]:[display:none]">
            <span className="ui-tabular [font-family:var(--font-mono)] [font-variant-numeric:tabular-nums]">
              {todayLabel}
            </span>
          </p>
        </div>
      </div>

      <div
        className="ui-topbar-actions inline-flex shrink-0 items-center
        [@media(max-width:600px)]:w-full [@media(max-width:600px)]:justify-end
        [@media(max-width:600px)]:[&_.ui-version-switcher]:absolute
        [@media(max-width:600px)]:[&_.ui-version-switcher]:top-[10px]
        [@media(max-width:600px)]:[&_.ui-version-switcher]:right-[12px]"
      >
        <NotificationBell />
        <LanguageSelect />
        <ThemeToggle />
        <VersionSwitcher />
        {!isAgentPage && (
          <div
            className="ui-global-task-filter relative shrink-0
              [&[data-open=true]_.ui-global-task-filter\_\_trigger]:border-[color-mix(in_srgb,var(--color-accent)_24%,var(--color-line))]
              [&[data-open=true]_.ui-global-task-filter\_\_trigger]:[background:var(--color-accent-soft)]
              [&[data-open=true]_.ui-global-task-filter\_\_chevron]:[transform:rotate(180deg)]"
            ref={statusMenuRef}
            data-open={isStatusMenuOpen ? "true" : "false"}
          >
            <button
              type="button"
              onClick={() => setIsStatusMenuOpen((isOpen) => !isOpen)}
              className="ui-global-task-filter__trigger inline-flex min-h-[2.5rem] items-center justify-center gap-[0.375rem]
                rounded-[var(--radius-md)] p-[0_0.5rem_0_0.625rem] touch-manipulation whitespace-nowrap
                [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
                [&:hover]:[transform:translateY(-1px)] [@media(max-width:640px)]:px-[0.5rem]
                [@media(max-width:640px)]:[&_span]:overflow-hidden [@media(max-width:640px)]:[&_span]:text-ellipsis
                [@media(max-width:600px)]:w-[2.5rem] [@media(max-width:600px)]:justify-center ui-focus-ring"
              aria-expanded={isStatusMenuOpen}
              aria-haspopup="menu"
              aria-label={t("status.filter") + ": " + statusFilterLabel}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
              <span>{statusFilterLabel}</span>
              <ChevronDown
                className="ui-global-task-filter__chevron [transition:transform_160ms_ease] [@media(max-width:600px)]:[display:none] h-4 w-4"
                aria-hidden="true"
              />
            </button>

            {isStatusMenuOpen ? (
              <div
                className="ui-global-task-filter__menu absolute top-[calc(100%_+_0.625rem)] right-[0] z-60
                  w-[min(9rem,calc(100vw_-_1.5rem))]
                  [border:1px_solid_color-mix(in_srgb,var(--color-line)_75%,var(--color-text-muted))]
                  rounded-[calc(var(--radius-md)_+_2px)] [background:var(--color-surface)] [box-shadow:var(--shadow-lg)]
                  p-[0.75rem] [@media(max-width:640px)]:fixed [@media(max-width:640px)]:top-[4.25rem]
                  [@media(max-width:640px)]:right-[0.75rem]"
                role="menu"
                aria-label={t("status.filter")}
              >
                <div className="ui-global-task-filter__menu-header flex items-center justify-between gap-[1rem] text-[var(--color-text)] text-[0.8125rem] [font-weight:700]">
                  <span>{t("status.title")}</span>
                  {selectedStatuses.length > 0 ? (
                    <button
                      type="button"
                      onClick={handleClearStatuses}
                      className="ui-global-task-filter__clear [border:0] rounded-[0.375rem] [background:transparent] p-[0.25rem_0.375rem] [&:hover]:[background:var(--color-accent-soft)] ui-focus-ring"
                    >
                      {t("status.clear")}
                    </button>
                  ) : null}
                </div>
                <div className="ui-global-task-filter__options grid gap-[0.25rem]">
                  {STATUS_OPTIONS.map((option) => {
                    const isSelected = selectedStatuses.includes(option.id);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={isSelected}
                        onClick={() => handleStatusToggle(option.id)}
                        className="ui-global-task-filter__option flex min-h-[2.25rem] items-center gap-[0.625rem] w-full
                          [border:1px_solid_transparent] rounded-[0.5rem] [background:transparent] p-[0.375rem_0.5rem] text-left
                          [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease]
                          [&[data-selected=true]]:border-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-line))] ui-focus-ring"
                        data-selected={isSelected ? "true" : "false"}
                      >
                        <span
                          className="ui-global-task-filter__check inline-grid w-[1rem] h-[1rem] shrink-0 place-items-center rounded-[0.25rem]"
                          aria-hidden="true"
                        >
                          {isSelected ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : null}
                        </span>
                        <span>{t(`status.${option.id}`)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="ui-avatar-button inline-flex items-center justify-center shrink-0 [border:1px_solid_var(--color-line)]
            [background:var(--color-surface)]
            [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
            w-[2.5rem] h-[2.5rem] overflow-hidden rounded-[999px]
            [&:hover]:border-[color-mix(_in_srgb,var(--color-line)_72%,var(--color-text-muted)_)]
            [&:hover]:[background:var(--color-surface-muted)] [&:hover]:[transform:translateY(-1px)] ui-focus-ring"
          aria-label={t("navigation.settings")}
        >
          {showAvatar ? (
            <img
              src={avatarUrl}
              alt={
                user?.name
                  ? t("navigation.avatar", { name: user.name })
                  : t("navigation.userAvatar")
              }
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
