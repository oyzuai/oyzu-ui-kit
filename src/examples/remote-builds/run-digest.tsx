import { ChevronRight, Copy, ScrollText, Sparkles, Stethoscope, TriangleAlert } from "lucide-react";
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
import "./run-digest.css";

// "Summary-first" look: a run opens on a plain-language digest of what
// happened, with the raw log one click away instead of being the page.

const taskNames: Record<string, string> = {
  compile: "Compile",
  test: "Tests",
  lint: "Lint",
  image: "Container image",
  "policy-check": "Policy check",
};

export function stepName(group: LogGroup) {
  if (group.target === "runner") return group.task === "setup" ? "Check out and start" : "Upload results";
  if (group.target === "task") return taskNames[group.task] ?? group.task;
  return `${taskNames[group.task] ?? group.task}`;
}

function headline(run: Run, groups: readonly LogGroup[], entries: readonly LogEntry[], live: boolean, attempt?: Attempt) {
  if (attempt?.logState === "incomplete")
    return { tone: "warning", title: "This attempt lost its runner", detail: attempt.reason ?? "" };
  const work = groups.filter((group) => group.target !== "runner");
  const failed = work.filter((group) => group.state === "failed");
  if (failed.length) {
    const group = failed[0];
    const counts = entries
      .filter((entry) => entry.scope === group.scope)
      .map((entry) => stripAnsiText(entry.text).match(/(\d+) passed; (\d+) failed/))
      .find(Boolean);
    const title = counts
      ? `${counts[2]} ${counts[2] === "1" ? "test" : "tests"} failed in ${group.target}`
      : `${stepName(group)} failed in ${group.target}`;
    const passed = work.length - failed.length;
    return {
      tone: "failed",
      title,
      detail: `${passed} of ${work.length} steps passed${counts ? `, and ${counts[1]} other tests in ${group.target} passed` : ""}. Nothing else needs your attention.`,
    };
  }
  if (live) {
    const current = work.find((group) => group.state === "running");
    const done = work.filter((group) => group.state === "succeeded").length;
    return {
      tone: "running",
      title: current ? `${stepName(current)} for ${current.target} is running` : "Starting",
      detail: `Step ${Math.min(done + 1, work.length)} of ${work.length}. Usually takes about a minute.`,
    };
  }
  if (!groups.length)
    return { tone: run.state === "failed" ? "failed" : "neutral", title: run.reason?.message ?? "No log for this run", detail: "" };
  return {
    tone: "succeeded",
    title: `All ${work.length} ${work.length === 1 ? "step" : "steps"} passed`,
    detail: `Finished in ${duration(run.durationMs)} on ${run.attempts.at(-1)?.pool ?? "the pool"}.`,
  };
}

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
  const errorLines = entries.filter((entry) => entry.level === "error" && entry.stream !== "system").slice(0, 3);
  const steps = groups.filter((group) => group.target !== "runner" || group.state === "failed");
  return (
    <section className="rd" data-tone={head.tone} aria-label="Run summary">
      <header className="rd-head">
        <span className="rd-badge" aria-hidden="true">
          {head.tone === "warning" ? <TriangleAlert size={18} /> : <GroupIcon state={head.tone === "neutral" ? "skipped" : (head.tone as GroupState)} size={18} />}
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
                <button type="button" data-state={group.state} onClick={() => onOpenLog(first?.seq)} disabled={!first}>
                  <GroupIcon state={group.state} />
                  <span>
                    <strong>{stepName(group)}</strong>
                    <small>
                      {group.target === "task" || group.target === "runner" ? "" : `${group.target} · `}
                      {group.state === "running" ? "running" : group.state === "queued" ? "waiting" : duration(group.durationMs)}
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
            <button key={entry.seq} type="button" className="rd-error-line" onClick={() => onOpenLog(entry.seq)}>
              <span>{stripAnsiText(entry.text)}</span>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <footer className="rd-actions">
        {onAsk && (firstError || entries.length > 0) && (
          <Button size="sm" onClick={() => onAsk(firstError ?? entries[entries.length - 1])}>
            <Sparkles /> {head.tone === "failed" ? "Explain this failure" : "Ask about this run"}
          </Button>
        )}
        {entries.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => onOpenLog(logOpen ? -1 : undefined)}>
            <ScrollText /> {logOpen ? "Hide full log" : `Show full log · ${entries.length} lines`}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigator.clipboard?.writeText(run.command).catch(() => undefined)}
          title={run.command}
        >
          <Copy /> Copy command to reproduce
        </Button>
        {role === "pool-admin" && onDiagnostics && attempt && attempt.state !== "succeeded" && (
          <Button size="sm" variant="ghost" onClick={() => onDiagnostics(attempt.jobId)}>
            <Stethoscope /> Runner diagnostics
          </Button>
        )}
      </footer>
    </section>
  );
}
