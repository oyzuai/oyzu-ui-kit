import { useActiveContext } from "./active-context";
import type { ReactNode } from "react";
import "./page-layout.css";
/** Full-width page structure. Content decides whether it needs a secondary rail. */
export function PageLayout({
  eyebrow,
  title,
  description,
  actions,
  children,
  aside,
  identity,
  contextLabel,
  variant = "workspace",
}: {
  variant?: "workspace" | "discovery" | "entity" | "ledger";
  identity?: ReactNode;
  contextLabel?: string;
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const context = useActiveContext();
  const contextEyebrow =
    context.organization !== "Workspace"
      ? `${context.organization} / ${context.project ?? "Organization"}`
      : eyebrow;
  return (
    <div className="full-page" data-page-family={variant}>
      <header className="full-page-heading">
        {identity}
        <div>
          <span className="eyebrow">{contextLabel ?? contextEyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && <div className="full-page-actions">{actions}</div>}
      </header>
      <div className={"full-page-body" + (aside ? " with-rail" : "")}>
        <div className="full-page-primary">{children}</div>
        {aside && <aside className="full-page-rail">{aside}</aside>}
      </div>
    </div>
  );
}
