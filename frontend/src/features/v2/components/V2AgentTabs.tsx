import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare } from "lucide-react";

export default function V2AgentTabs() {
  const { t } = useTranslation("v2");
  const { pathname } = useLocation();
  const onSkills = pathname.startsWith("/v2/agents/skills");

  return (
    <nav className="v2-agent-tabs" aria-label={t("agents")}>
      <Link
        to="/v2/agents"
        className="v2-agent-tab"
        data-active={!onSkills}
        aria-current={onSkills ? undefined : "page"}
      >
        <MessageSquare size={15} aria-hidden="true" />
        <span>{t("chatTab")}</span>
      </Link>
      <Link
        to="/v2/agents/skills"
        className="v2-agent-tab"
        data-active={onSkills}
        aria-current={onSkills ? "page" : undefined}
      >
        <BookOpen size={15} aria-hidden="true" />
        <span>{t("skillsTab")}</span>
      </Link>
    </nav>
  );
}
