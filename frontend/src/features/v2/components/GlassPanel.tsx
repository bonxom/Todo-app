import type { HTMLAttributes, PropsWithChildren } from "react";

export type GlassPanelProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    className?: string;
  }
>;

export default function GlassPanel({
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <div className={`v2-glass-panel ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}
