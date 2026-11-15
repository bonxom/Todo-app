import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FileQuestion, LayoutDashboard } from "lucide-react";
import GlassPanel from "../components/GlassPanel";

export default function V2NotFoundPage() {
  const { t } = useTranslation("v2");

  return (
    <div
      data-testid="v2-not-found-page"
      className="min-h-[60vh] flex items-center justify-center py-12 px-4"
    >
      <GlassPanel className="max-w-md w-full p-8 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-[var(--v2-accent)]/10 text-[var(--v2-accent)]">
          <FileQuestion size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--v2-ink)] tracking-tight">
            {t("notFoundTitle")}
          </h1>
          <p className="text-sm text-[var(--v2-muted)]">
            {t("notFoundDescription")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link to="/v2/dashboard" className="v2-btn v2-btn-primary">
            <LayoutDashboard size={16} />
            <span>{t("goToDashboard")}</span>
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
