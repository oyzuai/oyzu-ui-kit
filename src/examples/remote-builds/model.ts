// Fictional remote-build data for the design experiments. Shapes follow the
// public runs-v1alpha1 contract (run = one oyzu operation on one commit) plus the
// portal-only views the design doc describes: deliveries, binding evaluations,
// log groups and pool logs. Nothing here is a real account, repository or secret.

export type RunState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"
  | "timed_out";
export type GroupState = "queued" | "running" | "succeeded" | "failed" | "skipped";
export type Role = "member" | "pool-admin";

export type Operation =
  | { kind: "build"; targets?: string[]; affectedBase?: string }
  | { kind: "run"; task: string };

export type Attempt = {
  n: number;
  state: RunState;
  pool: string;
  manager: string;
  jobId: string;
  startedAt: string;
  durationMs: number;
  logState: "open" | "complete" | "incomplete";
  reason?: string;
};

export type LogGroup = {
  scope: string;
  target: string;
  task: string;
  state: GroupState;
  durationMs: number;
};

export type LogEntry = {
  seq: number;
  /** Milliseconds since the attempt started. */
  t: number;
  scope: string;
  stream: "stdout" | "stderr" | "system";
  text: string;
  /** How many values the runner masked on this line. */
  redacted?: number;
  level?: "error" | "warn";
};

export type Output = {
  path: string;
  kind: "manifest" | "report" | "artifact";
  size: number;
  digest: string;
};

export type Run = {
  id: string;
  number: number;
  project: string;
  repository: string;
  commit: string;
  ref: string;
  pr?: number;
  title: string;
  author: string;
  operation: Operation;
  command: string;
  check: string;
  bindingId?: string;
  trigger: "pull_request" | "push" | "manual" | "schedule";
  deliveryId?: string;
  state: RunState;
  reason?: { code: string; message: string };
  attempt: number;
  attempts: Attempt[];
  oyzuVersion: string;
  createdAt: string;
  durationMs: number;
  groups: LogGroup[];
  outputs: Output[];
};

export type Binding = {
  id: string;
  name: string;
  scope: string;
  repositories: string;
  filters: string[];
  actions: { label: string; command: string; check: string }[];
  mandatory: boolean;
  cancelPrevious: boolean;
  enabled: boolean;
};

export type StageKey =
  | "received"
  | "verified"
  | "deduplicated"
  | "parsed"
  | "matched"
  | "started"
  | "ran"
  | "reported";
export type StageStatus = "ok" | "fail" | "skip" | "running" | "pending";
export type Stage = { key: StageKey; label: string; status: StageStatus; detail: string };

export type Evaluation = { bindingId: string; matched: boolean; reason: string };

export type Delivery = {
  id: string;
  correlationId: string;
  githubDelivery: string;
  connector: string;
  receivedAt: string;
  event: string;
  repository: string;
  ref: string;
  commit: string;
  pr?: { number: number; title: string; draft: boolean; labels: string[] };
  actor: string;
  changedPaths: string[];
  outcome: "started" | "no-match" | "ignored" | "rejected" | "unregistered";
  outcomeLabel: string;
  stages: Stage[];
  evaluations: Evaluation[];
  runIds: string[];
};

export type CheckConclusion =
  | "queued"
  | "in_progress"
  | "success"
  | "failure"
  | "skipped"
  | "cancelled"
  | "action_required";
export type Check = {
  name: string;
  commit: string;
  conclusion: CheckConclusion;
  summary: string;
  runId?: string;
  required: boolean;
};

export type ManagerStatus = "healthy" | "warning" | "failed" | "paused";
export type Manager = {
  id: string;
  host: string;
  version: string;
  adapter: "vm" | "container" | "process";
  status: ManagerStatus;
  heartbeat: string;
  activeJobs: number;
  keyAgeDays: number;
  note?: string;
};
export type Pool = {
  id: string;
  name: string;
  kind: "Oyzu hosted" | "Customer network" | "Developer machine";
  scope: string;
  capacity: number;
  busy: number;
  queued: number;
  status: ManagerStatus;
  shipping: boolean;
  releaseEligible: boolean;
  managers: Manager[];
};
export type PoolLog = {
  t: string;
  level: "info" | "warn" | "error";
  manager: string;
  msg: string;
  jobId?: string;
  fields: Record<string, string>;
};

// ---------------------------------------------------------------- bindings

export const bindings: Binding[] = [
  {
    id: "pr-affected",
    name: "Affected build on pull requests",
    scope: "Org · acme",
    repositories: "All repositories in acme",
    filters: ["Pull request, not draft", "Any base branch"],
    actions: [
      {
        label: "Build affected",
        command: "oyzu build --affected <merge-base> --full",
        check: "oyzu / build",
      },
    ],
    mandatory: true,
    cancelPrevious: true,
    enabled: true,
  },
  {
    id: "main-build",
    name: "Full build on main",
    scope: "Org · acme",
    repositories: "All repositories in acme",
    filters: ["Push to main"],
    actions: [{ label: "Build all", command: "oyzu build --full", check: "oyzu / build" }],
    mandatory: true,
    cancelPrevious: false,
    enabled: true,
  },
  {
    id: "payments-policy",
    name: "Policy and image",
    scope: "Project · payments",
    repositories: "acme/payments-api",
    filters: ["Pull request", "Paths policy/** or deploy/**"],
    actions: [
      { label: "Run task policy-check", command: "oyzu run policy-check", check: "oyzu / policy" },
      { label: "Build api-image", command: "oyzu build api-image --full", check: "oyzu / api-image" },
    ],
    mandatory: false,
    cancelPrevious: true,
    enabled: true,
  },
  {
    id: "release-tags",
    name: "Release candidates",
    scope: "Project · payments",
    repositories: "acme/payments-*",
    filters: ["Tag v*", "Actor in group release-managers"],
    actions: [{ label: "Build all", command: "oyzu build --full", check: "oyzu / release" }],
    mandatory: false,
    cancelPrevious: false,
    enabled: true,
  },
  {
    id: "nightly",
    name: "Nightly cross-platform",
    scope: "Project · payments",
    repositories: "acme/payments-api",
    filters: ["Schedule 02:00 ET daily", "Branch main"],
    actions: [{ label: "Build all", command: "oyzu build --all-platforms --full", check: "portal only" }],
    mandatory: false,
    cancelPrevious: false,
    enabled: false,
  },
];

// ---------------------------------------------------------------- runs

const failedGroups: LogGroup[] = [
  { scope: "runner", target: "runner", task: "setup", state: "succeeded", durationMs: 14_200 },
  { scope: "ledger-client/compile", target: "ledger-client", task: "compile", state: "succeeded", durationMs: 21_800 },
  { scope: "payments-core/lint", target: "payments-core", task: "lint", state: "succeeded", durationMs: 9_400 },
  { scope: "payments-core/compile", target: "payments-core", task: "compile", state: "succeeded", durationMs: 48_100 },
  { scope: "payments-core/test", target: "payments-core", task: "test", state: "failed", durationMs: 71_300 },
  { scope: "api/compile", target: "api", task: "compile", state: "succeeded", durationMs: 39_900 },
  { scope: "api/test", target: "api", task: "test", state: "succeeded", durationMs: 52_600 },
  { scope: "runner/finish", target: "runner", task: "finish", state: "succeeded", durationMs: 3_100 },
];

export const runs: Run[] = [
  {
    id: "01jab9r2f6k8m0p2r4t6v8x0z2",
    number: 9012,
    project: "payments",
    repository: "acme/payments-api",
    commit: "9c41e2a7b3d05f18c6e2a94b07d1e3f5a8c2b610",
    ref: "feat/refund-retries",
    pr: 482,
    title: "Retry refunds with the original idempotency key",
    author: "dana.okafor",
    operation: { kind: "build", affectedBase: "7d0b113" },
    command: "oyzu build --affected 7d0b113 --full",
    check: "oyzu / build",
    bindingId: "pr-affected",
    trigger: "pull_request",
    deliveryId: "dlv-7f3a",
    state: "failed",
    reason: { code: "EXIT_NONZERO", message: "oyzu exited 1: 1 task failed (payments-core/test)" },
    attempt: 2,
    attempts: [
      {
        n: 1,
        state: "timed_out",
        pool: "acme-onprem",
        manager: "mgr-onprem-02",
        jobId: "job-5521",
        startedAt: "2026-10-09T15:31:08-04:00",
        durationMs: 184_000,
        logState: "incomplete",
        reason: "Executor lost: the lease expired after the manager missed 3 heartbeats. 41 log lines were not received.",
      },
      {
        n: 2,
        state: "failed",
        pool: "acme-onprem",
        manager: "mgr-onprem-01",
        jobId: "job-5530",
        startedAt: "2026-10-09T15:35:02-04:00",
        durationMs: 260_400,
        logState: "complete",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T15:30:51-04:00",
    durationMs: 260_400,
    groups: failedGroups,
    outputs: [
      { path: "dist/manifest.json", kind: "manifest", size: 6_144, digest: "sha256:4be1…92c0" },
      { path: "dist/payments-core/reports/junit.xml", kind: "report", size: 18_432, digest: "sha256:a07d…11fe" },
      { path: "dist/api/reports/junit.xml", kind: "report", size: 12_288, digest: "sha256:5c3b…e804" },
    ],
  },
  {
    id: "01jab9r2f6k8m0p2r4t6v8x0z3",
    number: 9013,
    project: "payments",
    repository: "acme/payments-api",
    commit: "9c41e2a7b3d05f18c6e2a94b07d1e3f5a8c2b610",
    ref: "feat/refund-retries",
    pr: 482,
    title: "Retry refunds with the original idempotency key",
    author: "dana.okafor",
    operation: { kind: "run", task: "policy-check" },
    command: "oyzu run policy-check",
    check: "oyzu / policy",
    bindingId: "payments-policy",
    trigger: "pull_request",
    deliveryId: "dlv-7f3a",
    state: "succeeded",
    attempt: 1,
    attempts: [
      {
        n: 1,
        state: "succeeded",
        pool: "hosted-linux",
        manager: "mgr-hosted-a",
        jobId: "job-5522",
        startedAt: "2026-10-09T15:31:02-04:00",
        durationMs: 38_700,
        logState: "complete",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T15:30:51-04:00",
    durationMs: 38_700,
    groups: [
      { scope: "runner", target: "runner", task: "setup", state: "succeeded", durationMs: 9_800 },
      { scope: "policy-check", target: "task", task: "policy-check", state: "succeeded", durationMs: 26_200 },
      { scope: "runner/finish", target: "runner", task: "finish", state: "succeeded", durationMs: 2_700 },
    ],
    outputs: [{ path: "dist/policy/report.json", kind: "report", size: 3_072, digest: "sha256:9e2f…7a41" }],
  },
  {
    id: "01jab9r2f6k8m0p2r4t6v8x0z4",
    number: 9014,
    project: "payments",
    repository: "acme/payments-api",
    commit: "9c41e2a7b3d05f18c6e2a94b07d1e3f5a8c2b610",
    ref: "feat/refund-retries",
    pr: 482,
    title: "Retry refunds with the original idempotency key",
    author: "dana.okafor",
    operation: { kind: "build", targets: ["api-image"] },
    command: "oyzu build api-image --full",
    check: "oyzu / api-image",
    bindingId: "payments-policy",
    trigger: "pull_request",
    deliveryId: "dlv-7f3a",
    state: "running",
    attempt: 1,
    attempts: [
      {
        n: 1,
        state: "running",
        pool: "hosted-linux",
        manager: "mgr-hosted-b",
        jobId: "job-5523",
        startedAt: "2026-10-09T15:39:40-04:00",
        durationMs: 0,
        logState: "open",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T15:30:51-04:00",
    durationMs: 0,
    groups: [
      { scope: "runner", target: "runner", task: "setup", state: "succeeded", durationMs: 11_400 },
      { scope: "api-image/compile", target: "api-image", task: "compile", state: "running", durationMs: 0 },
      { scope: "api-image/image", target: "api-image", task: "image", state: "queued", durationMs: 0 },
    ],
    outputs: [],
  },
  {
    id: "01jab9q7c1e3g5j7l9n1q3s5u7",
    number: 9009,
    project: "payments",
    repository: "acme/payments-api",
    commit: "3f2a9c14e7b20d58a1c6f93e04b7d2a5c8e1f046",
    ref: "main",
    title: "Merge pull request #477 from acme/chore/ledger-client-0.14",
    author: "lee.marsh",
    operation: { kind: "build" },
    command: "oyzu build --full",
    check: "oyzu / build",
    bindingId: "main-build",
    trigger: "push",
    deliveryId: "dlv-7e91",
    state: "succeeded",
    attempt: 1,
    attempts: [
      {
        n: 1,
        state: "succeeded",
        pool: "hosted-linux",
        manager: "mgr-hosted-a",
        jobId: "job-5507",
        startedAt: "2026-10-09T14:58:12-04:00",
        durationMs: 412_900,
        logState: "complete",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T14:58:01-04:00",
    durationMs: 412_900,
    groups: [
      { scope: "runner", target: "runner", task: "setup", state: "succeeded", durationMs: 12_100 },
      { scope: "ledger-client/compile", target: "ledger-client", task: "compile", state: "succeeded", durationMs: 22_400 },
      { scope: "payments-core/test", target: "payments-core", task: "test", state: "succeeded", durationMs: 69_800 },
      { scope: "api/test", target: "api", task: "test", state: "succeeded", durationMs: 51_100 },
      { scope: "api-image/image", target: "api-image", task: "image", state: "succeeded", durationMs: 141_300 },
    ],
    outputs: [{ path: "dist/manifest.json", kind: "manifest", size: 8_192, digest: "sha256:c41d…0b9a" }],
  },
  {
    id: "01jab9m4x8z0b2d4f6h8k0m2p4",
    number: 9004,
    project: "payments",
    repository: "acme/payments-api",
    commit: "b81e04c9d2a7f35e60c1b94d8a2e7f03c5b9d168",
    ref: "fix/ledger-timeouts",
    pr: 480,
    title: "Shorten ledger client timeouts",
    author: "sam.ito",
    operation: { kind: "run", task: "policy-check" },
    command: "oyzu run policy-check",
    check: "oyzu / policy",
    bindingId: "payments-policy",
    trigger: "pull_request",
    deliveryId: "dlv-7d02",
    state: "skipped",
    reason: { code: "TASK_NOT_DEFINED", message: "task policy-check is not defined at b81e04c" },
    attempt: 0,
    attempts: [],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T13:12:44-04:00",
    durationMs: 0,
    groups: [],
    outputs: [],
  },
  {
    id: "01jab9k1v5x7z9b1d3f5h7k9m1",
    number: 9001,
    project: "payments",
    repository: "acme/payments-api",
    commit: "e5c9a1b7d3f04e26a8c0b5d9f1e3a7c2b6d40f88",
    ref: "feat/refund-retries",
    pr: 482,
    title: "Add refund retry worker",
    author: "dana.okafor",
    operation: { kind: "build", affectedBase: "7d0b113" },
    command: "oyzu build --affected 7d0b113 --full",
    check: "oyzu / build",
    bindingId: "pr-affected",
    trigger: "pull_request",
    deliveryId: "dlv-7c66",
    state: "cancelled",
    reason: { code: "SUPERSEDED", message: "A newer push to pull request #482 replaced this run" },
    attempt: 1,
    attempts: [
      {
        n: 1,
        state: "cancelled",
        pool: "hosted-linux",
        manager: "mgr-hosted-b",
        jobId: "job-5512",
        startedAt: "2026-10-09T15:22:30-04:00",
        durationMs: 96_000,
        logState: "complete",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T15:22:18-04:00",
    durationMs: 96_000,
    groups: [],
    outputs: [],
  },
  {
    id: "01jab9h8s2u4w6y8a0c2e4g6j8",
    number: 8998,
    project: "payments",
    repository: "acme/payments-api",
    commit: "a2d4f6b8c0e1a3c5e7f9b1d3a5c7e9f1b3d5a7c9",
    ref: "main",
    title: "Manual run: oyzu build cli --remote",
    author: "micah",
    operation: { kind: "build", targets: ["cli"] },
    command: "oyzu build cli --full",
    check: "manual",
    trigger: "manual",
    state: "succeeded",
    attempt: 1,
    attempts: [
      {
        n: 1,
        state: "succeeded",
        pool: "dev-desktop",
        manager: "mgr-desktop",
        jobId: "job-5490",
        startedAt: "2026-10-09T12:04:10-04:00",
        durationMs: 128_300,
        logState: "complete",
      },
    ],
    oyzuVersion: "0.9.2",
    createdAt: "2026-10-09T12:04:02-04:00",
    durationMs: 128_300,
    groups: [],
    outputs: [],
  },
];

export const runById = (id: string) => runs.find((run) => run.id === id);
export const failedRun = runs[0];
export const liveRun = runs[2];

// ---------------------------------------------------------------- checks

export const checks: Check[] = [
  {
    name: "oyzu / build",
    commit: "9c41e2a",
    conclusion: "failure",
    summary: "1 of 7 tasks failed: payments-core/test (1 test)",
    runId: runs[0].id,
    required: true,
  },
  {
    name: "oyzu / policy",
    commit: "9c41e2a",
    conclusion: "success",
    summary: "12 policies passed",
    runId: runs[1].id,
    required: false,
  },
  {
    name: "oyzu / api-image",
    commit: "9c41e2a",
    conclusion: "in_progress",
    summary: "Compiling api-image",
    runId: runs[2].id,
    required: false,
  },
  {
    name: "oyzu / web-console",
    commit: "9c41e2a",
    conclusion: "skipped",
    summary: "Not affected by this change",
    required: true,
  },
  {
    name: "oyzu / ledger-sim",
    commit: "9c41e2a",
    conclusion: "skipped",
    summary: "Not affected by this change",
    required: true,
  },
];

// ---------------------------------------------------------------- deliveries

const stages = (
  rows: [StageKey, StageStatus, string][],
): Stage[] =>
  rows.map(([key, status, detail]) => ({
    key,
    status,
    detail,
    label: key[0].toUpperCase() + key.slice(1),
  }));

export const deliveries: Delivery[] = [
  {
    id: "dlv-7f3a",
    correlationId: "corr-1d9e44b2",
    githubDelivery: "6f1c2a80-5e4b-11f1-8a3e-2b7c41e0d9aa",
    connector: "github-acme",
    receivedAt: "2026-10-09T15:30:49-04:00",
    event: "pull_request.synchronize",
    repository: "acme/payments-api",
    ref: "feat/refund-retries",
    commit: "9c41e2a",
    pr: { number: 482, title: "Retry refunds with the original idempotency key", draft: false, labels: ["payments", "needs-review"] },
    actor: "dana.okafor",
    changedPaths: ["crates/payments-core/src/refund.rs", "crates/payments-core/tests/refund_retry.rs", "policy/refunds.rego", "deploy/api/values.yaml"],
    outcome: "started",
    outcomeLabel: "Started 3 runs",
    stages: stages([
      ["received", "ok", "15:30:49 ET via /webhooks/github/github-acme"],
      ["verified", "ok", "Signature valid (HMAC SHA-256)"],
      ["deduplicated", "ok", "New delivery"],
      ["parsed", "ok", "pull_request.synchronize on #482, head 9c41e2a"],
      ["matched", "ok", "2 of 5 bindings matched, 3 actions"],
      ["started", "ok", "Runs 9012, 9013, 9014; cancelled run 9001"],
      ["ran", "running", "1 failed, 1 succeeded, 1 running"],
      ["reported", "ok", "5 check runs written (2 skipped targets)"],
    ]),
    evaluations: [
      { bindingId: "pr-affected", matched: true, reason: "Pull request #482 is ready for review" },
      { bindingId: "main-build", matched: false, reason: "Listens for push, got pull_request" },
      { bindingId: "payments-policy", matched: true, reason: "policy/refunds.rego matches policy/**" },
      { bindingId: "release-tags", matched: false, reason: "Listens for tags, got pull_request" },
      { bindingId: "nightly", matched: false, reason: "Disabled in project payments" },
    ],
    runIds: [runs[0].id, runs[1].id, runs[2].id],
  },
  {
    id: "dlv-7f12",
    correlationId: "corr-0b7c19fe",
    githubDelivery: "1a44be10-5e4b-11f1-9f0d-77a1c2d3e4f5",
    connector: "github-acme",
    receivedAt: "2026-10-09T15:18:02-04:00",
    event: "pull_request.opened",
    repository: "acme/payments-api",
    ref: "spike/fx-rounding",
    commit: "c3a9e10",
    pr: { number: 483, title: "Spike: FX rounding modes", draft: true, labels: [] },
    actor: "jo.pereira",
    changedPaths: ["crates/fx/src/round.rs"],
    outcome: "no-match",
    outcomeLabel: "Nothing matched",
    stages: stages([
      ["received", "ok", "15:18:02 ET via /webhooks/github/github-acme"],
      ["verified", "ok", "Signature valid (HMAC SHA-256)"],
      ["deduplicated", "ok", "New delivery"],
      ["parsed", "ok", "pull_request.opened on #483 (draft)"],
      ["matched", "skip", "0 of 5 bindings matched"],
      ["started", "pending", "No runs started"],
      ["ran", "pending", "—"],
      ["reported", "pending", "No checks written"],
    ]),
    evaluations: [
      { bindingId: "pr-affected", matched: false, reason: "Pull request #483 is a draft; this binding skips drafts" },
      { bindingId: "main-build", matched: false, reason: "Listens for push, got pull_request" },
      { bindingId: "payments-policy", matched: false, reason: "No changed file under policy/** or deploy/**" },
      { bindingId: "release-tags", matched: false, reason: "Listens for tags, got pull_request" },
      { bindingId: "nightly", matched: false, reason: "Disabled in project payments" },
    ],
    runIds: [],
  },
  {
    id: "dlv-7e91",
    correlationId: "corr-77e0a3c1",
    githubDelivery: "c0de7710-5e46-11f1-8c11-0a1b2c3d4e5f",
    connector: "github-acme",
    receivedAt: "2026-10-09T14:58:00-04:00",
    event: "push",
    repository: "acme/payments-api",
    ref: "main",
    commit: "3f2a9c1",
    actor: "lee.marsh",
    changedPaths: ["crates/ledger-client/Cargo.toml"],
    outcome: "started",
    outcomeLabel: "Started 1 run",
    stages: stages([
      ["received", "ok", "14:58:00 ET via /webhooks/github/github-acme"],
      ["verified", "ok", "Signature valid (HMAC SHA-256)"],
      ["deduplicated", "ok", "New delivery"],
      ["parsed", "ok", "push to main, head 3f2a9c1"],
      ["matched", "ok", "1 of 5 bindings matched"],
      ["started", "ok", "Run 9009"],
      ["ran", "ok", "Succeeded in 6m 53s"],
      ["reported", "ok", "Check oyzu / build: success"],
    ]),
    evaluations: [
      { bindingId: "pr-affected", matched: false, reason: "Listens for pull_request, got push" },
      { bindingId: "main-build", matched: true, reason: "Push to main" },
      { bindingId: "payments-policy", matched: false, reason: "Listens for pull_request, got push" },
      { bindingId: "release-tags", matched: false, reason: "Listens for tags, got push" },
      { bindingId: "nightly", matched: false, reason: "Disabled in project payments" },
    ],
    runIds: [runs[3].id],
  },
  {
    id: "dlv-7e40",
    correlationId: "corr-5a0f2e91",
    githubDelivery: "9b3e1100-5e44-11f1-8111-ffeeddccbbaa",
    connector: "github-acme",
    receivedAt: "2026-10-09T14:41:37-04:00",
    event: "pull_request.synchronize",
    repository: "acme/ledger-tools",
    ref: "feat/export",
    commit: "f00d1e2",
    pr: { number: 12, title: "CSV export", draft: false, labels: [] },
    actor: "sam.ito",
    changedPaths: [],
    outcome: "unregistered",
    outcomeLabel: "Repository not registered",
    stages: stages([
      ["received", "ok", "14:41:37 ET via /webhooks/github/github-acme"],
      ["verified", "ok", "Signature valid (HMAC SHA-256)"],
      ["deduplicated", "ok", "New delivery"],
      ["parsed", "fail", "acme/ledger-tools is not registered to any project"],
      ["matched", "pending", "Not evaluated"],
      ["started", "pending", "No runs started"],
      ["ran", "pending", "—"],
      ["reported", "pending", "No checks written"],
    ]),
    evaluations: [],
    runIds: [],
  },
  {
    id: "dlv-rej",
    correlationId: "corr-rejected",
    githubDelivery: "12 deliveries",
    connector: "github-acme-legacy",
    receivedAt: "2026-10-09T15:36:10-04:00",
    event: "push",
    repository: "acme/web-console",
    ref: "main",
    commit: "—",
    actor: "—",
    changedPaths: [],
    outcome: "rejected",
    outcomeLabel: "Signature mismatch ×12",
    stages: stages([
      ["received", "ok", "12 deliveries since 14:02 ET via /webhooks/github/github-acme-legacy"],
      ["verified", "fail", "Signature mismatch: the webhook secret on GitHub probably differs from this connector's"],
      ["deduplicated", "pending", "Not reached"],
      ["parsed", "pending", "Body not read"],
      ["matched", "pending", "Not evaluated"],
      ["started", "pending", "No runs started"],
      ["ran", "pending", "—"],
      ["reported", "pending", "—"],
    ]),
    evaluations: [],
    runIds: [],
  },
];
export const deliveryById = (id: string) => deliveries.find((d) => d.id === id);
export const bindingById = (id: string) => bindings.find((b) => b.id === id);

// ---------------------------------------------------------------- pools

export const pools: Pool[] = [
  {
    id: "hosted-linux",
    name: "Hosted Linux",
    kind: "Oyzu hosted",
    scope: "Org · acme",
    capacity: 12,
    busy: 2,
    queued: 0,
    status: "healthy",
    shipping: true,
    releaseEligible: true,
    managers: [
      { id: "mgr-hosted-a", host: "use1-a.pool.oyzu.example", version: "0.4.1", adapter: "vm", status: "healthy", heartbeat: "4s ago", activeJobs: 1, keyAgeDays: 12 },
      { id: "mgr-hosted-b", host: "use1-b.pool.oyzu.example", version: "0.4.1", adapter: "vm", status: "healthy", heartbeat: "2s ago", activeJobs: 1, keyAgeDays: 12 },
      { id: "mgr-hosted-c", host: "use1-c.pool.oyzu.example", version: "0.4.1", adapter: "vm", status: "healthy", heartbeat: "6s ago", activeJobs: 0, keyAgeDays: 27, note: "Key rotation due in 3 days" },
    ],
  },
  {
    id: "acme-onprem",
    name: "Acme on-prem",
    kind: "Customer network",
    scope: "Project · payments",
    capacity: 4,
    busy: 0,
    queued: 1,
    status: "warning",
    shipping: true,
    releaseEligible: true,
    managers: [
      { id: "mgr-onprem-01", host: "build-01.corp.acme.example", version: "0.4.1", adapter: "container", status: "healthy", heartbeat: "3s ago", activeJobs: 0, keyAgeDays: 8 },
      { id: "mgr-onprem-02", host: "build-02.corp.acme.example", version: "0.4.0", adapter: "container", status: "warning", heartbeat: "2m 41s ago", activeJobs: 0, keyAgeDays: 31, note: "Heartbeats late since 15:32 ET; key in rotation overlap" },
    ],
  },
  {
    id: "dev-desktop",
    name: "Micah's desktop",
    kind: "Developer machine",
    scope: "Project · payments",
    capacity: 1,
    busy: 0,
    queued: 0,
    status: "paused",
    shipping: false,
    releaseEligible: false,
    managers: [
      { id: "mgr-desktop", host: "desktop.tailnet.example", version: "0.4.1", adapter: "process", status: "paused", heartbeat: "18m ago", activeJobs: 0, keyAgeDays: 2, note: "Machine asleep; pool logs stay on the host" },
    ],
  },
];
export const poolById = (id: string) => pools.find((p) => p.id === id);

export const poolLogs: PoolLog[] = [
  { t: "15:31:02", level: "info", manager: "mgr-onprem-02", msg: "assignment claimed", jobId: "job-5521", fields: { run: "9012", attempt: "1", lease: "90s" } },
  { t: "15:31:03", level: "info", manager: "mgr-onprem-02", msg: "startup token issued", jobId: "job-5521", fields: { executor: "ctr-8f21", ttl: "5m" } },
  { t: "15:31:08", level: "info", manager: "mgr-onprem-02", msg: "executor started", jobId: "job-5521", fields: { executor: "ctr-8f21", image: "oyzu-runner:0.4.0" } },
  { t: "15:31:09", level: "info", manager: "mgr-onprem-02", msg: "runner checked in", jobId: "job-5521", fields: { executor: "ctr-8f21" } },
  { t: "15:32:31", level: "warn", manager: "mgr-onprem-02", msg: "heartbeat failed", jobId: "job-5521", fields: { status: "timeout", after: "10s", proxy: "proxy.corp.acme.example:3128" } },
  { t: "15:33:01", level: "warn", manager: "mgr-onprem-02", msg: "heartbeat failed", jobId: "job-5521", fields: { status: "timeout", after: "10s", proxy: "proxy.corp.acme.example:3128" } },
  { t: "15:33:31", level: "warn", manager: "mgr-onprem-02", msg: "heartbeat failed", jobId: "job-5521", fields: { status: "407", detail: "proxy authentication required" } },
  { t: "15:34:02", level: "error", manager: "mgr-onprem-02", msg: "lease expired", jobId: "job-5521", fields: { lease: "90s", outcome: "executor lost" } },
  { t: "15:34:05", level: "info", manager: "mgr-onprem-02", msg: "executor stopped", jobId: "job-5521", fields: { executor: "ctr-8f21", reason: "lease lost" } },
  { t: "15:34:40", level: "info", manager: "mgr-onprem-02", msg: "key rotation started", fields: { overlap: "active", keys: "2" } },
  { t: "15:35:01", level: "info", manager: "mgr-onprem-01", msg: "assignment claimed", jobId: "job-5530", fields: { run: "9012", attempt: "2", lease: "90s" } },
  { t: "15:35:02", level: "info", manager: "mgr-onprem-01", msg: "executor started", jobId: "job-5530", fields: { executor: "ctr-9a04", image: "oyzu-runner:0.4.1" } },
  { t: "15:39:22", level: "info", manager: "mgr-onprem-01", msg: "runner reported exit", jobId: "job-5530", fields: { exit: "1", logs: "complete", seq: "612" } },
  { t: "15:39:24", level: "info", manager: "mgr-onprem-01", msg: "executor stopped", jobId: "job-5530", fields: { executor: "ctr-9a04", reason: "job finished" } },
  { t: "15:41:55", level: "warn", manager: "mgr-onprem-02", msg: "heartbeat failed", fields: { status: "407", detail: "proxy authentication required" } },
];

// ---------------------------------------------------------------- logs

const esc = "\u001b[";
const red = (s: string) => `${esc}31m${s}${esc}0m`;
const green = (s: string) => `${esc}32m${s}${esc}0m`;
const yellow = (s: string) => `${esc}33m${s}${esc}0m`;
const dim = (s: string) => `${esc}2m${s}${esc}0m`;
const bold = (s: string) => `${esc}1m${s}${esc}0m`;

type Line = Omit<LogEntry, "seq">;

function build(lines: Line[]): LogEntry[] {
  return lines.map((line, index) => ({ ...line, seq: index + 1 }));
}

function setupLines(start: number, pool: string, manager: string): Line[] {
  return [
    { t: start, scope: "runner", stream: "system", text: `Claimed by ${manager} in pool ${pool}` },
    { t: start + 400, scope: "runner", stream: "system", text: "Exchanged startup token for a job token" },
    { t: start + 900, scope: "runner", stream: "system", text: "Source token issued: acme/payments-api, contents read, 60 min", redacted: 1 },
    { t: start + 1300, scope: "runner", stream: "stdout", text: "git fetch --tags origin 9c41e2a7b3d05f18c6e2a94b07d1e3f5a8c2b610" },
    { t: start + 6200, scope: "runner", stream: "stdout", text: dim("remote: Enumerating objects: 18422, done.") },
    { t: start + 9100, scope: "runner", stream: "stdout", text: "HEAD is now at 9c41e2a Retry refunds with the original idempotency key" },
    { t: start + 9300, scope: "runner", stream: "system", text: "Merge base with main is 7d0b113 (used for --affected)" },
    { t: start + 9600, scope: "runner", stream: "stdout", text: "Using credentials https://x-access-token:***@github.com/acme/payments-api", redacted: 1 },
    { t: start + 10_100, scope: "runner", stream: "system", text: "oyzu 0.9.2 selected (project pin)" },
    { t: start + 10_400, scope: "runner", stream: "system", text: "$ oyzu build --affected 7d0b113 --full --json" },
    { t: start + 12_900, scope: "runner", stream: "stdout", text: `Selected ${bold("4 targets")}: ledger-client, payments-core, api ${dim("(changed)")}; web-console, ledger-sim ${dim("(not affected)")}` },
  ];
}

function testFiller(start: number, count: number, scope: string, prefix: string): Line[] {
  const names = ["capture", "authorize", "settle", "void", "ledger_post", "fx_convert", "webhook_sign", "partial_refund", "chargeback", "payout"];
  return Array.from({ length: count }, (_, index) => ({
    t: start + index * 180,
    scope,
    stream: "stdout" as const,
    text: `test ${prefix}::${names[index % names.length]}_${Math.floor(index / names.length) + 1} ... ${green("ok")}`,
  }));
}

export const failedLog: LogEntry[] = build([
  ...setupLines(0, "acme-onprem", "mgr-onprem-01"),
  { t: 14_200, scope: "ledger-client/compile", stream: "system", text: "Task ledger-client/compile started" },
  { t: 14_800, scope: "ledger-client/compile", stream: "stderr", text: `${green("   Compiling")} ledger-client v0.14.0 (crates/ledger-client)` },
  { t: 34_900, scope: "ledger-client/compile", stream: "stderr", text: `${green("    Finished")} release [optimized] target(s) in 20.1s` },
  { t: 36_000, scope: "ledger-client/compile", stream: "system", text: "Task ledger-client/compile succeeded in 21.8s" },
  { t: 36_100, scope: "payments-core/lint", stream: "system", text: "Task payments-core/lint started" },
  { t: 36_300, scope: "payments-core/lint", stream: "stderr", text: `${yellow("warning")}: unused import: \`std::time::Instant\` --> crates/payments-core/src/retry.rs:4:5`, level: "warn" },
  { t: 45_500, scope: "payments-core/lint", stream: "system", text: "Task payments-core/lint succeeded in 9.4s (1 warning)" },
  { t: 45_600, scope: "payments-core/compile", stream: "system", text: "Task payments-core/compile started" },
  { t: 46_200, scope: "payments-core/compile", stream: "stderr", text: `${green("   Compiling")} payments-core v2.3.0 (crates/payments-core)` },
  { t: 93_400, scope: "payments-core/compile", stream: "stderr", text: `${green("    Finished")} release [optimized] target(s) in 47.2s` },
  { t: 93_700, scope: "payments-core/compile", stream: "system", text: "Task payments-core/compile succeeded in 48.1s" },
  { t: 93_800, scope: "payments-core/test", stream: "system", text: "Task payments-core/test started" },
  { t: 94_100, scope: "payments-core/test", stream: "stdout", text: "running 64 tests" },
  { t: 94_200, scope: "payments-core/test", stream: "stdout", text: `Connecting to test ledger with LEDGER_API_KEY=***`, redacted: 1 },
  ...testFiller(94_400, 38, "payments-core/test", "refund"),
  { t: 101_400, scope: "payments-core/test", stream: "stdout", text: `test refund::retry::refund_retry_respects_idempotency_key ... ${red("FAILED")}`, level: "error" },
  ...testFiller(101_600, 25, "payments-core/test", "ledger"),
  { t: 160_000, scope: "payments-core/test", stream: "stdout", text: "" },
  { t: 160_010, scope: "payments-core/test", stream: "stdout", text: "failures:" },
  { t: 160_020, scope: "payments-core/test", stream: "stdout", text: "---- refund::retry::refund_retry_respects_idempotency_key stdout ----" },
  { t: 160_030, scope: "payments-core/test", stream: "stdout", text: `thread 'refund::retry::refund_retry_respects_idempotency_key' panicked at crates/payments-core/tests/refund_retry.rs:88:5:`, level: "error" },
  { t: 160_040, scope: "payments-core/test", stream: "stdout", text: red("assertion `left == right` failed: retry must reuse the original idempotency key"), level: "error" },
  { t: 160_050, scope: "payments-core/test", stream: "stdout", text: `  left: ${bold("2")} charges posted` },
  { t: 160_060, scope: "payments-core/test", stream: "stdout", text: `  right: ${bold("1")} charge posted` },
  { t: 160_070, scope: "payments-core/test", stream: "stdout", text: dim("note: key was regenerated in RefundRetry::schedule at crates/payments-core/src/refund.rs:212:21") },
  { t: 160_080, scope: "payments-core/test", stream: "stdout", text: "" },
  { t: 160_090, scope: "payments-core/test", stream: "stdout", text: `test result: ${red("FAILED")}. 63 passed; 1 failed; 0 ignored; finished in 66.02s`, level: "error" },
  { t: 165_100, scope: "payments-core/test", stream: "system", text: "Task payments-core/test failed in 71.3s (exit 101)", level: "error" },
  { t: 165_200, scope: "api/compile", stream: "system", text: "Task api/compile started" },
  { t: 165_600, scope: "api/compile", stream: "stderr", text: `${green("   Compiling")} payments-api v2.3.0 (crates/api)` },
  { t: 204_900, scope: "api/compile", stream: "stderr", text: `${green("    Finished")} release [optimized] target(s) in 39.2s` },
  { t: 205_100, scope: "api/compile", stream: "system", text: "Task api/compile succeeded in 39.9s" },
  { t: 205_200, scope: "api/test", stream: "system", text: "Task api/test started" },
  { t: 205_300, scope: "api/test", stream: "stdout", text: "running 41 tests" },
  ...testFiller(205_500, 41, "api/test", "api"),
  { t: 257_000, scope: "api/test", stream: "stdout", text: `test result: ${green("ok")}. 41 passed; 0 failed; 0 ignored; finished in 50.98s` },
  { t: 257_800, scope: "api/test", stream: "system", text: "Task api/test succeeded in 52.6s" },
  { t: 257_900, scope: "runner/finish", stream: "system", text: "oyzu exited 1 (1 task failed)", level: "error" },
  { t: 258_400, scope: "runner/finish", stream: "system", text: "Masked outputs/logs/events.jsonl (2 values)" },
  { t: 260_200, scope: "runner/finish", stream: "system", text: "Uploaded 3 outputs; log complete at sequence 612" },
]);

export const failedFirstAttemptLog: LogEntry[] = build([
  ...setupLines(0, "acme-onprem", "mgr-onprem-02"),
  { t: 14_000, scope: "ledger-client/compile", stream: "system", text: "Task ledger-client/compile started" },
  { t: 14_600, scope: "ledger-client/compile", stream: "stderr", text: `${green("   Compiling")} ledger-client v0.14.0 (crates/ledger-client)` },
  { t: 61_000, scope: "runner", stream: "system", text: "41 entries were not received: the executor stopped responding at 15:32:31 ET", level: "warn" },
  { t: 184_000, scope: "runner", stream: "system", text: "Attempt closed as incomplete: executor lost (lease expired). The run was retried as attempt 2.", level: "error" },
]);

export const passedPolicyLog: LogEntry[] = build([
  { t: 0, scope: "runner", stream: "system", text: "Claimed by mgr-hosted-a in pool hosted-linux" },
  { t: 9_800, scope: "runner", stream: "system", text: "$ oyzu run policy-check --json" },
  { t: 10_000, scope: "policy-check", stream: "system", text: "Task policy-check started" },
  ...Array.from({ length: 12 }, (_, index) => ({
    t: 11_000 + index * 2000,
    scope: "policy-check",
    stream: "stdout" as const,
    text: `${green("PASS")} policy/${["refunds", "payouts", "pii", "regions", "images", "secrets", "network", "ledger", "fx", "limits", "audit", "retention"][index]}.rego`,
  })),
  { t: 36_000, scope: "policy-check", stream: "system", text: "Task policy-check succeeded in 26.2s" },
  { t: 38_700, scope: "runner/finish", stream: "system", text: "oyzu exited 0" },
]);

/** Lines the live api-image run will emit, one every few hundred ms. */
export const liveScript: Line[] = [
  { t: 11_400, scope: "api-image/compile", stream: "system", text: "Task api-image/compile started" },
  ...[
    "serde v1.0.214", "tokio v1.41.0", "hyper v1.5.0", "rustls v0.23.16", "sqlx-core v0.8.2",
    "tower-http v0.6.1", "tracing v0.1.40", "ledger-client v0.14.0", "payments-core v2.3.0", "payments-api v2.3.0",
  ].map((crate, index) => ({
    t: 12_000 + index * 2400,
    scope: "api-image/compile",
    stream: "stderr" as const,
    text: `${green("   Compiling")} ${crate}`,
  })),
  { t: 38_000, scope: "api-image/compile", stream: "stderr", text: `${green("    Finished")} release [optimized] target(s) in 26.0s` },
  { t: 38_200, scope: "api-image/compile", stream: "system", text: "Task api-image/compile succeeded in 26.8s" },
  { t: 38_300, scope: "api-image/image", stream: "system", text: "Task api-image/image started" },
  ...["FROM distroless/cc:nonroot@sha256:6c1f…", "COPY dist/api/payments-api /app/payments-api", "LABEL org.opencontainers.image.revision=9c41e2a", "Layer 1/3 sha256:1b2c… 18.4 MiB", "Layer 2/3 sha256:77de… 41.0 MiB", "Layer 3/3 sha256:a90f… 2.1 KiB", "Image index sha256:3e5a…c2d0"].map(
    (text, index) => ({ t: 40_000 + index * 2600, scope: "api-image/image", stream: "stdout" as const, text }),
  ),
  { t: 59_000, scope: "api-image/image", stream: "system", text: "Task api-image/image succeeded in 20.7s" },
  { t: 59_400, scope: "runner/finish", stream: "system", text: "oyzu exited 0" },
  { t: 60_100, scope: "runner/finish", stream: "system", text: "Uploaded 2 outputs; log complete" },
];

export const liveInitialLog: LogEntry[] = build([
  { t: 0, scope: "runner", stream: "system", text: "Claimed by mgr-hosted-b in pool hosted-linux" },
  { t: 900, scope: "runner", stream: "system", text: "Source token issued: acme/payments-api, contents read, 60 min", redacted: 1 },
  { t: 9_000, scope: "runner", stream: "stdout", text: "HEAD is now at 9c41e2a Retry refunds with the original idempotency key" },
  { t: 10_900, scope: "runner", stream: "system", text: "$ oyzu build api-image --full --json" },
]);

export function logFor(runId: string, attempt: number): LogEntry[] {
  if (runId === failedRun.id) return attempt === 1 ? failedFirstAttemptLog : failedLog;
  if (runId === runs[1].id) return passedPolicyLog;
  return [];
}

// ---------------------------------------------------------------- helpers

export function stripAnsiText(text: string) {
  return text.replace(/\u001b\[[\d;]+m/g, "");
}

export function duration(ms: number) {
  if (!ms) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}

const etFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
/** Times are shown in US Eastern, the demo's account setting. */
export function clock(iso: string) {
  return etFormat.format(new Date(iso)) + " ET";
}

const demoNow = Date.parse("2026-10-09T15:42:00-04:00");
export function ago(iso: string) {
  const minutes = Math.max(0, Math.round((demoNow - Date.parse(iso)) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

export const stateLabel: Record<RunState, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  skipped: "Skipped",
  cancelled: "Cancelled",
  timed_out: "Timed out",
};

/** Maps run and check states onto the kit's StatusBadge tones. */
export function tone(state: RunState | GroupState | CheckConclusion | ManagerStatus) {
  switch (state) {
    case "succeeded":
    case "success":
    case "healthy":
      return "healthy" as const;
    case "failed":
    case "failure":
    case "timed_out":
      return "failed" as const;
    case "running":
    case "in_progress":
    case "queued":
      return "pending" as const;
    case "action_required":
    case "warning":
      return "warning" as const;
    default:
      return "paused" as const;
  }
}
