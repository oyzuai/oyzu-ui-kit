import { createContext, useContext, type ReactNode } from "react";
import {
  CheckCircle2,
  CircleDashed,
  CircleMinus,
  LoaderCircle,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  stateLabel,
  type CheckConclusion,
  type ManagerStatus,
  type Role,
  type RunState,
  statusWord,
} from "./model";

// Shared prototype plumbing every design direction uses: the viewer's role, the
// state chip, and the confirmation text an assistant action produces.

export type Look = "terminal" | "summary";
export type PrototypeContextValue = { role: Role; look: Look };
export const PrototypeContext = createContext<PrototypeContextValue>({
  role: "member",
  look: "summary",
});
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
  const text = label ?? statusWord(state as RunState);
  return (
    <span className={`rb-chip rb-chip-${size}`} data-state={state}>
      <Icon
        size={size === "sm" ? 11 : 13}
        aria-hidden="true"
        className={
          state === "running" || state === "in_progress"
            ? "animate-spin"
            : undefined
        }
      />
      {text}
      {label === undefined && (
        <span className="sr-only">
          {" "}
          (
          {state in stateLabel
            ? stateLabel[state as RunState]
            : state in checkLabels
              ? checkLabels[state as CheckConclusion]
              : state}
          )
        </span>
      )}
    </span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="rb-mono">{children}</code>;
}

/** What the platform would say after the person confirms an assistant action. */
export { actionResult } from "./assistant-policy";
