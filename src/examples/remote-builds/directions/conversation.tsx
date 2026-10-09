import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode, type RefObject } from "react";
import {
  ArrowLeft,
  ArrowUp,
  AtSign,
  ChevronDown,
  CircleCheck,
  CircleMinus,
  CircleX,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  GitPullRequestDraft,
  HeartPulse,
  Inbox,
  KeyRound,
  LoaderCircle,
  Play,
  RotateCcw,
  Server,
  ShieldAlert,
  Sparkles,
  SquareSlash,
  Stethoscope,
  SquareTerminal,
  TriangleAlert,
  UserPlus,
  Webhook,
  Workflow,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Progress } from "../../../components/ui/progress";
import { TooltipProvider } from "../../../components/ui/tooltip";
import { SearchField } from "../../../components/patterns/search-field";
import { EmptyState } from "../../../components/patterns/empty-state";
import { BlockView, useAssistant, type ChatMessage } from "../assistant";
import { respond, type ActionId, type AssistantContext, type Reply } from "../assistant-engine";
import { GroupIcon, LogText } from "../log-viewer";
import { useLiveRun } from "../live";
import {
  ago,
  bindings,
  checks,
  clock,
  deliveries,
  deliveryById,
  duration,
  failedLog,
  liveInitialLog,
  liveRun,
  liveScript,
  poolLogs,
  poolById,
  pools,
  runById,
  runs,
  stripAnsiText,
  type Delivery,
  type LogEntry,
  type Role,
  type Run,
  type RunState,
} from "../model";
import { StateChip, actionResult, usePrototype } from "../shared";
import {
  Canvas,
  CommandLine,
  InlineConfirm,
  StageList,
  VerdictTable,
  hasLog,
  liveGroups,
  tabKey,
  type Tab,
} from "./conversation-canvas";
import "./conversation.css";

// Conversation direction: everything that needs attention is a thread. Inside a
// thread the platform's own records (delivery, binding verdicts, attempts,
// failures, checks) and the assistant share one feed; detail opens in a side
// canvas. A Browse switch keeps every record reachable without chatting.

type Live = ReturnType<typeof useLiveRun>;
type ChipState = ComponentProps<typeof StateChip>["state"];
type IconKey = "failed" | "draft" | "shield" | "pool" | "running" | "ok" | "skipped" | "cancelled" | "unregistered";

type ThreadDef = {
  id: string;
  group: "attention" | "running" | "recent";
  icon: IconKey;
  title: string;
  preview: string;
  at: string;
  chip: { state: ChipState; label?: string };
  meta: { pr?: number; commit?: string; ref?: string; extra?: string };
  context: AssistantContext;
  summary?: string;
  explain: string;
  suggestions?: string[];
  runId?: string;
  deliveryId?: string;
  poolId?: string;
  adminOnly?: boolean;
  people: string[];
};

const [run9012, run9013, run9014, run9009, run9004, run9001, run8998] = runs;
const firstError = failedLog.find((entry) => entry.level === "error")!;

const threads: ThreadDef[] = [
  {
    id: "t-9012",
    group: "attention",
    icon: "failed",
    title: "Build 9012 failed on #482",
    preview: "payments-core/test failed: 1 of 64 tests",
    at: "2026-10-09T15:39:24Z",
    chip: { state: "failed" },
    meta: { pr: 482, commit: "9c41e2a", ref: "feat/refund-retries" },
    context: { kind: "run", runId: run9012.id, attempt: 2 },
    summary: "Why did this fail?",
    explain: "Why did this fail?",
    runId: run9012.id,
    deliveryId: "dlv-7f3a",
    people: ["dana.okafor"],
  },
  {
    id: "t-483",
    group: "attention",
    icon: "draft",
    title: "PR #483 started nothing",
    preview: "0 of 5 bindings matched: the pull request is a draft",
    at: "2026-10-09T15:18:02Z",
    chip: { state: "skipped", label: "No match" },
    meta: { pr: 483, commit: "c3a9e10", ref: "spike/fx-rounding" },
    context: { kind: "delivery", deliveryId: "dlv-7f12" },
    summary: "Why did PR #483 not build?",
    explain: "Why did this start nothing?",
    deliveryId: "dlv-7f12",
    people: ["jo.pereira"],
  },
  {
    id: "t-rej",
    group: "attention",
    icon: "shield",
    title: "12 webhooks rejected on github-acme-legacy",
    preview: "Signature check failed on every delivery since early afternoon",
    at: "2026-10-09T15:36:10Z",
    chip: { state: "failure", label: "Rejected" },
    meta: { extra: "github-acme-legacy · acme/web-console" },
    context: { kind: "delivery", deliveryId: "dlv-rej" },
    summary: "Why are webhooks being rejected?",
    explain: "Why are webhooks being rejected?",
    suggestions: ["Why are webhooks being rejected?", "Which bindings matched?"],
    deliveryId: "dlv-rej",
    people: [],
  },
  {
    id: "t-pool",
    group: "attention",
    icon: "pool",
    title: "mgr-onprem-02 is missing heartbeats",
    preview: "HTTP 407 from the corporate proxy; 1 job lost and retried",
    at: "2026-10-09T15:41:55Z",
    chip: { state: "warning" },
    meta: { extra: "Acme on-prem · Customer network" },
    context: { kind: "pool", poolId: "acme-onprem" },
    summary: "Why is mgr-onprem-02 unhealthy?",
    explain: "Why is mgr-onprem-02 unhealthy?",
    poolId: "acme-onprem",
    adminOnly: true,
    people: [],
  },
  {
    id: "t-9014",
    group: "running",
    icon: "running",
    title: "api-image 9014",
    preview: "Compiling api-image",
    at: "2026-10-09T15:39:40Z",
    chip: { state: "running" },
    meta: { pr: 482, commit: "9c41e2a", ref: "feat/refund-retries" },
    context: { kind: "run", runId: run9014.id },
    explain: "What is it building?",
    runId: run9014.id,
    deliveryId: "dlv-7f3a",
    people: ["dana.okafor"],
  },
  {
    id: "t-9013",
    group: "recent",
    icon: "ok",
    title: "Policy check 9013 passed on #482",
    preview: "12 policies passed in 39s",
    at: "2026-10-09T15:31:41Z",
    chip: { state: "succeeded" },
    meta: { pr: 482, commit: "9c41e2a", ref: "feat/refund-retries" },
    context: { kind: "run", runId: run9013.id },
    explain: "Summarize this run",
    suggestions: ["Summarize this run", "Why did build 9012 fail?"],
    runId: run9013.id,
    deliveryId: "dlv-7f3a",
    people: ["dana.okafor"],
  },
  {
    id: "t-9009",
    group: "recent",
    icon: "ok",
    title: "main build 9009 succeeded",
    preview: "Merge of #477 built in 6m 53s",
    at: "2026-10-09T15:04:54Z",
    chip: { state: "succeeded" },
    meta: { commit: "3f2a9c1", ref: "main" },
    context: { kind: "run", runId: run9009.id },
    explain: "Summarize this run",
    suggestions: ["Summarize this run", "Is anything wrong with our pools?"],
    runId: run9009.id,
    deliveryId: "dlv-7e91",
    people: ["lee.marsh"],
  },
  {
    id: "t-9004",
    group: "recent",
    icon: "skipped",
    title: "Run 9004 skipped on #480",
    preview: "TASK_NOT_DEFINED: policy-check isn't defined at b81e04c",
    at: "2026-10-09T13:12:44Z",
    chip: { state: "skipped" },
    meta: { pr: 480, commit: "b81e04c", ref: "fix/ledger-timeouts" },
    context: { kind: "run", runId: run9004.id },
    explain: "Why was this skipped?",
    suggestions: ["Why was this skipped?"],
    runId: run9004.id,
    people: ["sam.ito"],
  },
  {
    id: "t-9001",
    group: "recent",
    icon: "cancelled",
    title: "Run 9001 superseded on #482",
    preview: "A newer push replaced it; run 9012 took over",
    at: "2026-10-09T15:24:06Z",
    chip: { state: "cancelled" },
    meta: { pr: 482, commit: "e5c9a1b", ref: "feat/refund-retries" },
    context: { kind: "run", runId: run9001.id },
    explain: "Why was this cancelled?",
    suggestions: ["Why was this cancelled?", "Why did build 9012 fail?"],
    runId: run9001.id,
    people: ["dana.okafor"],
  },
  {
    id: "t-8998",
    group: "recent",
    icon: "ok",
    title: "Manual run 8998: oyzu build cli",
    preview: "You ran it with --remote on Micah's desktop",
    at: "2026-10-09T12:06:18Z",
    chip: { state: "succeeded" },
    meta: { commit: "a2d4f6b", ref: "main" },
    context: { kind: "run", runId: run8998.id },
    explain: "Can this be released?",
    suggestions: ["Can this be released?"],
    runId: run8998.id,
    people: ["you"],
  },
  {
    id: "t-7e40",
    group: "recent",
    icon: "unregistered",
    title: "acme/ledger-tools isn't registered",
    preview: "Webhook verified, then stopped: no project owns this repository",
    at: "2026-10-09T14:41:37Z",
    chip: { state: "skipped", label: "Not registered" },
    meta: { pr: 12, commit: "f00d1e2", ref: "feat/export", extra: "acme/ledger-tools" },
    context: { kind: "delivery", deliveryId: "dlv-7e40" },
    explain: "Why did nothing run?",
    suggestions: ["Why did nothing run?"],
    deliveryId: "dlv-7e40",
    people: ["sam.ito"],
  },
];
const threadById = (id: string) => threads.find((thread) => thread.id === id);

// Answers for threads the scripted engine doesn't cover, written from the same records.
const localReplies: Record<string, Record<string, Reply>> = {
  "t-9013": {
    "Summarize this run": {
      blocks: [
        {
          type: "text",
          text: "**Policy check passed.** `oyzu run policy-check` evaluated 12 policies against 9c41e2a on Hosted Linux in 39s. All passed, including `policy/refunds.rego`, which this pull request changed. That file is why the Policy and image binding matched.",
        },
        { type: "facts", rows: [["Check", "oyzu / policy: success"], ["Pool", "Hosted Linux"], ["Outputs", "dist/policy/report.json"]] },
        { type: "actions", actions: [{ id: "open-run", label: "Open its log", primary: true, target: run9013.id }] },
      ],
      sources: ["Run 9013 log (17 lines)", "Binding verdicts for delivery dlv-7f3a"],
    },
  },
  "t-9009": {
    "Summarize this run": {
      blocks: [
        {
          type: "text",
          text: "**main is green.** The merge of #477 built every target with `oyzu build --full` in 6m 53s on Hosted Linux. Runs on main are never cancelled by newer pushes, so each merge keeps its own complete result.",
        },
        { type: "facts", rows: [["Commit", "3f2a9c1 by lee.marsh"], ["Binding", "Full build on main"], ["Output", "dist/manifest.json · sha256:c41d…0b9a"]] },
        { type: "actions", actions: [{ id: "open-run", label: "Run details", primary: true, target: run9009.id }] },
      ],
      sources: ["Run 9009 record", "Delivery dlv-7e91"],
    },
  },
  "t-9004": {
    "Why was this skipped?": {
      blocks: [
        {
          type: "text",
          text: "**Nothing ran because the task doesn't exist at that commit.** The Policy and image binding asks for `oyzu run policy-check`, but at b81e04c the project doesn't define `policy-check`; it reached main after fix/ledger-timeouts branched. Oyzu decided this before claiming an executor, so no pool time was used and the check reports skipped.",
        },
        { type: "command", command: "git rebase origin/main", note: "Brings in the task definition; the next push runs the check" },
      ],
      sources: ["Run 9004 decision record", "oyzu project definition at b81e04c"],
    },
  },
  "t-9001": {
    "Why was this cancelled?": {
      blocks: [
        {
          type: "text",
          text: "**A newer push replaced it.** dana.okafor pushed 9c41e2a to #482 while this run was 1m 36s in. The Affected build on pull requests binding cancels unfinished runs on the same pull request, so run 9012 took over the `oyzu / build` check.",
        },
        { type: "actions", actions: [{ id: "open-run", label: "Open run 9012's log", primary: true, target: run9012.id }] },
      ],
      sources: ["Run 9001 record", "Delivery dlv-7f3a (started runs and cancellations)"],
    },
  },
  "t-8998": {
    "Can this be released?": {
      blocks: [
        {
          type: "text",
          text: "**No.** It ran on Micah's desktop, a developer machine, and developer machines are never release-eligible. The build succeeded and its outputs are fine for testing. For a releasable build, run the same command on an eligible pool:",
        },
        { type: "command", command: "oyzu build cli --full --remote --pool hosted-linux" },
      ],
      sources: ["Run 8998 attempt 1", "Pool settings for Micah's desktop"],
    },
  },
  "t-7e40": {
    "Why did nothing run?": {
      blocks: [
        {
          type: "text",
          text: "**acme/ledger-tools isn't registered to any project,** so Oyzu verified the webhook, recorded it, and stopped before evaluating bindings. Nothing failed. Once the repository is registered, its next push is evaluated like any other.",
        },
        {
          type: "actions",
          actions: [
            { id: "register-repo", label: "Register acme/ledger-tools", primary: true },
            { id: "open-delivery", label: "Open delivery record", target: "dlv-7e40" },
          ],
        },
      ],
      sources: ["Delivery dlv-7e40"],
    },
  },
};

const people: Record<string, { name: string; initials: string; hue: number }> = {
  you: { name: "You", initials: "M", hue: 0 },
  "dana.okafor": { name: "dana.okafor", initials: "DO", hue: 1 },
  "lee.marsh": { name: "lee.marsh", initials: "LM", hue: 2 },
  "sam.ito": { name: "sam.ito", initials: "SI", hue: 3 },
  "jo.pereira": { name: "jo.pereira", initials: "JP", hue: 4 },
};
const teammates = ["dana.okafor", "lee.marsh", "sam.ito", "jo.pereira"];

type Mention = { token: string; label: string; group: string; hint: string; tab: Tab };
const mentionables: Mention[] = [
  ...runs.map((run) => ({
    token: `run-${run.number}`,
    label: `run ${run.number}`,
    group: "Runs",
    hint: `${run.check} · ${run.ref}`,
    tab: { kind: "run", runId: run.id } as Tab,
  })),
  { token: "pr-482", label: "PR #482", group: "Pull requests", hint: "Retry refunds with the original idempotency key", tab: { kind: "delivery", deliveryId: "dlv-7f3a" } },
  { token: "pr-483", label: "PR #483", group: "Pull requests", hint: "Spike: FX rounding modes (draft)", tab: { kind: "delivery", deliveryId: "dlv-7f12" } },
  { token: "pr-480", label: "PR #480", group: "Pull requests", hint: "Shorten ledger client timeouts", tab: { kind: "run", runId: run9004.id } },
  ...bindings.map((binding) => ({
    token: `binding-${binding.id}`,
    label: binding.name,
    group: "Bindings",
    hint: binding.scope,
    tab: { kind: "binding", bindingId: binding.id } as Tab,
  })),
  ...pools.map((pool) => ({
    token: `pool-${pool.id}`,
    label: pool.name,
    group: "Pools",
    hint: pool.kind,
    tab: { kind: "pool", poolId: pool.id } as Tab,
  })),
];
const mentionByToken = (token: string) => mentionables.find((mention) => mention.token === token);
const mentionPattern = /(@[a-z]+-[\w#.-]*[\w])/g;

const commands = [
  { name: "rerun", hint: "Rerun this run, or replay this delivery. Asks first." },
  { name: "logs", hint: "Open the log or record in the canvas" },
  { name: "explain", hint: "Ask the assistant what happened here" },
  { name: "diagnostics", hint: "Runner diagnostics for this job (pool admins)", admin: true },
  { name: "reproduce", hint: "The exact command to run it yourself" },
  { name: "assign", hint: "Assign this thread to a teammate" },
];

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

function livePercent(live: Live) {
  if (live.state !== "running") return 100;
  return Math.min(99, Math.round(((live.entries.length - liveInitialLog.length) / liveScript.length) * 100));
}

function liveMilestones(live: Live) {
  const list: { key: string; title: string; tone: "ok" | "info" }[] = [];
  if (live.groups["api-image/compile"] === "succeeded") list.push({ key: "compile", title: "api-image/compile succeeded", tone: "ok" });
  if (live.groups["api-image/image"] && live.groups["api-image/image"] !== "queued")
    list.push({ key: "image", title: "api-image/image started: building the container image", tone: "info" });
  if (live.state === "succeeded") list.push({ key: "done", title: `Run 9014 succeeded in ${duration(live.elapsedMs)}`, tone: "ok" });
  return list;
}

// ---------------------------------------------------------------- small visual pieces

function StateIcon({ icon, size = 15 }: { icon: IconKey; size?: number }) {
  switch (icon) {
    case "failed":
      return <CircleX size={size} className="cv-bad" aria-label="Failed" />;
    case "draft":
      return <GitPullRequestDraft size={size} className="cv-warn" aria-label="Nothing matched" />;
    case "shield":
      return <ShieldAlert size={size} className="cv-bad" aria-label="Rejected" />;
    case "pool":
      return <HeartPulse size={size} className="cv-warn" aria-label="Warning" />;
    case "running":
      return <LoaderCircle size={size} className="cv-run animate-spin" aria-label="Running" />;
    case "ok":
      return <CircleCheck size={size} className="cv-ok" aria-label="Succeeded" />;
    case "unregistered":
      return <Webhook size={size} className="cv-warn" aria-label="Not registered" />;
    default:
      return <CircleMinus size={size} className="cv-mute" aria-label={icon === "skipped" ? "Skipped" : "Cancelled"} />;
  }
}

function Avatar({ who }: { who: string }) {
  if (who === "assistant")
    return (
      <span className="cv-avatar is-assistant" aria-hidden="true">
        <Sparkles size={13} />
      </span>
    );
  const person = people[who] ?? { initials: who.slice(0, 2).toUpperCase(), hue: 0 };
  return (
    <span className="cv-avatar" data-hue={person.hue} aria-hidden="true">
      {person.initials}
    </span>
  );
}

function Said({ who, at, children }: { who: string; at: string; children: ReactNode }) {
  return (
    <div className="cv-item cv-msg">
      <Avatar who={who} />
      <div className="cv-msg-main">
        <p className="cv-by">
          <strong>{people[who]?.name ?? who}</strong>
          {who !== "you" && <span className="cv-role">teammate</span>}
          <time>{at}</time>
        </p>
        <div className="cv-said">{children}</div>
      </div>
    </div>
  );
}

function SysEvent({
  icon,
  tone = "info",
  title,
  at,
  children,
  compact,
}: {
  icon: ReactNode;
  tone?: "ok" | "bad" | "warn" | "info" | "muted";
  title: ReactNode;
  at?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={"cv-item cv-ev" + (compact ? " is-compact" : "")} data-tone={tone}>
      <span className="cv-node" aria-hidden="true">
        {icon}
      </span>
      <div className="cv-ev-main">
        <p className="cv-ev-title">
          <strong>{title}</strong>
          <span className="cv-by-sys">
            Oyzu{at ? <time> · {at}</time> : null}
          </span>
        </p>
        {children && <div className="cv-card">{children}</div>}
      </div>
    </div>
  );
}

function Sources({ sources }: { sources: string[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;
  return (
    <div className="cv-sources">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Read {sources.length} {sources.length === 1 ? "record" : "records"} <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <ul>
          {sources.map((source) => (
            <li key={source}>{source}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Thinking({ reply }: { reply: Reply }) {
  return (
    <p className="cv-thinking">
      <span className="as-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      Reading {reply.sources[0]?.toLowerCase() ?? "the records"}…
    </p>
  );
}

type CiteFn = (runId: string, attempt: number, seq: number) => void;
type ActionFn = (id: ActionId, target?: string) => void;

function AssistantItem({
  reply,
  shown,
  thinking,
  animateLast,
  onCite,
  onAction,
}: {
  reply: Reply;
  shown: number;
  thinking?: boolean;
  animateLast: boolean;
  onCite: CiteFn;
  onAction: ActionFn;
}) {
  return (
    <div className="cv-item cv-msg is-assistant" aria-busy={thinking}>
      <Avatar who="assistant" />
      <div className="cv-msg-main">
        <p className="cv-by">
          <strong>Assistant</strong>
          <span className="cv-role">reads records, never secrets</span>
        </p>
        <div className="cv-answer">
          {thinking ? (
            <Thinking reply={reply} />
          ) : (
            <>
              {reply.blocks.slice(0, shown).map((block, index) => (
                <BlockView key={index} block={block} animate={animateLast && index === shown - 1} onCite={onCite} onAction={onAction} />
              ))}
              {shown >= reply.blocks.length && <Sources sources={reply.sources} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** A locally answered question: thinks briefly, then shows the whole reply. */
function LocalReply({ reply, onCite, onAction }: { reply: Reply; onCite: CiteFn; onAction: ActionFn }) {
  const [ready, setReady] = useState(reducedMotion);
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), 850);
    return () => window.clearTimeout(timer);
  }, [ready]);
  return <AssistantItem reply={reply} shown={reply.blocks.length} thinking={!ready} animateLast={false} onCite={onCite} onAction={onAction} />;
}

function PinnedSummary({ reply, onCite, onAction }: { reply: Reply; onCite: CiteFn; onAction: ActionFn }) {
  const [ready, setReady] = useState(reducedMotion);
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => setReady(true), 1100);
    return () => window.clearTimeout(timer);
  }, [ready]);
  const blocks = open ? reply.blocks : reply.blocks.slice(0, 1);
  return (
    <article className="cv-item cv-pinned" aria-busy={!ready}>
      <header>
        <Avatar who="assistant" />
        <div>
          <strong>Here's what happened</strong>
          <small>Assistant · summarized from the records when you opened this thread</small>
        </div>
        {ready && (
          <Button variant="ghost" size="xs" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "Collapse" : "Show all"}
          </Button>
        )}
      </header>
      <div className="cv-answer">
        {!ready ? (
          <Thinking reply={reply} />
        ) : (
          <>
            {blocks.map((block, index) => (
              <BlockView key={index} block={block} animate={false} onCite={onCite} onAction={onAction} />
            ))}
            {open && <Sources sources={reply.sources} />}
          </>
        )}
      </div>
    </article>
  );
}

function MentionText({ text, open }: { text: string; open: (tab: Tab) => void }) {
  return (
    <>
      {text.split(mentionPattern).map((part, index) => {
        const mention = part.startsWith("@") ? mentionByToken(part.slice(1)) : undefined;
        if (!mention) return <span key={index}>{part}</span>;
        return (
          <button key={index} type="button" className="cv-mention" onClick={() => open(mention.tab)} title={`Open ${mention.label}`}>
            <AtSign size={11} aria-hidden="true" />
            {mention.label}
          </button>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------- record-backed event cards

function DeliveryEvent({ delivery, open }: { delivery: Delivery; open: (tab: Tab) => void }) {
  return (
    <SysEvent icon={<Webhook size={13} />} tone="ok" title="Webhook received and verified" at={clock(delivery.receivedAt)}>
      <p className="cv-line">
        <code>{delivery.event}</code> from {delivery.connector} · signature valid
      </p>
      <dl className="cv-kv">
        <div>
          <dt>Delivery</dt>
          <dd>{delivery.id}</dd>
        </div>
        <div>
          <dt>Correlation</dt>
          <dd>{delivery.correlationId}</dd>
        </div>
      </dl>
      <div className="cv-card-actions">
        <Button size="xs" variant="outline" onClick={() => open({ kind: "delivery", deliveryId: delivery.id })}>
          <Webhook /> Delivery record
        </Button>
      </div>
    </SysEvent>
  );
}

function VerdictEvent({ delivery, defaultOpen = false }: { delivery: Delivery; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const matched = delivery.evaluations.filter((evaluation) => evaluation.matched).length;
  return (
    <SysEvent
      icon={<GitBranch size={13} />}
      tone={matched ? "info" : "warn"}
      title={`${matched} of ${delivery.evaluations.length} bindings matched`}
      at={clock(delivery.receivedAt)}
    >
      <button type="button" className="cv-disclose" aria-expanded={open} onClick={() => setOpen(!open)}>
        <ChevronDown size={13} aria-hidden="true" />
        {open ? "Hide verdicts" : "Show every binding's verdict and reason"}
      </button>
      {open && <VerdictTable delivery={delivery} />}
    </SysEvent>
  );
}

function RunStartedEvent({ run, open, extra }: { run: Run; open: (tab: Tab) => void; extra?: ReactNode }) {
  const attempt = run.attempts[0];
  const pool = attempt ? poolById(attempt.pool)?.name ?? attempt.pool : "no pool";
  const binding = run.bindingId ? bindings.find((b) => b.id === run.bindingId)?.name : undefined;
  return (
    <SysEvent icon={<Play size={12} />} title={`Run ${run.number} started on ${pool}`} at={clock(run.createdAt)}>
      <CommandLine command={run.command} />
      <p className="cv-line cv-quiet">
        Reports as <strong>{run.check}</strong>
        {binding ? ` · binding ${binding}` : " · started from the CLI"}
        {run.operation.kind === "build" && run.operation.affectedBase ? ` · merge base ${run.operation.affectedBase}` : ""}
      </p>
      {extra}
      <div className="cv-card-actions">
        <Button size="xs" variant="outline" onClick={() => open({ kind: "run", runId: run.id })}>
          <Workflow /> Run details
        </Button>
      </div>
    </SysEvent>
  );
}

function AttemptLostEvent({ role, open }: { role: Role; open: (tab: Tab) => void }) {
  const attempt = run9012.attempts[0];
  if (role !== "pool-admin")
    return (
      <SysEvent icon={<RotateCcw size={12} />} tone="warn" title="Attempt 1 lost its executor" at={clock(attempt.startedAt)}>
        <p className="cv-line">
          The machine running attempt 1 stopped responding. Oyzu retried it automatically as attempt 2; there's nothing
          for you to do.
        </p>
        <div className="cv-card-actions">
          <Button size="xs" variant="outline" onClick={() => open({ kind: "log", runId: run9012.id, attempt: 1 })}>
            <FileText /> Attempt 1 log
          </Button>
        </div>
      </SysEvent>
    );
  return (
    <SysEvent icon={<RotateCcw size={12} />} tone="warn" title="Attempt 1 lost its executor" at={clock(attempt.startedAt)}>
      <p className="cv-line">{attempt.reason}</p>
      <p className="cv-line cv-quiet">
        {attempt.manager} · {attempt.jobId} · retried as attempt 2 on {run9012.attempts[1].manager}
      </p>
      <div className="cv-card-actions">
        <Button size="xs" variant="outline" onClick={() => open({ kind: "poollogs", filter: attempt.jobId })}>
          <Stethoscope /> Runner diagnostics
        </Button>
        <Button size="xs" variant="ghost" onClick={() => open({ kind: "log", runId: run9012.id, attempt: 1 })}>
          <FileText /> Attempt 1 log
        </Button>
      </div>
    </SysEvent>
  );
}

const excerptNeedles = ["panicked at", "assertion `left == right`", "  left:", "  right:"];

function FailureEvent({ open, onExplain }: { open: (tab: Tab) => void; onExplain: () => void }) {
  const lines = excerptNeedles
    .map((needle) => failedLog.find((entry) => stripAnsiText(entry.text).includes(needle)))
    .filter((entry): entry is LogEntry => Boolean(entry));
  const group = run9012.groups.find((item) => item.scope === "payments-core/test")!;
  return (
    <SysEvent icon={<CircleX size={13} />} tone="bad" title="payments-core/test failed" at={clock(run9012.attempts[1].startedAt)}>
      <p className="cv-line">
        1 of 64 tests failed after {duration(group.durationMs)} on attempt 2. First error:
      </p>
      <div className="cv-excerpt" role="group" aria-label="First error excerpt">
        {lines.map((entry) => (
          <button
            key={entry.seq}
            type="button"
            onClick={() => open({ kind: "log", runId: run9012.id, attempt: 2, focusSeq: entry.seq })}
            aria-label={`Open log at line ${entry.seq}`}
          >
            <span>{entry.seq}</span>
            <code>
              <LogText text={entry.text} commit={run9012.commit} />
            </code>
          </button>
        ))}
      </div>
      <div className="cv-card-actions">
        <Button size="xs" variant="outline" onClick={() => open({ kind: "log", runId: run9012.id, attempt: 2, focusSeq: lines[0]?.seq ?? firstError.seq })}>
          <FileText /> Open log
        </Button>
        <Button size="xs" variant="ghost" onClick={onExplain}>
          <Sparkles /> Explain
        </Button>
      </div>
    </SysEvent>
  );
}

function ChecksEvent({ open, live }: { open: (tab: Tab) => void; live: Live }) {
  return (
    <SysEvent icon={<GitPullRequest size={12} />} tone="bad" title="Reported oyzu / build: failure to GitHub" at={clock("2026-10-09T15:39:26Z")}>
      <p className="cv-line cv-quiet">Every action reports as its own check on 9c41e2a. Required targets this change didn't touch report skipped.</p>
      <ul className="cv-checks">
        {checks.map((check) => {
          const conclusion = check.runId === liveRun.id && live.state === "succeeded" ? "success" : check.conclusion;
          const body = (
            <>
              <StateChip size="sm" state={conclusion} />
              <strong>{check.name}</strong>
              {check.required && <em>required</em>}
              <span>{check.runId === liveRun.id && live.state === "succeeded" ? "Built api-image" : check.summary}</span>
            </>
          );
          return (
            <li key={check.name}>
              {check.runId ? (
                <button
                  type="button"
                  onClick={() =>
                    open({ kind: "log", runId: check.runId!, attempt: runById(check.runId!)!.attempt || 1 })
                  }
                >
                  {body}
                </button>
              ) : (
                <div>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </SysEvent>
  );
}

function LiveCard({ live, open }: { live: Live; open: (tab: Tab) => void }) {
  const groups = liveGroups(live.groups).filter((group) => group.target !== "runner" || group.task === "setup");
  const tail = live.entries.slice(-3);
  const pct = livePercent(live);
  return (
    <div className="cv-item cv-ev" data-tone={live.state === "running" ? "live" : "ok"}>
      <span className="cv-node" aria-hidden="true">
        {live.state === "running" ? <span className="cv-pulse" /> : <CircleCheck size={13} />}
      </span>
      <div className="cv-ev-main">
        <p className="cv-ev-title">
          <strong>{live.state === "running" ? "Building api-image" : "Finished building api-image"}</strong>
          <span className="cv-by-sys">
            {live.state === "running" ? "Live" : "Done"} · {duration(live.elapsedMs)}
          </span>
        </p>
        <div className="cv-card cv-live">
          <div className="cv-live-bar">
            <Progress value={pct} aria-label="Run progress" />
            <span>{pct}%</span>
          </div>
          <ul className="cv-live-groups">
            {groups.map((group) => (
              <li key={group.scope}>
                <GroupIcon state={group.state} size={13} />
                <span>{group.target === "runner" ? "runner setup" : group.scope}</span>
                <small>{group.state}</small>
              </li>
            ))}
          </ul>
          <div className="cv-tail" aria-live="polite">
            {tail.map((entry) => (
              <code key={entry.seq} className="cv-enter">
                <LogText text={entry.text} />
              </code>
            ))}
          </div>
          <div className="cv-card-actions">
            <Button size="xs" variant="outline" onClick={() => open({ kind: "log", runId: liveRun.id, attempt: 1 })}>
              <FileText /> {live.state === "running" ? "Watch live log" : "Open log"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PoolHeartbeatRows() {
  const rows = poolLogs.filter((row) => row.manager === "mgr-onprem-02" && row.level !== "info");
  return (
    <ol className="cv-hb">
      {rows.map((row, index) => (
        <li key={index} data-level={row.level}>
          <time>{row.t}</time>
          <strong>{row.msg}</strong>
          <code>
            {Object.entries(row.fields)
              .map(([key, value]) => `${key}=${value}`)
              .join(" ")}
          </code>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------- per-thread record feed

function ThreadEvents({
  thread,
  role,
  live,
  open,
  goThread,
  note,
  explain,
}: {
  thread: ThreadDef;
  role: Role;
  live: Live;
  open: (tab: Tab) => void;
  goThread: (id: string) => void;
  note: (text: string) => void;
  explain: () => void;
}) {
  const push482 = (
    <Said who="dana.okafor" at={clock("2026-10-09T15:30:47Z")}>
      Pushed <code>9c41e2a</code> “Retry refunds with the original idempotency key” to feat/refund-retries on #482
    </Said>
  );
  switch (thread.id) {
    case "t-9012": {
      const delivery = deliveryById("dlv-7f3a")!;
      return (
        <>
          {push482}
          <DeliveryEvent delivery={delivery} open={open} />
          <VerdictEvent delivery={delivery} />
          <RunStartedEvent
            run={run9012}
            open={open}
            extra={
              <p className="cv-line cv-quiet">
                Also started{" "}
                <button type="button" className="cv-link" onClick={() => goThread("t-9013")}>
                  policy check 9013
                </button>{" "}
                and{" "}
                <button type="button" className="cv-link" onClick={() => goThread("t-9014")}>
                  api-image 9014
                </button>
                ; cancelled{" "}
                <button type="button" className="cv-link" onClick={() => goThread("t-9001")}>
                  run 9001
                </button>{" "}
                on the previous push.
              </p>
            }
          />
          <AttemptLostEvent role={role} open={open} />
          <SysEvent
            compact
            icon={<Play size={12} />}
            title={`Attempt 2 started on a fresh executor${role === "pool-admin" ? ` (${run9012.attempts[1].manager})` : ""}`}
            at={clock(run9012.attempts[1].startedAt)}
          />
          <FailureEvent open={open} onExplain={explain} />
          <ChecksEvent open={open} live={live} />
        </>
      );
    }
    case "t-483": {
      const delivery = deliveryById("dlv-7f12")!;
      return (
        <>
          <Said who="jo.pereira" at={clock(delivery.receivedAt)}>
            Opened draft pull request #483 “Spike: FX rounding modes” from spike/fx-rounding
          </Said>
          <DeliveryEvent delivery={delivery} open={open} />
          <VerdictEvent delivery={delivery} defaultOpen />
          <SysEvent icon={<CircleMinus size={13} />} tone="muted" title="No runs started and no checks written" at={clock(delivery.receivedAt)}>
            <p className="cv-line">
              Nothing failed: this delivery matched no binding. Marking #483 ready for review sends a new event that starts{" "}
              <code>oyzu / build</code>.
            </p>
            <div className="cv-card-actions">
              <Button size="xs" variant="outline" onClick={() => note(actionResult("explain")!)}>
                Explain against today's bindings
              </Button>
              <Button size="xs" variant="ghost" onClick={() => open({ kind: "binding", bindingId: "pr-affected" })}>
                <GitBranch /> Pull request binding
              </Button>
            </div>
          </SysEvent>
        </>
      );
    }
    case "t-rej": {
      const delivery = deliveryById("dlv-rej")!;
      return (
        <>
          <SysEvent icon={<ShieldAlert size={13} />} tone="bad" title="Deliveries failing the signature check" at={clock(delivery.receivedAt)}>
            <div className="cv-counter">
              <strong>12</strong>
              <span>
                deliveries to <code>github-acme-legacy</code> were rejected: signature mismatch. The webhook secret on
                GitHub probably no longer matches this connector's.
              </span>
            </div>
            <dl className="cv-kv">
              <div>
                <dt>Last good delivery</dt>
                <dd>Yesterday 6:14 PM ET</dd>
              </div>
              <div>
                <dt>Latest rejected</dt>
                <dd>{clock(delivery.receivedAt)}</dd>
              </div>
              <div>
                <dt>Repository</dt>
                <dd>acme/web-console</dd>
              </div>
              <div>
                <dt>Kept</dt>
                <dd>Headers only; bodies never read</dd>
              </div>
            </dl>
            <div className="cv-card-actions">
              {role === "pool-admin" ? (
                <InlineConfirm
                  label="Rotate webhook secret"
                  icon={<KeyRound />}
                  variant="default"
                  prompt="Generate a new webhook secret for github-acme-legacy? The current one keeps working for 24 hours while you paste the new one into GitHub."
                  confirmLabel="Rotate secret"
                  result={actionResult("rotate-secret")!}
                  onDone={note}
                />
              ) : (
                <InlineConfirm
                  label="Ask an org admin to rotate it"
                  prompt="Send this thread to the org admins of acme with a request to rotate the github-acme-legacy secret?"
                  confirmLabel="Send request"
                  result="Sent to the acme org admins with a link to this thread."
                  onDone={note}
                />
              )}
              <Button size="xs" variant="ghost" onClick={() => open({ kind: "delivery", deliveryId: "dlv-rej" })}>
                Rejected deliveries
              </Button>
            </div>
          </SysEvent>
          <SysEvent icon={<Webhook size={13} />} tone="muted" title="Where each delivery stopped" at={clock(delivery.receivedAt)}>
            <StageList delivery={delivery} />
          </SysEvent>
        </>
      );
    }
    case "t-pool": {
      const pool = poolById("acme-onprem")!;
      const manager = pool.managers[1];
      return (
        <>
          <SysEvent icon={<HeartPulse size={13} />} tone="warn" title={`${manager.id} is missing heartbeats`} at={clock("2026-10-09T15:32:31Z")}>
            <dl className="cv-kv">
              <div>
                <dt>Host</dt>
                <dd>{manager.host}</dd>
              </div>
              <div>
                <dt>Last heartbeat</dt>
                <dd>{manager.heartbeat}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{manager.version} (pool default 0.4.1)</dd>
              </div>
              <div>
                <dt>Key</dt>
                <dd>{manager.keyAgeDays} days, in rotation overlap</dd>
              </div>
            </dl>
          </SysEvent>
          <SysEvent icon={<Stethoscope size={13} />} tone="warn" title="Heartbeat failures from the pool log" at={clock("2026-10-09T15:41:55Z")}>
            <PoolHeartbeatRows />
            <div className="cv-card-actions">
              <Button size="xs" variant="outline" onClick={() => open({ kind: "poollogs", filter: manager.id })}>
                <Stethoscope /> Pool logs
              </Button>
            </div>
          </SysEvent>
          <SysEvent icon={<RotateCcw size={12} />} tone="muted" title="1 job lost and retried" at={clock("2026-10-09T15:34:02Z")}>
            <p className="cv-line">
              job-5521 (run 9012, attempt 1) lost its lease and was retried on mgr-onprem-01, which ran it to completion.{" "}
              <button type="button" className="cv-link" onClick={() => goThread("t-9012")}>
                Open the run's thread
              </button>
            </p>
          </SysEvent>
          <SysEvent icon={<Server size={13} />} tone="info" title="Stop new work while you fix the proxy">
            <p className="cv-line">Draining keeps running jobs going and stops new claims. mgr-onprem-01 carries the pool meanwhile.</p>
            <div className="cv-card-actions">
              <InlineConfirm
                label="Drain mgr-onprem-02"
                variant="destructive"
                prompt="Drain mgr-onprem-02? It stops claiming new jobs; jobs already running finish."
                confirmLabel="Drain"
                result={actionResult("drain-manager", manager.id)!}
                onDone={note}
              />
              <Button size="xs" variant="ghost" onClick={() => open({ kind: "pool", poolId: pool.id })}>
                <Server /> Pool
              </Button>
            </div>
          </SysEvent>
        </>
      );
    }
    case "t-9014": {
      const milestones = liveMilestones(live);
      return (
        <>
          <RunStartedEvent run={run9014} open={open} />
          <LiveCard live={live} open={open} />
          {milestones.map((milestone) => (
            <SysEvent
              key={milestone.key}
              compact={milestone.key !== "done"}
              icon={milestone.tone === "ok" ? <CircleCheck size={13} /> : <Play size={12} />}
              tone={milestone.tone}
              title={milestone.title}
              at="just now"
            >
              {milestone.key === "done" ? (
                <p className="cv-line">
                  Reported <strong>oyzu / api-image: success</strong> to GitHub. 2 outputs uploaded. <code>oyzu / build</code>{" "}
                  stays red until build 9012 is fixed.
                </p>
              ) : undefined}
            </SysEvent>
          ))}
        </>
      );
    }
    case "t-9013":
      return (
        <>
          {push482}
          <RunStartedEvent run={run9013} open={open} />
          <SysEvent icon={<CircleCheck size={13} />} tone="ok" title={`Run 9013 succeeded in ${duration(run9013.durationMs)}`} at={clock("2026-10-09T15:31:41Z")}>
            <p className="cv-line">
              12 policies passed. Reported <strong>oyzu / policy: success</strong> to GitHub.
            </p>
            <div className="cv-card-actions">
              <Button size="xs" variant="outline" onClick={() => open({ kind: "log", runId: run9013.id, attempt: 1 })}>
                <FileText /> Open log
              </Button>
            </div>
          </SysEvent>
        </>
      );
    case "t-9009": {
      const delivery = deliveryById("dlv-7e91")!;
      return (
        <>
          <Said who="lee.marsh" at={clock(delivery.receivedAt)}>
            Merged #477 into main as <code>3f2a9c1</code>
          </Said>
          <DeliveryEvent delivery={delivery} open={open} />
          <VerdictEvent delivery={delivery} />
          <RunStartedEvent run={run9009} open={open} />
          <SysEvent icon={<CircleCheck size={13} />} tone="ok" title={`Run 9009 succeeded in ${duration(run9009.durationMs)}`} at={clock(thread.at)}>
            <p className="cv-line">
              Reported <strong>oyzu / build: success</strong>. Output <code>dist/manifest.json</code> ·{" "}
              <code>{run9009.outputs[0].digest}</code>
            </p>
          </SysEvent>
        </>
      );
    }
    case "t-9004":
      return (
        <>
          <Said who="sam.ito" at={clock("2026-10-09T13:12:40Z")}>
            Pushed <code>b81e04c</code> to fix/ledger-timeouts on #480
          </Said>
          <SysEvent icon={<CircleMinus size={13} />} tone="muted" title="Run 9004 skipped: task not defined" at={clock(run9004.createdAt)}>
            <p className="cv-line">
              <code>{run9004.reason!.code}</code> {run9004.reason!.message}. Decided before any executor was claimed; no pool
              time used. Reported <strong>oyzu / policy: skipped</strong>.
            </p>
            <CommandLine command={run9004.command} />
            <div className="cv-card-actions">
              <Button size="xs" variant="outline" onClick={() => open({ kind: "run", runId: run9004.id })}>
                <Workflow /> Run details
              </Button>
            </div>
          </SysEvent>
        </>
      );
    case "t-9001":
      return (
        <>
          <Said who="dana.okafor" at={clock("2026-10-09T15:22:15Z")}>
            Pushed <code>e5c9a1b</code> “Add refund retry worker” to feat/refund-retries on #482
          </Said>
          <RunStartedEvent run={run9001} open={open} />
          <SysEvent icon={<CircleMinus size={13} />} tone="muted" title="Cancelled: superseded by a newer push" at={clock(thread.at)}>
            <p className="cv-line">
              {run9001.reason!.message}. The pull request binding cancels unfinished runs.{" "}
              <button type="button" className="cv-link" onClick={() => goThread("t-9012")}>
                Go to run 9012
              </button>
            </p>
          </SysEvent>
        </>
      );
    case "t-8998":
      return (
        <>
          <Said who="you" at={clock("2026-10-09T12:04:00Z")}>
            Ran <code>oyzu build cli --remote</code> from a terminal
          </Said>
          <RunStartedEvent run={run8998} open={open} />
          <SysEvent icon={<CircleCheck size={13} />} tone="ok" title={`Run 8998 succeeded in ${duration(run8998.durationMs)}`} at={clock(thread.at)}>
            <p className="cv-line">
              Ran on Micah's desktop, a developer machine. Its outputs are fine for testing and never release-eligible.
            </p>
          </SysEvent>
        </>
      );
    default: {
      const delivery = deliveryById("dlv-7e40")!;
      return (
        <>
          <Said who="sam.ito" at={clock(delivery.receivedAt)}>
            Pushed <code>f00d1e2</code> to feat/export on acme/ledger-tools #12
          </Said>
          <DeliveryEvent delivery={delivery} open={open} />
          <SysEvent icon={<TriangleAlert size={13} />} tone="warn" title="Stopped: repository not registered" at={clock(delivery.receivedAt)}>
            <p className="cv-line">acme/ledger-tools isn't registered to any project, so no binding was evaluated and nothing ran.</p>
            <div className="cv-card-actions">
              <InlineConfirm
                label="Register acme/ledger-tools"
                prompt="Open registration for acme/ledger-tools in project payments? Nothing runs until a binding matches."
                confirmLabel="Open registration"
                result="Registration started for acme/ledger-tools in project payments. Its next push will be evaluated."
                onDone={note}
              />
            </div>
          </SysEvent>
        </>
      );
    }
  }
}

// ---------------------------------------------------------------- composer

function Composer({
  role,
  suggestions,
  onSend,
  onCommand,
  openMention,
  placeholder,
}: {
  role: Role;
  suggestions: string[];
  onSend: (text: string) => void;
  onCommand: (name: string) => void;
  openMention: (tab: Tab) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState("");
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const available = commands.filter((command) => !command.admin || role === "pool-admin");

  const slash = /^\/(\w*)$/.exec(draft);
  const at = /(^|\s)@([\w#.-]*)$/.exec(draft);
  const menu = slash
    ? { kind: "slash" as const, items: available.filter((command) => command.name.startsWith(slash[1].toLowerCase())) }
    : at
      ? {
          kind: "mention" as const,
          items: mentionables
            .filter((mention) => {
              const q = at[2].toLowerCase();
              return mention.token.includes(q) || mention.label.toLowerCase().includes(q);
            })
            .slice(0, 9),
        }
      : undefined;
  const showMenu = Boolean(menu && menu.items.length && !dismissed);
  const count = menu?.items.length ?? 0;
  const draftMentions = Array.from(new Set(draft.match(mentionPattern) ?? []))
    .map((token) => mentionByToken(token.slice(1)))
    .filter((mention): mention is Mention => Boolean(mention));

  const change = (value: string) => {
    setDraft(value);
    setIndex(0);
    setDismissed(false);
  };
  const runCommand = (name: string) => {
    onCommand(name);
    change("");
  };
  const pickMention = (mention: Mention) => {
    change(draft.replace(/@([\w#.-]*)$/, `@${mention.token} `));
    input.current?.focus();
  };
  const pick = (position: number) => {
    if (!menu) return;
    if (menu.kind === "slash") runCommand(menu.items[position].name);
    else pickMention(menu.items[position]);
  };
  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    const exact = /^\/(\w+)$/.exec(text);
    if (exact) {
      if (available.some((command) => command.name === exact[1])) runCommand(exact[1]);
      return;
    }
    onSend(text);
    change("");
  };

  return (
    <div className="cv-composer">
      {suggestions.length > 0 && (
        <div className="cv-suggest" aria-label="Suggested questions">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" onClick={() => onSend(suggestion)}>
              <Sparkles size={11} aria-hidden="true" /> {suggestion}
            </button>
          ))}
        </div>
      )}
      <form
        className="cv-input"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        {showMenu && menu && (
          <div className="cv-pop" role="listbox" aria-label={menu.kind === "slash" ? "Commands" : "Mention"}>
            <p className="cv-pop-head">{menu.kind === "slash" ? "Commands" : "Mention a run, pull request, binding or pool"}</p>
            {menu.kind === "slash"
              ? menu.items.map((command, position) => (
                  <button
                    key={command.name}
                    type="button"
                    role="option"
                    aria-selected={position === index}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => pick(position)}
                  >
                    <SquareSlash size={13} aria-hidden="true" />
                    <strong>/{command.name}</strong>
                    <span>{command.hint}</span>
                  </button>
                ))
              : menu.items.map((mention, position) => (
                  <button
                    key={mention.token}
                    type="button"
                    role="option"
                    aria-selected={position === index}
                    onMouseEnter={() => setIndex(position)}
                    onClick={() => pick(position)}
                  >
                    <AtSign size={13} aria-hidden="true" />
                    <strong>{mention.label}</strong>
                    <span>
                      {mention.group} · {mention.hint}
                    </span>
                  </button>
                ))}
          </div>
        )}
        {draftMentions.length > 0 && (
          <div className="cv-draft-chips" aria-label="Mentioned in this message">
            {draftMentions.map((mention) => (
              <button key={mention.token} type="button" className="cv-mention" onClick={() => openMention(mention.tab)} title={`Open ${mention.label} in the canvas`}>
                <AtSign size={11} aria-hidden="true" />
                {mention.label}
              </button>
            ))}
          </div>
        )}
        <div className="cv-input-row">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            placeholder={placeholder}
            aria-label="Message this thread"
            aria-autocomplete="list"
            aria-expanded={showMenu}
            onChange={(event) => change(event.target.value)}
            onKeyDown={(event) => {
              if (showMenu && count) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setIndex((index + 1) % count);
                  return;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setIndex((index - 1 + count) % count);
                  return;
                }
                if (event.key === "Tab" || (event.key === "Enter" && !event.shiftKey)) {
                  event.preventDefault();
                  pick(Math.min(index, count - 1));
                  return;
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setDismissed(true);
                  return;
                }
              }
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit();
              }
            }}
          />
          <div className="cv-input-tools">
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Insert a command" title="Commands" onClick={() => { change("/"); input.current?.focus(); }}>
              <SquareSlash />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Mention something"
              title="Mention"
              onClick={() => {
                change(draft && !/\s$/.test(draft) ? `${draft} @` : `${draft}@`);
                input.current?.focus();
              }}
            >
              <AtSign />
            </Button>
            <Button type="submit" size="icon-sm" aria-label="Send" disabled={!draft.trim()}>
              <ArrowUp />
            </Button>
          </div>
        </div>
      </form>
      <p className="cv-hint">
        <kbd>/</kbd> commands · <kbd>@</kbd> mention · answers come from this project's records; masked values stay masked
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- thread

type LocalItem =
  | { id: number; after: number; kind: "user"; text: string }
  | { id: number; after: number; kind: "reply"; reply: Reply }
  | { id: number; after: number; kind: "cmd"; text: string; result: string }
  | { id: number; after: number; kind: "confirm"; prompt: string; confirmLabel: string; result: string; state: "asking" | "done" | "cancelled" }
  | { id: number; after: number; kind: "reproduce"; run: Run }
  | { id: number; after: number; kind: "assign"; picked?: string };

type DistOmit<T> = T extends unknown ? Omit<T, "id" | "after"> : never;
type LocalDraft = DistOmit<LocalItem>;

let localId = 1;

type Registry = Record<string, { ask: (text: string, line?: LogEntry) => void; note: (text: string) => void }>;

function ThreadView({
  thread,
  active,
  role,
  live,
  open,
  goThread,
  onBack,
  registry,
}: {
  thread: ThreadDef;
  active: boolean;
  role: Role;
  live: Live;
  open: (tab: Tab) => void;
  goThread: (id: string) => void;
  onBack: () => void;
  registry: RefObject<Registry>;
}) {
  const assistant = useAssistant(thread.context, role);
  const { ask, note, messages } = assistant;
  const [local, setLocal] = useState<LocalItem[]>([]);
  const [assignee, setAssignee] = useState<string>();
  const [fixAsked, setFixAsked] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const run = thread.runId ? runById(thread.runId) : undefined;
  const isLive = run?.id === liveRun.id;
  const summary = useMemo(
    () => (thread.summary ? respond(thread.summary, thread.context, role) : undefined),
    [thread.summary, thread.context, role],
  );

  useEffect(() => {
    registry.current[thread.id] = { ask, note };
  }, [registry, thread.id, ask, note]);

  const add = useCallback(
    (item: LocalDraft) =>
      setLocal((current) => [...current, { ...item, id: localId++, after: messages.length } as LocalItem]),
    [messages.length],
  );
  const update = (id: number, patch: Partial<LocalItem>) =>
    setLocal((current) => current.map((item) => (item.id === id ? ({ ...item, ...patch } as LocalItem) : item)));

  const last = messages[messages.length - 1];
  const milestoneCount = isLive ? liveMilestones(live).length : 0;
  // Follow new messages, but open the thread at the top so the summary reads first.
  const feedKey = `${messages.length}-${last?.shown ?? 0}-${local.length}-${milestoneCount}`;
  const seenKey = useRef(feedKey);
  useEffect(() => {
    if (seenKey.current === feedKey) return;
    seenKey.current = feedKey;
    if (active) end.current?.scrollIntoView({ block: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
  }, [feedKey, active]);

  const send = (text: string) => {
    const answer = localReplies[thread.id]?.[text];
    if (answer) {
      add({ kind: "user", text });
      add({ kind: "reply", reply: answer });
      return;
    }
    ask(text);
  };
  const explain = () => send(thread.explain);

  const onCite: CiteFn = (runId, attempt, seq) => open({ kind: "log", runId, attempt, focusSeq: seq });
  const onAction: ActionFn = (id, target) => {
    switch (id) {
      case "open-logs":
        open({ kind: "log", runId: run9012.id, attempt: 2, focusSeq: firstError.seq });
        return;
      case "open-attempt-1":
        open({ kind: "log", runId: run9012.id, attempt: 1 });
        return;
      case "diagnostics":
        open({ kind: "poollogs", filter: target ?? "job-5521" });
        return;
      case "open-delivery":
        open({ kind: "delivery", deliveryId: target ?? thread.deliveryId ?? "dlv-7f12" });
        return;
      case "register-repo":
        open({ kind: "delivery", deliveryId: "dlv-7e40" });
        return;
      case "open-binding":
        open({ kind: "binding", bindingId: target ?? "pr-affected" });
        return;
      case "open-pool":
        open({ kind: "pool", poolId: target ?? "acme-onprem" });
        return;
      case "open-run": {
        const target_ = runById(target ?? liveRun.id) ?? liveRun;
        open(hasLog(target_.id) ? { kind: "log", runId: target_.id, attempt: target_.attempt || 1 } : { kind: "run", runId: target_.id });
        return;
      }
      case "apply-fix":
        open({ kind: "diff" });
        if (!fixAsked) {
          setFixAsked(true);
          ask("Suggest a fix");
        }
        return;
      default: {
        const text = actionResult(id, target);
        if (text) note(text);
      }
    }
  };

  const onCommand = (name: string) => {
    const echo = (result: string) => add({ kind: "cmd", text: `/${name}`, result });
    switch (name) {
      case "logs":
        if (run && hasLog(run.id)) {
          open({ kind: "log", runId: run.id, attempt: run.attempt || 1 });
          echo(`Opened run ${run.number}'s log in the canvas${run.state === "failed" ? " at the first error" : ""}.`);
        } else if (run) {
          open({ kind: "run", runId: run.id });
          echo(`Run ${run.number} has no log in this prototype; opened its details instead.`);
        } else if (thread.deliveryId) {
          open({ kind: "delivery", deliveryId: thread.deliveryId });
          echo("Opened the delivery record in the canvas.");
        } else {
          open({ kind: "poollogs", filter: "mgr-onprem-02" });
          echo("Opened pool logs for mgr-onprem-02.");
        }
        return;
      case "explain":
        explain();
        return;
      case "diagnostics": {
        if (role !== "pool-admin") return;
        const job = run?.attempts.find((attempt) => attempt.state !== "succeeded")?.jobId ?? run?.attempts[run.attempts.length - 1]?.jobId;
        if (job && run?.attempts.some((attempt) => attempt.pool === "acme-onprem")) {
          open({ kind: "poollogs", filter: job });
          echo(`Opened runner diagnostics filtered to ${job}.`);
        } else if (thread.poolId) {
          open({ kind: "poollogs", filter: "mgr-onprem-02" });
          echo("Opened pool logs filtered to mgr-onprem-02.");
        } else if (run && job) {
          echo(`${job} ran on ${poolById(run.attempts[0].pool)?.name}, which doesn't ship pool logs to this prototype. Nothing unusual was reported for it.`);
        } else {
          echo("Runner diagnostics belong to runs. This thread didn't start one, so there's no job to look at.");
        }
        return;
      }
      case "reproduce":
        if (run) add({ kind: "reproduce", run });
        else echo("Reproduce applies to runs. This thread is about a delivery, so there's no command to repeat; replay or explain it instead.");
        return;
      case "assign":
        add({ kind: "assign" });
        return;
      case "rerun":
        if (run && isLive && live.state === "running") {
          echo("Run 9014 is still running. Rerun becomes available when it finishes.");
        } else if (run && run.attempts.length) {
          add({
            kind: "confirm",
            prompt:
              run.id === run9012.id
                ? "Rerun payments-core/test for 9c41e2a on Acme on-prem? It creates attempt 3 of the same check; the commit and command don't change."
                : `Rerun ${run.check} for ${run.commit.slice(0, 7)}? It creates a new attempt with the same command.`,
            confirmLabel: "Rerun",
            result: run.id === run9012.id ? actionResult("rerun-failed")! : `Queued attempt ${run.attempts.length + 1} of run ${run.number}.`,
            state: "asking",
          });
        } else if (run) {
          echo(`Run ${run.number} never started an attempt. Fix the cause first: ${run.reason?.message ?? "nothing ran"}.`);
        } else if (thread.deliveryId === "dlv-rej") {
          echo("Rejected deliveries can't be replayed from Oyzu because their bodies were never stored. Rotate the secret, then redeliver them from GitHub.");
        } else if (thread.deliveryId) {
          add({
            kind: "confirm",
            prompt: `Replay delivery ${thread.deliveryId} as a new delivery linked to the original? Bindings that match today will start runs.`,
            confirmLabel: "Replay",
            result: actionResult("replay")!,
            state: "asking",
          });
        } else {
          echo("There's nothing to rerun in a pool thread. Drain the manager or open its logs instead.");
        }
        return;
      default:
        return;
    }
  };

  const renderLocal = (item: LocalItem) => {
    switch (item.kind) {
      case "user":
        return (
          <div key={`l${item.id}`} className="cv-item cv-msg is-you">
            <Avatar who="you" />
            <div className="cv-msg-main">
              <p className="cv-by">
                <strong>You</strong>
                <time>just now</time>
              </p>
              <div className="cv-said">
                <MentionText text={item.text} open={open} />
              </div>
            </div>
          </div>
        );
      case "reply":
        return <LocalReply key={`l${item.id}`} reply={item.reply} onCite={onCite} onAction={onAction} />;
      case "cmd":
        return (
          <div key={`l${item.id}`} className="cv-item cv-cmdline">
            <Avatar who="you" />
            <p>
              <code>{item.text}</code>
              <span>{item.result}</span>
            </p>
          </div>
        );
      case "confirm":
        return (
          <div key={`l${item.id}`} className="cv-item cv-confirm-card" data-state={item.state}>
            <Avatar who="you" />
            <div>
              <p className="cv-by">
                <strong>You</strong> <code>/rerun</code>
              </p>
              {item.state === "asking" ? (
                <div className="cv-confirm">
                  <p>{item.prompt}</p>
                  <div>
                    <Button
                      size="sm"
                      onClick={() => {
                        update(item.id, { state: "done" });
                        note(item.result);
                      }}
                    >
                      {item.confirmLabel}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => update(item.id, { state: "cancelled" })}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="cv-quiet">{item.state === "done" ? "Confirmed." : "Cancelled. Nothing was changed."}</p>
              )}
            </div>
          </div>
        );
      case "reproduce":
        return (
          <div key={`l${item.id}`} className="cv-item cv-ev" data-tone="info">
            <span className="cv-node" aria-hidden="true">
              <SquareTerminal size={13} />
            </span>
            <div className="cv-ev-main">
              <p className="cv-ev-title">
                <strong>Reproduce run {item.run.number} yourself</strong>
                <span className="cv-by-sys">Oyzu · for /reproduce</span>
              </p>
              <div className="cv-card">
                <p className="cv-line cv-quiet">Every run is one oyzu command on one commit, so it reproduces exactly.</p>
                <CommandLine command={`git checkout ${item.run.commit.slice(0, 7)} && ${item.run.command}`} note="On your machine" />
                <CommandLine command={`${item.run.command} --remote --ref ${item.run.commit.slice(0, 7)}`} note="Its --remote twin, on the same pool, without a local toolchain" />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div key={`l${item.id}`} className="cv-item cv-confirm-card">
            <Avatar who="you" />
            <div>
              <p className="cv-by">
                <strong>You</strong> <code>/assign</code>
              </p>
              {item.picked ? (
                <p className="cv-quiet">Assigned to {item.picked}.</p>
              ) : (
                <div className="cv-assign" role="group" aria-label="Assign to">
                  {teammates.map((who) => (
                    <button
                      key={who}
                      type="button"
                      onClick={() => {
                        update(item.id, { picked: who });
                        setAssignee(who);
                        note(`Assigned to ${who}. They get a notification with a link to this thread.`);
                      }}
                    >
                      <Avatar who={who} /> {who}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  const feed: ReactNode[] = [];
  for (let position = 0; position <= messages.length; position += 1) {
    local.filter((item) => item.after === position).forEach((item) => feed.push(renderLocal(item)));
    const message: ChatMessage | undefined = messages[position];
    if (!message) continue;
    if (message.author === "user")
      feed.push(
        <div key={`m${message.id}`} className="cv-item cv-msg is-you">
          <Avatar who="you" />
          <div className="cv-msg-main">
            <p className="cv-by">
              <strong>You</strong>
              <time>just now</time>
            </p>
            <div className="cv-said">
              <MentionText text={message.text ?? ""} open={open} />
            </div>
          </div>
        </div>,
      );
    else if (message.author === "system")
      feed.push(
        <div key={`m${message.id}`} className="cv-item cv-ev is-compact" data-tone="ok">
          <span className="cv-node" aria-hidden="true">
            <CircleCheck size={13} />
          </span>
          <div className="cv-ev-main">
            <p className="cv-ev-title">
              <strong>{message.text}</strong>
              <span className="cv-by-sys">Oyzu · just now</span>
            </p>
          </div>
        </div>,
      );
    else
      feed.push(
        <AssistantItem
          key={`m${message.id}`}
          reply={message.reply!}
          shown={message.shown ?? message.reply!.blocks.length}
          thinking={message.thinking}
          animateLast={message === last}
          onCite={onCite}
          onAction={onAction}
        />,
      );
  }

  const state: ChipState = isLive ? live.state : thread.chip.state;
  const suggestions = thread.suggestions ?? assistant.suggestions;

  return (
    <section className="cv-thread" hidden={!active} aria-label={thread.title}>
      <header className="cv-thread-head">
        <Button className="cv-phone-only" variant="ghost" size="icon-sm" aria-label="Back to inbox" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="cv-thread-title">
          <h2>{isLive && live.state === "succeeded" ? "api-image 9014 succeeded" : thread.title}</h2>
          <div className="cv-thread-meta">
            <StateChip size="sm" state={state} label={isLive ? undefined : thread.chip.label} />
            {thread.meta.pr && (
              <span>
                <GitPullRequest size={12} aria-hidden="true" /> #{thread.meta.pr}
              </span>
            )}
            {thread.meta.commit && (
              <span>
                <GitCommitHorizontal size={12} aria-hidden="true" /> <code>{thread.meta.commit}</code>
              </span>
            )}
            {thread.meta.ref && (
              <span className="cv-hide-sm">
                <GitBranch size={12} aria-hidden="true" /> {thread.meta.ref}
              </span>
            )}
            {thread.meta.extra && <span>{thread.meta.extra}</span>}
            {assignee && (
              <span className="cv-assigned">
                <Avatar who={assignee} /> {assignee}
              </span>
            )}
          </div>
        </div>
        <div className="cv-quick">
          {run && hasLog(run.id) && (
            <Button size="sm" variant="outline" aria-label="Open log" onClick={() => open({ kind: "log", runId: run.id, attempt: run.attempt || 1 })}>
              <FileText /> <span className="cv-hide-sm">Log</span>
            </Button>
          )}
          {run && (
            <Button size="sm" variant="ghost" aria-label="Run details" onClick={() => open({ kind: "run", runId: run.id })}>
              <Workflow /> <span className="cv-hide-sm">Details</span>
            </Button>
          )}
          {run && run.attempts.length > 0 && !(isLive && live.state === "running") && (
            <Button size="sm" variant="ghost" aria-label="Rerun" onClick={() => onCommand("rerun")}>
              <RotateCcw /> <span className="cv-hide-sm">Rerun</span>
            </Button>
          )}
          {thread.deliveryId && !run && (
            <Button size="sm" variant="outline" aria-label="Delivery record" onClick={() => open({ kind: "delivery", deliveryId: thread.deliveryId! })}>
              <Webhook /> <span className="cv-hide-sm">Record</span>
            </Button>
          )}
          {thread.poolId && (
            <Button size="sm" variant="outline" aria-label="Pool" onClick={() => open({ kind: "pool", poolId: thread.poolId! })}>
              <Server /> <span className="cv-hide-sm">Pool</span>
            </Button>
          )}
          <Button size="sm" variant="ghost" aria-label="Assign" title="Assign this thread" onClick={() => onCommand("assign")}>
            <UserPlus />
          </Button>
        </div>
      </header>
      <TooltipProvider delayDuration={150}>
        <div className="cv-feed">
          <p className="cv-day">
            <span>Today · times in ET</span>
          </p>
          {summary && <PinnedSummary reply={summary} onCite={onCite} onAction={onAction} />}
          <ThreadEvents thread={thread} role={role} live={live} open={open} goThread={goThread} note={note} explain={explain} />
          {feed.length > 0 && (
            <p className="cv-day">
              <span>Conversation</span>
            </p>
          )}
          {feed}
          <div ref={end} className="cv-end" />
        </div>
      </TooltipProvider>
      <Composer
        role={role}
        suggestions={suggestions}
        onSend={send}
        onCommand={onCommand}
        openMention={open}
        placeholder={`Ask about ${thread.title.replace(/^\d+ /, "")}, or type / for commands`}
      />
    </section>
  );
}

// ---------------------------------------------------------------- inbox and browse

type BrowseTab = "runs" | "deliveries" | "pools" | "bindings";
const runFilters: { id: "all" | RunState; label: string }[] = [
  { id: "all", label: "All" },
  { id: "failed", label: "Failed" },
  { id: "running", label: "Running" },
  { id: "succeeded", label: "Succeeded" },
  { id: "skipped", label: "Skipped" },
  { id: "cancelled", label: "Cancelled" },
];

function InboxRow({
  thread,
  active,
  unread,
  live,
  onSelect,
}: {
  thread: ThreadDef;
  active: boolean;
  unread: boolean;
  live: Live;
  onSelect: () => void;
}) {
  const isLive = thread.id === "t-9014";
  const liveDone = isLive && live.state !== "running";
  const preview = isLive
    ? liveDone
      ? `Succeeded in ${duration(live.elapsedMs)}`
      : stripAnsiText(live.entries[live.entries.length - 1]?.text ?? "").trim()
    : thread.preview;
  return (
    <li>
      <button type="button" className="cv-row" aria-current={active ? "true" : undefined} data-unread={unread} onClick={onSelect}>
        <span className="cv-row-icon">
          <StateIcon icon={liveDone ? "ok" : thread.icon} />
        </span>
        <span className="cv-row-main">
          <strong>{isLive && liveDone ? "api-image 9014 succeeded" : thread.title}</strong>
          <span className={isLive && !liveDone ? "cv-row-live" : undefined}>{preview}</span>
          {isLive && !liveDone && <Progress value={livePercent(live)} aria-label="api-image progress" className="cv-row-progress" />}
        </span>
        <span className="cv-row-side">
          <time>{isLive && !liveDone ? "live" : ago(thread.at)}</time>
          {unread && <i className="cv-dot" role="img" aria-label="Unread" />}
        </span>
      </button>
    </li>
  );
}

function BrowseList({
  tab,
  query,
  live,
  role,
  onRun,
  onDelivery,
  open,
}: {
  tab: BrowseTab;
  query: string;
  live: Live;
  role: Role;
  onRun: (run: Run) => void;
  onDelivery: (delivery: Delivery) => void;
  open: (tab: Tab) => void;
}) {
  const [filter, setFilter] = useState<"all" | RunState>("all");
  const q = query.trim().toLowerCase();
  const hit = (...values: string[]) => !q || values.some((value) => value.toLowerCase().includes(q));
  if (tab === "runs") {
    const list = runs
      .map((run) => ({ run, state: run.id === liveRun.id ? live.state : run.state }))
      .filter(({ run, state }) => (filter === "all" || state === filter) && hit(String(run.number), run.check, run.ref, run.title, run.author));
    return (
      <>
        <div className="cv-filters" role="group" aria-label="Filter runs by state">
          {runFilters.map((item) => (
            <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
        {list.length === 0 ? (
          <EmptyState filtered title="No runs match" description="Try another state or clear the search." />
        ) : (
          <ul className="cv-list">
            {list.map(({ run, state }) => (
              <li key={run.id}>
                <button type="button" className="cv-row" onClick={() => onRun(run)}>
                  <span className="cv-row-main">
                    <strong>
                      Run {run.number} <em>{run.check}</em>
                    </strong>
                    <span>
                      {run.pr ? `#${run.pr} · ` : ""}
                      {run.ref} · {run.author}
                    </span>
                  </span>
                  <span className="cv-row-side">
                    <StateChip size="sm" state={state} />
                    <time>{state === "running" ? "live" : ago(run.createdAt)}</time>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }
  if (tab === "deliveries") {
    const list = deliveries.filter((delivery) => hit(delivery.id, delivery.event, delivery.repository, delivery.outcomeLabel, delivery.connector));
    return (
      <ul className="cv-list">
        {list.map((delivery) => (
          <li key={delivery.id}>
            <button type="button" className="cv-row" onClick={() => onDelivery(delivery)}>
              <span className="cv-row-main">
                <strong>
                  {delivery.event} <em>{delivery.pr ? `#${delivery.pr.number}` : delivery.ref}</em>
                </strong>
                <span>
                  {delivery.repository} · {delivery.outcomeLabel}
                </span>
              </span>
              <span className="cv-row-side">
                <StateChip
                  size="sm"
                  state={delivery.outcome === "started" ? "success" : delivery.outcome === "no-match" || delivery.outcome === "unregistered" ? "skipped" : "failure"}
                  label={delivery.outcome === "started" ? "Started" : delivery.outcome === "no-match" ? "No match" : delivery.outcome === "unregistered" ? "Unregistered" : "Rejected"}
                />
                <time>{ago(delivery.receivedAt)}</time>
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }
  if (tab === "pools")
    return (
      <ul className="cv-list">
        {pools
          .filter((pool) => hit(pool.name, pool.kind, pool.id))
          .map((pool) => (
            <li key={pool.id}>
              <button type="button" className="cv-row" onClick={() => open({ kind: "pool", poolId: pool.id })}>
                <span className="cv-row-main">
                  <strong>
                    {pool.name} <em>{pool.kind}</em>
                  </strong>
                  <span>
                    {role === "pool-admin"
                      ? `${pool.managers.length} managers · ${pool.busy}/${pool.capacity} busy · ${pool.queued} queued`
                      : `${pool.capacity} concurrent jobs${pool.releaseEligible ? "" : " · not release-eligible"}`}
                  </span>
                </span>
                <span className="cv-row-side">
                  <StateChip size="sm" state={role === "pool-admin" || pool.status === "paused" ? pool.status : "healthy"} label={role === "pool-admin" ? undefined : pool.status === "paused" ? "Paused" : "Running"} />
                </span>
              </button>
            </li>
          ))}
      </ul>
    );
  return (
    <ul className="cv-list">
      {bindings
        .filter((binding) => hit(binding.name, binding.scope, binding.filters.join(" ")))
        .map((binding) => (
          <li key={binding.id}>
            <button type="button" className="cv-row" onClick={() => open({ kind: "binding", bindingId: binding.id })}>
              <span className="cv-row-main">
                <strong>{binding.name}</strong>
                <span>
                  {binding.scope} · {binding.filters.join(" · ")}
                </span>
              </span>
              <span className="cv-row-side">
                <StateChip size="sm" state={binding.enabled ? "success" : "skipped"} label={binding.enabled ? "On" : "Off"} />
              </span>
            </button>
          </li>
        ))}
    </ul>
  );
}

// ---------------------------------------------------------------- direction root

const initialUnread = ["t-483", "t-rej", "t-pool", "t-9014"];

export function Conversation() {
  const { role } = usePrototype();
  const live = useLiveRun();
  const [activeId, setActiveId] = useState("t-9012");
  const [visited, setVisited] = useState<string[]>(["t-9012"]);
  const [unread, setUnread] = useState<string[]>(initialUnread);
  const [pane, setPane] = useState<"inbox" | "thread" | "canvas">("inbox");
  const [mode, setMode] = useState<"inbox" | "browse">("inbox");
  const [browse, setBrowse] = useState<BrowseTab>("runs");
  const [query, setQuery] = useState("");
  const [tabs, setTabs] = useState<Tab[]>([{ kind: "log", runId: run9012.id, attempt: 2 }]);
  const [activeTab, setActiveTab] = useState(`log:${run9012.id}`);
  const [expanded, setExpanded] = useState(false);
  const [liveSeen, setLiveSeen] = useState(0);
  const registry = useRef<Registry>({});
  // Where the phone's canvas sheet returns to when closed.
  const paneNow = useRef(pane);
  const returnTo = useRef<"inbox" | "thread">("thread");
  useEffect(() => {
    paneNow.current = pane;
  }, [pane]);

  const visible = threads.filter((thread) => !thread.adminOnly || role === "pool-admin");
  const milestoneCount = liveMilestones(live).length;

  useEffect(() => {
    if (role !== "pool-admin" && threadById(activeId)?.adminOnly) setActiveId("t-9012");
    if (role !== "pool-admin")
      setTabs((current) => (current.some((tab) => tab.kind === "poollogs") ? current.filter((tab) => tab.kind !== "poollogs") : current));
  }, [role, activeId]);

  useEffect(() => {
    if (activeId === "t-9014") setLiveSeen(milestoneCount);
  }, [activeId, milestoneCount]);

  const selectThread = useCallback((id: string) => {
    setActiveId(id);
    setVisited((current) => (current.includes(id) ? current : [...current, id]));
    setUnread((current) => current.filter((item) => item !== id));
    setPane("thread");
  }, []);

  const open = useCallback((tab: Tab) => {
    const key = tabKey(tab);
    setTabs((current) => (current.some((item) => tabKey(item) === key) ? current.map((item) => (tabKey(item) === key ? tab : item)) : [...current, tab]));
    setActiveTab(key);
    if (paneNow.current !== "canvas") returnTo.current = paneNow.current;
    setPane("canvas");
  }, []);

  const closeTab = (key: string) => {
    const rest = tabs.filter((tab) => tabKey(tab) !== key);
    setTabs(rest);
    if (key === activeTab && rest.length) setActiveTab(tabKey(rest[rest.length - 1]));
    if (!rest.length) {
      setPane("thread");
      setExpanded(false);
    }
  };

  const isUnread = (id: string) =>
    id !== activeId && (unread.includes(id) || (id === "t-9014" && milestoneCount > liveSeen));

  const q = query.trim().toLowerCase();
  const filtered = visible.filter(
    (thread) => !q || [thread.title, thread.preview, thread.meta.ref ?? "", thread.meta.extra ?? ""].some((text) => text.toLowerCase().includes(q)),
  );
  const groupOf = (thread: ThreadDef) => (thread.id === "t-9014" && live.state !== "running" ? "recent" : thread.group);
  const groups = [
    { id: "attention", label: "Needs attention" },
    { id: "running", label: "Running" },
    { id: "recent", label: "Recent" },
  ] as const;
  const attentionCount = visible.filter((thread) => thread.group === "attention" && isUnread(thread.id)).length;

  return (
    <div className="cv" data-pane={pane} data-canvas={tabs.length ? "open" : "closed"} data-expanded={expanded && tabs.length > 0}>
      <nav className="cv-inbox" aria-label="Threads">
        <div className="cv-inbox-head">
          <div className="cv-brandline">
            <img src="/brand/oyzu-mark-color.svg" alt="" width={18} height={18} />
            <strong>payments</strong>
            <span>acme</span>
          </div>
          <div className="cv-seg" role="group" aria-label="Inbox or browse">
            <button type="button" aria-pressed={mode === "inbox"} onClick={() => setMode("inbox")}>
              <Inbox size={13} aria-hidden="true" /> Inbox
              {attentionCount > 0 && <b>{attentionCount}</b>}
            </button>
            <button type="button" aria-pressed={mode === "browse"} onClick={() => setMode("browse")}>
              <Workflow size={13} aria-hidden="true" /> Browse
            </button>
          </div>
          <SearchField
            value={query}
            onChange={setQuery}
            label={mode === "inbox" ? "Search threads" : `Search ${browse}`}
            placeholder={mode === "inbox" ? "Search threads" : `Search ${browse}`}
          />
          {mode === "browse" && (
            <div className="cv-browse-tabs" role="tablist" aria-label="Record type">
              {(["runs", "deliveries", "pools", "bindings"] as const).map((item) => (
                <button key={item} type="button" role="tab" aria-selected={browse === item} onClick={() => setBrowse(item)}>
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="cv-inbox-body">
          {mode === "inbox" ? (
            filtered.length === 0 ? (
              <EmptyState filtered title="No threads match" description="Clear the search, or switch to Browse to look through every record." />
            ) : (
              groups.map((group) => {
                const list = filtered.filter((thread) => groupOf(thread) === group.id);
                if (!list.length) return null;
                return (
                  <section key={group.id} className="cv-group">
                    <h3>
                      {group.label} <span>{list.length}</span>
                    </h3>
                    <ul>
                      {list.map((thread) => (
                        <InboxRow
                          key={thread.id}
                          thread={thread}
                          active={thread.id === activeId}
                          unread={isUnread(thread.id)}
                          live={live}
                          onSelect={() => selectThread(thread.id)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })
            )
          ) : (
            <BrowseList
              tab={browse}
              query={query}
              live={live}
              role={role}
              open={open}
              onRun={(run) => {
                const thread = threads.find((item) => item.runId === run.id);
                if (thread) selectThread(thread.id);
                else open({ kind: "run", runId: run.id });
              }}
              onDelivery={(delivery) => {
                const thread = threads.find((item) => item.deliveryId === delivery.id && !item.runId);
                if (thread && (!thread.adminOnly || role === "pool-admin")) {
                  selectThread(thread.id);
                  return;
                }
                const owner = threads.find((item) => item.deliveryId === delivery.id);
                if (owner) selectThread(owner.id);
                open({ kind: "delivery", deliveryId: delivery.id });
              }}
            />
          )}
        </div>
      </nav>

      <main className="cv-center">
        {visible
          .filter((thread) => visited.includes(thread.id))
          .map((thread) => (
            <ThreadView
              key={`${thread.id}-${role}`}
              thread={thread}
              active={thread.id === activeId}
              role={role}
              live={live}
              open={open}
              goThread={selectThread}
              onBack={() => setPane("inbox")}
              registry={registry}
            />
          ))}
      </main>

      {tabs.length > 0 && (
        <Canvas
          tabs={tabs}
          active={activeTab}
          onSelect={setActiveTab}
          onClose={closeTab}
          onCloseAll={() => {
            setTabs([]);
            setExpanded(false);
            setPane("thread");
          }}
          expanded={expanded}
          onToggleExpanded={() => setExpanded(!expanded)}
          onBack={() => setPane(returnTo.current)}
          role={role}
          open={open}
          onAsk={(entry) => {
            registry.current[activeId]?.ask(`Explain line ${entry.seq}`, entry);
            setPane("thread");
          }}
          onNote={(text) => registry.current[activeId]?.note(text)}
        />
      )}
    </div>
  );
}
