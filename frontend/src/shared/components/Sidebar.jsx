import { useTranslation } from "react-i18next";
import { getLocale } from "../i18n";
import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bot, LogOut, X } from "lucide-react";
import { useLogoutMutation } from "@/features/auth/api/authMutations";
import OrbitMark from "./OrbitMark";

export const DESKTOP_BREAKPOINT = 1024;
export const drawerWidthExpanded = 272;
export const drawerWidthCollapsed = 88;

const menuItems = [
  {
    path: "/dashboard",
    label: "navigation.todos",
    icon: (
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
    path: "/categories",
    label: "navigation.categories",
    icon: (
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
    path: "/calendar",
    label: "navigation.calendar",
    icon: (
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
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
    path: "/statistics",
    label: "navigation.statistics",
    icon: (
      <svg
        className="h-5 w-5 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  {
    path: "/agent",
    label: "navigation.agent",
    icon: <Bot className="h-5 w-5 flex-shrink-0" />,
  },
];

const Sidebar = ({
  isDesktop,
  isExpanded,
  isOpen,
  onClose,
  onHoverChange,
  onFocusChange,
}) => {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();
  const logoutMutation = useLogoutMutation();
  const previousPathnameRef = useRef(location.pathname);
  const showLabels = !isDesktop || isExpanded;
  const currentDrawerWidth = isDesktop
    ? isExpanded
      ? drawerWidthExpanded
      : drawerWidthCollapsed
    : "min(18rem, calc(100vw - 1rem))";
  const todayLabel = new Intl.DateTimeFormat(getLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  useEffect(() => {
    if (
      !isDesktop &&
      isOpen &&
      previousPathnameRef.current !== location.pathname
    ) {
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
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDesktop, isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      navigate("/");
    }
  };

  return (
    <>
      {!isDesktop && isOpen && (
        <button
          type="button"
          className="ui-shell-overlay fixed inset-[0] z-30 [background:var(--color-overlay)]"
          onClick={onClose}
          aria-label={t("navigation.close")}
        />
      )}

      <aside
        className="ui-shell-sidebar fixed top-[0] left-[0] bottom-[0] z-40 flex flex-col overflow-visible
          [border-right:1px_solid_var(--color-line)] [box-shadow:none]
          [transition:transform_220ms_ease,width_220ms_ease]
          [&[data-desktop=true]_.ui-shell-sidebar\_\_toggle]:right-[0]
          [&[data-desktop=true]_.ui-shell-sidebar\_\_toggle]:[box-shadow:var(--shadow-sm)]
          [&[data-desktop=false]]:[box-shadow:var(--shadow-sm)]
          [&[data-desktop=false][data-open=false]]:[visibility:hidden]
          [&[data-desktop=false][data-open=false]]:pointer-events-none [&[data-desktop=false][data-open=true]]:visible"
        data-desktop={isDesktop}
        data-open={isOpen}
        data-expanded={isExpanded}
        onPointerEnter={(event) => {
          if (isDesktop && event.pointerType !== "touch") onHoverChange?.(true);
        }}
        onPointerLeave={() => {
          if (isDesktop) onHoverChange?.(false);
        }}
        onFocusCapture={(event) => {
          if (isDesktop && event.target.matches(":focus-visible"))
            onFocusChange?.(true);
        }}
        onBlurCapture={(event) => {
          if (isDesktop && !event.currentTarget.contains(event.relatedTarget))
            onFocusChange?.(false);
        }}
        aria-hidden={!isDesktop && !isOpen}
        style={{ width: currentDrawerWidth }}
      >
        {!isDesktop && (
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-button items-center justify-center
              [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease,transform_160ms_ease]
              [&:hover]:[transform:translateY(-1px)] ui-focus-ring ui-shell-sidebar__toggle absolute top-[1rem] z-1"
            aria-label={t("navigation.close")}
            title={t("navigation.close")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}

        <div
          className="ui-shell-sidebar__content flex min-h-[0] flex-1 flex-col gap-[var(--space-4)] overflow-x-hidden overflow-y-auto [transition:padding_220ms_ease]"
          style={{ padding: showLabels ? "1rem" : "1rem 0.75rem" }}
        >
          <div
            className={`ui-shell-brand flex items-center gap-[0.75rem] min-w-[0] ${showLabels ? "" : "justify-center"}`}
          >
            <div
              className="ui-shell-brand-mark grid w-[2.5rem] h-[2.5rem] place-items-center shrink-0"
              aria-hidden="true"
            >
              <OrbitMark />
            </div>
            {showLabels && (
              <div className="ui-shell-brand-copy min-w-[0] [&_p]:m-[0]">
                <p className="text-sm font-semibold text-[var(--color-text)]">
                  Orbit
                </p>
                <p className="ui-tabular [font-family:var(--font-mono)] [font-variant-numeric:tabular-nums] text-xs text-[var(--color-text-muted)]">
                  {todayLabel}
                </p>
              </div>
            )}
          </div>

          {showLabels && (
            <p className="ui-shell-section-label m-[0] text-[var(--color-text-muted)] text-[0.75rem] [font-weight:600] [line-height:1.2] px-1">
              {t("navigation.workspace")}
            </p>
          )}

          <nav
            className="ui-shell-nav flex flex-1 flex-col gap-[0.375rem]"
            aria-label={t("navigation.primary")}
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`ui-shell-nav-link flex min-h-[2.75rem] items-center gap-[0.75rem] p-[0.75rem] [border:1px_solid_transparent] rounded-[var(--radius-lg)] [text-decoration:none] [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease] [&[data-active=true]]:border-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-line))] ui-focus-ring ${showLabels ? "" : "justify-center"}`}
                  data-active={isActive}
                  aria-current={isActive ? "page" : undefined}
                  onClick={!isDesktop ? onClose : undefined}
                  aria-label={t(item.label)}
                  title={!showLabels ? t(item.label) : undefined}
                >
                  <span className="flex-shrink-0" aria-hidden="true">
                    {item.icon}
                  </span>
                  {showLabels && (
                    <span className="ui-shell-nav-label overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] [font-weight:600]">
                      {t(item.label)}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-[var(--color-line)] pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className={`ui-shell-nav-link flex min-h-[2.75rem] items-center gap-[0.75rem] p-[0.75rem] [border:1px_solid_transparent] rounded-[var(--radius-lg)] [text-decoration:none] [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease] [&[data-active=true]]:border-[color-mix(in_srgb,var(--color-accent)_18%,var(--color-line))] ui-focus-ring w-full ${showLabels ? "" : "justify-center"}`}
              title={!showLabels ? t("navigation.logout") : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {showLabels && (
                <span className="ui-shell-nav-label overflow-hidden text-ellipsis whitespace-nowrap text-[0.9375rem] [font-weight:600]">
                  {t("navigation.logout")}
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
