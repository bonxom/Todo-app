import { useTranslation } from "react-i18next";
import { BookOpen, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export function AgentNavigation({ active }: { active: "chat" | "skills" }) {
  const { t } = useTranslation("agent");

  return (
    <nav
      className="agent-navigation inline-flex gap-[4px] p-[4px] [border:1px_solid_var(--color-line)] rounded-[var(--radius-md)]
      [background:var(--color-surface-muted)] shrink-0 [&_a]:flex [&_a]:items-center [&_a]:justify-center
      [&_a]:gap-[7px] [&_a]:min-h-[34px] [&_a]:p-[0_12px] [&_a]:[text-decoration:none] [&_a]:rounded-[6px]
      [&_a]:whitespace-nowrap [&_a[aria-current=page]]:[background:var(--color-surface)]
      [&_a[aria-current=page]]:[box-shadow:var(--shadow-xs)]
      [&_a:focus-visible]:[outline:2px_solid_var(--color-accent)] [&_a:focus-visible]:outline-offset-[2px]"
      aria-label={t("agentNavigation")}
    >
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
