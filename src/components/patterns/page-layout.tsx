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
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="full-page">
      <header className="full-page-heading">
        <div>
          <span className="eyebrow">{eyebrow}</span>
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
