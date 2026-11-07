import { useTranslation } from "react-i18next";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../theme/theme";

export default function ThemeToggle() {
  const { t } = useTranslation("common");
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const label = t(isDark ? "theme.light" : "theme.dark");

  return (
    <button
      type="button"
      className="ui-icon-button ui-focus-ring ui-theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      {isDark ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
