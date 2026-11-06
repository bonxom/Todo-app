import { ApiError } from "@/shared/services/apiError";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Plus, Eye, X, Loader2, AlertCircle } from "lucide-react";
import {
  useSkillTemplates,
  useSessionKey,
  currentSessionKey,
  useSkillTemplate,
  useImportTemplateMutation,
} from "./useSkillQueries";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";
import type { TemplateSummary } from "@/shared/types/skill";

interface TemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TemplateGallery({ isOpen, onClose }: TemplateGalleryProps) {
  const navigate = useNavigate();
  const sessionKey = useSessionKey();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  useModalKeyboard(isOpen, dialogRef, onClose);
  const {
    data: templates,
    isLoading,
    error,
    refetch: refetchTemplates,
  } = useSkillTemplates(isOpen);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const {
    data: templateDetail,
    error: detailError,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useSkillTemplate(isOpen ? (selectedTemplateId ?? undefined) : undefined);

  const importMutation = useImportTemplateMutation();

  if (!isOpen) return null;

  const handleImport = async (template: TemplateSummary) => {
    setImportError(null);
    try {
      const imported = await importMutation.mutateAsync({
        templateId: template.id,
        expectedTemplateVersion: template.version,
      });
      if (currentSessionKey() !== sessionKey) return;
      onClose();
      navigate(`/agent/skills/${imported.id}`);
    } catch (error) {
      if (currentSessionKey() !== sessionKey) return;
      if (error instanceof ApiError && error.status === 409) {
        await refetchTemplates();
        if (selectedTemplateId) await refetchDetail();
        setImportError(
          "Không thể thêm mẫu: kiểm tra giới hạn kỹ năng và xem lại phiên bản mẫu mới trước khi thử lại.",
        );
        return;
      }
      if (currentSessionKey() === sessionKey)
        setImportError(
          error instanceof Error
            ? error.message
            : "Không thể thêm mẫu. Hãy tải lại mẫu trước khi thử lại.",
        );
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Thư viện mẫu kỹ năng"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl bg-[var(--color-bg-primary)] shadow-2xl border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-base font-semibold text-[var(--color-text)]">
              Mẫu kỹ năng gợi ý
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)]"
            aria-label="Đóng thư viện mẫu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {importError && (
          <p role="alert" className="p-4 text-red-600">
            {importError}
          </p>
        )}
        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template List */}
          <div
            className={`${selectedTemplateId ? "hidden sm:block" : "block"} w-full sm:w-1/2 overflow-y-auto border-r border-[var(--color-border)] p-4 space-y-3`}
          >
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
              </div>
            ) : error ? (
              <div className="p-4 text-sm text-red-500 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Không thể tải danh sách mẫu.</span>
              </div>
            ) : (
              templates?.map((t) => (
                <div
                  key={t.id}
                  className={`rounded-xl border p-4 transition-all ${
                    selectedTemplateId === t.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-border-hover)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-sm text-[var(--color-text)]">
                        {t.name}
                      </h3>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)] line-clamp-2">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
                      aria-label={`preview ${t.name}`}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Xem trước</span>
                    </button>
                    <button
                      type="button"
                      disabled={importMutation.isPending}
                      onClick={() => handleImport(t)}
                      className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                      aria-label="add to my skills"
                    >
                      {importMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>Thêm vào kỹ năng của tôi</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Template Preview */}
          <div
            className={`${selectedTemplateId ? "flex" : "hidden sm:flex"} min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-bg-secondary)]/30`}
          >
            {selectedTemplateId && (
              <button
                className="sm:hidden p-3"
                onClick={() => setSelectedTemplateId(null)}
              >
                Quay lại danh sách mẫu
              </button>
            )}
            {isLoadingDetail && <p role="status">Đang tải mẫu…</p>}
            {detailError && <p role="alert">Không thể tải nội dung mẫu.</p>}
            {selectedTemplateId && templateDetail ? (
              <div className="flex flex-1 flex-col overflow-hidden p-6">
                <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--color-text)]">
                      {templateDetail.name}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      {templateDetail.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={importMutation.isPending}
                    onClick={() => handleImport(templateDetail)}
                    className="flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3.5 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {importMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span>Thêm vào kỹ năng của tôi</span>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto pt-4 text-sm text-[var(--color-text)]">
                  <MarkdownText text={templateDetail.instructions} />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-[var(--color-text-muted)]">
                Chọn một mẫu bên trái để xem nội dung chi tiết.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
