import { Fragment, useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  Ban,
  Check,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  Copy,
  Download,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  GitPullRequestDraft,
  LoaderCircle,
  RotateCcw,
  Search,
  Server,
  Sparkles,
  Stethoscope,
  Terminal,
  TriangleAlert,
  Waypoints,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { TooltipProvider } from "../../../components/ui/tooltip";
import { CopyIdentifier } from "../../../components/patterns/copy-identifier";
import { EmptyState } from "../../../components/patterns/empty-state";
import { AssistantComposer, AssistantMessages, useAssistant } from "../assistant";
import type { AssistantContext } from "../assistant-engine";
import { useLiveRun } from "../live";
import { GroupIcon, LogViewer } from "../log-viewer";
import {
  ago,
  bindingById,
  checks,
  clock,
  deliveryById,
  duration,
  failedRun,
  liveRun,
  logFor,
  runById,
  runs,
  stateLabel,
  type Check as CheckRecord,
  type CheckConclusion,
  type RunState,
  type StageStatus,
} from "../model";
import { StateChip, actionResult, usePrototype } from "../shared";
import {
  AskView,
  CapacityView,
  CommandPalette,
  ConfirmInline,
  ExplainCard,
  ExplainChip,
  Pip,
  RulesView,
  actionHandler,
  shortcutLabel,
  useMediaQuery,
  type Explain,
  type Focus,
  type Go,
  type GoTarget,
  type PoolFocus,
  type StageFocus,
} from "./trace-views";
import "./trace.css";

// Trace: every change is drawn as the path its webhook took, from delivery to
// verification, rule matching, runs and checks. Any step opens its record, and
// red or grey steps can be explained in place.

type Tone = "ok" | "fail" | "skip" | "warn" | "running" | "pending";
type Tab = "changes" | "rules" | "capacity" | "ask";
type Filter = "all" | "attention" | "running";
type LiveState = ReturnType<typeof useLiveRun>;
type DrawerTarget = Extract<GoTarget, { to: "run" | "delivery" | "checks" }>;

type Step = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone: Tone;
  why?: string;
  target?: GoTarget;
  explain?: Explain;
};
type Lane = {
  id: string;
  name: string;
  tone: Tone;
  summary: string;
  meta?: string;
  runId?: string;
  runNumber?: number;
  dim?: boolean;
  live?: boolean;
  progress?: number;
  required?: boolean;
  check: { tone: Tone; label: string };
  explain?: Explain;
  retry?: Explain;
};
type Change = {
  id: string;
  group: "now" | "earlier";
  icon: LucideIcon;
  prefix: string;
  title: string;
  tag?: string;
  meta: string[];
  when: string;
  status: { state: RunState | CheckConclusion | "warning"; label: string };
  attention: boolean;
  running: boolean;
  steps: Step[];
  lanes: Lane[];
  empty?: string;
  checksCommit?: string;
  footnote?: { text: string; runId: string; explain: Explain };
};

const LIVE_START = 11_400;
const LIVE_END = 60_100;
const HOME: AssistantContext = { kind: "home" };

const explains: Record<string, Explain> = {
  build: {
    id: "x-build",
    chip: "Explain",
    question: "Why did this fail?",
    context: { kind: "run", runId: failedRun.id, attempt: 2 },
  },
  retry: {
    id: "x-retry",
    chip: "Why retried?",
    question: "What happened to attempt 1?",
    context: { kind: "run", runId: failedRun.id, attempt: 1 },
  },
  draft: {
    id: "x-draft",
    chip: "Explain",
    question: "Why did this start nothing?",
    context: { kind: "delivery", deliveryId: "dlv-7f12" },
  },
  rejected: {
    id: "x-rejected",
    chip: "Explain",
    question: "Why are webhooks being rejected?",
    context: { kind: "delivery", deliveryId: "dlv-rej" },
  },
  unregistered: {
    id: "x-unregistered",
    chip: "Explain",
    question: "Why didn't any rules run for acme/ledger-tools #12?",
    context: { kind: "delivery", deliveryId: "dlv-7e40" },
    local: {
      blocks: [
        {
          type: "text",
          text: "**acme/ledger-tools isn't registered to any Oyzu project**, so the delivery stopped after parsing and no rules were evaluated. The webhook and its signature are fine: GitHub sends events for every repository the app is installed on.",
        },
        {
          type: "facts",
          rows: [
            ["Delivery", "dlv-7e40 · pull_request.synchronize on #12"],
            ["Connector", "github-acme (signature valid)"],
            ["Stopped at", "Parsed: repository not registered"],
          ],
        },
        {
          type: "text",
          text: "Register the repository to a project, then replay this delivery to build #12 without waiting for another push.",
        },
        {
          type: "actions",
          actions: [
            { id: "register-repo", label: "Ask to register acme/ledger-tools", primary: true },
            { id: "open-delivery", label: "Open delivery record", target: "dlv-7e40" },
          ],
        },
      ],
      sources: ["Delivery dlv-7e40 record", "Project registrations in acme"],
    },
  },
  skipped: {
    id: "x-skipped",
    chip: "Explain",
    question: "Why was run 9004 skipped?",
    context: { kind: "run", runId: runs[4].id },
    local: {
      blocks: [
        {
          type: "text",
          text: "**Run 9004 was skipped before it started.** The Policy and image rule asked for `oyzu run policy-check`, but commit b81e04c doesn't define a task named policy-check, so there was nothing to run. The check reports skipped, not failed, and doesn't block the pull request.",
        },
        {
          type: "facts",
          rows: [
            ["Rule", "Policy and image (project payments)"],
            ["Commit", "b81e04c on fix/ledger-timeouts (#480)"],
            ["Reason", "TASK_NOT_DEFINED"],
          ],
        },
        {
          type: "text",
          text: "The task was added to main after this branch was cut. Rebasing #480 on main picks it up.",
        },
        { type: "actions", actions: [{ id: "open-binding", label: "Open the rule", primary: true, target: "payments-policy" }] },
      ],
      sources: ["Run 9004 record", "Task list at b81e04c"],
    },
  },
  cancelled: {
    id: "x-cancelled",
    chip: "Why cancelled?",
    question: "Why was run 9001 cancelled?",
    context: { kind: "run", runId: runs[5].id },
    local: {
      blocks: [
        {
          type: "text",
          text: "**Superseded, not failed.** dana.okafor pushed 9c41e2a to #482 while run 9001 was still building e5c9a1b. The pull request rule cancels unfinished runs for older pushes, so 9001 stopped after 1m 36s and run 9012 took over.",
        },
        { type: "actions", actions: [{ id: "open-run", label: "Open run 9012", primary: true, target: runs[0].id }] },
      ],
      sources: ["Run 9001 record", "Delivery dlv-7f3a (started 9012, cancelled 9001)"],
    },
  },
};

function liveSummary(live: LiveState) {
  if (live.state !== "running") return `Built api-image in ${duration(LIVE_END)}`;
  if (live.groups["api-image/image"] === "running") return "Building the container image";
  return "Compiling api-image";
}

function buildChanges(live: LiveState): Change[] {
  const done = live.state !== "running";
  const progress = Math.min(1, Math.max(0.02, (live.elapsedMs - LIVE_START) / (LIVE_END - LIVE_START)));
  const dlv = (id: string, focus: StageFocus): GoTarget => ({ to: "delivery", id, focus });
  return [
    {
      id: "pr-482",
      group: "now",
      icon: GitPullRequest,
      prefix: "PR #482",
      title: "Retry refunds with the original idempotency key",
      meta: ["feat/refund-retries", "9c41e2a", "dana.okafor"],
      when: done ? ago("2026-10-09T15:30:49-04:00") : "running now",
      status: { state: "failed", label: "1 check failing" },
      attention: true,
      running: !done,
      steps: [
        { key: "delivery", label: "Delivery", value: "PR synchronize", sub: "3:30 PM ET", tone: "ok", target: dlv("dlv-7f3a", "received") },
        { key: "verified", label: "Verified", value: "Signature valid", sub: "HMAC SHA-256", tone: "ok", target: dlv("dlv-7f3a", "verified") },
        { key: "matched", label: "Matched", value: "2 of 5 rules", sub: "3 actions", tone: "ok", target: dlv("dlv-7f3a", "matched") },
      ],
      lanes: [
        {
          id: "9012",
          name: "oyzu / build",
          runId: runs[0].id,
          runNumber: 9012,
          tone: "fail",
          summary: "1 test failed",
          meta: "payments-core/test · attempt 2",
          required: true,
          check: { tone: "fail", label: "Failure" },
          explain: explains.build,
          retry: explains.retry,
        },
        {
          id: "9013",
          name: "oyzu / policy",
          runId: runs[1].id,
          runNumber: 9013,
          tone: "ok",
          summary: "12 policies passed",
          meta: duration(38_700),
          check: { tone: "ok", label: "Success" },
        },
        {
          id: "9014",
          name: "oyzu / api-image",
          runId: runs[2].id,
          runNumber: 9014,
          tone: done ? "ok" : "running",
          summary: liveSummary(live),
          meta: done ? duration(LIVE_END) : `live · ${duration(live.elapsedMs)}`,
          live: !done,
          progress,
          check: { tone: done ? "ok" : "running", label: done ? "Success" : "In progress" },
        },
        {
          id: "web-console",
          name: "oyzu / web-console",
          tone: "skip",
          dim: true,
          summary: "Skipped: not affected",
          required: true,
          check: { tone: "skip", label: "Skipped" },
        },
        {
          id: "ledger-sim",
          name: "oyzu / ledger-sim",
          tone: "skip",
          dim: true,
          summary: "Skipped: not affected",
          required: true,
          check: { tone: "skip", label: "Skipped" },
        },
      ],
      checksCommit: "9c41e2a",
      footnote: {
        text: "Earlier push e5c9a1b: run 9001 was cancelled when 9c41e2a arrived",
        runId: runs[5].id,
        explain: explains.cancelled,
      },
    },
    {
      id: "legacy",
      group: "now",
      icon: Webhook,
      prefix: "github-acme-legacy",
      title: "12 rejected deliveries",
      meta: ["acme/web-console", "since 2:02 PM ET"],
      when: ago("2026-10-09T15:36:10-04:00"),
      status: { state: "failed", label: "Rejected" },
      attention: true,
      running: false,
      steps: [
        { key: "delivery", label: "Delivery", value: "12 pushes", sub: "since 2:02 PM ET", tone: "ok", target: dlv("dlv-rej", "received") },
        {
          key: "verified",
          label: "Verified",
          value: "Signature mismatch",
          tone: "fail",
          why: "The webhook secret probably differs from GitHub's",
          target: dlv("dlv-rej", "verified"),
          explain: explains.rejected,
        },
        { key: "matched", label: "Matched", value: "Not evaluated", tone: "pending", target: dlv("dlv-rej", "matched") },
      ],
      lanes: [],
      empty: "Body not read, so no runs started and no checks were written",
    },
    {
      id: "pr-483",
      group: "now",
      icon: GitPullRequestDraft,
      prefix: "PR #483",
      tag: "draft",
      title: "Spike: FX rounding modes",
      meta: ["spike/fx-rounding", "c3a9e10", "jo.pereira"],
      when: ago("2026-10-09T15:18:02-04:00"),
      status: { state: "skipped", label: "Nothing ran" },
      attention: false,
      running: false,
      steps: [
        { key: "delivery", label: "Delivery", value: "PR opened", sub: "3:18 PM ET", tone: "ok", target: dlv("dlv-7f12", "received") },
        { key: "verified", label: "Verified", value: "Signature valid", sub: "HMAC SHA-256", tone: "ok", target: dlv("dlv-7f12", "verified") },
        {
          key: "matched",
          label: "Matched",
          value: "0 of 5 rules",
          tone: "skip",
          why: "Draft PR: no binding listens for drafts",
          target: dlv("dlv-7f12", "matched"),
          explain: explains.draft,
        },
      ],
      lanes: [],
      empty: "No runs, no checks. Marking it ready for review starts oyzu / build",
    },
    {
      id: "main",
      group: "now",
      icon: GitCommitHorizontal,
      prefix: "main",
      title: "Merge pull request #477 from acme/chore/ledger-client-0.14",
      meta: ["3f2a9c1", "lee.marsh"],
      when: ago("2026-10-09T14:58:00-04:00"),
      status: { state: "succeeded", label: "Passed" },
      attention: false,
      running: false,
      steps: [
        { key: "delivery", label: "Delivery", value: "Push to main", sub: "2:58 PM ET", tone: "ok", target: dlv("dlv-7e91", "received") },
        { key: "verified", label: "Verified", value: "Signature valid", sub: "HMAC SHA-256", tone: "ok", target: dlv("dlv-7e91", "verified") },
        { key: "matched", label: "Matched", value: "1 of 5 rules", sub: "Full build on main", tone: "ok", target: dlv("dlv-7e91", "matched") },
      ],
      lanes: [
        {
          id: "9009",
          name: "oyzu / build",
          runId: runs[3].id,
          runNumber: 9009,
          tone: "ok",
          summary: "Built everything",
          meta: duration(412_900),
          required: true,
          check: { tone: "ok", label: "Success" },
        },
      ],
      checksCommit: "3f2a9c1",
    },
    {
      id: "ledger-12",
      group: "now",
      icon: FolderGit2,
      prefix: "acme/ledger-tools #12",
      tag: "repository not registered",
      title: "CSV export",
      meta: ["feat/export", "f00d1e2", "sam.ito"],
      when: ago("2026-10-09T14:41:37-04:00"),
      status: { state: "warning", label: "Not registered" },
      attention: true,
      running: false,
      steps: [
        { key: "delivery", label: "Delivery", value: "PR synchronize", sub: "2:41 PM ET", tone: "ok", target: dlv("dlv-7e40", "received") },
        { key: "verified", label: "Verified", value: "Signature valid", sub: "HMAC SHA-256", tone: "ok", target: dlv("dlv-7e40", "verified") },
        {
          key: "matched",
          label: "Matched",
          value: "Not registered",
          tone: "warn",
          why: "This repository isn't in any project, so no rules ran",
          target: dlv("dlv-7e40", "matched"),
          explain: explains.unregistered,
        },
      ],
      lanes: [],
      empty: "No runs started and no checks written",
    },
    {
      id: "pr-480",
      group: "earlier",
      icon: GitPullRequest,
      prefix: "PR #480",
      title: "Shorten ledger client timeouts",
      meta: ["fix/ledger-timeouts", "b81e04c", "sam.ito"],
      when: ago("2026-10-09T13:12:44-04:00"),
      status: { state: "skipped", label: "Skipped" },
      attention: false,
      running: false,
      steps: [
        { key: "delivery", label: "Delivery", value: "PR synchronize", sub: "1:12 PM ET", tone: "ok" },
        { key: "verified", label: "Verified", value: "Signature valid", tone: "ok" },
        { key: "matched", label: "Matched", value: "1 rule", sub: "Policy and image", tone: "ok", target: { to: "binding", id: "payments-policy" } },
      ],
      lanes: [
        {
          id: "9004",
          name: "oyzu / policy",
          runId: runs[4].id,
          runNumber: 9004,
          tone: "skip",
          summary: "policy-check isn't defined at b81e04c",
          meta: "skipped before start",
          check: { tone: "skip", label: "Skipped" },
          explain: explains.skipped,
        },
      ],
    },
    {
      id: "manual-8998",
      group: "earlier",
      icon: Terminal,
      prefix: "Manual run",
      title: "oyzu build cli --remote",
      meta: ["main", "a2d4f6b", "micah"],
      when: ago("2026-10-09T12:04:02-04:00"),
      status: { state: "succeeded", label: "Passed" },
      attention: false,
      running: false,
      steps: [{ key: "cli", label: "Started from", value: "oyzu CLI", sub: "no webhook", tone: "ok" }],
      lanes: [
        {
          id: "8998",
          name: "manual",
          runId: runs[6].id,
          runNumber: 8998,
          tone: "ok",
          summary: "Built cli on Micah's desktop",
          meta: duration(128_300),
          check: { tone: "skip", label: "Portal only" },
        },
      ],
    },
  ];
}

const toneIcon: Record<Tone, LucideIcon> = {
  ok: CircleCheck,
  fail: CircleX,
  skip: CircleMinus,
  warn: TriangleAlert,
  running: LoaderCircle,
  pending: CircleDashed,
};

function stageTone(status: StageStatus): Tone {
  return status;
}

function runTone(state: RunState): Tone {
  if (state === "succeeded") return "ok";
  if (state === "failed" || state === "timed_out") return "fail";
  if (state === "running" || state === "queued") return "running";
  return "skip";
}

// ---------------------------------------------------------------- trace drawing

/** A step with no record to open (for example a delivery older than the record window). */
function StepNode({ step }: { step: Step }) {
  return (
    <div className="tr-node" data-tone={step.tone}>
      <Pip tone={step.tone} />
      <span className="tr-node-text">
        <span className="tr-node-label">{step.label}</span>
        <strong>{step.value}</strong>
        {step.sub && <small>{step.sub}</small>}
        {step.why && <em className="tr-why">{step.why}</em>}
      </span>
    </div>
  );
}

function TraceDiagram({
  change,
  openExplain,
  toggle,
  go,
}: {
  change: Change;
  openExplain?: string;
  toggle: (id: string) => void;
  go: Go;
}) {
  const checksTarget = (lane: Lane): GoTarget | undefined =>
    change.checksCommit ? { to: "checks", commit: change.checksCommit } : lane.runId ? { to: "run", runId: lane.runId } : undefined;
  return (
    <div className="tr-trace">
      <ol className="tr-spine" aria-label="Path of this change">
        {change.steps.map((step) => (
          <li key={step.key} className="tr-step" data-tone={step.tone}>
            <div className="tr-node-wrap">
              {step.target ? (
                <button
                  type="button"
                  className="tr-node"
                  data-tone={step.tone}
                  onClick={() => go(step.target!)}
                  aria-label={`${step.label}: ${step.value}${step.why ? `. ${step.why}` : ""}. Open record`}
                >
                  <Pip tone={step.tone} />
                  <span className="tr-node-text">
                    <span className="tr-node-label">{step.label}</span>
                    <strong>{step.value}</strong>
                    {step.sub && <small>{step.sub}</small>}
                    {step.why && <em className="tr-why">{step.why}</em>}
                  </span>
                </button>
              ) : (
                <StepNode step={step} />
              )}
              {step.explain && (
                <ExplainChip explain={step.explain} open={openExplain === step.explain.id} onToggle={() => toggle(step.explain!.id)} />
              )}
            </div>
            <span className="tr-edge" data-tone={step.tone === "ok" ? "ok" : "stop"} aria-hidden="true" />
          </li>
        ))}
      </ol>
      <div className="tr-runs">
        <div className="tr-runs-head">
          <span className="tr-node-label">Runs</span>
          {change.checksCommit ? (
            <button type="button" className="tr-node-label tr-linkish" onClick={() => go({ to: "checks", commit: change.checksCommit! })}>
              Checks
            </button>
          ) : (
            <span className="tr-node-label">Checks</span>
          )}
        </div>
        <ul className="tr-fan" aria-label="Runs and checks">
          {change.lanes.length === 0 && (
            <li className="tr-branch" data-tone="pending">
              <div className="tr-ghost">
                <Ban size={13} aria-hidden="true" />
                {change.empty}
              </div>
            </li>
          )}
          {change.lanes.map((lane) => {
            const Icon = toneIcon[lane.check.tone];
            const capTarget = checksTarget(lane);
            const runBody = (
              <>
                <Pip tone={lane.tone} />
                <span className="tr-run-name">
                  {lane.name}
                  {lane.runNumber && <span className="tr-run-num">#{lane.runNumber}</span>}
                </span>
                <span className="tr-run-sum">{lane.summary}</span>
                {lane.meta && <span className="tr-run-meta">{lane.meta}</span>}
                {lane.progress !== undefined && lane.live && (
                  <span className="tr-progress" aria-hidden="true">
                    <i style={{ width: `${Math.round(lane.progress * 100)}%` }} />
                  </span>
                )}
              </>
            );
            return (
              <li
                key={lane.id}
                className="tr-branch"
                data-tone={lane.tone}
                data-dim={lane.dim || undefined}
                data-live={lane.live || undefined}
              >
                <div className="tr-lane">
                  <div className="tr-lane-main">
                    {lane.runId ? (
                      <button
                        type="button"
                        className="tr-run"
                        data-tone={lane.tone}
                        onClick={() => go({ to: "run", runId: lane.runId! })}
                        aria-label={`Run ${lane.runNumber} ${lane.name}: ${lane.summary}. Open run`}
                      >
                        {runBody}
                      </button>
                    ) : (
                      <div className="tr-run" data-tone={lane.tone}>
                        {runBody}
                      </div>
                    )}
                    {(lane.explain || lane.retry) && (
                      <div className="tr-lane-chips">
                        {lane.explain && (
                          <ExplainChip explain={lane.explain} open={openExplain === lane.explain.id} onToggle={() => toggle(lane.explain!.id)} />
                        )}
                        {lane.retry && (
                          <ExplainChip quiet explain={lane.retry} open={openExplain === lane.retry.id} onToggle={() => toggle(lane.retry!.id)} />
                        )}
                      </div>
                    )}
                  </div>
                  <span className="tr-lane-edge" aria-hidden="true" />
                  {capTarget ? (
                    <button
                      type="button"
                      className="tr-cap"
                      data-tone={lane.check.tone}
                      onClick={() => go(capTarget)}
                      aria-label={`Check ${lane.name}: ${lane.check.label}${lane.required ? ", required" : ""}`}
                    >
                      <Icon size={13} aria-hidden="true" className={lane.check.tone === "running" ? "tr-spin" : undefined} />
                      <span>{lane.check.label}</span>
                      {lane.required && <small>required</small>}
                    </button>
                  ) : (
                    <span className="tr-cap" data-tone={lane.check.tone}>
                      <Icon size={13} aria-hidden="true" />
                      <span>{lane.check.label}</span>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ChangeCard({
  change,
  focusN,
  role,
  go,
  drain,
}: {
  change: Change;
  focusN?: number;
  role: ReturnType<typeof usePrototype>["role"];
  go: Go;
  drain: (id: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [openExplain, setOpenExplain] = useState<string>();
  const Icon = change.icon;
  const all = [
    ...change.steps.map((step) => step.explain),
    ...change.lanes.flatMap((lane) => [lane.explain, lane.retry]),
    change.footnote?.explain,
  ].filter(Boolean) as Explain[];
  const current = all.find((item) => item.id === openExplain);
  useEffect(() => {
    if (focusN) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focusN]);
  const toggle = (id: string) => setOpenExplain(openExplain === id ? undefined : id);
  return (
    <article
      ref={ref}
      className="tr-card"
      data-focus={focusN ? true : undefined}
      data-attention={change.attention || undefined}
      aria-labelledby={`tr-card-${change.id}`}
    >
      <header className="tr-card-head">
        <span className="tr-card-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div className="tr-card-title">
          <h2 className="tr-h2" id={`tr-card-${change.id}`}>
            <span className="tr-prefix">{change.prefix}</span> {change.title}
            {change.tag && (
              <span className="tr-tag" data-tone={change.tag === "draft" ? undefined : "warn"}>
                {change.tag}
              </span>
            )}
          </h2>
          <p className="tr-card-meta">
            {change.meta.map((item, index) => (
              <Fragment key={item}>
                {index > 0 && <span aria-hidden="true">·</span>}
                <span className={/^[0-9a-f]{7}$/.test(item) || item.includes("/") || item === "main" ? "tr-mono" : undefined}>
                  {item}
                </span>
              </Fragment>
            ))}
            <span aria-hidden="true">·</span>
            <span data-live={change.when === "running now" || undefined}>{change.when}</span>
          </p>
        </div>
        <StateChip state={change.status.state} label={change.status.label} size="sm" />
      </header>
      <TraceDiagram change={change} openExplain={openExplain} toggle={toggle} go={go} />
      {change.footnote && (
        <div className="tr-footnote">
          <button type="button" className="tr-linkish" onClick={() => go({ to: "run", runId: change.footnote!.runId })}>
            <Ban size={13} aria-hidden="true" />
            {change.footnote.text}
          </button>
          <ExplainChip
            quiet
            explain={change.footnote.explain}
            open={openExplain === change.footnote.explain.id}
            onToggle={() => toggle(change.footnote!.explain.id)}
          />
        </div>
      )}
      {current && (
        <ExplainCard key={current.id} explain={current} role={role} go={go} drain={drain} onClose={() => setOpenExplain(undefined)} />
      )}
    </article>
  );
}

function ChangesView({
  changes,
  filter,
  setFilter,
  focus,
  role,
  go,
  drain,
}: {
  changes: Change[];
  filter: Filter;
  setFilter: (filter: Filter) => void;
  focus?: Focus;
  role: ReturnType<typeof usePrototype>["role"];
  go: Go;
  drain: (id: string) => void;
}) {
  const counts: Record<Filter, number> = {
    all: changes.length,
    attention: changes.filter((c) => c.attention).length,
    running: changes.filter((c) => c.running).length,
  };
  const shown = changes.filter((c) => (filter === "all" ? true : filter === "attention" ? c.attention : c.running));
  const labels: Record<Filter, string> = { all: "All", attention: "Needs attention", running: "Running" };
  const groups: { id: Change["group"]; label: string }[] = [
    { id: "now", label: "Last 2 hours" },
    { id: "earlier", label: "Earlier today" },
  ];
  return (
    <div className="tr-view">
      <header className="tr-head">
        <span className="tr-eyebrow">acme · payments</span>
        <h1 className="tr-h1">Changes</h1>
        <p>Every push and pull request, traced from GitHub's webhook to the checks it reported. Select any step to open its record.</p>
        <div className="tr-head-row">
          <div className="tr-filter" role="group" aria-label="Filter changes">
            {(Object.keys(labels) as Filter[]).map((key) => (
              <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
                {key === "running" && counts.running > 0 && <span className="tr-livedot" aria-hidden="true" />}
                {labels[key]}
                <span className="tr-count">{counts[key]}</span>
              </button>
            ))}
          </div>
          <ul className="tr-legend" aria-label="Legend">
            <li data-tone="ok">Passed</li>
            <li data-tone="fail">Failed</li>
            <li data-tone="warn">Blocked</li>
            <li data-tone="skip">Skipped or stopped</li>
            <li data-tone="running">Running</li>
          </ul>
        </div>
      </header>
      {shown.length === 0 && (
        <EmptyState
          filtered
          title={filter === "running" ? "Nothing is running" : "Nothing needs attention"}
          description={
            filter === "running"
              ? "The api-image run on PR #482 finished. Use Replay live run in the study bar to watch it again."
              : "Every change today either passed or was skipped on purpose."
          }
          action={
            <Button size="sm" variant="outline" onClick={() => setFilter("all")}>
              Show all changes
            </Button>
          }
        />
      )}
      {groups.map((group) => {
        const items = shown.filter((c) => c.group === group.id);
        if (!items.length) return null;
        return (
          <section key={group.id} className="tr-group" aria-label={group.label}>
            <h2 className="tr-group-label">{group.label}</h2>
            <div className="tr-cards">
              {items.map((change) => (
                <ChangeCard
                  key={change.id}
                  change={change}
                  focusN={focus?.id === change.id ? focus.n : undefined}
                  role={role}
                  go={go}
                  drain={drain}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- drawer records

function CommandLine({ label, command }: { label: string; command: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="tr-cmd">
      <span className="tr-cmd-label">{label}</span>
      <code>{command}</code>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => {
          navigator.clipboard?.writeText(command).catch(() => undefined);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}

function AskSection({
  title,
  assistant,
  go,
  onCite,
  sectionRef,
}: {
  title: string;
  assistant: ReturnType<typeof useAssistant>;
  go: Go;
  onCite?: (runId: string, attempt: number, seq: number) => void;
  sectionRef?: RefObject<HTMLElement | null>;
}) {
  return (
    <section ref={sectionRef} className="tr-dsection tr-dask" aria-label={title}>
      <h3 className="tr-dlabel">
        <Sparkles size={13} aria-hidden="true" /> {title}
      </h3>
      <AssistantMessages
        messages={assistant.messages}
        onCite={onCite ?? ((runId, attempt, seq) => go({ to: "run", runId, attempt, seq }))}
        onAction={actionHandler(go, assistant.note)}
        empty={<p className="tr-muted">Answers cite the lines and records they read. Pick a question or select Ask on any log line.</p>}
      />
      <AssistantComposer onSend={(text) => assistant.ask(text)} suggestions={assistant.suggestions} placeholder="Ask about this…" />
    </section>
  );
}

function RunRecord({
  runId,
  initialAttempt,
  seq,
  go,
  role,
  live,
  phone,
}: {
  runId: string;
  initialAttempt?: number;
  seq?: number;
  go: Go;
  role: ReturnType<typeof usePrototype>["role"];
  live: LiveState;
  phone: boolean;
}) {
  const run = runById(runId) ?? failedRun;
  const isLive = run.id === liveRun.id;
  const [attempt, setAttempt] = useState(initialAttempt ?? run.attempt);
  const [focusSeq, setFocusSeq] = useState<number | undefined>(seq);
  const [archived, setArchived] = useState(false);
  const assistant = useAssistant({ kind: "run", runId: run.id, attempt }, role);
  const askRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const state: RunState = isLive ? live.state : run.state;
  const entries = isLive ? live.entries : logFor(run.id, attempt);
  const groups = isLive ? run.groups.map((g) => ({ ...g, state: live.groups[g.scope] ?? g.state })) : run.groups;
  const info = run.attempts.find((a) => a.n === attempt);
  const binding = run.bindingId ? bindingById(run.bindingId) : undefined;
  const commit7 = run.commit.slice(0, 7);
  const switchAttempt = (n: number) => {
    setAttempt(n);
    setFocusSeq(undefined);
  };
  /** Citations to this run stay in this drawer so the conversation is kept. */
  const cite = (citedRun: string, citedAttempt: number, citedSeq: number) => {
    if (citedRun !== run.id) return go({ to: "run", runId: citedRun, attempt: citedAttempt, seq: citedSeq });
    setAttempt(citedAttempt);
    setFocusSeq(undefined);
    window.requestAnimationFrame(() => setFocusSeq(citedSeq));
    logRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  useEffect(() => {
    if (seq) logRef.current?.scrollIntoView({ block: "start" });
  }, [seq]);
  return (
    <>
      <header className="tr-dhead">
        <span className="tr-eyebrow">
          Run {run.number} · {run.project} · {run.trigger.replace("_", " ")}
        </span>
        <DialogTitle className="tr-dtitle">
          {run.check === "manual" ? "Manual run" : run.check}
          <StateChip state={state} />
        </DialogTitle>
        <DialogDescription className="tr-dsub">
          {run.pr ? `PR #${run.pr} · ` : ""}
          {run.title}
        </DialogDescription>
        <p className="tr-dmeta">
          <span className="tr-mono">{run.ref}</span>
          <span aria-hidden="true">·</span>
          <span className="tr-mono">{commit7}</span>
          <CopyIdentifier value={run.commit} />
          <span aria-hidden="true">·</span>
          <span>{run.author}</span>
          <span aria-hidden="true">·</span>
          <span>{clock(run.createdAt)}</span>
        </p>
        <div className="tr-actions">
          {state === "running" ? (
            <ConfirmInline
              label="Cancel run"
              variant="destructive"
              prompt={`Cancel run ${run.number}? ${run.check} on 9c41e2a reports cancelled, and nothing it built so far is kept.`}
              done="Cancellation requested. The runner stops after the current task."
              confirmLabel="Cancel run"
            />
          ) : state !== "skipped" ? (
            <ConfirmInline
              label="Rerun"
              icon={<RotateCcw />}
              prompt={
                run.id === failedRun.id
                  ? `Rerun ${run.check} for ${commit7}? It creates attempt 3 of the same check; the commit and command don't change.`
                  : `Rerun ${run.check === "manual" ? "this manual run" : run.check} for ${commit7}? It creates a new attempt; the commit and command don't change.`
              }
              done={(run.id === failedRun.id ? actionResult("rerun-failed") : actionResult("rerun")) ?? "Queued."}
              confirmLabel="Rerun"
            />
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => askRef.current?.scrollIntoView({ block: "start", behavior: "smooth" })}>
            <Sparkles /> Ask about this run
          </Button>
        </div>
      </header>
      <div className="tr-dbody">
        <section className="tr-dsection" aria-label="Command">
          <CommandLine label="Command" command={run.command} />
          <CommandLine label="Same run, remote" command={`${run.command} --remote --ref ${commit7}`} />
        </section>
        {run.reason && (
          <p className="tr-reason" data-tone={runTone(run.state)}>
            <code>{run.reason.code}</code> {run.reason.message}
          </p>
        )}
        <dl className="tr-facts">
          <div>
            <dt>Trigger</dt>
            <dd>
              {run.deliveryId ? (
                <button type="button" className="tr-linkish" onClick={() => go({ to: "delivery", id: run.deliveryId! })}>
                  {run.trigger.replace("_", " ")} · {run.deliveryId}
                </button>
              ) : (
                "Started from the oyzu CLI"
              )}
            </dd>
          </div>
          <div>
            <dt>Rule</dt>
            <dd>
              {binding ? (
                <button type="button" className="tr-linkish" onClick={() => go({ to: "binding", id: binding.id })}>
                  {binding.name}
                </button>
              ) : (
                "None (manual)"
              )}
            </dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{isLive ? (state === "running" ? `${duration(live.elapsedMs)} so far` : duration(LIVE_END)) : duration(run.durationMs)}</dd>
          </div>
          <div>
            <dt>oyzu</dt>
            <dd>{run.oyzuVersion}</dd>
          </div>
        </dl>
        {run.attempts.length > 0 && (
          <section className="tr-dsection" aria-label="Attempts">
            <h3 className="tr-dlabel">Attempts</h3>
            <ol className="tr-attempts">
              {run.attempts.map((item) => {
                const itemState = isLive ? state : item.state;
                return (
                  <li key={item.n}>
                    <button type="button" aria-pressed={item.n === attempt} data-tone={runTone(itemState)} onClick={() => switchAttempt(item.n)}>
                      <Pip tone={runTone(itemState)} />
                      <span>
                        <strong>Attempt {item.n}</strong>
                        <small>
                          {item.state === "timed_out" ? "Executor lost" : stateLabel[itemState]} · {item.manager} ·{" "}
                          {isLive ? (state === "running" ? "running" : duration(LIVE_END)) : duration(item.durationMs)}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {info?.reason && (
              <div className="tr-attempt-note">
                <TriangleAlert size={14} aria-hidden="true" />
                <p>{info.reason}</p>
                {role === "pool-admin" ? (
                  <Button size="sm" variant="outline" onClick={() => go({ to: "pool", job: info.jobId })}>
                    <Stethoscope /> Runner diagnostics
                  </Button>
                ) : (
                  <small>The pool's admins can see why; nothing to do for this run.</small>
                )}
              </div>
            )}
          </section>
        )}
        <section className="tr-dsection" aria-label="Log">
          <div ref={logRef} className="tr-anchor" />
          {entries.length > 0 || isLive ? (
            <LogViewer
              key={`${run.id}-${attempt}`}
              run={run}
              entries={entries}
              groups={groups}
              attempt={attempt}
              onAttemptChange={switchAttempt}
              live={isLive && state === "running"}
              role={role}
              onDiagnostics={(jobId) => go({ to: "pool", job: jobId })}
              onAsk={(entry) => {
                assistant.ask(`Explain line ${entry.seq}`, entry);
                window.setTimeout(() => askRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }), 50);
              }}
              focusSeq={focusSeq}
              compact={phone}
              height={phone ? "58dvh" : "min(50vh, 520px)"}
            />
          ) : (
            <div className="tr-nolog">
              {groups.length > 0 && (
                <ul className="tr-tasks">
                  {groups.map((group) => (
                    <li key={group.scope}>
                      <GroupIcon state={group.state} size={13} />
                      <span className="tr-mono">{group.target === "runner" ? `runner · ${group.task}` : group.scope}</span>
                      <small>{duration(group.durationMs)}</small>
                    </li>
                  ))}
                </ul>
              )}
              <p className="tr-muted">
                {run.state === "skipped"
                  ? "Nothing ran, so this run has no log."
                  : run.state === "cancelled"
                    ? "Cancelled after 1m 36s. The log up to cancellation is archived."
                    : "This run's log is archived. Download it to read every line."}
              </p>
              {run.state !== "skipped" && (
                <div className="tr-actions">
                  <Button size="sm" variant="outline" onClick={() => setArchived(true)}>
                    <Download /> Download raw log
                  </Button>
                  {archived && (
                    <p className="tr-done" role="status">
                      <CircleCheck size={13} aria-hidden="true" /> In the portal this downloads the archived log as text or JSON Lines.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
        {run.outputs.length > 0 && (
          <section className="tr-dsection" aria-label="Outputs">
            <h3 className="tr-dlabel">Outputs</h3>
            <ul className="tr-outputs">
              {run.outputs.map((output) => (
                <li key={output.path}>
                  <span className="tr-mono">{output.path}</span>
                  <small>
                    {output.kind} · {Math.round(output.size / 1024)} KiB
                  </small>
                  <code>{output.digest}</code>
                </li>
              ))}
            </ul>
          </section>
        )}
        <AskSection title={`Ask about run ${run.number}`} assistant={assistant} go={go} onCite={cite} sectionRef={askRef} />
      </div>
    </>
  );
}

const replayDone: Record<string, string> = {
  "dlv-7f3a": "Replayed as dlv-7f3a-r1, linked to this delivery. The same 2 rules matched and new runs started for 9c41e2a.",
  "dlv-7f12": "Replayed as dlv-7f12-r1, linked to this delivery. Still no match: #483 is still a draft.",
  "dlv-7e91": "Replayed as dlv-7e91-r1, linked to this delivery. Main never cancels, so a new run started alongside 9009.",
  "dlv-7e40": "Replayed as dlv-7e40-r1. It still stops at Parsed until acme/ledger-tools is registered.",
};
const explainDone: Record<string, string> = {
  "dlv-7f3a": "Dry run against today's rules: same result, 2 of 5 match. Nothing was started.",
  "dlv-7f12": actionResult("explain") ?? "",
  "dlv-7e91": "Dry run against today's rules: same result, 1 of 5 matches. Nothing was started.",
  "dlv-7e40": "Dry run: it still stops at Parsed because acme/ledger-tools isn't registered.",
};

function DeliveryRecord({
  id,
  focus,
  go,
  role,
}: {
  id: string;
  focus?: StageFocus;
  go: Go;
  role: ReturnType<typeof usePrototype>["role"];
}) {
  const delivery = deliveryById(id)!;
  const assistant = useAssistant({ kind: "delivery", deliveryId: delivery.id }, role);
  const stagesRef = useRef<HTMLElement>(null);
  const verdictRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = focus === "matched" ? verdictRef.current : focus === "verified" ? stagesRef.current : undefined;
    node?.scrollIntoView({ block: "start" });
  }, [focus]);
  const focusedStage = focus === "received" ? "received" : focus === "verified" ? "verified" : focus === "matched" ? "matched" : undefined;
  const rejected = delivery.outcome === "rejected";
  return (
    <>
      <header className="tr-dhead">
        <span className="tr-eyebrow">
          Delivery · {delivery.connector} · {clock(delivery.receivedAt)}
        </span>
        <DialogTitle className="tr-dtitle">
          {rejected ? "12 rejected deliveries" : delivery.event}
          <StateChip
            state={delivery.outcome === "started" ? "succeeded" : rejected ? "failed" : delivery.outcome === "unregistered" ? "warning" : "skipped"}
            label={delivery.outcomeLabel}
          />
        </DialogTitle>
        <DialogDescription className="tr-dsub">
          {delivery.repository}
          {delivery.pr ? ` · PR #${delivery.pr.number} ${delivery.pr.title}${delivery.pr.draft ? " (draft)" : ""}` : ` · ${delivery.ref}`}
        </DialogDescription>
        <p className="tr-dmeta">
          <span className="tr-mono">{delivery.id}</span>
          <span aria-hidden="true">·</span>
          <span>correlation</span> <span className="tr-mono">{delivery.correlationId}</span>
          <CopyIdentifier value={delivery.correlationId} />
          {!rejected && (
            <>
              <span aria-hidden="true">·</span>
              <span>{delivery.actor}</span>
            </>
          )}
        </p>
        <div className="tr-actions">
          {rejected ? (
            role === "pool-admin" ? (
              <ConfirmInline
                label="Rotate webhook secret"
                icon={<RotateCcw />}
                prompt="Generate a new webhook secret for github-acme-legacy? The current one keeps working for 24 hours, so nothing else drops while you update GitHub."
                done={actionResult("rotate-secret") ?? "Rotated."}
                confirmLabel="Rotate secret"
              />
            ) : (
              <p className="tr-muted">Connector admins can rotate this webhook secret.</p>
            )
          ) : (
            <>
              {delivery.outcome === "unregistered" && (
                <ConfirmInline
                  label="Register repository"
                  icon={<FolderGit2 />}
                  prompt="Register acme/ledger-tools to project payments? Future deliveries are evaluated against payments' rules."
                  done="acme/ledger-tools is registered to payments. Replay this delivery to build #12 now."
                  confirmLabel="Register"
                />
              )}
              <ConfirmInline
                label="Replay"
                icon={<RotateCcw />}
                prompt={`Replay ${delivery.id}? It's processed again as a new delivery linked to this one, and can start runs and update checks.`}
                done={replayDone[delivery.id] ?? actionResult("replay") ?? "Replayed."}
                confirmLabel="Replay"
              />
              <ConfirmInline
                label="Explain against today's rules"
                icon={<Sparkles />}
                prompt="Dry-run this delivery against today's rules? Nothing starts and no checks change; you get the verdicts."
                done={explainDone[delivery.id] ?? "Same result as the original delivery."}
                confirmLabel="Run dry run"
              />
            </>
          )}
        </div>
      </header>
      <div className="tr-dbody">
        <section ref={stagesRef} className="tr-dsection" aria-label="Stages">
          <h3 className="tr-dlabel">Stages</h3>
          <ol className="tr-stages">
            {delivery.stages.map((stage) => (
              <li
                key={stage.key}
                data-tone={stageTone(stage.status)}
                data-focus={focusedStage === stage.key || (focus === "verified" && stage.key === "verified") || undefined}
              >
                <Pip tone={stageTone(stage.status)} />
                <strong>{stage.label}</strong>
                <span>{stage.detail}</span>
              </li>
            ))}
          </ol>
        </section>
        <section ref={verdictRef} className="tr-dsection" data-focus={focus === "matched" || undefined} aria-label="Rule verdicts">
          <h3 className="tr-dlabel">Every rule's verdict</h3>
          {delivery.evaluations.length === 0 ? (
            <p className="tr-muted">
              No rules were evaluated. {delivery.stages.find((stage) => stage.status === "fail")?.detail}.
            </p>
          ) : (
            <ul className="tr-verdicts">
              {delivery.evaluations.map((evaluation) => {
                const binding = bindingById(evaluation.bindingId);
                return (
                  <li key={evaluation.bindingId} data-matched={evaluation.matched}>
                    {evaluation.matched ? <CircleCheck size={15} aria-label="Matched" /> : <CircleX size={15} aria-label="Not matched" />}
                    <span>
                      <button type="button" className="tr-linkish" onClick={() => go({ to: "binding", id: evaluation.bindingId })}>
                        {binding?.name ?? evaluation.bindingId}
                      </button>
                      <small>{evaluation.reason}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {rejected && (
          <section className="tr-dsection" aria-label="Sampled deliveries">
            <h3 className="tr-dlabel">Sampled deliveries · headers only</h3>
            <div className="tr-table-wrap">
              <table className="tr-table">
                <thead>
                  <tr>
                    <th>Received</th>
                    <th>X-GitHub-Event</th>
                    <th>X-GitHub-Delivery</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["3:36 PM ET", "push", "e81f…40a2"],
                    ["3:12 PM ET", "push", "77c0…9b1e"],
                    ["2:02 PM ET", "push", "0d4a…c3f7"],
                  ].map(([time, event, guid]) => (
                    <tr key={guid}>
                      <td>{time}</td>
                      <td className="tr-mono">{event}</td>
                      <td className="tr-mono">{guid}</td>
                      <td>Signature mismatch</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="tr-muted">Bodies of rejected deliveries are never read or stored. Last good delivery: yesterday 6:14 PM ET.</p>
          </section>
        )}
        {delivery.changedPaths.length > 0 && (
          <section className="tr-dsection" aria-label="Changed paths">
            <h3 className="tr-dlabel">Changed paths</h3>
            <ul className="tr-paths">
              {delivery.changedPaths.map((path) => (
                <li key={path} className="tr-mono">
                  {path}
                </li>
              ))}
            </ul>
          </section>
        )}
        {delivery.runIds.length > 0 && (
          <section className="tr-dsection" aria-label="Runs started">
            <h3 className="tr-dlabel">Runs started</h3>
            <ul className="tr-runlinks">
              {delivery.runIds.map((runId) => {
                const run = runById(runId)!;
                return (
                  <li key={runId}>
                    <button type="button" onClick={() => go({ to: "run", runId })}>
                      <StateChip state={run.state} size="sm" />
                      <span className="tr-mono">{run.check}</span>
                      <small>Run {run.number}</small>
                      <ArrowRight size={13} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <AskSection title="Ask about this delivery" assistant={assistant} go={go} />
      </div>
    </>
  );
}

function ChecksRecord({ commit, go, live }: { commit: string; go: Go; live: LiveState }) {
  const list: CheckRecord[] =
    commit === "9c41e2a"
      ? checks.map((check): CheckRecord =>
          check.runId === liveRun.id
            ? {
                ...check,
                conclusion: live.state === "running" ? "in_progress" : "success",
                summary: live.state === "running" ? liveSummary(live) : "Image built and pushed by digest",
              }
            : check,
        )
      : [{ name: "oyzu / build", commit, conclusion: "success", summary: "Built everything in 6m 53s", runId: runs[3].id, required: true }];
  return (
    <>
      <header className="tr-dhead">
        <span className="tr-eyebrow">Checks · acme/payments-api</span>
        <DialogTitle className="tr-dtitle">
          Checks on <span className="tr-mono">{commit}</span>
        </DialogTitle>
        <DialogDescription className="tr-dsub">
          Each rule action reports as its own GitHub check. Required checks for targets this change didn't touch report
          skipped: not affected.
        </DialogDescription>
      </header>
      <div className="tr-dbody">
        <ul className="tr-checks">
          {list.map((check) => (
            <li key={check.name} data-dim={check.conclusion === "skipped" || undefined}>
              <StateChip state={check.conclusion} size="sm" />
              <span className="tr-check-name">
                <strong className="tr-mono">{check.name}</strong>
                <small>{check.summary}</small>
              </span>
              {check.required && <span className="tr-tag">required</span>}
              {check.runId ? (
                <Button size="sm" variant="outline" onClick={() => go({ to: "run", runId: check.runId! })}>
                  Open run <ArrowRight />
                </Button>
              ) : (
                <span className="tr-muted tr-norun">No run</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Drawer({
  target,
  nonce,
  onClose,
  go,
  role,
  live,
  phone,
}: {
  target: DrawerTarget | null;
  nonce: number;
  onClose: () => void;
  go: Go;
  role: ReturnType<typeof usePrototype>["role"];
  live: LiveState;
  phone: boolean;
}) {
  const last = useRef<DrawerTarget | null>(target);
  if (target) last.current = target;
  const shown = target ?? last.current;
  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="tr-drawer">
        {shown?.to === "run" && (
          <RunRecord
            key={`${shown.runId}-${nonce}`}
            runId={shown.runId}
            initialAttempt={shown.attempt}
            seq={shown.seq}
            go={go}
            role={role}
            live={live}
            phone={phone}
          />
        )}
        {shown?.to === "delivery" && <DeliveryRecord key={`${shown.id}-${nonce}`} id={shown.id} focus={shown.focus} go={go} role={role} />}
        {shown?.to === "checks" && <ChecksRecord commit={shown.commit} go={go} live={live} />}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- shell

const tabs: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "changes", label: "Changes", icon: Waypoints },
  { id: "rules", label: "Rules", icon: Workflow },
  { id: "capacity", label: "Capacity", icon: Server },
  { id: "ask", label: "Ask", icon: Sparkles },
];

export function Trace() {
  const { role } = usePrototype();
  const live = useLiveRun();
  const phone = useMediaQuery("(max-width: 760px)");
  const [tab, setTab] = useState<Tab>("changes");
  const [filter, setFilter] = useState<Filter>("all");
  const [drawer, setDrawer] = useState<DrawerTarget | null>(null);
  const [nonce, setNonce] = useState(0);
  const [palette, setPalette] = useState(false);
  const [changeFocus, setChangeFocus] = useState<Focus>();
  const [ruleFocus, setRuleFocus] = useState<Focus>();
  const [poolFocus, setPoolFocus] = useState<PoolFocus>({});
  const [drained, setDrained] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const home = useAssistant(HOME, role);
  const changes = buildChanges(live);

  const drain = useCallback((id: string) => setDrained((current) => (current.includes(id) ? current : [...current, id])), []);

  const switchTab = useCallback((next: Tab) => {
    scrollRef.current?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
    setTab(next);
  }, []);
  /** A plain tab press: no jump target, so earlier focus requests are dropped. */
  const pickTab = (next: Tab) => {
    setChangeFocus(undefined);
    setRuleFocus(undefined);
    setPoolFocus({});
    switchTab(next);
  };

  const go: Go = useCallback(
    (target: GoTarget) => {
      const n = Date.now();
      setPalette(false);
      if (target.to === "run" || target.to === "delivery" || target.to === "checks") {
        setDrawer(target);
        setNonce(n);
        return;
      }
      setDrawer(null);
      if (target.to === "change") {
        setFilter("all");
        setChangeFocus({ id: target.id, n });
        switchTab("changes");
      } else if (target.to === "binding") {
        setRuleFocus({ id: target.id, n });
        switchTab("rules");
      } else if (target.to === "pool") {
        setPoolFocus({ id: target.id, job: target.job, manager: target.manager, n });
        switchTab("capacity");
      } else {
        switchTab("ask");
      }
    },
    [switchTab],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPalette((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const attention = changes.filter((c) => c.attention).length;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="tr-app" data-tab={tab}>
        <header className="tr-top">
          <nav className="tr-tabs" aria-label="Remote builds sections">
            {tabs.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => pickTab(item.id)}>
                  <Icon size={14} aria-hidden="true" />
                  {item.label}
                  {item.id === "changes" && attention > 0 && <span className="tr-badge">{attention}</span>}
                </button>
              );
            })}
          </nav>
          <button type="button" className="tr-kbar" onClick={() => setPalette(true)}>
            <Search size={14} aria-hidden="true" />
            <span>Ask or jump to…</span>
            <kbd>{shortcutLabel}</kbd>
          </button>
        </header>
        <div className="tr-scroll" ref={scrollRef}>
          <div className="tr-page">
            {tab === "changes" && (
              <ChangesView
                changes={changes}
                filter={filter}
                setFilter={setFilter}
                focus={changeFocus}
                role={role}
                go={go}
                drain={drain}
              />
            )}
            {tab === "rules" && <RulesView focus={ruleFocus} role={role} go={go} />}
            {tab === "capacity" && (
              <CapacityView
                role={role}
                focus={poolFocus}
                setFocus={(focus) => setPoolFocus({ ...focus, n: Date.now() })}
                go={go}
                drained={drained}
                drain={drain}
              />
            )}
            {tab === "ask" && <AskView assistant={home} go={go} drain={drain} />}
          </div>
        </div>
        {tab !== "ask" && (
          <button type="button" className="tr-fab" onClick={() => setPalette(true)}>
            <Sparkles size={16} aria-hidden="true" />
            Ask or jump
          </button>
        )}
        <nav className="tr-bottom" aria-label="Remote builds sections, phone">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => pickTab(item.id)}>
                <span className="tr-bottom-icon">
                  <Icon size={19} aria-hidden="true" />
                  {item.id === "changes" && attention > 0 && <span className="tr-badge">{attention}</span>}
                </span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <Drawer target={drawer} nonce={nonce} onClose={() => setDrawer(null)} go={go} role={role} live={live} phone={phone} />
        <CommandPalette open={palette} onOpenChange={setPalette} assistant={home} go={go} role={role} drain={drain} />
      </div>
    </TooltipProvider>
  );
}
