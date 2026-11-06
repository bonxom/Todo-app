import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Search,
  Loader2,
  Sparkles,
  Layers,
  AlertCircle,
} from "lucide-react";
import {
  useSkills,
  useToggleSkillMutation,
  useSessionKey,
  currentSessionKey,
} from "./useSkillQueries";
import { TemplateGallery } from "./TemplateGallery";
import type { SkillSummary } from "@/shared/types/skill";
import "./skills.css";

export function SkillsPage() {
  const sessionKey = useSessionKey();
  return <SkillsList key={sessionKey} />;
}

function SkillsList() {
  const sessionKey = useSessionKey();
  const navigate = useNavigate();
  const { data: skills, isLoading, error } = useSkills();
  const [searchQuery, setSearchQuery] = useState("");
  const [isTemplateGalleryOpen, setIsTemplateGalleryOpen] = useState(false);
  const [toggleNotice, setToggleNotice] = useState<string | null>(null);

  const toggleMutation = useToggleSkillMutation();

  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    if (!searchQuery.trim()) return skills;
    const query = searchQuery.toLowerCase().trim();
    return skills.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query),
    );
  }, [skills, searchQuery]);

  const [toggleError, setToggleError] = useState<string | null>(null);
  const handleToggle = async (skill: SkillSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setToggleError(null);
    try {
      await toggleMutation.mutateAsync({
        skill,
        enabled: !skill.enabled,
      });
      if (currentSessionKey() !== sessionKey) return;
      setToggleNotice("Thay đổi áp dụng từ lượt chat tiếp theo");
    } catch (error) {
      if (currentSessionKey() !== sessionKey) return;
      setToggleError(
        error instanceof Error ? error.message : "Không thể cập nhật kỹ năng.",
      );
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={isTemplateGalleryOpen}
        onClose={() => setIsTemplateGalleryOpen(false)}
      />

      {toggleError && <p role="alert">{toggleError}</p>}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[var(--color-primary)]" />
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
                Kỹ năng cá nhân
              </h1>
            </div>

            <nav
              aria-label="Điều hướng Agent"
              className="flex items-center rounded-lg border border-[var(--color-border)] p-0.5 bg-[var(--color-bg-secondary)]"
            >
              <Link
                to="/agent"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <span>Trò chuyện</span>
              </Link>
              <Link
                to="/agent/skills"
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-[var(--color-bg-primary)] text-[var(--color-text)] shadow-xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span>Kỹ năng</span>
              </Link>
            </nav>
          </div>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Tùy chỉnh hướng dẫn và phong cách làm việc của Orbit Agent cho riêng
            bạn.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTemplateGalleryOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
          >
            <BookOpen className="h-4 w-4" />
            <span>Thêm từ mẫu</span>
          </button>

          <Link
            to="/agent/skills/new"
            className="flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo kỹ năng</span>
          </Link>
        </div>
      </div>

      {/* Status Notice on toggle */}
      {toggleNotice && (
        <div
          role="status"
          className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-4 py-2.5 text-xs font-medium text-[var(--color-primary)] flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>{toggleNotice}</span>
        </div>
      )}

      {/* Controls Bar: Search & Quota */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm kỹ năng theo tên hoặc mô tả..."
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] pl-10 pr-4 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-primary)] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-muted)]">
          <Layers className="h-4 w-4" />
          <span>{skills ? `${skills.length}/50 kỹ năng` : "Đang tải..."}</span>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-600 dark:text-red-400 flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8" />
          <span className="font-semibold">Không thể tải danh sách kỹ năng</span>
          <p className="text-xs text-[var(--color-text-muted)]">
            Vui lòng thử làm mới trang hoặc kiểm tra kết nối mạng.
          </p>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <BookOpen className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--color-text)]">
            {searchQuery
              ? "Không tìm thấy kỹ năng phù hợp"
              : "Chưa có kỹ năng cá nhân nào"}
          </h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)] max-w-md mx-auto">
            {searchQuery
              ? `Không có kết quả nào cho "${searchQuery}". Hãy thử tìm kiếm với từ khóa khác.`
              : "Kỹ năng giúp Orbit Agent làm việc theo phong cách và hướng dẫn của riêng bạn. Bạn có thể tự tạo hoặc chọn từ các mẫu sẵn có."}
          </p>
          {!searchQuery && (
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsTemplateGalleryOpen(true)}
                className="rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              >
                Thêm từ mẫu
              </button>
              <Link
                to="/agent/skills/new"
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Tạo kỹ năng
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => navigate(`/agent/skills/${skill.id}`)}
              className="group relative cursor-pointer rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-primary)] p-5 shadow-xs transition-all hover:border-[var(--color-primary)] hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-bg-secondary)] text-[var(--color-primary)] group-hover:bg-[var(--color-primary)]/10">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <h3 className="font-semibold text-base text-[var(--color-text)] group-hover:text-[var(--color-primary)] transition-colors">
                      {skill.name}
                    </h3>
                  </div>

                  {/* Toggle Button */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2"
                  >
                    <button
                      type="button"
                      role="switch"
                      aria-checked={skill.enabled}
                      aria-label={`Bật/tắt ${skill.name}`}
                      disabled={toggleMutation.isPending}
                      onClick={(e) => handleToggle(skill, e)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        skill.enabled
                          ? "bg-[var(--color-primary)]"
                          : "bg-[var(--color-border)]"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          skill.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-xs sm:text-sm text-[var(--color-text-muted)] line-clamp-3">
                  {skill.description || "Chưa có mô tả."}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-[var(--color-bg-secondary)] px-2 py-0.5 font-medium">
                    v{skill.version}
                  </span>
                  {skill.sourceTemplateId && (
                    <span className="rounded-md border border-[var(--color-border)] px-1.5 py-0.5 text-[10px]">
                      Mẫu: {skill.sourceTemplateId}
                    </span>
                  )}
                </div>

                <span className="text-[11px]">
                  Cập nhật: {new Date(skill.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
