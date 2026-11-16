import type { PropsWithChildren } from "react";

export type GlassPanelProps = PropsWithChildren<{
  className?: string;
}>;

export default function GlassPanel({
  className = "",
  children,
}: GlassPanelProps) {
  return <div className={`v2-glass-panel ${className}`.trim()}>{children}</div>;
}
