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
    <div
      className="ui-page-shell mx-auto skills-page max-w-[1120px]
      [&_:is(button,a):focus-visible]:[outline:2px_solid_var(--color-accent)]
      [&_:is(button,a):focus-visible]:outline-offset-[3px] [&_button:disabled]:cursor-not-allowed
      [&_button:disabled]:opacity-[0.5]"
    >
      <TemplateGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
      />
      <div
        className="skills-section-bar flex items-center justify-between gap-[16px] min-h-[44px]
        [@media(max-width:760px)]:[&_.agent-navigation_a]:p-[0_9px]
        [@media(max-width:760px)]:[&_.agent-navigation_svg]:[display:none]"
      >
        <span className="skills-section-name inline-flex items-center gap-[9px] text-[var(--color-text-muted)] text-[13px] [font-weight:600] [@media(max-width:760px)]:text-[12px]">
          <span className="skills-orbit-dot w-[9px] h-[9px] [border:2px_solid_var(--color-accent)] rounded-[50%] [box-shadow:0_0_0_4px_var(--color-accent-soft)]" />
          {t("orbitAgent")}
        </span>
        <AgentNavigation active="skills" />
      </div>
      <header
        className="skills-heading flex items-center justify-between gap-[24px]
        [@media(max-width:1000px)]:items-start [@media(max-width:1000px)]:[&_.skills-actions]:flex-wrap
        [@media(max-width:760px)]:flex-col [@media(max-width:760px)]:gap-[18px]
        [@media(max-width:760px)]:[&_.skills-actions]:w-full"
      >
        <div>
          <h1 className="ui-page-title m-[0] text-[var(--color-text)] [font-weight:650] text-balance">
            {t("personalSkills")}
          </h1>
          <p className="ui-page-description max-w-[68ch] text-[var(--color-text-muted)] [line-height:1.6] text-pretty">
            {t("customizeHowAgentWorksWithYou")}
          </p>
        </div>
        <div className="skills-actions flex items-center gap-[10px] shrink-0 [@media(max-width:760px)]:[&_>_:is(a,button)]:flex-1">
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
          className={`skills-notice flex items-center gap-[10px] p-[14px_16px] [border:1px_solid_var(--color-line)] rounded-[9px] text-[13px] [&_>_svg]:shrink-0 [&_>_span]:flex-1 [&_>_div]:flex-1 [&_p]:m-[5px_0_0] [@media(max-width:760px)]:flex-wrap ${toggleError ? "skills-notice--error" : ""}`}
          role={toggleError ? "alert" : "status"}
        >
          {toggleError ? <AlertCircle size={17} /> : <Check size={17} />}
          <span>{toggleError || notice}</span>
          <button
            className="skills-icon-button grid place-items-center w-[36px] h-[36px] p-[0] [border:0] rounded-[8px]
              [background:transparent] cursor-pointer shrink-0 [&:hover]:[background:var(--color-surface-muted)]"
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
        className="skill-library [border:1px_solid_var(--color-line)] rounded-[12px] [background:var(--color-surface)] overflow-hidden"
        aria-label={t("personalSkillsLibrary")}
      >
        <div
          className="skill-library-toolbar flex justify-between p-[24px] [&_h2]:flex [&_h2]:m-[0] [&_h2]:text-[15px]
          [&_h2]:[font-weight:650] [&_p]:m-[5px_0_0] [&_p]:text-[12px] [&_p]:text-[var(--color-text-muted)]
          [@media(max-width:760px)]:flex-col [@media(max-width:760px)]:p-[20px]"
        >
          <div>
            <h2>
              {t("yourSkills")}{" "}
              <span className="skill-count p-[1px_7px] rounded-[5px] [background:var(--color-surface-muted)] text-[var(--color-text-muted)] text-[12px]">
                {skills?.length ?? 0}
              </span>
            </h2>
            <p>
              {skills?.filter((s) => s.enabled).length ?? 0} {t("active")}{" "}
              <span aria-hidden="true">·</span> {t("max50Skills")}
            </p>
          </div>
          <label
            className="skill-search flex items-center gap-[9px] min-h-[40px] p-[0_12px] [border:1px_solid_var(--color-line)]
            rounded-[8px] text-[var(--color-text-muted)] [&:focus-within]:border-[var(--color-accent)]
            [&:focus-within]:[box-shadow:var(--ring-focus-shadow)] [&_input]:min-w-[0] [&_input]:[border:0]
            [&_input]:[outline:0] [&_input]:[background:transparent]"
          >
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
          <div
            className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
            [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
            [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
            role="status"
          >
            <Loader2 className="animate-spin" />
            {t("loadingSkills")}
          </div>
        ) : error ? (
          <div
            className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
            [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
            [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
            role="alert"
          >
            <AlertCircle />
            <h3>{t("unableToLoadSkills")}</h3>
            <p>{t("checkYourConnectionAndTryAgain")}</p>
            <button className="ui-btn-secondary" onClick={() => void refetch()}>
              {t("tryAgain")}
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="skills-empty min-h-[280px] p-[44px_24px] flex items-center justify-center flex-col gap-[12px] text-center
            [&_h3]:m-[6px_0_0] [&_h3]:text-[18px] [&_h3]:[font-weight:650] [&_p]:max-w-[45ch] [&_p]:m-[0]
            [&_p]:text-[14px] [&_p]:[line-height:1.7] [&_p]:text-[var(--color-text-muted)]"
          >
            <div
              className="skill-empty-symbol grid place-items-center w-[66px] h-[72px] [border:1px_solid_var(--color-line)]
              rounded-[12px_12px_12px_3px] [background:var(--color-accent-soft)] text-[var(--color-accent)]
              [transform:rotate(-5deg)]"
            >
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
                className="skill-text-action inline-flex items-center justify-center gap-[7px] p-[8px_0] [border:0] [background:none] cursor-pointer"
                onClick={() => setGalleryOpen(true)}
              >
                {t("exploreIeltsAndGymTemplates")}
                <ArrowUpRight size={16} />
              </button>
            )}
          </div>
        ) : (
          <ul className="skill-list m-[0] p-[0] [list-style:none]">
            {filtered.map((skill) => (
              <li
                key={skill.id}
                className={`skill-row flex items-center gap-[20px] [border-top:1px_solid_var(--color-line)] p-[22px_24px] relative [&:hover]:[background:color-mix(_in_srgb,var(--color-accent-soft)_30%,var(--color-surface)_)] [@media(max-width:760px)]:p-[20px] [@media(max-width:760px)]:gap-[12px] [@media(max-width:760px)]:flex-wrap ${!skill.enabled ? "skill-row--paused" : ""}`}
              >
                <Link
                  to={`/agent/skills/${skill.id}`}
                  className="skill-row-link flex items-start gap-[17px] flex-1 min-w-[0] [text-decoration:none] rounded-[4px]
                    [@media(max-width:760px)]:basis-[calc(100%_-_32px)] [@media(max-width:760px)]:gap-[13px]"
                >
                  <span className="skill-document-icon grid place-items-center w-[43px] h-[48px] rounded-[8px_8px_8px_2px] shrink-0">
                    {skill.sourceTemplateId ? (
                      <BookOpen size={21} />
                    ) : (
                      <SlidersHorizontal size={21} />
                    )}
                  </span>
                  <div
                    className="skill-row-copy min-w-[0] [&_h3]:m-[0_0_5px] [&_h3]:[font-weight:650] [&_h3]:wrap-anywhere [&_p]:m-[0]
                    [&_p]:text-[var(--color-text-muted)] [&_p]:[line-height:1.6] [&_p]:max-w-[64ch] [&_p]:[display:-webkit-box]
                    [&_p]:[-webkit-line-clamp:2] [&_p]:[-webkit-box-orient:vertical] [&_p]:overflow-hidden"
                  >
                    <h3>{skill.name}</h3>
                    <p>{skill.description}</p>
                    <div className="skill-row-meta flex flex-wrap gap-[8px] mt-[10px] text-[var(--color-text-muted)] text-[11px] [&_span_+_span::before]:mr-[8px]">
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
                <div className="skill-row-state flex items-center gap-[12px] shrink-0 text-[12px] text-[var(--color-text-muted)] [@media(max-width:760px)]:ml-[56px] [@media(max-width:760px)]:flex-row-reverse">
                  <span>{skill.enabled ? t("enabled") : t("disabled")}</span>
                  <button
                    className="skill-switch inline-flex items-center w-[38px] h-[23px] [border:1px_solid_var(--color-line)] p-[2px]
                      [background:var(--color-line)] rounded-[99px] shrink-0 cursor-pointer [&_span]:w-[17px] [&_span]:h-[17px]
                      [&_span]:rounded-[50%] [&_span]:[background:#fff] [&_span]:[box-shadow:0_1px_3px_#0002]
                      [&[aria-checked=true]]:[background:var(--color-accent)] [&[aria-checked=true]]:border-[var(--color-accent)]
                      [&[aria-checked=true]_span]:[transform:translateX(15px)]"
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
                  className="skill-row-chevron text-[var(--color-text-muted)] shrink-0 [@media(max-width:760px)]:absolute [@media(max-width:760px)]:right-[16px] [@media(max-width:760px)]:top-[24px]"
                  size={17}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ul>
        )}
        <div
          className="skill-library-footer flex items-center gap-[9px] p-[16px_24px] [border-top:1px_solid_var(--color-line)]
          [background:var(--color-surface-muted)] text-[var(--color-text-muted)] text-[12px] [&_svg]:shrink-0
          [@media(max-width:760px)]:p-[15px_20px] [@media(max-width:760px)]:items-start
          [@media(max-width:760px)]:[line-height:1.6]"
        >
          <BookOpen size={15} />
          <span>
            {t("agentOnlyReadsRelevantSkillsYouCanEditOrDisableThemAnytime")}
          </span>
        </div>
      </section>
    </div>
  );
}
