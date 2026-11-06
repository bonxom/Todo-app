import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Search,
  Loader2,
  ArrowUpRight,
  ChevronRight,
  SlidersHorizontal,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import {
  useSkills,
  useToggleSkillMutation,
  useSessionKey,
  currentSessionKey,
} from "./useSkillQueries";
import { TemplateGallery } from "./TemplateGallery";
import { AgentNavigation } from "../AgentNavigation";
import type { SkillSummary } from "@/shared/types/skill";
import "./skills.css";

export function SkillsPage() {
  const sessionKey = useSessionKey();
  return <SkillsList key={sessionKey} />;
}

function SkillsList() {
  const sessionKey = useSessionKey();
  const { data: skills, isLoading, error, refetch } = useSkills();
  const [searchQuery, setSearchQuery] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const toggleMutation = useToggleSkillMutation();
  const filtered = useMemo(
    () =>
      (skills ?? []).filter((s) =>
        `${s.name} ${s.description}`
          .toLocaleLowerCase()
          .includes(searchQuery.trim().toLocaleLowerCase()),
      ),
    [skills, searchQuery],
  );
  const handleToggle = async (skill: SkillSummary) => {
    setToggleError(null);
    try {
      await toggleMutation.mutateAsync({ skill, enabled: !skill.enabled });
      if (currentSessionKey() === sessionKey)
        setNotice("Thay đổi áp dụng từ lượt chat tiếp theo");
    } catch (err) {
      if (currentSessionKey() === sessionKey)
        setToggleError(
          err instanceof Error
            ? err.message
            : "Không thể cập nhật kỹ năng. Hãy thử lại.",
        );
    }
  };
  return (
    <div className="ui-page-shell skills-page">
      <TemplateGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      <div className="skills-section-bar">
        <span className="skills-section-name">
          <span className="skills-orbit-dot" />
          Orbit Agent
        </span>
        <AgentNavigation active="skills" />
      </div>
      <header className="skills-heading">
        <div>
          <h1 className="ui-page-title">Kỹ năng cá nhân</h1>
          <p className="ui-page-description">
            Để Agent hiểu cách bạn muốn làm việc.
          </p>
        </div>
        <div className="skills-actions">
          <button
            className="ui-btn-secondary"
            onClick={() => setGalleryOpen(true)}
          >
            <BookOpen size={16} />
            Thêm từ mẫu
          </button>
          <Link className="ui-btn-primary" to="/agent/skills/new">
            <Plus size={17} />
            Tạo kỹ năng
          </Link>
        </div>
      </header>
      {(toggleError || notice) && (
        <div
          className={`skills-notice ${toggleError ? "skills-notice--error" : ""}`}
          role={toggleError ? "alert" : "status"}
        >
          {toggleError ? <AlertCircle size={17} /> : <Check size={17} />}
          <span>{toggleError || notice}</span>
          <button
            className="skills-icon-button"
            aria-label="Đóng thông báo"
            onClick={() => {
              setToggleError(null);
              setNotice(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section className="skill-library" aria-label="Thư viện kỹ năng cá nhân">
        <div className="skill-library-toolbar">
          <div>
            <h2>
              Kỹ năng của bạn{" "}
              <span className="skill-count">{skills?.length ?? 0}</span>
            </h2>
            <p>
              {skills?.filter((s) => s.enabled).length ?? 0} đang bật{" "}
              <span aria-hidden="true">·</span> Tối đa 50 kỹ năng
            </p>
          </div>
          <label className="skill-search">
            <Search size={17} />
            <span className="sr-only">Tìm kiếm kỹ năng</span>
            <input
              type="search"
              placeholder="Tìm kiếm kỹ năng…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        {isLoading ? (
          <div className="skills-empty" role="status">
            <Loader2 className="animate-spin" />
            Đang tải kỹ năng…
          </div>
        ) : error ? (
          <div className="skills-empty" role="alert">
            <AlertCircle />
            <h3>Không thể tải danh sách kỹ năng</h3>
            <p>Kiểm tra kết nối và thử lại.</p>
            <button className="ui-btn-secondary" onClick={() => void refetch()}>
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="skills-empty">
            <div className="skill-empty-symbol">
              <BookOpen size={28} />
            </div>
            <h3>
              {searchQuery
                ? "Không tìm thấy kỹ năng phù hợp"
                : "Chưa có kỹ năng cá nhân nào"}
            </h3>
            <p>
              {searchQuery
                ? "Thử một từ khóa khác hoặc xóa tìm kiếm để xem tất cả."
                : "Lưu những hướng dẫn bạn thường nhắc lại. Agent sẽ đọc và áp dụng khi phù hợp với cuộc trò chuyện."}
            </p>
            {searchQuery ? (
              <button
                className="ui-btn-secondary"
                onClick={() => setSearchQuery("")}
              >
                Xóa tìm kiếm
              </button>
            ) : (
              <button
                className="skill-text-action"
                onClick={() => setGalleryOpen(true)}
              >
                Khám phá mẫu IELTS và Gym <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <ul className="skill-list">
            {filtered.map((skill) => (
              <li
                key={skill.id}
                className={`skill-row ${!skill.enabled ? "skill-row--paused" : ""}`}
              >
                <Link
                  to={`/agent/skills/${skill.id}`}
                  className="skill-row-link"
                >
                  <span className="skill-document-icon">
                    {skill.sourceTemplateId ? (
                      <BookOpen size={21} />
                    ) : (
                      <SlidersHorizontal size={21} />
                    )}
                  </span>
                  <div className="skill-row-copy">
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    <div className="skill-row-meta">
                      <span>
                        {skill.sourceTemplateId
                          ? `Từ mẫu ${skill.sourceTemplateId === "ielts" ? "IELTS" : skill.sourceTemplateId === "gym" ? "Gym" : skill.sourceTemplateId}`
                          : "Tự tạo"}
                      </span>
                      <span>v{skill.version}</span>
                      <span>
                        Cập nhật{" "}
                        {new Intl.DateTimeFormat("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                        }).format(new Date(skill.updatedAt))}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="skill-row-state">
                  <span>{skill.enabled ? "Đang bật" : "Đang tắt"}</span>
                  <button
                    className="skill-switch"
                    role="switch"
                    aria-checked={skill.enabled}
                    aria-label={`Bật/tắt ${skill.name}`}
                    disabled={toggleMutation.isPending}
                    onClick={() => void handleToggle(skill)}
                  >
                    <span />
                  </button>
                </div>
                <ChevronRight
                  className="skill-row-chevron"
                  size={17}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        )}
        <div className="skill-library-footer">
          <BookOpen size={15} />
          <span>
            Agent chỉ đọc kỹ năng phù hợp. Bạn có thể chỉnh sửa hoặc tắt bất cứ
            lúc nào.
          </span>
        </div>
      </section>
    </div>
  );
}
