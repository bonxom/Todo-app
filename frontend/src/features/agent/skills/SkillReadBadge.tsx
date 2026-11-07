import { useTranslation } from "react-i18next";
import { ApiError } from "@/shared/services/apiError";
import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, AlertTriangle } from "lucide-react";
import { useSkill } from "./useSkillQueries";
import type { SkillReadRecord } from "@/shared/types/skill";

interface SkillReadBadgeProps {
  skill: SkillReadRecord;
}

export function SkillReadBadge({ skill }: SkillReadBadgeProps) {
  const { t } = useTranslation("agent");

  const [showTooltip, setShowTooltip] = useState(false);
  const { data: currentSkill, error } = useSkill(skill.id);

  const isDeleted = error instanceof ApiError && error.status === 404;
  const isDifferentVersion =
    currentSkill && currentSkill.version !== skill.version;

  let tooltipText = t("skillVersion", { version: skill.version });
  if (isDeleted) {
    tooltipText = t("skillIsNoLongerAvailable");
  } else if (isDifferentVersion) {
    tooltipText = t("usedSkillVersion", {
      version: skill.version,
      current: currentSkill.version,
    });
  }

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
        isDeleted
          ? "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          : isDifferentVersion
            ? "border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
            : "border border-[var(--color-line)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"
      }`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {isDeleted || isDifferentVersion ? (
        <AlertTriangle className="h-3 w-3 shrink-0" />
      ) : (
        <BookOpen className="h-3 w-3 shrink-0 text-[var(--color-accent)]" />
      )}
      <span>{t("readSkill", { name: skill.name })}</span>
    </span>
  );

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
    >
      {isDeleted ? (
        <div aria-label={t("readSkill", { name: skill.name })}>
          {badgeContent}
        </div>
      ) : (
        <Link
          to={`/agent/skills/${skill.id}`}
          className="focus:outline-hidden"
          aria-label={t("readSkill", { name: skill.name })}
        >
          {badgeContent}
        </Link>
      )}

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--color-surface)] px-2.5 py-1 text-xs text-[var(--color-text)] shadow-md border border-[var(--color-line)]"
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}
