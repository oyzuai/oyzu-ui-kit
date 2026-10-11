import { test } from "node:test";
import assert from "node:assert/strict";
import type { Run, LogGroup } from "./model.ts";
import { headline } from "./run-digest-logic.ts";
import { actionResult, confirmFirst } from "./assistant-policy.ts";
import { parsePipelineHash } from "./pipeline-hash.ts";
import { statusWord } from "./model.ts";

const groups: LogGroup[] = [
  { scope: "compile", target: "task", task: "compile", state: "skipped", durationMs: 0 },
  { scope: "tests", target: "task", task: "test", state: "skipped", durationMs: 0 },
];
function run(state: Run["state"], overrides: Partial<Run> = {}): Run {
  return { state, durationMs: 1000, attempts: [{ pool: "Hosted Linux" }], ...overrides } as Run;
}

test("cancelled, timed-out and queued runs never report all steps passed", () => {
  for (const state of ["cancelled", "timed_out", "queued"] as const) {
    const result = headline(run(state), groups, [], false);
    assert.notEqual(result.tone, "succeeded");
    assert.doesNotMatch(`${result.title} ${result.detail}`, /All .* steps passed/);
  }
  assert.match(headline(run("cancelled"), groups, [], false).title, /cancelled/i);
  assert.match(headline(run("timed_out"), groups, [], false).title, /timed out/i);
  assert.match(headline(run("queued"), groups, [], false).title, /queued/i);
});

test("a succeeded run counts only succeeded groups", () => {
  const mixed: LogGroup[] = [{ ...groups[0], state: "succeeded" }, groups[1]];
  const result = headline(run("succeeded"), mixed, [], false);
  assert.equal(result.tone, "succeeded");
  assert.equal(result.title, "All 1 step passed");
});

test("runs without groups preserve failed and succeeded empty-log states", () => {
  const failed = headline(run("failed", { reason: { message: "Runner exited before writing logs" } as Run["reason"] }), [], [], false);
  assert.equal(failed.tone, "failed");
  assert.equal(failed.title, "Runner exited before writing logs");
  const succeeded = headline(run("succeeded"), [], [], false);
  assert.equal(succeeded.tone, "neutral");
  assert.equal(succeeded.title, "No log for this run");
});

test("Suggest a fix only proposes; opening the suggested change requires confirmation", () => {
  assert.equal(confirmFirst["suggest-fix"], undefined);
  assert.equal(actionResult("suggest-fix"), undefined);
  assert.ok(confirmFirst["apply-fix"]);
});

test("copied pipeline line hashes reopen the run, attempt and line", () => {
  const runs = [{ id: "run-9012", number: 9012 }];
  assert.deepEqual(parsePipelineHash("#pipeline-run-9012-attempt-2-L88", runs), {
    name: "run", runId: "run-9012", attempt: 2, focusSeq: 88,
  });
  assert.deepEqual(parsePipelineHash("#attempt-2-L88", runs), { name: "executions" });
  assert.deepEqual(parsePipelineHash("#pipeline-run-9999-L4", runs), { name: "executions" });
  assert.deepEqual(parsePipelineHash("#pipeline-triggers", runs), { name: "triggers" });
});

test("status chip words use the shared five status labels", () => {
  assert.equal(statusWord("warning"), "Needs attention");
  const states = ["succeeded", "success", "healthy", "failed", "failure", "timed_out", "running", "in_progress", "queued", "action_required", "warning", "skipped", "cancelled", "paused"] as const;
  const allowed = new Set(["Healthy", "Pending", "Paused", "Needs attention", "Failed"]);
  for (const state of states) assert.ok(allowed.has(statusWord(state)), `${state} maps to a shared status word`);
});
