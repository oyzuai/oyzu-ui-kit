import { duration, stripAnsiText, type Attempt, type LogEntry, type LogGroup, type Run } from "./model.ts";

const taskNames: Record<string, string> = { compile: "Compile", test: "Tests", lint: "Lint", image: "Container image", "policy-check": "Policy check" };
export function stepName(group: LogGroup) {
  if (group.target === "runner") return group.task === "setup" ? "Check out and start" : "Upload results";
  return taskNames[group.task] ?? group.task;
}

export function headline(run: Run, groups: readonly LogGroup[], entries: readonly LogEntry[], live: boolean, attempt?: Attempt) {
  if (attempt?.logState === "incomplete") return { tone: "warning", title: "This attempt lost its runner", detail: attempt.reason ?? "" };
  const work = groups.filter((group) => group.target !== "runner");
  const failed = work.filter((group) => group.state === "failed");
  if (failed.length) {
    const group = failed[0];
    const counts = entries.filter((entry) => entry.scope === group.scope).map((entry) => stripAnsiText(entry.text).match(/(\d+) passed; (\d+) failed/)).find(Boolean);
    const title = counts ? `${counts[2]} ${counts[2] === "1" ? "test" : "tests"} failed in ${group.target}` : `${stepName(group)} failed in ${group.target}`;
    return { tone: "failed", title, detail: `${work.filter((item) => item.state === "succeeded").length} of ${work.length} steps passed${counts ? `, and ${counts[1]} other tests in ${group.target} passed` : ""}. Nothing else needs your attention.` };
  }
  if (live) {
    const current = work.find((group) => group.state === "running");
    const done = work.filter((group) => group.state === "succeeded").length;
    return { tone: "running", title: current ? `${stepName(current)} for ${current.target} is running` : "Starting", detail: `Step ${Math.min(done + 1, work.length)} of ${work.length}. Usually takes about a minute.` };
  }
  const passed = work.filter((group) => group.state === "succeeded").length;
  if (run.state === "cancelled") return { tone: "warning", title: "Run cancelled", detail: `${passed} of ${work.length} steps passed before cancellation.` };
  if (run.state === "timed_out") return { tone: "failed", title: "Run timed out", detail: `${passed} of ${work.length} steps passed before timeout.` };
  if (run.state === "queued") return { tone: "running", title: "Run queued", detail: "Waiting for a runner." };
  if (!groups.length) return { tone: run.state === "failed" ? "failed" : "neutral", title: run.reason?.message ?? "No log for this run", detail: "" };
  if (run.state !== "succeeded") return { tone: "warning", title: "Run did not complete", detail: `${passed} of ${work.length} steps passed.` };
  return { tone: "succeeded", title: `All ${passed} ${passed === 1 ? "step" : "steps"} passed`, detail: `Finished in ${duration(run.durationMs)} on ${run.attempts.at(-1)?.pool ?? "the pool"}.` };
}
