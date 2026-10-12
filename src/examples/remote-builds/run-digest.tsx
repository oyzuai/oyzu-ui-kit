import {
  ChevronRight,
  Copy,
  ScrollText,
  Sparkles,
  Stethoscope,
  TriangleAlert,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { GroupIcon } from "./log-viewer";
import {
  duration,
  stripAnsiText,
  type Attempt,
  type GroupState,
  type LogEntry,
  type LogGroup,
  type Role,
  type Run,
} from "./model";
import { headline, stepName } from "./run-digest-logic";
import "./run-digest.css";

// "Summary-first" look: a run opens on a plain-language digest of what
// happened, with the raw log one click away instead of being the page.

export function RunDigest({
  run,
  groups,
  entries,
  live,
  attempt,
  role,
  onOpenLog,
  onAsk,
  onDiagnostics,
  logOpen,
}: {
  run: Run;
  groups: readonly LogGroup[];
  entries: readonly LogEntry[];
  live: boolean;
  attempt?: Attempt;
  role: Role;
  onOpenLog: (seq?: number) => void;
  onAsk?: (entry: LogEntry) => void;
  onDiagnostics?: (jobId: string) => void;
  logOpen: boolean;
}) {
  const head = headline(run, groups, entries, live, attempt);
  const firstError = entries.find((entry) => entry.level === "error");
  const errorLines = entries
    .filter((entry) => entry.level === "error" && entry.stream !== "system")
    .slice(0, 3);
  const steps = groups.filter(
    (group) => group.target !== "runner" || group.state === "failed",
  );
  return (
    <section className="rd" data-tone={head.tone} aria-label="Run summary">
      <header className="rd-head">
        <span className="rd-badge" aria-hidden="true">
          {head.tone === "warning" ? (
            <TriangleAlert size={18} />
          ) : (
            <GroupIcon
              state={
                head.tone === "neutral" ? "skipped" : (head.tone as GroupState)
              }
              size={18}
            />
          )}
        </span>
        <div>
          <h3>{head.title}</h3>
          {head.detail && <p>{head.detail}</p>}
        </div>
      </header>

      {steps.length > 0 && (
        <ol className="rd-steps" aria-label="Steps">
          {steps.map((group) => {
            const first = entries.find((entry) => entry.scope === group.scope);
            return (
              <li key={group.scope}>
                <button
                  type="button"
                  data-state={group.state}
                  onClick={() => onOpenLog(first?.seq)}
                  disabled={!first}
                >
                  <GroupIcon state={group.state} />
                  <span>
                    <strong>{stepName(group)}</strong>
                    <small>
                      {group.target === "task" || group.target === "runner"
                        ? ""
                        : `${group.target} · `}
                      {group.state === "running"
                        ? "running"
                        : group.state === "queued"
                          ? "waiting"
                          : duration(group.durationMs)}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {head.tone === "failed" && errorLines.length > 0 && (
        <div className="rd-error">
          <p className="rd-label">What went wrong</p>
          {errorLines.map((entry) => (
            <button
              key={entry.seq}
              type="button"
              className="rd-error-line"
              onClick={() => onOpenLog(entry.seq)}
            >
              <span>{stripAnsiText(entry.text)}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <footer className="rd-actions">
        {onAsk && (firstError || entries.length > 0) && (
          <Button
            size="sm"
            onClick={() => onAsk(firstError ?? entries[entries.length - 1])}
          >
            <Sparkles />{" "}
            {head.tone === "failed"
              ? "Explain this failure"
              : "Ask about this run"}
          </Button>
        )}
        {entries.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenLog(logOpen ? -1 : undefined)}
          >
            <ScrollText />{" "}
            {logOpen
              ? "Hide full log"
              : `Show full log · ${entries.length} lines`}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            navigator.clipboard?.writeText(run.command).catch(() => undefined)
          }
          title={run.command}
        >
          <Copy /> Copy command to reproduce
        </Button>
        {role === "pool-admin" &&
          onDiagnostics &&
          attempt &&
          attempt.state !== "succeeded" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDiagnostics(attempt.jobId)}
            >
              <Stethoscope /> Runner diagnostics
            </Button>
          )}
      </footer>
    </section>
  );
}
