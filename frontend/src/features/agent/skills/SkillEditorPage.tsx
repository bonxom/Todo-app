import { useState, useMemo, useRef } from "react";
import {
  useNavigate,
  useParams,
  useBlocker,
  useBeforeUnload,
} from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
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
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-accent)]" />
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
    <div className="ui-page-shell skills-page skill-editor-page">
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
      {isDeleteDialogOpen && (
        <div
          className="skill-modal-backdrop"
          ref={deleteRef}
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận xóa kỹ năng"
        >
          <div className="skill-delete-dialog">
            <span className="skill-delete-icon">
              <Trash2 size={23} />
            </span>
            <h2>Xóa kỹ năng này?</h2>
            <p>
              <strong>{name}</strong> sẽ bị xóa khỏi thư viện. Các câu trả lời
              trước đây vẫn được giữ nguyên.
            </p>
            <div className="skills-actions">
              <button
                className="ui-btn-secondary"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Hủy
              </button>
              <button
                className="skill-danger-button"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="skills-section-bar">
        <button
          className="skill-back-link"
          onClick={handleBack}
          aria-label="Quay lại danh sách"
        >
          <ArrowLeft size={17} />
          Kỹ năng cá nhân
        </button>
        <span className="skill-editor-status">
          {isSaving
            ? "Đang lưu…"
            : isDirty
              ? "Có thay đổi chưa lưu"
              : isNew
                ? "Bản nháp mới"
                : "Đã lưu"}
        </span>
      </div>
      <header className="skills-heading skill-editor-heading">
        <div>
          <h1 className="ui-page-title">
            {isNew ? "Tạo kỹ năng mới" : name || "Chỉnh sửa kỹ năng"}
          </h1>
          <p className="ui-page-description">
            Một hướng dẫn rõ ràng, nhiều cuộc trò chuyện tốt hơn.
          </p>
        </div>
        <button
          className="ui-btn-primary skill-save-button"
          onClick={handleSave}
          disabled={!isValid || isSaving || deleteMutation.isPending}
        >
          {isSaving ? (
            <Loader2 size={17} className="animate-spin" />
          ) : (
            <Save size={17} />
          )}
          {isNew ? "Lưu kỹ năng" : "Lưu thay đổi"}
        </button>
      </header>
      {conflictError && (
        <div className="skills-notice skills-notice--warning" role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>{conflictError}</strong>
            <p>
              Bản nháp vẫn được giữ nguyên. Sao chép nội dung hoặc tải bản mới
              để tiếp tục.
            </p>
          </div>
          <button
            className="ui-btn-secondary"
            onClick={handleReloadServerVersion}
          >
            <RotateCcw size={15} />
            Tải bản mới
          </button>
        </div>
      )}
      {generalError && (
        <div className="skills-notice skills-notice--error" role="alert">
          <AlertCircle size={18} />
          <span>{generalError}</span>
        </div>
      )}
      <div className="skill-editor-grid">
        <section
          className="skill-info-panel"
          aria-labelledby="skill-info-heading"
        >
          <div className="skill-panel-heading">
            <h2 id="skill-info-heading">Thông tin kỹ năng</h2>
            <p>Giúp Agent nhận ra khi nào cần dùng.</p>
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-name">
                Tên kỹ năng <span>*</span>
              </label>
              <span>{name.length}/80</span>
            </div>
            <input
              className="ui-input"
              id="skill-name"
              value={name}
              maxLength={80}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: IELTS Writing"
            />
          </div>
          <div className="skill-field">
            <div className="skill-field-label">
              <label htmlFor="skill-description">
                Mô tả kỹ năng <span>*</span>
              </label>
              <span>{description.length}/500</span>
            </div>
            <textarea
              className="ui-input skill-description-input"
              id="skill-description"
              rows={4}
              value={description}
              maxLength={500}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Khi nào Agent nên dùng hướng dẫn này?"
            />
            <p className="skill-field-hint">
              Ví dụ: Khi tôi cần nhận xét và cải thiện bài viết IELTS Task 2.
            </p>
          </div>
          <div className="skill-enabled-setting">
            <div>
              <label id="skill-enabled-label">Kích hoạt kỹ năng</label>
              <p>
                {enabled
                  ? "Sẵn sàng cho cuộc trò chuyện tiếp theo."
                  : "Agent sẽ không đọc kỹ năng này."}
              </p>
            </div>
            <button
              className="skill-switch"
              role="switch"
              aria-labelledby="skill-enabled-label"
              aria-checked={enabled}
              onClick={() => setEnabled((value) => !value)}
              disabled={isSaving || deleteMutation.isPending}
            >
              <span />
            </button>
          </div>
          <div className="skill-editor-help">
            <BookOpen size={17} />
            <p>
              Chỉ dẫn càng cụ thể, Agent càng dễ áp dụng. Viết như cách bạn
              hướng dẫn một người cùng làm việc.
            </p>
          </div>
          {!isNew && (
            <div className="skill-editor-danger-zone">
              <span>Phiên bản hiện tại: v{baseline?.version}</span>
              <button
                className="skill-text-action skill-text-danger"
                disabled={isSaving || deleteMutation.isPending}
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 size={15} />
                Xóa kỹ năng
              </button>
            </div>
          )}
        </section>
        <section
          className="skill-instructions-panel"
          aria-label="Soạn hướng dẫn cho Agent"
        >
          <div className="skill-instructions-header">
            <div>
              <label id="skill-instructions-label" htmlFor="skill-instructions">
                Hướng dẫn chi tiết <span>*</span>
              </label>
              <p>Agent sẽ làm theo hướng dẫn này khi đọc kỹ năng.</p>
            </div>
            <div className="skill-editor-tabs" aria-label="Chế độ soạn thảo">
              <button
                aria-pressed={!previewMode}
                onClick={() => setPreviewMode(false)}
              >
                <Edit3 size={14} />
                Soạn thảo
              </button>
              <button
                aria-pressed={previewMode}
                onClick={() => setPreviewMode(true)}
              >
                <Eye size={14} />
                Xem trước
              </button>
            </div>
          </div>
          {previewMode ? (
            <div className="skill-markdown-preview">
              {instructions.trim() ? (
                <MarkdownText text={instructions} />
              ) : (
                <p className="skill-preview-empty">
                  Nội dung xem trước sẽ xuất hiện khi bạn thêm hướng dẫn.
                </p>
              )}
            </div>
          ) : (
            <textarea
              id="skill-instructions"
              className="skill-instructions-input"
              value={instructions}
              maxLength={10000}
              disabled={isSaving || deleteMutation.isPending}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={
                "Mô tả cách bạn muốn Agent hỗ trợ…\n\nVí dụ:\n- Giữ nguyên ý chính khi sửa bài.\n- Giải thích ngắn gọn từng thay đổi.\n- Kết thúc bằng một gợi ý thực hành."
              }
            />
          )}
          <div className="skill-instructions-footer">
            <span>Hỗ trợ Markdown</span>
            <span>
              {instructions.length.toLocaleString("vi-VN")} / 10.000 ký tự
            </span>
          </div>
        </section>
      </div>
      <p className="skill-editor-footnote">
        Thay đổi áp dụng từ lượt chat tiếp theo.
      </p>
    </div>
  );
}
