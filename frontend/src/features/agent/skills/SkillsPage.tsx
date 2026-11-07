import { getLocale } from "@/shared/i18n";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("agent");

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
        setNotice(t("changesApplyFromTheNextChatTurnLabel"));
    } catch (err) {
      if (currentSessionKey() === sessionKey)
        setToggleError(
          err instanceof Error
            ? err.message
            : t("unableToUpdateSkillPleaseTryAgain"),
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
          {t("orbitAgent")}
        </span>
        <AgentNavigation active="skills" />
      </div>
      <header className="skills-heading">
        <div>
          <h1 className="ui-page-title">{t("personalSkills")}</h1>
          <p className="ui-page-description">
            {t("customizeHowAgentWorksWithYou")}
          </p>
        </div>
        <div className="skills-actions">
          <button
            className="ui-btn-secondary"
            onClick={() => setGalleryOpen(true)}
          >
            <BookOpen size={16} />
            {t("addFromTemplate")}
          </button>
          <Link className="ui-btn-primary" to="/agent/skills/new">
            <Plus size={17} />
            {t("createSkill")}
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
            aria-label={t("closeNotice")}
            onClick={() => {
              setToggleError(null);
              setNotice(null);
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section
        className="skill-library"
        aria-label={t("personalSkillsLibrary")}
      >
        <div className="skill-library-toolbar">
          <div>
            <h2>
              {t("yourSkills")}{" "}
              <span className="skill-count">{skills?.length ?? 0}</span>
            </h2>
            <p>
              {skills?.filter((s) => s.enabled).length ?? 0} {t("active")}{" "}
              <span aria-hidden="true">·</span> {t("max50Skills")}
            </p>
          </div>
          <label className="skill-search">
            <Search size={17} />
            <span className="sr-only">{t("searchSkills")}</span>
            <input
              type="search"
              placeholder={t("searchSkillsLabel")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
        </div>
        {isLoading ? (
          <div className="skills-empty" role="status">
            <Loader2 className="animate-spin" />
            {t("loadingSkills")}
          </div>
        ) : error ? (
          <div className="skills-empty" role="alert">
            <AlertCircle />
            <h3>{t("unableToLoadSkills")}</h3>
            <p>{t("checkYourConnectionAndTryAgain")}</p>
            <button className="ui-btn-secondary" onClick={() => void refetch()}>
              {t("tryAgain")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="skills-empty">
            <div className="skill-empty-symbol">
              <BookOpen size={28} />
            </div>
            <h3>
              {searchQuery
                ? t("noMatchingSkillsFound")
                : t("noPersonalSkillsYet")}
            </h3>
            <p>
              {searchQuery
                ? t("tryADifferentKeywordOrClearYourSearchToSeeAllSkills")
                : t(
                    "saveGuidelinesYouFrequentlyRepeatAgentWillReadAndApplyThemWhenRelevantToYourConversation",
                  )}
            </p>
            {searchQuery ? (
              <button
                className="ui-btn-secondary"
                onClick={() => setSearchQuery("")}
              >
                {t("clearSearch")}
              </button>
            ) : (
              <button
                className="skill-text-action"
                onClick={() => setGalleryOpen(true)}
              >
                {t("exploreIeltsAndGymTemplates")}
                <ArrowUpRight size={16} />
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
                          ? t("templateSource", {
                              name:
                                skill.sourceTemplateId === "ielts"
                                  ? "IELTS"
                                  : skill.sourceTemplateId === "gym"
                                    ? t("gym")
                                    : skill.sourceTemplateId,
                            })
                          : t("custom")}
                      </span>
                      <span>v{skill.version}</span>
                      <span>
                        {t("updated")}{" "}
                        {new Intl.DateTimeFormat(getLocale(), {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(skill.updatedAt))}
                      </span>
                    </div>
                  </div>
                </Link>
                <div className="skill-row-state">
                  <span>{skill.enabled ? t("enabled") : t("disabled")}</span>
                  <button
                    className="skill-switch"
                    role="switch"
                    aria-checked={skill.enabled}
                    aria-label={t("toggleSkill", { name: skill.name })}
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
            {t("agentOnlyReadsRelevantSkillsYouCanEditOrDisableThemAnytime")}
          </span>
        </div>
      </section>
    </div>
  );
}
