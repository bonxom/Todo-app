import { getLocale } from "@/shared/i18n";
import type { Category, Project } from "@/shared/types/domain";

function parseValidDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasNonMidnightTime(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatProposalDate(
  date: Date,
  includeTime = hasNonMidnightTime(date),
): string {
  const locale = getLocale();
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function formatProposalTime(date: Date): string {
  return new Intl.DateTimeFormat(getLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatProposalSchedule(
  startDate: string | null | undefined,
  dueDate: string | null | undefined,
  t: (key: string, options?: Record<string, unknown>) => string,
): string | null {
  const start = parseValidDate(startDate);
  const due = parseValidDate(dueDate);

  if (start && due) {
    if (isSameLocalDay(start, due)) {
      const dayLabel = formatProposalDate(start, false);
      if (hasNonMidnightTime(start) || hasNonMidnightTime(due)) {
        return `${dayLabel} · ${formatProposalTime(start)} → ${formatProposalTime(due)}`;
      }
      return dayLabel;
    }
    return `${formatProposalDate(start)} → ${formatProposalDate(due)}`;
  }

  if (due) {
    return t("proposalDuePrefix", { date: formatProposalDate(due) });
  }

  if (start) {
    return t("proposalStartPrefix", { date: formatProposalDate(start) });
  }

  return null;
}

export function resolveCategoryName(
  categoryId: string | undefined,
  categories: Category[],
  fallbackLabel: string,
): string | null {
  if (!categoryId) return null;
  const match = categories.find((category) => category._id === categoryId);
  return match?.name ?? fallbackLabel;
}

export function resolveProjectName(
  projectId: string | null | undefined,
  projects: Project[],
  fallbackLabel: string,
): string | null {
  if (!projectId) return null;
  const match = projects.find((project) => project._id === projectId);
  return match?.name ?? fallbackLabel;
}
