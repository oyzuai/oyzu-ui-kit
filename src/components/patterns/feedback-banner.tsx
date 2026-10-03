import { Info, CheckCircle2, TriangleAlert, XCircle, X } from "lucide-react";
import type { ReactNode } from "react";
const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  error: XCircle,
};
export function FeedbackBanner({
  tone = "info",
  title,
  children,
  action,
  onDismiss,
}: {
  tone?: keyof typeof icons;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const Icon = icons[tone];
  return (
    <div
      className={"feedback-banner feedback-" + tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={17} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {children && <p>{children}</p>}
        {action}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label={"Dismiss " + title}
          onClick={onDismiss}
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
