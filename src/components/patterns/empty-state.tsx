import { Inbox, SearchX } from "lucide-react";
import type { ReactNode } from "react";
export function EmptyState({
  title,
  description,
  action,
  filtered = false,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  filtered?: boolean;
}) {
  const Icon = filtered ? SearchX : Inbox;
  return (
    <div className="kit-empty">
      <span className="kit-empty-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
