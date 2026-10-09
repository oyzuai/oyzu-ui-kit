import { createContext, useContext, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleDashed,
  CircleMinus,
  LoaderCircle,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { ActionId } from "./assistant-engine";
import {
  stateLabel,
  type CheckConclusion,
  type ManagerStatus,
  type Role,
  type RunState,
} from "./model";

// Shared prototype plumbing every design direction uses: the viewer's role, the
// state chip, and the confirmation text an assistant action produces.

export type PrototypeContextValue = { role: Role };
export const PrototypeContext = createContext<PrototypeContextValue>({ role: "member" });
export const usePrototype = () => useContext(PrototypeContext);

const icons = {
  succeeded: CheckCircle2,
  success: CheckCircle2,
  healthy: CheckCircle2,
  failed: XCircle,
  failure: XCircle,
  timed_out: XCircle,
  running: LoaderCircle,
  in_progress: LoaderCircle,
  queued: CircleDashed,
  skipped: CircleMinus,
  cancelled: CircleMinus,
  paused: CircleMinus,
  warning: TriangleAlert,
  action_required: TriangleAlert,
} as const;

const checkLabels: Record<CheckConclusion, string> = {
  queued: "Queued",
  in_progress: "In progress",
  success: "Success",
  failure: "Failure",
  skipped: "Skipped",
  cancelled: "Cancelled",
  action_required: "Action required",
};

/** A compact state chip: icon plus word, coloured by meaning. */
export function StateChip({
  state,
  label,
  size = "md",
}: {
  state: RunState | CheckConclusion | ManagerStatus;
  label?: string;
  size?: "sm" | "md";
}) {
  const Icon = icons[state as keyof typeof icons] ?? CircleDashed;
  const text =
    label ??
    (state in stateLabel
      ? stateLabel[state as RunState]
      : state in checkLabels
        ? checkLabels[state as CheckConclusion]
        : state[0].toUpperCase() + state.slice(1));
  return (
    <span className={`rb-chip rb-chip-${size}`} data-state={state}>
      <Icon size={size === "sm" ? 11 : 13} aria-hidden="true" className={state === "running" || state === "in_progress" ? "animate-spin" : undefined} />
      {text}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rb-mono">{children}</code>;
}

/** What the platform would say after the person confirms an assistant action. */
export function actionResult(id: ActionId, target?: string): string | undefined {
  switch (id) {
    case "rerun-failed":
      return "Queued attempt 3 of run 9012 on Acme on-prem. The check on #482 shows queued again.";
    case "rerun":
      return "Queued a new attempt of the same check and commit.";
    case "apply-fix":
      return "Posted a suggested change on pull request #482 for dana.okafor to review.";
    case "drain-manager":
      return `${target ?? "mgr-onprem-02"} is draining. It finishes running jobs and claims nothing new.`;
    case "rotate-secret":
      return "New webhook secret generated and shown once to pool admins. The old one works for 24 hours.";
    case "explain":
      return "Explained against today's bindings: still no match, because PR #483 is still a draft.";
    case "replay":
      return "Replayed as a new delivery linked to the original.";
    default:
      return undefined;
  }
}
