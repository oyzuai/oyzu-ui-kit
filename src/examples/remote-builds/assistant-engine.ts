import {
  bindingById,
  bindings,
  deliveries,
  deliveryById,
  failedLog,
  failedRun,
  liveRun,
  runs,
  poolById,
  stripAnsiText,
  type LogEntry,
  type Role,
} from "./model";

// A scripted stand-in for the troubleshooting assistant. It answers from the
// same records a person can open (run logs, attempts, delivery records, binding
// evaluations, pool logs for admins), cites them, and proposes actions the
// person confirms. It never sees secret values; masked lines stay masked.

export type AssistantContext =
  | { kind: "home" }
  | { kind: "run"; runId: string; attempt?: number }
  | { kind: "delivery"; deliveryId: string }
  | { kind: "binding"; bindingId: string }
  | { kind: "pool"; poolId: string };

export type ActionId =
  | "rerun"
  | "rerun-failed"
  | "open-logs"
  | "open-attempt-1"
  | "diagnostics"
  | "explain"
  | "replay"
  | "open-delivery"
  | "open-binding"
  | "open-pool"
  | "open-run"
  | "apply-fix"
  | "rotate-secret"
  | "register-repo"
  | "drain-manager";

export type Block =
  | { type: "text"; text: string }
  | { type: "cite"; runId: string; attempt: number; seq: number; label: string; excerpt: string }
  | { type: "command"; command: string; note?: string }
  | { type: "facts"; rows: [string, string][] }
  | { type: "verdicts"; rows: { name: string; matched: boolean; reason: string }[] }
  | { type: "diff"; file: string; lines: { kind: "+" | "-" | " "; text: string }[] }
  | { type: "actions"; actions: { id: ActionId; label: string; primary?: boolean; target?: string }[] };

export type Reply = { blocks: Block[]; sources: string[] };

const lineBySubstring = (needle: string) =>
  failedLog.find((entry) => stripAnsiText(entry.text).includes(needle))!;

function cite(entry: LogEntry, label: string, runId = failedRun.id, attempt = 2): Block {
  return { type: "cite", runId, attempt, seq: entry.seq, label, excerpt: stripAnsiText(entry.text) };
}

export function suggestionsFor(context: AssistantContext, role: Role): string[] {
  switch (context.kind) {
    case "run":
      if (context.runId === failedRun.id)
        return ["Why did this fail?", "Is this test flaky?", "What happened to attempt 1?", "Suggest a fix", "How do I reproduce it locally?"];
      if (context.runId === liveRun.id) return ["When will this finish?", "What is it building?"];
      return ["How do I reproduce it locally?"];
    case "delivery":
      if (context.deliveryId === "dlv-rej") return ["Why are webhooks being rejected?"];
      if (context.deliveryId === "dlv-7f12") return ["Why did this start nothing?", "Which bindings matched?"];
      return ["Which bindings matched?"];
    case "binding":
      return ["What did this binding match today?", "Why did PR #483 not build?"];
    case "pool":
      return role === "pool-admin"
        ? ["Why is mgr-onprem-02 unhealthy?", "Which jobs did this pool lose today?"]
        : ["Is the pool healthy?"];
    default:
      return ["Why did build 9012 fail?", "Why did PR #483 not build?", "Why are webhooks being rejected?", "Is anything wrong with our pools?"];
  }
}

const has = (q: string, ...words: string[]) => words.some((word) => q.includes(word));

export function respond(
  question: string,
  context: AssistantContext,
  role: Role,
  line?: LogEntry,
): Reply {
  const q = question.toLowerCase();
  const runId = context.kind === "run" ? context.runId : undefined;

  if (line) return explainLine(line);

  if (has(q, "signature", "reject", "legacy", "webhooks being", "webhook secret"))
    return rejectedWebhooks();
  if (has(q, "#483", "483", "not build", "didn't", "did not", "start nothing", "no build", "not trigger", "draft"))
    return draftPr();
  if (has(q, "which bindings", "matched"))
    return context.kind === "delivery" ? deliveryVerdicts(context.deliveryId) : draftPr();
  if (has(q, "binding match", "this binding")) return bindingToday(context.kind === "binding" ? context.bindingId : "pr-affected");
  if (has(q, "attempt 1", "executor", "lost", "first attempt", "retried", "timed out"))
    return attemptOne(role);
  if (has(q, "mgr-onprem", "unhealthy", "lose", "lost today", "pool", "manager", "healthy"))
    return poolHealth(role);
  if (has(q, "flaky", "flake", "intermittent", "history"))
    return flaky();
  if (has(q, "fix", "patch", "change"))
    return suggestFix();
  if (has(q, "local", "reproduce", "my machine"))
    return reproduce(runId);
  if (has(q, "when", "finish", "how long", "eta", "building") || runId === liveRun.id)
    return liveStatus();
  if (has(q, "why", "fail", "broke", "red", "summar", "9012") || runId === failedRun.id)
    return whyFailed();
  return {
    blocks: [
      {
        type: "text",
        text: "I can explain failed runs, find the first error, check whether a test is flaky, say why a push or pull request started nothing, and look into pool health. Try one of the suggestions below, or ask about a specific run, pull request or webhook.",
      },
    ],
    sources: [],
  };
}

function whyFailed(): Reply {
  const failed = lineBySubstring("refund_retry_respects_idempotency_key ... FAILED");
  const assertion = lineBySubstring("assertion `left == right` failed");
  const note = lineBySubstring("key was regenerated");
  return {
    blocks: [
      {
        type: "text",
        text: "**One test failed in payments-core.** `refund_retry_respects_idempotency_key` expected a retried refund to post 1 charge and saw 2. Everything else passed: 6 of 7 tasks, 104 of 105 tests.",
      },
      cite(failed, "Failing test"),
      cite(assertion, "Assertion"),
      {
        type: "text",
        text: "The note under the assertion points at `RefundRetry::schedule`, which this pull request changed. It generates a new idempotency key on every retry, so the ledger treats the retry as a new charge.",
      },
      cite(note, "Where the key changes"),
      {
        type: "facts",
        rows: [
          ["Command", failedRun.command],
          ["Commit", "9c41e2a on feat/refund-retries (#482)"],
          ["First seen", "This commit; passed on the previous push e5c9a1b"],
          ["Attempt", "2 of 2 (attempt 1 lost its executor)"],
        ],
      },
      {
        type: "actions",
        actions: [
          { id: "apply-fix", label: "Suggest a fix", primary: true },
          { id: "rerun-failed", label: "Rerun payments-core/test" },
          { id: "open-logs", label: "Open first error" },
        ],
      },
    ],
    sources: ["Run 9012 log, attempt 2 (612 lines)", "Pull request #482 diff", "Test history for payments-core, last 30 runs"],
  };
}

function suggestFix(): Reply {
  return {
    blocks: [
      {
        type: "text",
        text: "Keep the key from the first attempt and pass it through. This is the smallest change that makes the failing test's expectation hold; review it before pushing.",
      },
      {
        type: "diff",
        file: "crates/payments-core/src/refund.rs",
        lines: [
          { kind: " ", text: "impl RefundRetry {" },
          { kind: " ", text: "    pub fn schedule(&self, attempt: u32) -> RetryPlan {" },
          { kind: "-", text: "        let key = IdempotencyKey::new();" },
          { kind: "+", text: "        let key = self.original.idempotency_key.clone();" },
          { kind: " ", text: "        RetryPlan { key, delay: backoff(attempt) }" },
          { kind: " ", text: "    }" },
        ],
      },
      { type: "command", command: "oyzu build payments-core --full", note: "Runs lint, compile and test for the changed target on your machine" },
      {
        type: "actions",
        actions: [
          { id: "apply-fix", label: "Open as a suggested change on #482", primary: true },
          { id: "rerun-failed", label: "Rerun after pushing" },
        ],
      },
    ],
    sources: ["crates/payments-core/src/refund.rs at 9c41e2a", "crates/payments-core/tests/refund_retry.rs:88"],
  };
}

function flaky(): Reply {
  return {
    blocks: [
      {
        type: "text",
        text: "**Probably not flaky.** This test passed in all 29 earlier runs over 14 days on every branch, and failed on the first commit that touched `RefundRetry::schedule`. It also failed the same way on attempt 2 after a fresh executor, so it is not the lost executor either.",
      },
      {
        type: "facts",
        rows: [
          ["Last 30 runs", "29 passed, 1 failed (this one)"],
          ["Other tests in payments-core", "0 failures in 14 days"],
          ["Same failure elsewhere", "None"],
        ],
      },
      { type: "actions", actions: [{ id: "apply-fix", label: "Suggest a fix", primary: true }] },
    ],
    sources: ["Test results from JUnit reports, last 30 runs of oyzu / build"],
  };
}

function reproduce(runId?: string): Reply {
  const run = runId ? runs.find((item) => item.id === runId) : undefined;
  if (run && run.id !== failedRun.id)
    return {
      blocks: [
        { type: "text", text: `Every check is one oyzu command. Check out ${run.commit.slice(0, 7)} and run the same command the runner used, or add \`--remote\` to run it on the same pool:` },
        { type: "command", command: `git checkout ${run.commit.slice(0, 7)} && ${run.command}` },
        { type: "command", command: `${run.command} --remote --ref ${run.commit.slice(0, 7)}` },
      ],
      sources: [`Run ${run.number} operation`],
    };
  return {
    blocks: [
      {
        type: "text",
        text: "Every check is one oyzu command, so the remote run reproduces exactly on your machine. Check out the commit and run the same command the runner used:",
      },
      { type: "command", command: "git checkout 9c41e2a && oyzu build --affected 7d0b113 --full" },
      { type: "text", text: "Or run the same thing remotely on the same pool, without a local toolchain:" },
      { type: "command", command: "oyzu build --affected 7d0b113 --full --remote --ref 9c41e2a" },
    ],
    sources: ["Run 9012 operation and merge base"],
  };
}

function attemptOne(role: Role): Reply {
  const blocks: Block[] = [
    {
      type: "text",
      text: "**Attempt 1 lost its executor.** It started at 3:31 PM on manager mgr-onprem-02, stopped sending log lines at 3:32 PM, and its lease expired at 3:34 PM. The platform retried it as attempt 2 on mgr-onprem-01, which ran to completion. Attempt 1 has nothing to do with the test failure.",
    },
  ];
  if (role === "pool-admin") {
    blocks.push(
      {
        type: "facts",
        rows: [
          ["Manager", "mgr-onprem-02 in Acme on-prem"],
          ["Pool log", "3 heartbeats failed: 2 timeouts, then HTTP 407 from proxy.corp.acme.example"],
          ["Likely cause", "The corporate proxy started asking this manager for authentication"],
        ],
      },
      {
        type: "actions",
        actions: [
          { id: "diagnostics", label: "Runner diagnostics for job-5521", primary: true, target: "job-5521" },
          { id: "open-pool", label: "Open Acme on-prem", target: "acme-onprem" },
        ],
      },
    );
  } else {
    blocks.push(
      {
        type: "text",
        text: "Pool details are visible to the pool's admins. I've linked this run in a note to them; you don't need to do anything for this run.",
      },
      { type: "actions", actions: [{ id: "open-attempt-1", label: "Open attempt 1 log", primary: true }] },
    );
  }
  return {
    blocks,
    sources: role === "pool-admin"
      ? ["Run 9012 attempts", "Pool logs for job-5521 (admin)"]
      : ["Run 9012 attempts"],
  };
}

function poolHealth(role: Role): Reply {
  const pool = poolById("acme-onprem")!;
  if (role !== "pool-admin")
    return {
      blocks: [
        {
          type: "text",
          text: `Builds for payments are running normally. ${pool.name} has one manager reporting late, so one job was retried today; queue wait is under a minute.`,
        },
      ],
      sources: ["Pool status summary"],
    };
  return {
    blocks: [
      {
        type: "text",
        text: "**mgr-onprem-02 can't reach the platform through the corporate proxy.** Since 3:32 PM its heartbeats time out or get HTTP 407 (proxy authentication required). Its key is also mid-rotation, but that is unrelated: rotation keeps both keys valid and the failures start before it.",
      },
      {
        type: "facts",
        rows: [
          ["Jobs lost today", "1 (job-5521, run 9012 attempt 1, retried automatically)"],
          ["Capacity", "1 of 2 managers claiming work; 1 job queued"],
          ["Manager version", "0.4.0 (pool default is 0.4.1)"],
        ],
      },
      { type: "command", command: "oyzu pool manager drain mgr-onprem-02", note: "Stops new claims while you fix the proxy credentials; running jobs finish" },
      {
        type: "actions",
        actions: [
          { id: "drain-manager", label: "Drain mgr-onprem-02", primary: true, target: "mgr-onprem-02" },
          { id: "diagnostics", label: "Pool logs for mgr-onprem-02", target: "mgr-onprem-02" },
        ],
      },
    ],
    sources: ["Pool logs, Acme on-prem, last 2 hours", "Manager heartbeats"],
  };
}

function draftPr(): Reply {
  const delivery = deliveryById("dlv-7f12")!;
  return {
    blocks: [
      {
        type: "text",
        text: "**PR #483 is a draft, and the pull request binding skips drafts.** GitHub delivered the event and it verified fine; none of the 5 bindings in scope matched. Marking the pull request ready for review sends a new event that will start `oyzu / build`.",
      },
      {
        type: "verdicts",
        rows: delivery.evaluations.map((evaluation) => ({
          name: bindingById(evaluation.bindingId)?.name ?? evaluation.bindingId,
          matched: evaluation.matched,
          reason: evaluation.reason,
        })),
      },
      {
        type: "actions",
        actions: [
          { id: "open-delivery", label: "Open delivery record", primary: true, target: delivery.id },
          { id: "explain", label: "Explain against today's bindings", target: delivery.id },
          { id: "open-binding", label: "Open binding", target: "pr-affected" },
        ],
      },
    ],
    sources: ["Delivery 1a44be10 (pull_request.opened)", "Binding evaluations for that delivery"],
  };
}

function deliveryVerdicts(deliveryId: string): Reply {
  const delivery = deliveryById(deliveryId) ?? deliveries[0];
  if (!delivery.evaluations.length)
    return {
      blocks: [{ type: "text", text: `No bindings were evaluated: ${delivery.stages.find((stage) => stage.status === "fail")?.detail ?? delivery.outcomeLabel}.` }],
      sources: ["Delivery record"],
    };
  return {
    blocks: [
      { type: "text", text: `${delivery.evaluations.filter((e) => e.matched).length} of ${delivery.evaluations.length} bindings matched this delivery.` },
      {
        type: "verdicts",
        rows: delivery.evaluations.map((evaluation) => ({
          name: bindingById(evaluation.bindingId)?.name ?? evaluation.bindingId,
          matched: evaluation.matched,
          reason: evaluation.reason,
        })),
      },
    ],
    sources: ["Binding evaluations"],
  };
}

function bindingToday(bindingId: string): Reply {
  const binding = bindingById(bindingId) ?? bindings[0];
  const seen = deliveries.filter((delivery) => delivery.evaluations.some((e) => e.bindingId === binding.id));
  const matched = seen.filter((delivery) => delivery.evaluations.find((e) => e.bindingId === binding.id)?.matched);
  return {
    blocks: [
      { type: "text", text: `**${binding.name}** saw ${seen.length} deliveries today and matched ${matched.length}.` },
      {
        type: "verdicts",
        rows: seen.map((delivery) => {
          const evaluation = delivery.evaluations.find((e) => e.bindingId === binding.id)!;
          return { name: `${delivery.event} · ${delivery.ref}`, matched: evaluation.matched, reason: evaluation.reason };
        }),
      },
    ],
    sources: ["Per-binding delivery history"],
  };
}

function rejectedWebhooks(): Reply {
  return {
    blocks: [
      {
        type: "text",
        text: "**12 deliveries to the github-acme-legacy connector failed the signature check since 2:02 PM.** The webhook secret configured on GitHub probably no longer matches this connector's. Nothing from those deliveries was read or stored beyond allowlisted headers, so no builds started for acme/web-console.",
      },
      {
        type: "facts",
        rows: [
          ["Endpoint", "/webhooks/github/github-acme-legacy"],
          ["Result", "Signature mismatch on all 12 (none missing or malformed)"],
          ["Last good delivery", "Yesterday 6:14 PM"],
        ],
      },
      {
        type: "text",
        text: "Rotate the secret here, paste the new value into the GitHub App's webhook settings, then replay the missed pushes from GitHub's Recent Deliveries. The old and new secrets both work during a short overlap, so nothing else drops.",
      },
      {
        type: "actions",
        actions: [
          { id: "rotate-secret", label: "Rotate webhook secret", primary: true },
          { id: "open-delivery", label: "Open rejected deliveries", target: "dlv-rej" },
        ],
      },
    ],
    sources: ["Rejected delivery counters for github-acme-legacy", "Sampled rejected deliveries (headers only)"],
  };
}

function liveStatus(): Reply {
  return {
    blocks: [
      {
        type: "text",
        text: "Run 9014 is building `api-image`: compile first, then the container image. The last 10 runs of this check took 58s to 1m 12s, so expect it in about a minute. It runs separately from the failed build, so it can pass while `oyzu / build` stays red.",
      },
      { type: "actions", actions: [{ id: "open-run", label: "Watch live log", primary: true, target: liveRun.id }] },
    ],
    sources: ["Run 9014 live log", "Durations of the last 10 api-image runs"],
  };
}

function explainLine(line: LogEntry): Reply {
  const text = stripAnsiText(line.text);
  if (line.redacted)
    return {
      blocks: [
        {
          type: "text",
          text: "That `***` is a value the runner masked before the line left the executor. I can't see it either. It was one of the credentials released to this job (the source token or a build secret); masking also covers its base64, URL-encoded and JSON-escaped forms.",
        },
      ],
      sources: ["Runner masking record for this line (count only)"],
    };
  if (line.level === "error" && text.includes("panicked"))
    return {
      blocks: [
        { type: "text", text: "This is where the failing test stopped. Line 88 of the test asserts that a retried refund posts one charge; the next lines show it posted two." },
        cite(lineBySubstring("assertion `left == right` failed"), "Assertion"),
        { type: "actions", actions: [{ id: "apply-fix", label: "Suggest a fix", primary: true }] },
      ],
      sources: ["Run 9012 log, attempt 2"],
    };
  if (line.level === "error") return whyFailed();
  if (line.level === "warn")
    return {
      blocks: [
        { type: "text", text: "A lint warning, not a failure: `retry.rs` imports `Instant` but doesn't use it. Lint still passed. Removing the import silences it." },
      ],
      sources: ["Run 9012 log, payments-core/lint"],
    };
  if (text.includes("Merge base"))
    return {
      blocks: [
        { type: "text", text: "For pull requests the runner builds what changed since the merge base with main, not since main's tip, so other people's merges don't count as affected. 7d0b113 is where feat/refund-retries branched off." },
      ],
      sources: ["Run 9012 operation"],
    };
  return {
    blocks: [
      { type: "text", text: `Line ${line.seq} comes from \`${line.scope}\` (${line.stream}). Nothing in it suggests a problem. Ask me about the failure, or pick a red line to explain.` },
    ],
    sources: [`Run log line ${line.seq}`],
  };
}

