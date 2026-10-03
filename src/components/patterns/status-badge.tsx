import {
  CheckCircle2,
  CircleDashed,
  CirclePause,
  TriangleAlert,
  XCircle,
  LoaderCircle,
} from "lucide-react";
export type ResourceStatus =
  "healthy" | "pending" | "paused" | "warning" | "failed";
const statuses = {
  healthy: { label: "Healthy", Icon: CheckCircle2 },
  pending: { label: "Pending", Icon: CircleDashed },
  paused: { label: "Paused", Icon: CirclePause },
  warning: { label: "Needs attention", Icon: TriangleAlert },
  failed: { label: "Failed", Icon: XCircle },
};
export function StatusBadge({
  status,
  label,
}: {
  status: ResourceStatus;
  label?: string;
}) {
  const { Icon, label: fallback } = statuses[status];
  return (
    <span className={"resource-status status-" + status}>
      <Icon size={12} aria-hidden="true" />
      {label || fallback}
    </span>
  );
}
export function PendingIndicator({
  children = "Working…",
}: {
  children?: React.ReactNode;
}) {
  return (
    <span className="pending-indicator" role="status">
      <LoaderCircle size={14} className="animate-spin" />
      {children}
    </span>
  );
}
