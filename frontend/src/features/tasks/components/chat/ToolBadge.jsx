import { X } from "lucide-react";
import { ToolIcon } from "./SlashCommandMenu";
import { TOOL_CATALOG } from "./toolCatalog";

export const ToolBadge = ({ tool, onRemove, size = "md", className = "" }) => {
  const toolData =
    typeof tool === "string"
      ? TOOL_CATALOG.find((t) => t.id === tool) || {
          id: tool,
          name: tool,
          category: "core",
        }
      : tool;

  if (!toolData) return null;

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent-strong)] dark:text-[var(--color-accent)] transition-all ${
        isSmall
          ? "px-2 py-0.5 text-[11px]"
          : "px-2.5 py-1 text-xs shadow-xs"
      } ${className}`}
    >
      <ToolIcon
        iconName={toolData.iconName}
        category={toolData.category}
        className={isSmall ? "h-3 w-3" : "h-3.5 w-3.5"}
      />
      <span className="font-mono font-semibold">{toolData.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove skill ${toolData.name}`}
          className="ml-0.5 -mr-1 flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-accent)]/20 hover:text-[var(--color-accent-strong)] cursor-pointer transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default ToolBadge;
