import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { getUiVersion, getVersionDestination } from "../navigation/uiVersions";
import { savePreferredVersion } from "../navigation/versionPreference";

export interface VersionSwitcherProps {
  className?: string;
}

export default function VersionSwitcher({
  className = "",
}: VersionSwitcherProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const currentVersion = getUiVersion(location.pathname);
  const target = currentVersion === "v1" ? "v2" : "v1";
  const destination = getVersionDestination(location, target);

  const switchVersion = () => {
    savePreferredVersion(target);
    navigate(destination.to);
  };

  const label = target === "v2" ? t("version.tryV2") : t("version.backToV1");

  return (
    <button
      type="button"
      onClick={switchVersion}
      className={`ui-version-switcher inline-flex items-center justify-center gap-[0.375rem] touch-manipulation whitespace-nowrap cursor-pointer [transition:background-color_160ms_ease,border-color_160ms_ease,color_160ms_ease,box-shadow_160ms_ease] [&:focus-visible]:[outline:2px_solid_var(--ring-focus-outline)] [&:focus-visible]:outline-offset-[2px] ${className}`}
      aria-label={label}
    >
      <Sparkles size={14} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
