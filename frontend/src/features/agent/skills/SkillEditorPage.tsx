import { useState, useMemo, useRef } from "react";
import {
  useNavigate,
  useParams,
  useBlocker,
  useBeforeUnload,
} from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
  AlertCircle,
  Eye,
  Edit3,
  RotateCcw,
} from "lucide-react";
import {
  useSkill,
  useSessionKey,
  currentSessionKey,
  useCreateSkillMutation,
  useUpdateSkillMutation,
  useDeleteSkillMutation,
} from "./useSkillQueries";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";
import { AgentDiscardDialog } from "../AgentDiscardDialog";
import "./skills.css";
import type { SkillDetail } from "@/shared/types/skill";
import { ApiError } from "@/shared/services/apiError";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";

export function SkillEditorPage() {
  const { skillId } = useParams();
  const sessionKey = useSessionKey();
  return <SkillEditorForm key={`${sessionKey}:${skillId ?? "new"}`} />;
}

function SkillEditorForm() {
  const sessionKey = useSessionKey();
  const isCurrent = () => currentSessionKey() === sessionKey;
  const bypass = useRef(false);
  const deleteRef = useRef<HTMLDivElement>(null);
  const [baseline, setBaseline] = useState<SkillDetail | null>(null);
  const { skillId } = useParams<{ skillId?: string }>();
  const isNew = !skillId || skillId === "new";
  const navigate = useNavigate();

  const {
    data: initialSkill,
    isLoading: isLoadingSkill,
    error: loadError,
    refetch,
  } = useSkill(isNew ? undefined : skillId);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const [conflictError, setConflictError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [reloadRequested, setReloadRequested] = useState(false);
  useModalKeyboard(isDeleteDialogOpen, deleteRef, () =>
    setIsDeleteDialogOpen(false),
  );

  // Adopt fresh server data only while the form is pristine.
  if (
    initialSkill &&
    initialSkill !== baseline &&
    (!baseline ||
      (name === baseline.name &&
        description === baseline.description &&
        instructions === baseline.instructions &&
        enabled === baseline.enabled))
  ) {
    setBaseline(initialSkill);
    setName(initialSkill.name);
    setDescription(initialSkill.description);
    setInstructions(initialSkill.instructions);
    setEnabled(initialSkill.enabled);
  }

  const isDirty = useMemo(() => {
    if (isNew) {
      return Boolean(name.trim() || description.trim() || instructions.trim());
    }
    if (!baseline) return false;
    return (
      name !== baseline.name ||
      description !== baseline.description ||
      instructions !== baseline.instructions ||
      enabled !== baseline.enabled
    );
  }, [isNew, baseline, name, description, instructions, enabled]);

  const blocker = useBlocker(() => isCurrent() && isDirty && !bypass.current);
  useBeforeUnload((event) => {
    if (isDirty && !bypass.current) {
      event.preventDefault();
      event.returnValue = "";
    }
  });

  const isValid =
    name.trim().length >= 1 &&
    name.trim().length <= 80 &&
    description.trim().length >= 1 &&
    description.trim().length <= 500 &&
    instructions.trim().length >= 1 &&
    instructions.trim().length <= 10000;

  const createMutation = useCreateSkillMutation();
  const updateMutation = useUpdateSkillMutation();
  const deleteMutation = useDeleteSkillMutation();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const handleSave = async () => {
    if (!isValid || isSaving || deleteMutation.isPending) return;
    setConflictError(null);
    setGeneralError(null);

    try {
      if (isNew) {
        const created = await createMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          enabled,
        });
        if (!isCurrent()) return;
        bypass.current = true;
        navigate(`/agent/skills/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync({
          id: skillId!,
          input: {
            expectedVersion: baseline!.version,
            name: name.trim(),
            description: description.trim(),
            instructions: instructions.trim(),
            enabled,
          },
        });
        if (isCurrent()) {
          setBaseline(updated);
          setName(updated.name);
          setDescription(updated.description);
          setInstructions(updated.instructions);
          setEnabled(updated.enabled);
        }
      }
    } catch (err: unknown) {
      if (!isCurrent()) return;
      if (err instanceof ApiError && err.status === 409) {
        setConflictError(
          "Phiên bản kỹ năng đã thay đổi trên máy chủ bởi phiên làm việc khác.",
        );
      } else {
        setGeneralError(
          err instanceof Error ? err.message : "Đã xảy ra lỗi khi lưu kỹ năng.",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (isNew || !baseline || isSaving || deleteMutation.isPending) return;
    try {
      await deleteMutation.mutateAsync({
        id: baseline.id,
        expectedVersion: baseline.version,
      });
      if (!isCurrent()) return;
      bypass.current = true;
      setIsDeleteDialogOpen(false);
      navigate("/agent/skills");
    } catch (err: unknown) {
      if (!isCurrent()) return;
      setIsDeleteDialogOpen(false);
      if (err instanceof ApiError && err.status === 409)
        setConflictError(
          "Phiên bản kỹ năng đã thay đổi trên máy chủ bởi phiên làm việc khác.",
        );
      setGeneralError(
        err instanceof Error ? err.message : "Không thể xóa kỹ năng.",
      );
    }
  };

  const handleBack = () => navigate("/agent/skills");
  const handleReloadServerVersion = () => setReloadRequested(true);
  const reloadServerVersion = async () => {
    setReloadRequested(false);
    const result = await refetch();
    if (!isCurrent()) return;
    if (result.error || !result.data) {
      setGeneralError("Không thể tải phiên bản mới. Bản nháp vẫn được giữ.");
      return;
    }
    const latest = result.data;
    setBaseline(latest);
    setName(latest.name);
    setDescription(latest.description);
    setInstructions(latest.instructions);
    setEnabled(latest.enabled);
    setConflictError(null);
  };

  if (!isNew && isLoadingSkill) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isNew && loadError && !baseline)
    return (
      <div role="alert" className="p-6">
        Kỹ năng không khả dụng.{" "}
        <button onClick={handleBack}>Quay lại danh sách</button>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 space-y-6">
      {/* Navigation Discard Dialog */}
      <AgentDiscardDialog
        isOpen={
          discardDialogOpen || reloadRequested || blocker.state === "blocked"
        }
        onConfirm={() => {
          setDiscardDialogOpen(false);
          if (reloadRequested) void reloadServerVersion();
          else if (blocker.state === "blocked") blocker.proceed();
        }}
        onCancel={() => {
          setDiscardDialogOpen(false);
          setReloadRequested(false);
          if (blocker.state === "blocked") blocker.reset();
        }}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteDialogOpen && (
        <div
          ref={deleteRef}
          aria-label="Xác nhận xóa kỹ năng"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-[var(--color-bg-primary)] p-6 shadow-xl border border-[var(--color-border)]">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              Xác nhận xóa kỹ năng
            </h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">
              Bạn có chắc chắn muốn xóa kỹ năng{" "}
              <strong className="text-[var(--color-text)]">{name}</strong>? Thao
              tác này không thể hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="rounded-lg p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]"
            aria-label="Quay lại danh sách"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)]">
              {isNew ? "Tạo kỹ năng mới" : `Chỉnh sửa: ${baseline?.name}`}
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {isNew
                ? "Thêm hướng dẫn cá nhân để Orbit Agent thực hiện công việc theo ý bạn"
                : `Phiên bản hiện tại: v${baseline?.version}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              disabled={isSaving || deleteMutation.isPending}
              onClick={() => setIsDeleteDialogOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-500/10 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Xóa kỹ năng</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid || isSaving || deleteMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isNew ? "Lưu kỹ năng" : "Lưu thay đổi"}</span>
          </button>
        </div>
      </div>

      {/* Conflict / General Error Banner */}
      {conflictError && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{conflictError}</p>
              <p className="mt-1 text-xs">
                Nội dung bạn đang chỉnh sửa vẫn được giữ nguyên. Bạn có thể sao
                chép bản thảo hoặc tải phiên bản mới nhất từ máy chủ.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReloadServerVersion}
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-white/50 px-3 py-1.5 text-xs font-semibold hover:bg-white/80 dark:bg-black/20"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Tải bản mới</span>
          </button>
        </div>
      )}

      {generalError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-6 shadow-sm space-y-6">
        {/* Name */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="skill-name"
              className="block text-sm font-semibold text-[var(--color-text)]"
            >
              Tên kỹ năng *
            </label>
            <span
              className={`text-xs ${
                name.length > 80
                  ? "text-red-500 font-semibold"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {name.length}/80
            </span>
          </div>
          <input
            disabled={isSaving || deleteMutation.isPending}
            id="skill-name"
            type="text"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Quy tắc viết IELTS Task 2, Bài tập Gym chân..."
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-hidden"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between">
            <label
              htmlFor="skill-description"
              className="block text-sm font-semibold text-[var(--color-text)]"
            >
              Mô tả kỹ năng (khi nào Agent nên dùng)
            </label>
            <span
              className={`text-xs ${
                description.length > 500
                  ? "text-red-500 font-semibold"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {description.length}/500
            </span>
          </div>
          <input
            disabled={isSaving || deleteMutation.isPending}
            id="skill-description"
            type="text"
            value={description}
            maxLength={500}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ví dụ: Áp dụng khi người dùng yêu cầu sửa bài viết tiếng Anh học thuật..."
            className="mt-2 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-hidden"
          />
        </div>

        {/* Enabled Toggle */}
        <div className="flex items-center justify-between py-2 border-y border-[var(--color-border)]">
          <div>
            <span className="text-sm font-semibold text-[var(--color-text)]">
              Kích hoạt kỹ năng
            </span>
            <p className="text-xs text-[var(--color-text-muted)]">
              Khi được bật, Orbit Agent có thể tự động đọc hướng dẫn này trong
              các lượt trò chuyện tiếp theo
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="Kích hoạt kỹ năng"
            aria-checked={enabled}
            onClick={() => setEnabled((prev) => !prev)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              enabled ? "bg-[var(--color-primary)]" : "bg-[var(--color-border)]"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Instructions (Markdown) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="skill-instructions"
                className="block text-sm font-semibold text-[var(--color-text)]"
              >
                Hướng dẫn chi tiết (Markdown) *
              </label>
              <div className="flex rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-bg-secondary)]">
                <button
                  type="button"
                  onClick={() => setPreviewMode(false)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                    !previewMode
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text)] shadow-xs"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  <Edit3 className="h-3 w-3" />
                  <span>Soạn thảo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode(true)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                    previewMode
                      ? "bg-[var(--color-bg-primary)] text-[var(--color-text)] shadow-xs"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  <span>Xem trước</span>
                </button>
              </div>
            </div>
            <span
              className={`text-xs ${
                instructions.length > 10000
                  ? "text-red-500 font-semibold"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              {instructions.length}/10.000 ký tự
            </span>
          </div>

          {previewMode ? (
            <div className="min-h-[280px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)]/40 p-4 text-sm text-[var(--color-text)] overflow-y-auto">
              {instructions.trim() ? (
                <MarkdownText text={instructions} />
              ) : (
                <p className="italic text-[var(--color-text-muted)]">
                  Chưa có nội dung để xem trước.
                </p>
              )}
            </div>
          ) : (
            <textarea
              disabled={isSaving || deleteMutation.isPending}
              id="skill-instructions"
              rows={12}
              value={instructions}
              maxLength={10000}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Nhập hướng dẫn cụ thể cho Orbit Agent bằng Markdown...&#10;&#10;Ví dụ:&#10;## Quy tắc chấm điểm&#10;1. Luôn kiểm tra tính mạch lạc và liên kết (Coherence & Cohesion).&#10;2. Đưa ra 3 từ vựng học thuật thay thế phù hợp."
              className="w-full font-mono rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-4 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-hidden"
            />
          )}
        </div>
      </div>
    </div>
  );
}
