import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare } from "lucide-react";

export default function V2AgentTabs() {
  const { t } = useTranslation("v2");
  const { pathname } = useLocation();
  const onSkills = pathname.startsWith("/v2/agents/skills");

  return (
    <nav
      className="v2-agent-tabs inline-flex gap-[5px] p-[5px] [border:1px_solid_var(--v2-border)] rounded-[var(--v2-radius-pill)]"
      aria-label={t("agents")}
    >
      <Link
        to="/v2/agents"
        className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
          [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
          [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
          [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
          [@media(max-width:899px)]:justify-center"
        data-active={!onSkills}
        aria-current={onSkills ? undefined : "page"}
      >
        <MessageSquare size={15} aria-hidden="true" />
        <span>{t("chatTab")}</span>
      </Link>
      <Link
        to="/v2/agents/skills"
        className="v2-agent-tab inline-flex items-center gap-[7px] min-h-[36px] p-[7px_14px] rounded-[var(--v2-radius-pill)]
          [transition:color_140ms_ease,background_140ms_ease] [&[data-active=true]]:[background:var(--v2-input-fill)]
          [&[data-active=true]]:[box-shadow:var(--v2-shadow-sm)]
          [@media(prefers-reduced-motion:reduce)]:[transition:none] [@media(max-width:899px)]:flex-1
          [@media(max-width:899px)]:justify-center"
        data-active={onSkills}
        aria-current={onSkills ? "page" : undefined}
      >
        <BookOpen size={15} aria-hidden="true" />
        <span>{t("skillsTab")}</span>
      </Link>
    </nav>
  );
}
