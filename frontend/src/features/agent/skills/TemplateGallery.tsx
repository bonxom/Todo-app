import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import { ApiError } from "@/shared/services/apiError";
import { useModalKeyboard } from "@/shared/hooks/useModalKeyboard";
import {
  useSkillTemplates,
  useSkillTemplate,
  useImportTemplateMutation,
  useSessionKey,
  currentSessionKey,
} from "./useSkillQueries";
import MarkdownText from "@/features/tasks/components/chat/MarkdownText";

export function TemplateGallery({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const sessionKey = useSessionKey();
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalKeyboard(isOpen, dialogRef, onClose);
  const {
    data: templates,
    isLoading,
    error,
    refetch: reloadTemplates,
  } = useSkillTemplates(isOpen);
  const [selectedId, setSelectedId] = useState<string>();
  const [showPreview, setShowPreview] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const activeId = selectedId ?? templates?.[0]?.id;
  const {
    data: detail,
    isLoading: loadingDetail,
    error: detailError,
    refetch: reloadDetail,
  } = useSkillTemplate(isOpen ? activeId : undefined);
  const importing = useImportTemplateMutation();
  const close = () => {
    setShowPreview(false);
    setImportError(null);
    onClose();
  };
  const handleImport = async () => {
    if (!detail || importing.isPending) return;
    setImportError(null);
    try {
      const created = await importing.mutateAsync({
        templateId: detail.id,
        expectedTemplateVersion: detail.version,
      });
      if (currentSessionKey() !== sessionKey) return;
      close();
      navigate(`/agent/skills/${created.id}`);
    } catch (err) {
      if (currentSessionKey() !== sessionKey) return;
      if (err instanceof ApiError && err.status === 409) {
        await reloadTemplates();
        await reloadDetail();
        setImportError(
          "Kiểm tra giới hạn kỹ năng và xem lại phiên bản mẫu mới trước khi thử lại.",
        );
      } else
        setImportError("Không thể thêm mẫu. Hãy kiểm tra kết nối rồi thử lại.");
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="skill-modal-backdrop"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Thư viện mẫu kỹ năng"
    >
      <div
        className={`skill-gallery ${showPreview ? "skill-gallery--preview" : ""}`}
      >
        <header className="skill-gallery-header">
          <div>
            <span className="skill-eyebrow">
              Bắt đầu từ một hướng dẫn có sẵn
            </span>
            <h2>Thư viện mẫu kỹ năng</h2>
          </div>
          <button
            className="skills-icon-button"
            onClick={close}
            aria-label="Đóng thư viện mẫu"
          >
            <X size={21} />
          </button>
        </header>
        <div className="skill-gallery-body">
          <aside className="skill-template-list" aria-label="Mẫu kỹ năng">
            <p>Chọn một mẫu, sau đó chỉnh lại theo cách của bạn.</p>
            {isLoading ? (
              <p role="status">
                <Loader2 className="animate-spin" size={20} />
                Đang tải mẫu…
              </p>
            ) : error ? (
              <div role="alert">
                <p>Không thể tải danh sách mẫu.</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadTemplates()}
                >
                  Thử lại
                </button>
              </div>
            ) : (
              templates?.map((template) => (
                <button
                  className="skill-template-choice"
                  key={template.id}
                  aria-label={`Xem mẫu ${template.name}`}
                  aria-pressed={activeId === template.id}
                  onClick={() => {
                    setSelectedId(template.id);
                    setShowPreview(true);
                    setImportError(null);
                  }}
                >
                  <span className="skill-template-symbol">
                    <BookOpen size={21} />
                  </span>
                  <span>
                    <strong>{template.name}</strong>
                    <span>{template.description}</span>
                  </span>
                  <ChevronRight size={17} />
                </button>
              ))
            )}
            <div className="skill-template-note">
              <Check size={16} />
              <span>Bản sao của riêng bạn. Chỉnh sửa tự do sau khi thêm.</span>
            </div>
          </aside>
          <section className="skill-template-preview" aria-label="Nội dung mẫu">
            <button
              className="skill-back-link skill-template-back"
              onClick={() => setShowPreview(false)}
            >
              <ArrowLeft size={16} />
              Quay lại danh sách mẫu
            </button>
            {loadingDetail ? (
              <div className="skills-empty" role="status">
                <Loader2 className="animate-spin" />
                Đang tải nội dung…
              </div>
            ) : detailError ? (
              <div className="skills-empty" role="alert">
                <p>Không thể tải nội dung mẫu.</p>
                <button
                  className="ui-btn-secondary"
                  onClick={() => void reloadDetail()}
                >
                  Thử lại
                </button>
              </div>
            ) : detail ? (
              <>
                <div className="skill-template-preview-heading">
                  <span className="skill-eyebrow">Xem trước hướng dẫn</span>
                  <h3>{detail.name}</h3>
                  <p>{detail.description}</p>
                </div>
                <div className="skill-template-document">
                  <MarkdownText text={detail.instructions} />
                </div>
              </>
            ) : (
              <div className="skills-empty">
                <BookOpen />
                <p>Chọn mẫu để xem hướng dẫn.</p>
              </div>
            )}
          </section>
        </div>
        {importError && (
          <p className="skill-gallery-error" role="alert">
            {importError}
          </p>
        )}
        <footer className="skill-gallery-footer">
          <p>Mẫu chỉ được dùng sau khi bạn thêm vào thư viện.</p>
          <button
            className="ui-btn-primary"
            onClick={() => void handleImport()}
            disabled={!detail || !!detailError || importing.isPending}
          >
            {importing.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Plus size={17} />
            )}
            Thêm vào kỹ năng của tôi
          </button>
        </footer>
      </div>
    </div>
  );
}
