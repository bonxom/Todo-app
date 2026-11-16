import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  BookOpen,
  Check,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  currentSessionKey,
  useSessionKey,
  useSkills,
  useToggleSkillMutation,
} from "@/features/agent/skills/useSkillQueries";
import type { SkillSummary } from "@/shared/types/skill";
import SkillTemplateDialog from "../components/SkillTemplateDialog";
import V2AgentTabs from "../components/V2AgentTabs";

export default function SkillsPage() {
  const sessionKey = useSessionKey();
  return <SkillsLibrary key={sessionKey} />;
}

function SkillsLibrary() {
  const { t } = useTranslation("v2");
  const { t: tAgent } = useTranslation("agent");
  const sessionKey = useSessionKey();
  const { data: skills, isLoading, error, refetch } = useSkills();
  const toggleMutation = useToggleSkillMutation();
  const [query, setQuery] = useState("");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    const list = skills ?? [];
    if (!needle) return list;
    return list.filter((skill) =>
      `${skill.name} ${skill.description}`
        .toLocaleLowerCase()
        .includes(needle),
    );
  }, [skills, query]);

  const activeCount = skills?.filter((skill) => skill.enabled).length ?? 0;

  const handleToggle = async (skill: SkillSummary) => {
    setToggleError(null);
    setNotice(null);
    try {
      await toggleMutation.mutateAsync({ skill, enabled: !skill.enabled });
      if (currentSessionKey() === sessionKey)
        setNotice(tAgent("changesApplyFromTheNextChatTurnLabel"));
    } catch (err) {
      if (currentSessionKey() === sessionKey)
        setToggleError(
          err instanceof Error
            ? err.message
            : tAgent("unableToUpdateSkillPleaseTryAgain"),
        );
    }
  };

  return (
    <div className="v2-skills" data-testid="v2-skills-page">
      <header className="v2-agents-heading">
        <div>
          <p className="v2-eyebrow">
            <span aria-hidden="true" />
            {t("agentsEyebrow")}
          </p>
          <h1>
            {tAgent("personalSkills")}
            <span>{tAgent("customizeHowAgentWorksWithYou")}</span>
          </h1>
        </div>
        <div className="v2-agents-heading-actions">
          <button
            type="button"
            className="v2-btn"
            onClick={() => setGalleryOpen(true)}
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>{tAgent("addFromTemplate")}</span>
          </button>
          <Link className="v2-btn v2-btn-primary" to="/v2/agents/skills/new">
            <Plus size={16} aria-hidden="true" />
            <span>{tAgent("createSkill")}</span>
          </Link>
        </div>
      </header>

      <V2AgentTabs />

      {(toggleError || notice) && (
        <div
          className="v2-skills-notice"
          data-variant={toggleError ? "error" : "notice"}
          role={toggleError ? "alert" : "status"}
        >
          {toggleError ? (
            <AlertCircle size={16} aria-hidden="true" />
          ) : (
            <Check size={16} aria-hidden="true" />
          )}
          <span>{toggleError || notice}</span>
          <button
            type="button"
            className="v2-btn v2-skills-notice-close"
            aria-label={tAgent("closeNotice")}
            onClick={() => {
              setToggleError(null);
              setNotice(null);
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="v2-agent-panel v2-skills-library" aria-label={tAgent("personalSkillsLibrary")}>
        <div className="v2-skills-toolbar">
          <div>
            <h2>
              {tAgent("yourSkills")}{" "}
              <span className="v2-skills-count">{skills?.length ?? 0}</span>
            </h2>
            <p>
              {activeCount} {tAgent("active")} · {tAgent("max50Skills")}
            </p>
          </div>
          <div className="v2-skills-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="v2-input v2-search-input"
              placeholder={tAgent("searchSkills")}
              aria-label={tAgent("searchSkills")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p className="v2-skills-status" role="status">
            <Loader2 size={18} className="v2-spin" aria-hidden="true" />
            {tAgent("loadingSkills")}
          </p>
        ) : error ? (
          <div className="v2-skills-status" role="alert">
            <p>
              {error instanceof Error
                ? error.message
                : tAgent("anErrorOccurredWhileSavingTheSkill")}
            </p>
            <button
              type="button"
              className="v2-btn"
              onClick={() => void refetch()}
            >
              {t("retry")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="v2-skills-status">
            <p>
              {skills?.length
                ? tAgent("noMatchingSkillsFound")
                : tAgent("noPersonalSkillsYet")}
            </p>
            {skills?.length ? (
              <button
                type="button"
                className="v2-btn"
                onClick={() => setQuery("")}
              >
                {tAgent("clearSearch")}
              </button>
            ) : (
              <Link
                className="v2-btn v2-btn-primary"
                to="/v2/agents/skills/new"
              >
                <Plus size={15} aria-hidden="true" />
                {tAgent("createSkill")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="v2-skills-list">
            {filtered.map((skill) => (
              <li key={skill.id} className="v2-skills-row">
                <Link
                  to={`/v2/agents/skills/${skill.id}`}
                  className="v2-skills-link"
                >
                  <span className="v2-skills-name">{skill.name}</span>
                  <span className="v2-skills-description">
                    {skill.description}
                  </span>
                </Link>
                <button
                  type="button"
                  role="switch"
                  aria-checked={skill.enabled}
                  aria-label={`${tAgent("enableSkill")}: ${skill.name}`}
                  className="v2-switch"
                  disabled={toggleMutation.isPending}
                  onClick={() => void handleToggle(skill)}
                >
                  <span aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SkillTemplateDialog
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
