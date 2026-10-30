import { useEffect, useRef } from "react";
import {
  PlusCircle,
  ListTodo,
  Edit3,
  FileText,
  Folder,
  Briefcase,
  User,
  Dumbbell,
  GraduationCap,
  Wrench,
  Sparkles,
} from "lucide-react";
import { filterTools } from "./toolCatalog";

const ICONS = {
  PlusCircle,
  ListTodo,
  Edit3,
  FileText,
  Folder,
  Briefcase,
  User,
  Dumbbell,
  GraduationCap,
};

export const ToolIcon = ({ iconName, category, className = "h-4 w-4" }) => {
  const IconComponent =
    ICONS[iconName] || (category === "skill" ? Sparkles : Wrench);
  return <IconComponent className={className} />;
};

const SlashCommandMenu = ({
  query = "",
  selectedIndex = 0,
  onSelect,
  onHoverIndex,
}) => {
  const tools = filterTools(query);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex];
      if (activeEl?.scrollIntoView) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (tools.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 z-50 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3 text-center text-xs text-[var(--color-text-muted)] shadow-xl">
        No skills matching "{query}"
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Suggested skills"
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-2 z-50 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-1.5 shadow-xl transition-all"
    >
      <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Suggested skills ({tools.length})
      </div>
      {tools.map((tool, index) => {
        const isSelected = index === selectedIndex;
        return (
          <button
            key={tool.id}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(tool)}
            onMouseEnter={() => onHoverIndex?.(index)}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
              isSelected
                ? "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] dark:text-[var(--color-accent)]"
                : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                  isSelected
                    ? "border-[var(--color-accent)] bg-[var(--color-surface)] text-[var(--color-accent)]"
                    : "border-[var(--color-line)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]"
                }`}
              >
                <ToolIcon iconName={tool.iconName} category={tool.category} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="font-mono text-xs">{tool.name}</span>
                  <span className="text-[11px] text-[var(--color-text-muted)] font-normal">
                    • {tool.label}
                  </span>
                </div>
                <div className="truncate text-[11px] text-[var(--color-text-muted)]">
                  {tool.description}
                </div>
              </div>
            </div>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                tool.category === "skill"
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}
            >
              {tool.category === "skill" ? "Skill" : "Core"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default SlashCommandMenu;
