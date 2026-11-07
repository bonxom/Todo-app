import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import "./agentNavigation.css";

export function AgentNavigation({ active }: { active: "chat" | "skills" }) {
  const { t } = useTranslation("agent");

  return (
    <nav className="agent-navigation" aria-label={t("agentNavigation")}>
      <Link to="/agent" aria-current={active === "chat" ? "page" : undefined}>
        <MessageSquare size={15} aria-hidden="true" /> {t("chat")}
      </Link>
      <Link
        to="/agent/skills"
        aria-current={active === "skills" ? "page" : undefined}
      >
        <BookOpen size={15} aria-hidden="true" /> {t("skills")}
      </Link>
    </nav>
  );
}
