import type { HTMLAttributes, PropsWithChildren } from "react";

export type GlassPanelProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    as?: "div" | "section" | "aside" | "article";
    className?: string;
  }
>;

export default function GlassPanel({
  as: Component = "div",
  className = "",
  children,
  ...props
}: GlassPanelProps) {
  return (
    <Component className={`v2-glass-panel ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
