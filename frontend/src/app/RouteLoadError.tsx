import { useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface RouteLoadErrorProps {
  error?: unknown;
}

function useSafeRouteError(): unknown {
  try {
    return useRouteError();
  } catch {
    return null;
  }
}

export default function RouteLoadError({
  error: propError,
}: RouteLoadErrorProps) {
  const routeError = useSafeRouteError();
  const error = propError ?? routeError;
  const { i18n } = useTranslation("common");

  const isVi = i18n.language?.startsWith("vi");
  const reloadText = isVi ? "Tải lại trang" : "Reload";
  const backText = isVi ? "Về V1" : "Back to V1";
  const titleText = isVi ? "Không thể tải trang" : "Unable to load page";
  const descriptionText = isVi
    ? "Đã xảy ra lỗi khi tải tài nguyên ứng dụng. Vui lòng thử tải lại trang hoặc quay lại phiên bản V1."
    : "An error occurred while loading application resources. Please try reloading or return to V1.";

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-canvas,#0f172a)] text-[var(--color-text,#f8fafc)]"
    >
      <div className="max-w-md w-full p-6 rounded-2xl bg-[var(--color-surface,#1e293b)] border border-[var(--color-border,#334155)] shadow-xl text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-red-500/10 text-red-400">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{titleText}</h1>
        <p className="text-sm text-[var(--color-text-muted,#94a3b8)]">
          {descriptionText}
        </p>
        {Boolean(error) && (
          <pre className="text-xs p-2 text-left bg-black/20 rounded overflow-x-auto text-[var(--color-text-muted,#94a3b8)] max-h-24">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--color-accent,#0284c7)] hover:opacity-90 font-medium text-white transition-opacity text-sm"
          >
            <RefreshCw size={16} />
            {reloadText}
          </button>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--color-border,#334155)] hover:bg-white/5 font-medium text-[var(--color-text,#f8fafc)] transition-colors text-sm"
          >
            <ArrowLeft size={16} />
            {backText}
          </a>
        </div>
      </div>
    </div>
  );
}
