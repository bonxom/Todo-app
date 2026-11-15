import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, LogOut, Orbit } from "lucide-react";
import { useLogoutMutation } from "@/features/auth/api/authMutations";

export interface V2SidebarProps {
  onNavigate?: () => void;
  className?: string;
}
export default function V2Sidebar({
  onNavigate,
  className = "",
}: V2SidebarProps) {
  const { t } = useTranslation("v2");
  const navigate = useNavigate();
  const logout = useLogoutMutation();
  const signOut = async () => {
    try {
      await logout.mutateAsync();
    } catch {
      /* Shared mutation clears session. */
    } finally {
      onNavigate?.();
      navigate("/");
    }
  };
  return (
    <aside className={`v2-navigation ${className}`} aria-label="Orbit">
      <Link
        to="/v2/dashboard"
        className="v2-brand"
        onClick={onNavigate}
        aria-label="Orbit"
      >
        <span className="v2-brand-symbol">
          <Orbit size={28} strokeWidth={1.5} />
        </span>
        <span>
          orbit<span className="v2-brand-dot">.</span>
        </span>
      </Link>
      <nav aria-label={t("dashboard")}>
        <Link
          to="/v2/dashboard"
          onClick={onNavigate}
          className="v2-nav-item"
          data-active="true"
          aria-current="page"
        >
          <LayoutDashboard size={21} strokeWidth={1.7} aria-hidden="true" />
          <span>{t("dashboard")}</span>
        </Link>
      </nav>
      <button
        type="button"
        className="v2-nav-item v2-signout"
        onClick={() => void signOut()}
        disabled={logout.isPending}
      >
        <LogOut size={19} aria-hidden="true" />
        <span>{t("signOut")}</span>
      </button>
    </aside>
  );
}
