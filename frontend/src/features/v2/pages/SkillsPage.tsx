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
      `${skill.name} ${skill.description}`.toLocaleLowerCase().includes(needle),
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
    <div
      className="v2-skills flex flex-col gap-[18px] [&_h1_>_span]:block [&_h1_>_span]:mt-[8px]
      [&_h1_>_span]:[font-family:var(--v2-font-body)] [&_h1_>_span]:text-[13px] [&_h1_>_span]:[font-weight:400]
      [&_h1_>_span]:[letter-spacing:0] [&_h1_>_span]:text-[var(--v2-muted)]"
      data-testid="v2-skills-page"
    >
      <h1 className="sr-only">{tAgent("personalSkills")}</h1>
      <header
        className="v2-page-actions [&.v2-skills-header]:items-center [&.v2-skills-header]:justify-between
        [&.v2-skills-header]:flex-wrap [&.v2-skills-header]:gap-[12px] flex justify-end v2-skills-header"
      >
        <V2AgentTabs />
        <div className="v2-agents-heading-actions flex gap-[10px] flex-wrap">
          <button
            type="button"
            className="v2-btn"
            onClick={() => setGalleryOpen(true)}
          >
            <BookOpen size={16} aria-hidden="true" />
            <span>{tAgent("addFromTemplate")}</span>
          </button>
          <Link
            className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
            to="/v2/agents/skills/new"
          >
            <Plus size={16} aria-hidden="true" />
            <span>{tAgent("createSkill")}</span>
          </Link>
        </div>
      </header>

      {(toggleError || notice) && (
        <div
          className="v2-skills-notice flex items-center gap-[10px] p-[10px_14px] [border:1px_solid_var(--v2-border)] rounded-[14px] [background:var(--v2-input-fill)] text-[13px]"
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
            className="v2-btn v2-skills-notice-close ml-auto"
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

      <section
        className="v2-agent-panel [border:1px_solid_var(--v2-glass-border)] rounded-[var(--v2-radius-card)] flex-col min-w-[0] min-h-[0] v2-skills-library gap-[14px]"
        aria-label={tAgent("personalSkillsLibrary")}
      >
        <div className="v2-skills-toolbar flex items-end justify-between gap-[14px] flex-wrap [&_h2]:text-[16px] [&_h2]:[font-weight:600] [&_p]:mt-[4px] [&_p]:text-[12px] [&_p]:text-[var(--v2-muted)]">
          <div>
            <h2>
              {tAgent("yourSkills")}{" "}
              <span
                className="v2-skills-count inline-grid place-items-center min-w-[24px] p-[1px_7px] rounded-[var(--v2-radius-pill)]
                [background:var(--v2-input-fill)] text-[12px] [font-variant-numeric:tabular-nums]"
              >
                {skills?.length ?? 0}
              </span>
            </h2>
            <p>
              {activeCount} {tAgent("active")} · {tAgent("max50Skills")}
            </p>
          </div>
          <div className="v2-skills-search relative flex items-center min-w-[min(280px,100%)] [&_>_svg]:absolute [&_>_svg]:left-[12px] [&_>_svg]:text-[var(--v2-muted)] [&_>_svg]:pointer-events-none">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="v2-input [&:focus]:[outline:2px_solid_var(--v2-accent)] [&:focus]:outline-offset-[2px] v2-search-input"
              placeholder={tAgent("searchSkills")}
              aria-label={tAgent("searchSkills")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <p
            className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
            role="status"
          >
            <Loader2
              size={18}
              className="v2-spin animate-[v2-spin_900ms_linear_infinite] [@media(prefers-reduced-motion:reduce)]:animate-none"
              aria-hidden="true"
            />
            {tAgent("loadingSkills")}
          </p>
        ) : error ? (
          <div
            className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]"
            role="alert"
          >
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
          <div className="v2-skills-status flex flex-col items-center gap-[12px] p-[36px_16px] text-[var(--v2-muted)] text-[13px] text-center [&_>_svg]:flex-[0_0_auto]">
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
                className="v2-btn v2-btn-primary [&:hover]:filter-[brightness(1.08)]"
                to="/v2/agents/skills/new"
              >
                <Plus size={15} aria-hidden="true" />
                {tAgent("createSkill")}
              </Link>
            )}
          </div>
        ) : (
          <ul className="v2-skills-list flex flex-col m-[0] p-[0] [list-style:none]">
            {filtered.map((skill) => (
              <li
                key={skill.id}
                className="v2-skills-row flex items-center justify-between gap-[14px] p-[14px_2px] [border-bottom:1px_solid_var(--v2-border)] [&:last-child]:[border-bottom:0]"
              >
                <Link
                  to={`/v2/agents/skills/${skill.id}`}
                  className="v2-skills-link flex flex-1 min-w-[0] flex-col gap-[4px]"
                >
                  <span className="v2-skills-name text-[15px] [font-weight:600]">
                    {skill.name}
                  </span>
                  <span className="v2-skills-description text-[13px] text-[var(--v2-muted)] overflow-hidden text-ellipsis">
                    {skill.description}
                  </span>
                </Link>
                <button
                  type="button"
                  role="switch"
                  aria-checked={skill.enabled}
                  aria-label={`${tAgent("enableSkill")}: ${skill.name}`}
                  className="v2-switch relative flex-[0_0_auto] w-[46px] h-[26px] p-[0] [border:1px_solid_var(--v2-border)]
                    rounded-[var(--v2-radius-pill)] [background:var(--v2-input-fill)] cursor-pointer [&_>_span]:absolute
                    [&_>_span]:top-[3px] [&_>_span]:left-[3px] [&_>_span]:w-[18px] [&_>_span]:h-[18px] [&_>_span]:rounded-[100%]
                    [&_>_span]:[background:var(--v2-muted)] [&[aria-checked=true]]:border-transparent
                    [&[aria-checked=true]]:[background:var(--v2-accent)]
                    [&[aria-checked=true]_>_span]:[transform:translateX(20px)]
                    [&[aria-checked=true]_>_span]:[background:var(--v2-accent-ink)] [&:disabled]:opacity-[0.6]
                    [&:disabled]:cursor-progress"
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
