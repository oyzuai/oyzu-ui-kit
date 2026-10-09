import { Fragment, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleCheck,
  CornerDownLeft,
  FileText,
  GitPullRequest,
  HeartPulse,
  KeyRound,
  Minus,
  Search,
  Server,
  Sparkles,
  Stethoscope,
  Terminal,
  TriangleAlert,
  Waypoints,
  Webhook,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../../components/ui/tooltip";
import { AssistantComposer, AssistantMessages, BlockView, useAssistant } from "../assistant";
import type { ActionId, AssistantContext, Reply } from "../assistant-engine";
import {
  bindings,
  clock,
  deliveries,
  failedRun,
  poolLogs,
  pools,
  runs,
  stateLabel,
  type Binding,
  type Delivery,
  type Manager,
  type PoolLog,
  type Role,
} from "../model";
import { StateChip, actionResult } from "../shared";

// Shared pieces of the Trace direction: navigation targets, inline confirms,
// inline answer cards, and the Rules, Capacity, Ask and command-bar views.

export type StageFocus = "received" | "verified" | "matched";
export type GoTarget =
  | { to: "run"; runId: string; attempt?: number; seq?: number }
  | { to: "delivery"; id: string; focus?: StageFocus }
  | { to: "checks"; commit: string }
  | { to: "change"; id: string }
  | { to: "binding"; id: string }
  | { to: "pool"; id?: string; job?: string; manager?: string }
  | { to: "ask" };
export type Go = (target: GoTarget) => void;
export type PoolFocus = { id?: string; job?: string; manager?: string; n?: number };
export type Focus = { id: string; n: number };
export type HomeAssistant = ReturnType<typeof useAssistant>;

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (callback) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const shortcutLabel =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "⌘K" : "Ctrl K";

/** Routes assistant actions: open-* actions navigate, the rest confirm with a note. */
export function actionHandler(go: Go, note: (text: string) => void, drain?: (id: string) => void) {
  return (id: ActionId, target?: string) => {
    switch (id) {
      case "open-logs":
        return go({ to: "run", runId: failedRun.id, attempt: 2 });
      case "open-attempt-1":
        return go({ to: "run", runId: failedRun.id, attempt: 1 });
      case "open-run":
        return go({ to: "run", runId: target ?? failedRun.id });
      case "diagnostics":
        return go(target?.startsWith("mgr-") ? { to: "pool", manager: target } : { to: "pool", job: target ?? "job-5521" });
      case "open-delivery":
        return go({ to: "delivery", id: target ?? "dlv-7f12" });
      case "open-binding":
        return go({ to: "binding", id: target ?? "pr-affected" });
      case "open-pool":
        return go({ to: "pool", id: target ?? "acme-onprem" });
      case "register-repo":
        note("Asked the payments project admins to register acme/ledger-tools. Replay the delivery once it's registered.");
        return;
      default: {
        if (id === "drain-manager") drain?.(target ?? "mgr-onprem-02");
        const text = actionResult(id, target);
        if (text) note(text);
      }
    }
  };
}

export function deliveryLabel(delivery: Delivery) {
  if (delivery.outcome === "rejected") return `${delivery.connector}: 12 rejected`;
  if (delivery.pr) {
    const repo = delivery.repository === "acme/payments-api" ? "" : `${delivery.repository} `;
    return `${repo}PR #${delivery.pr.number} ${delivery.event.split(".")[1] ?? ""}`.trim();
  }
  return `${delivery.event} to ${delivery.ref}`;
}

// ---------------------------------------------------------------- confirm

/** A button that asks first, inline, then shows what happened. Lay it out in a
    `.tr-actions` row: the confirmation drops to its own line under the row. */
export function ConfirmInline({
  label,
  icon,
  prompt,
  done,
  confirmLabel = "Confirm",
  variant = "outline",
  onConfirm,
}: {
  label: string;
  icon?: ReactNode;
  prompt: string;
  done: string;
  confirmLabel?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  onConfirm?: () => void;
}) {
  const [stage, setStage] = useState<"idle" | "confirm" | "done">("idle");
  return (
    <div className="tr-confirm-slot">
      <Button
        size="sm"
        variant={variant}
        aria-expanded={stage === "confirm"}
        disabled={stage === "done"}
        onClick={() => setStage(stage === "confirm" ? "idle" : "confirm")}
      >
        {stage === "done" ? <CircleCheck /> : icon}
        {label}
      </Button>
      {stage === "confirm" && (
        <div className="tr-confirm" role="group" aria-label={`Confirm ${label.toLowerCase()}`}>
          <p>{prompt}</p>
          <div>
            <Button
              size="sm"
              variant={variant === "destructive" ? "destructive" : "default"}
              onClick={() => {
                onConfirm?.();
                setStage("done");
              }}
            >
              {confirmLabel}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setStage("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {stage === "done" && (
        <p className="tr-done" role="status">
          <CircleCheck size={13} aria-hidden="true" /> {done}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- inline answers

export type Explain = {
  id: string;
  /** Chip text, short. */
  chip: string;
  question: string;
  context: AssistantContext;
  /** A scripted answer for cases the shared engine has no branch for. */
  local?: Reply;
};

export function ExplainChip({
  explain,
  open,
  onToggle,
  quiet,
}: {
  explain: Explain;
  open: boolean;
  onToggle: () => void;
  quiet?: boolean;
}) {
  return (
    <button
      type="button"
      className="tr-explain-chip"
      data-quiet={quiet || undefined}
      aria-expanded={open}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <Sparkles size={12} aria-hidden="true" />
      {explain.chip}
    </button>
  );
}

/** The answer card that opens right under a trace, with a follow-up composer. */
export function ExplainCard({
  explain,
  role,
  go,
  drain,
  onClose,
}: {
  explain: Explain;
  role: Role;
  go: Go;
  drain?: (id: string) => void;
  onClose: () => void;
}) {
  const assistant = useAssistant(explain.context, role);
  const onCite = (runId: string, attempt: number, seq: number) => go({ to: "run", runId, attempt, seq });
  const onAction = actionHandler(go, assistant.note, drain);
  useEffect(() => {
    if (explain.local) return;
    // Deferred so a development double-mount doesn't ask twice.
    const timer = window.setTimeout(() => assistant.ask(explain.question), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const followUps = assistant.suggestions.filter((s) => s !== explain.question).slice(0, 3);
  return (
    <section className="tr-answer" aria-label={`Answer: ${explain.question}`}>
      <header>
        <span className="as-avatar" aria-hidden="true">
          <Sparkles size={13} />
        </span>
        <div>
          <strong>{explain.question}</strong>
          <small>Reads the records on this trace. Masked values stay masked.</small>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Close answer" onClick={onClose}>
          <X />
        </Button>
      </header>
      <div className="tr-answer-body">
        {explain.local && (
          <div className="as-messages">
            <article className="as-reply">
              <span className="as-avatar" aria-hidden="true">
                <Sparkles size={13} />
              </span>
              <div className="as-body">
                {explain.local.blocks.map((block, index) => (
                  <BlockView key={index} block={block} animate={false} onCite={onCite} onAction={onAction} />
                ))}
                <p className="tr-sources">Read: {explain.local.sources.join(" · ")}</p>
              </div>
            </article>
          </div>
        )}
        <AssistantMessages
          messages={explain.local ? assistant.messages : assistant.messages.slice(1)}
          onCite={onCite}
          onAction={onAction}
        />
      </div>
      <AssistantComposer
        onSend={(text) => assistant.ask(text)}
        suggestions={followUps}
        placeholder="Ask a follow-up…"
      />
    </section>
  );
}

// ---------------------------------------------------------------- rules

type Part = string | { k: "event" | "scope" | "do" | "check" | "filter"; t: string };
const sentences: Record<string, { when: Part[]; does: Part[]; report: Part[] }> = {
  "pr-affected": {
    when: ["When ", { k: "event", t: "a pull request that isn't a draft" }, " changes ", { k: "scope", t: "any repository in acme" }],
    does: [{ k: "do", t: "build what's affected" }, " since the merge base with main"],
    report: ["report as ", { k: "check", t: "oyzu / build" }],
  },
  "main-build": {
    when: ["When ", { k: "event", t: "someone pushes to main" }, " in ", { k: "scope", t: "any repository in acme" }],
    does: [{ k: "do", t: "build everything" }],
    report: ["report as ", { k: "check", t: "oyzu / build" }],
  },
  "payments-policy": {
    when: [
      "When ",
      { k: "event", t: "a pull request" },
      " changes ",
      { k: "filter", t: "policy/** or deploy/**" },
      " in ",
      { k: "scope", t: "acme/payments-api" },
    ],
    does: [{ k: "do", t: "run policy-check" }, " and ", { k: "do", t: "build api-image" }],
    report: ["report as ", { k: "check", t: "oyzu / policy" }, " and ", { k: "check", t: "oyzu / api-image" }],
  },
  "release-tags": {
    when: ["When ", { k: "filter", t: "release-managers" }, " push ", { k: "event", t: "a v* tag" }, " to ", { k: "scope", t: "acme/payments-*" }],
    does: [{ k: "do", t: "build everything" }],
    report: ["report as ", { k: "check", t: "oyzu / release" }],
  },
  nightly: {
    when: [{ k: "event", t: "Every day at 2:00 AM ET" }, " on ", { k: "filter", t: "main" }, " of ", { k: "scope", t: "acme/payments-api" }],
    does: [{ k: "do", t: "build for all platforms" }],
    report: [{ k: "check", t: "show in the portal only" }, " (no GitHub check)"],
  },
};

function Sentence({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, index) =>
        typeof part === "string" ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <span key={index} className="tr-tok" data-kind={part.k}>
            {part.t}
          </span>
        ),
      )}
    </>
  );
}

type Dot = { delivery: Delivery; verdict: "hit" | "miss" | "none"; reason: string };
function dotsFor(binding: Binding): Dot[] {
  return [...deliveries]
    .sort((a, b) => Date.parse(a.receivedAt) - Date.parse(b.receivedAt))
    .map((delivery) => {
      const evaluation = delivery.evaluations.find((e) => e.bindingId === binding.id);
      if (evaluation) return { delivery, verdict: evaluation.matched ? "hit" : "miss", reason: evaluation.reason };
      const stopped = delivery.stages.find((stage) => stage.status === "fail");
      return { delivery, verdict: "none", reason: `Not evaluated. ${stopped?.detail ?? delivery.outcomeLabel}` };
    });
}

const verdictWord = { hit: "Matched", miss: "Not matched", none: "Not evaluated" } as const;

function RuleCard({
  binding,
  focused,
  nonce,
  role,
  go,
}: {
  binding: Binding;
  focused: boolean;
  nonce?: number;
  role: Role;
  go: Go;
}) {
  const ref = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(binding.enabled);
  const [pending, setPending] = useState<boolean>();
  const [changed, setChanged] = useState<string>();
  const [dot, setDot] = useState<string>();
  const [asking, setAsking] = useState(false);
  const sentence = sentences[binding.id];
  const dots = dotsFor(binding);
  const selected = dots.find((d) => d.delivery.id === dot);
  const hits = dots.filter((d) => d.verdict === "hit").length;
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focused, nonce]);
  const explain: Explain = {
    id: `binding-${binding.id}`,
    chip: "What did this match today?",
    question: "What did this binding match today?",
    context: { kind: "binding", bindingId: binding.id },
  };
  return (
    <article ref={ref} className="tr-rule" data-focus={focused || undefined} data-enabled={enabled}>
      <header className="tr-rule-head">
        <div>
          <h3 className="tr-h3">{binding.name}</h3>
          <div className="tr-tags">
            <span className="tr-tag">{binding.scope}</span>
            {binding.mandatory && <span className="tr-tag" data-tone="ink">Mandatory</span>}
            <span className="tr-tag">{binding.cancelPrevious ? "Cancels previous runs" : "Never cancels"}</span>
            {!enabled && <span className="tr-tag" data-tone="warn">Off</span>}
          </div>
        </div>
        <label className="tr-switch">
          <span>{enabled ? "On" : "Off"}</span>
          <Switch
            checked={pending === undefined ? enabled : pending}
            onCheckedChange={(next) => {
              setChanged(undefined);
              setPending(next === enabled ? undefined : next);
            }}
            aria-label={`${binding.name} enabled`}
          />
        </label>
      </header>
      {pending !== undefined && (
        <div className="tr-confirm" role="group" aria-label="Confirm binding change">
          <p>
            {pending
              ? `Turn on "${binding.name}"? It starts matching new deliveries right away; past deliveries aren't replayed.`
              : `Turn off "${binding.name}"? ${
                  binding.mandatory
                    ? "It's mandatory, so pull requests that need its check can't merge until it's back on."
                    : "Deliveries stop starting its runs."
                } The change is audited.`}
          </p>
          <div>
            <Button
              size="sm"
              onClick={() => {
                setEnabled(pending);
                setPending(undefined);
                setChanged(pending ? "Turned on by you just now. Recorded in the audit log." : "Turned off by you just now. Recorded in the audit log.");
              }}
            >
              {pending ? "Turn on" : "Turn off"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPending(undefined)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {changed && (
        <p className="tr-done" role="status">
          <CircleCheck size={13} aria-hidden="true" /> {changed}
        </p>
      )}
      <ol className="tr-flow" aria-label="What this binding does">
        <li data-step="when">
          <span className="tr-eyebrow">When</span>
          <p>
            <Sentence parts={sentence.when} />
          </p>
        </li>
        <li data-step="do">
          <span className="tr-eyebrow">Then</span>
          <p>
            <Sentence parts={sentence.does} />
          </p>
        </li>
        <li data-step="report">
          <span className="tr-eyebrow">Report</span>
          <p>
            <Sentence parts={sentence.report} />
          </p>
        </li>
      </ol>
      <div className="tr-rule-foot">
        <div className="tr-dots-wrap">
          <span className="tr-eyebrow">
            Today · {hits} of {dots.length} deliveries matched
          </span>
          <div className="tr-dots">
            {dots.map((d) => (
              <Tooltip key={d.delivery.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="tr-dot"
                    data-verdict={d.verdict}
                    aria-pressed={dot === d.delivery.id}
                    aria-label={`${deliveryLabel(d.delivery)}, ${clock(d.delivery.receivedAt)}: ${verdictWord[d.verdict]}`}
                    onClick={() => setDot(dot === d.delivery.id ? undefined : d.delivery.id)}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {deliveryLabel(d.delivery)} · {clock(d.delivery.receivedAt)}: {verdictWord[d.verdict]}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
        {sentence && (
          <ExplainChip explain={explain} open={asking} onToggle={() => setAsking(!asking)} />
        )}
      </div>
      {selected && (
        <div className="tr-dot-detail" data-verdict={selected.verdict}>
          <span className="tr-dot" data-verdict={selected.verdict} aria-hidden="true" />
          <div>
            <strong>
              {deliveryLabel(selected.delivery)} · {clock(selected.delivery.receivedAt)}
            </strong>
            <p>
              {verdictWord[selected.verdict]}: {selected.reason}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => go({ to: "delivery", id: selected.delivery.id, focus: "matched" })}>
            Open delivery <ArrowRight />
          </Button>
        </div>
      )}
      {asking && <ExplainCard explain={explain} role={role} go={go} onClose={() => setAsking(false)} />}
    </article>
  );
}

export function RulesView({ focus, role, go }: { focus?: Focus; role: Role; go: Go }) {
  return (
    <div className="tr-view">
      <header className="tr-head">
        <span className="tr-eyebrow">acme · payments</span>
        <h1 className="tr-h1">Rules</h1>
        <p>
          Trigger bindings decide which GitHub events start runs. They live on the platform, not in the repository, and
          every change is audited. Each dot is one delivery today and whether this rule matched it.
        </p>
      </header>
      <div className="tr-rules">
        {bindings.map((binding) => (
          <RuleCard key={binding.id} binding={binding} focused={focus?.id === binding.id} nonce={focus?.n} role={role} go={go} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- capacity

type LogBlock = { kind: "job"; jobId: string; rows: PoolLog[] } | { kind: "row"; row: PoolLog };

function toBlocks(rows: PoolLog[]): LogBlock[] {
  const out: LogBlock[] = [];
  for (const row of rows) {
    const last = out[out.length - 1];
    if (row.jobId && last?.kind === "job" && last.jobId === row.jobId) last.rows.push(row);
    else if (row.jobId) out.push({ kind: "job", jobId: row.jobId, rows: [row] });
    else out.push({ kind: "row", row });
  }
  return out;
}

/** Consecutive rows with the same message collapse into one step (heartbeat failed ×3). */
function toSteps(rows: PoolLog[]) {
  const steps: PoolLog[][] = [];
  for (const row of rows) {
    const last = steps[steps.length - 1];
    if (last && last[0].msg === row.msg) last.push(row);
    else steps.push([row]);
  }
  return steps;
}

function Fields({ fields }: { fields: Record<string, string> }) {
  return (
    <span className="tr-fields">
      {Object.entries(fields).map(([key, value]) => (
        <code key={key}>
          {key}={value}
        </code>
      ))}
    </span>
  );
}

function LogStep({ rows }: { rows: PoolLog[] }) {
  const [open, setOpen] = useState(false);
  const first = rows[0];
  const level = rows.some((r) => r.level === "error") ? "error" : rows.some((r) => r.level === "warn") ? "warn" : "info";
  return (
    <li className="tr-logstep" data-level={level}>
      <span className="tr-logpip" aria-hidden="true" />
      <time>{first.t}</time>
      <div className="tr-logmain">
        <strong>
          {first.msg}
          {rows.length > 1 && <span className="tr-times">×{rows.length}</span>}
        </strong>
        <span className="tr-logmgr">{first.manager}</span>
        {rows.length > 1 ? (
          <>
            <button type="button" className="tr-linkish" aria-expanded={open} onClick={() => setOpen(!open)}>
              {open ? "Hide" : "Show"} {rows.length} entries
            </button>
            {open && (
              <ul className="tr-logsub">
                {rows.map((row) => (
                  <li key={row.t}>
                    <time>{row.t}</time> <Fields fields={row.fields} />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <Fields fields={first.fields} />
        )}
      </div>
    </li>
  );
}

function PoolLogTimeline({ focus, setFocus, go }: { focus: PoolFocus; setFocus: (focus: PoolFocus) => void; go: Go }) {
  const ref = useRef<HTMLElement>(null);
  const filters = [
    ...Array.from(new Set(poolLogs.map((row) => row.jobId).filter(Boolean) as string[])).map((job) => ({ job })),
    ...Array.from(new Set(poolLogs.map((row) => row.manager))).map((manager) => ({ manager })),
  ];
  const rows = poolLogs.filter((row) =>
    focus.job ? row.jobId === focus.job : focus.manager ? row.manager === focus.manager : true,
  );
  const blocks = toBlocks(rows);
  useEffect(() => {
    if (focus.job || focus.manager) ref.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus.job, focus.manager, focus.n]);
  return (
    <section ref={ref} className="tr-poollog" aria-labelledby="tr-poollog-title">
      <header className="tr-section-head">
        <div>
          <span className="tr-eyebrow">Pool admins only</span>
          <h2 className="tr-h2" id="tr-poollog-title">
            Pool log · Acme on-prem
          </h2>
          <p>Operational records from managers and runners. Never build output; that stays in the run log.</p>
        </div>
      </header>
      <div className="tr-filter" role="group" aria-label="Filter pool log">
        <button type="button" aria-pressed={!focus.job && !focus.manager} onClick={() => setFocus({})}>
          All
        </button>
        {filters.map((filter) => {
          const label = "job" in filter ? filter.job : filter.manager;
          const active = "job" in filter ? focus.job === filter.job : focus.manager === filter.manager;
          return (
            <button key={label} type="button" aria-pressed={active} onClick={() => setFocus(active ? {} : filter)}>
              {label}
            </button>
          );
        })}
      </div>
      {focus.job && (
        <div className="tr-focusnote">
          <Stethoscope size={15} aria-hidden="true" />
          <p>
            Runner diagnostics for <code>{focus.job}</code>
            {focus.job === "job-5521" ? ": run 9012, attempt 1." : focus.job === "job-5530" ? ": run 9012, attempt 2." : "."}
          </p>
          {(focus.job === "job-5521" || focus.job === "job-5530") && (
            <Button size="sm" variant="outline" onClick={() => go({ to: "run", runId: failedRun.id, attempt: focus.job === "job-5521" ? 1 : 2 })}>
              <FileText /> Open run log
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setFocus({})}>
            Clear filter
          </Button>
        </div>
      )}
      {blocks.length === 0 && (
        <p className="tr-muted">No pool log entries for this filter. This pool only ships logs for Acme on-prem managers.</p>
      )}
      <div className="tr-logblocks">
        {blocks.map((block, index) => {
          if (block.kind === "row")
            return (
              <ol key={index} className="tr-logsteps is-loose">
                <LogStep rows={[block.row]} />
              </ol>
            );
          const failed = block.rows.some((row) => row.level === "error");
          const first = block.rows[0];
          return (
            <section key={index} className="tr-jobblock" data-incident={failed || undefined} aria-label={`Job ${block.jobId}`}>
              <header>
                <span className="tr-jobid">{block.jobId}</span>
                <span>
                  run {first.fields.run ?? "—"}, attempt {first.fields.attempt ?? "—"} · {first.manager}
                </span>
                {failed ? (
                  <StateChip state="failed" size="sm" label="Executor lost" />
                ) : (
                  <StateChip state="succeeded" size="sm" label="Finished" />
                )}
              </header>
              {failed && (
                <p className="tr-incident">
                  <TriangleAlert size={14} aria-hidden="true" />
                  Three heartbeats failed through proxy.corp.acme.example (two timeouts, then HTTP 407), so the 90s lease
                  expired and the executor was stopped. The platform retried the run as attempt 2 on mgr-onprem-01.
                </p>
              )}
              <ol className="tr-logsteps">
                {toSteps(block.rows).map((step) => (
                  <LogStep key={step[0].t} rows={step} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </section>
  );
}

function ManagerBranch({
  manager,
  drained,
  drain,
  showLogs,
  open,
  onToggle,
}: {
  manager: Manager;
  drained: boolean;
  drain: () => void;
  showLogs?: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const status = drained ? "paused" : manager.status;
  return (
    <li className="tr-branch" data-tone={status === "healthy" ? "ok" : status === "warning" ? "warn" : "skip"} data-live={status === "healthy" || undefined}>
      <button type="button" className="tr-mgr" aria-expanded={open} onClick={onToggle}>
        <span className="tr-beat" data-status={status} aria-hidden="true" />
        <span className="tr-mgr-id">{manager.id}</span>
        <span className="tr-mgr-host">{manager.host}</span>
        <span className="tr-mgr-meta">
          <span>
            <HeartPulse size={12} aria-hidden="true" /> {manager.heartbeat}
          </span>
          <span>{manager.activeJobs} {manager.activeJobs === 1 ? "job" : "jobs"}</span>
          <span>
            {manager.adapter} · {manager.version}
          </span>
          <span data-warn={manager.keyAgeDays > 28 || undefined}>
            <KeyRound size={12} aria-hidden="true" /> key {manager.keyAgeDays}d
          </span>
        </span>
        <StateChip state={status} size="sm" label={drained ? "Draining" : undefined} />
      </button>
      {open && (
        <div className="tr-mgr-detail">
          {manager.note && <p>{manager.note}</p>}
          {manager.version !== "0.4.1" && <p>Runs manager {manager.version}; the pool default is 0.4.1.</p>}
          <div className="tr-actions">
            {showLogs && (
              <Button size="sm" variant="outline" onClick={showLogs}>
                <Stethoscope /> Pool log for {manager.id}
              </Button>
            )}
            {!drained && manager.status !== "paused" && (
              <ConfirmInline
                label={`Drain ${manager.id}`}
                prompt={`Drain ${manager.id}? It stops claiming new jobs; jobs already running finish. Undo by resuming it.`}
                done={`${manager.id} is draining. It finishes running jobs and claims nothing new.`}
                confirmLabel="Drain"
                onConfirm={drain}
              />
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Slots({ capacity, busy, queued }: { capacity: number; busy: number; queued: number }) {
  return (
    <span className="tr-slots" role="img" aria-label={`${busy} of ${capacity} slots busy, ${queued} queued`}>
      {Array.from({ length: capacity }, (_, index) => (
        <i key={index} data-busy={index < busy || undefined} />
      ))}
      {Array.from({ length: queued }, (_, index) => (
        <i key={`q${index}`} data-queued />
      ))}
    </span>
  );
}

export function CapacityView({
  role,
  focus,
  setFocus,
  go,
  drained,
  drain,
}: {
  role: Role;
  focus: PoolFocus;
  setFocus: (focus: PoolFocus) => void;
  go: Go;
  drained: string[];
  drain: (id: string) => void;
}) {
  const admin = role === "pool-admin";
  const [shipping, setShipping] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pools.map((pool) => [pool.id, pool.shipping])),
  );
  const [pendingShip, setPendingShip] = useState<string>();
  const [openMgr, setOpenMgr] = useState<string | undefined>(focus.manager);
  const [asking, setAsking] = useState(false);
  const poolRefs = useRef<Record<string, HTMLElement | null>>({});
  useEffect(() => {
    if (focus.id && !focus.job && !focus.manager)
      poolRefs.current[focus.id]?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [focus.id, focus.job, focus.manager, focus.n]);
  useEffect(() => {
    if (focus.manager) setOpenMgr(focus.manager);
  }, [focus.manager, focus.n]);
  const explain: Explain = admin
    ? { id: "pool-admin", chip: "Why is mgr-onprem-02 unhealthy?", question: "Why is mgr-onprem-02 unhealthy?", context: { kind: "pool", poolId: "acme-onprem" } }
    : { id: "pool-member", chip: "Is the pool healthy?", question: "Is the pool healthy?", context: { kind: "pool", poolId: "acme-onprem" } };
  return (
    <div className="tr-view">
      <header className="tr-head">
        <span className="tr-eyebrow">acme · payments</span>
        <h1 className="tr-h1">Capacity</h1>
        <p>
          Pools run your builds. Managers connect out to Oyzu, so no inbound ports are opened in your network.
          {admin ? " As a pool admin you can drain managers and read pool logs." : ""}
        </p>
        <div className="tr-head-actions">
          <ExplainChip explain={explain} open={asking} onToggle={() => setAsking(!asking)} />
        </div>
      </header>
      {asking && <ExplainCard explain={explain} role={role} go={go} drain={drain} onClose={() => setAsking(false)} />}
      {!admin && (
        <p className="tr-rolenote">
          <KeyRound size={14} aria-hidden="true" /> Manager details and pool logs are for pool admins. When a pool problem
          affects one of your runs, its run log says so in a system line.
        </p>
      )}
      <div className="tr-pools">
        {pools.map((pool) => {
          const managersHealthy = pool.managers.filter((m) => m.status === "healthy" && !drained.includes(m.id)).length;
          return (
            <article
              key={pool.id}
              ref={(node) => {
                poolRefs.current[pool.id] = node;
              }}
              className="tr-pool"
              data-focus={focus.id === pool.id || undefined}
            >
              <header className="tr-pool-head">
                <div>
                  <h2 className="tr-h2">{pool.name}</h2>
                  <div className="tr-tags">
                    <span className="tr-tag">{pool.kind}</span>
                    <span className="tr-tag">{pool.scope}</span>
                    <span className="tr-tag" data-tone={pool.releaseEligible ? "ink" : "warn"}>
                      {pool.releaseEligible ? "Release-eligible" : "Not release-eligible"}
                    </span>
                  </div>
                </div>
                <StateChip state={pool.status} />
              </header>
              <div className="tr-pool-stats">
                <div>
                  <span className="tr-eyebrow">Slots</span>
                  <Slots capacity={pool.capacity} busy={pool.busy} queued={pool.queued} />
                  <small>
                    {pool.busy} of {pool.capacity} busy · {pool.queued} queued
                  </small>
                </div>
                <div>
                  <span className="tr-eyebrow">Managers</span>
                  <strong>
                    {managersHealthy} of {pool.managers.length} claiming work
                  </strong>
                  {!pool.releaseEligible && <small>Developer machines never build releases.</small>}
                </div>
                {admin && (
                  <label className="tr-switch">
                    <span>
                      Ship pool logs
                      <small>{shipping[pool.id] ? "Sent to Oyzu for 14 days" : "Kept on the host"}</small>
                    </span>
                    <Switch
                      checked={pendingShip === pool.id ? !shipping[pool.id] : shipping[pool.id]}
                      onCheckedChange={() => setPendingShip(pendingShip === pool.id ? undefined : pool.id)}
                      aria-label={`Ship pool logs for ${pool.name}`}
                    />
                  </label>
                )}
              </div>
              {pendingShip === pool.id && (
                <div className="tr-confirm" role="group" aria-label="Confirm log shipping change">
                  <p>
                    {shipping[pool.id]
                      ? `Stop shipping pool logs for ${pool.name}? Runner diagnostics stop working for new jobs; logs stay on the managers' hosts.`
                      : `Start shipping pool logs for ${pool.name}? Manager and runner records (never build output) are kept for 14 days and visible to pool admins.`}
                  </p>
                  <div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setShipping({ ...shipping, [pool.id]: !shipping[pool.id] });
                        setPendingShip(undefined);
                      }}
                    >
                      {shipping[pool.id] ? "Stop shipping" : "Start shipping"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingShip(undefined)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {admin ? (
                <div className="tr-poollane">
                  <div className="tr-origin">
                    <img src="/brand/oyzu-mark-color.svg" alt="" width={18} height={18} />
                    <span>
                      <strong>Oyzu</strong>
                      <small>outbound only</small>
                    </span>
                  </div>
                  <span className="tr-edge" data-tone="ok" aria-hidden="true" />
                  <ul className="tr-fan" aria-label={`${pool.name} managers`}>
                    {pool.managers.map((manager) => (
                      <ManagerBranch
                        key={manager.id}
                        manager={manager}
                        drained={drained.includes(manager.id)}
                        drain={() => drain(manager.id)}
                        showLogs={pool.id === "acme-onprem" ? () => setFocus({ manager: manager.id }) : undefined}
                        open={openMgr === manager.id}
                        onToggle={() => setOpenMgr(openMgr === manager.id ? undefined : manager.id)}
                      />
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="tr-muted">
                  {pool.status === "healthy"
                    ? "Running normally."
                    : pool.status === "warning"
                      ? "One manager is reporting late, so jobs may wait a little longer. Builds that lose an executor retry automatically."
                      : "Paused. This machine is asleep; runs wait for another eligible pool."}
                </p>
              )}
            </article>
          );
        })}
      </div>
      {admin && <PoolLogTimeline focus={focus} setFocus={setFocus} go={go} />}
    </div>
  );
}

// ---------------------------------------------------------------- ask

export function AskView({ assistant, go, drain }: { assistant: HomeAssistant; go: Go; drain: (id: string) => void }) {
  const onCite = (runId: string, attempt: number, seq: number) => go({ to: "run", runId, attempt, seq });
  const onAction = actionHandler(go, assistant.note, drain);
  return (
    <div className="tr-view tr-ask">
      <header className="tr-head">
        <span className="tr-eyebrow">acme · payments</span>
        <h1 className="tr-h1">Ask</h1>
        <p>Questions about any change, rule or pool. Answers cite the records they read, and actions always ask first.</p>
        {assistant.messages.length > 0 && (
          <div className="tr-head-actions">
            <Button size="sm" variant="ghost" onClick={assistant.reset}>
              New conversation
            </Button>
          </div>
        )}
      </header>
      <div className="tr-ask-thread">
        <AssistantMessages
          messages={assistant.messages}
          onCite={onCite}
          onAction={onAction}
          empty={
            <div className="tr-ask-starters">
              {assistant.suggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => assistant.ask(suggestion)}>
                  <Sparkles size={14} aria-hidden="true" />
                  <span>{suggestion}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </button>
              ))}
            </div>
          }
        />
      </div>
      <div className="tr-ask-composer">
        <AssistantComposer
          onSend={(text) => assistant.ask(text)}
          suggestions={assistant.messages.length ? assistant.suggestions : []}
          placeholder="Ask about a run, pull request, webhook or pool…"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- command bar

type Jump = { id: string; group: string; label: string; meta: string; icon: LucideIcon; target: GoTarget };

function jumpTargets(role: Role): Jump[] {
  const list: Jump[] = [
    { id: "chg-482", group: "Pull requests", label: "PR #482 Retry refunds with the original idempotency key", meta: "feat/refund-retries · 9c41e2a · dana.okafor", icon: GitPullRequest, target: { to: "change", id: "pr-482" } },
    { id: "chg-483", group: "Pull requests", label: "PR #483 Spike: FX rounding modes (draft)", meta: "spike/fx-rounding · c3a9e10 · jo.pereira", icon: GitPullRequest, target: { to: "change", id: "pr-483" } },
    { id: "chg-480", group: "Pull requests", label: "PR #480 Shorten ledger client timeouts", meta: "fix/ledger-timeouts · b81e04c · sam.ito", icon: GitPullRequest, target: { to: "change", id: "pr-480" } },
    { id: "chg-12", group: "Pull requests", label: "acme/ledger-tools #12 CSV export", meta: "repository not registered", icon: GitPullRequest, target: { to: "change", id: "ledger-12" } },
    { id: "chg-main", group: "Pull requests", label: "main · Merge pull request #477", meta: "3f2a9c1 · lee.marsh", icon: Waypoints, target: { to: "change", id: "main" } },
    ...runs.map((run) => ({
      id: `run-${run.id}`,
      group: "Runs",
      label: `Run ${run.number} · ${run.check === "manual" ? "manual" : run.check}`,
      meta: `${stateLabel[run.state]} · ${run.pr ? `PR #${run.pr}` : run.ref} · ${run.commit.slice(0, 7)}`,
      icon: Terminal,
      target: { to: "run", runId: run.id } as GoTarget,
    })),
    ...deliveries.map((delivery) => ({
      id: `dlv-${delivery.id}`,
      group: "Deliveries",
      label: `${delivery.id} · ${deliveryLabel(delivery)}`,
      meta: `${delivery.outcomeLabel} · ${clock(delivery.receivedAt)}`,
      icon: Webhook,
      target: { to: "delivery", id: delivery.id } as GoTarget,
    })),
    ...bindings.map((binding) => ({
      id: `bnd-${binding.id}`,
      group: "Bindings",
      label: binding.name,
      meta: `${binding.scope} · ${binding.actions.map((a) => a.check).join(", ")}`,
      icon: Workflow,
      target: { to: "binding", id: binding.id } as GoTarget,
    })),
    ...pools.map((pool) => ({
      id: `pool-${pool.id}`,
      group: "Pools",
      label: pool.name,
      meta: `${pool.kind} · ${pool.status}`,
      icon: Server,
      target: { to: "pool", id: pool.id } as GoTarget,
    })),
  ];
  if (role === "pool-admin")
    for (const pool of pools)
      for (const manager of pool.managers)
        list.push({ id: `mgr-${manager.id}`, group: "Pools", label: manager.id, meta: `${pool.name} · ${manager.status} · ${manager.host}`, icon: Server, target: { to: "pool", manager: manager.id } });
  return list;
}

const starterJumps = ["run-01jab9r2f6k8m0p2r4t6v8x0z2", "chg-483", "dlv-dlv-rej", "pool-acme-onprem"];

type Row = { type: "ask"; text: string } | { type: "jump"; jump: Jump };

export function CommandPalette({
  open,
  onOpenChange,
  assistant,
  go,
  role,
  drain,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assistant: HomeAssistant;
  go: Go;
  role: Role;
  drain: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"search" | "answer">("search");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const all = useMemo(() => jumpTargets(role), [role]);
  const q = query.trim().toLowerCase();
  const rows: Row[] = useMemo(() => {
    if (!q)
      return [
        ...assistant.suggestions.slice(0, 3).map((text) => ({ type: "ask" as const, text })),
        ...all.filter((jump) => starterJumps.includes(jump.id)).map((jump) => ({ type: "jump" as const, jump })),
      ];
    const tokens = q.split(/\s+/);
    const hits = all
      .filter((jump) => {
        const hay = `${jump.label} ${jump.meta} ${jump.group} ${jump.id}`.toLowerCase();
        return tokens.every((token) => hay.includes(token));
      })
      .slice(0, 8)
      .map((jump) => ({ type: "jump" as const, jump }));
    return [...hits, { type: "ask" as const, text: query.trim() }];
  }, [q, query, all, assistant.suggestions]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (!open) {
      setQuery("");
      setMode("search");
    }
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const choose = (row: Row) => {
    if (row.type === "jump") {
      onOpenChange(false);
      go(row.jump.target);
      return;
    }
    assistant.ask(row.text);
    setMode("answer");
    setQuery("");
  };
  const onCite = (runId: string, attempt: number, seq: number) => go({ to: "run", runId, attempt, seq });
  const onAction = actionHandler(go, assistant.note, drain);

  let lastGroup = "";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tr-palette" showCloseButton={false}>
        <DialogTitle className="sr-only">Ask or jump</DialogTitle>
        <DialogDescription className="sr-only">
          Type to find runs, pull requests, deliveries, bindings and pools, or ask a question.
        </DialogDescription>
        <div className="tr-pal-input">
          {mode === "answer" ? (
            <Button variant="ghost" size="icon-sm" aria-label="Back to results" onClick={() => setMode("search")}>
              <ArrowLeft />
            </Button>
          ) : (
            <Search size={16} aria-hidden="true" />
          )}
          <input
            id="tr-palette-input"
            value={query}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder={mode === "answer" ? "Ask a follow-up…" : "Jump to a run, PR, rule or pool, or ask a question"}
            aria-label={mode === "answer" ? "Ask a follow-up" : "Search or ask"}
            aria-controls="tr-palette-list"
            aria-activedescendant={mode === "search" && rows[active] ? `tr-pal-row-${active}` : undefined}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (mode === "answer") {
                if (event.key === "Enter" && query.trim()) {
                  event.preventDefault();
                  assistant.ask(query.trim());
                  setQuery("");
                }
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActive((active + 1) % rows.length);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setActive((active - 1 + rows.length) % rows.length);
              } else if (event.key === "Enter" && rows[active]) {
                event.preventDefault();
                choose(rows[active]);
              }
            }}
          />
          <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={() => onOpenChange(false)}>
            <X />
          </Button>
        </div>
        {mode === "search" ? (
          <div className="tr-pal-list" id="tr-palette-list" role="listbox" aria-label="Results" ref={listRef}>
            {rows.map((row, index) => {
              const group = row.type === "ask" ? (q ? "Ask" : "Ask Oyzu") : q ? row.jump.group : "Jump to";
              const header = group !== lastGroup ? group : undefined;
              lastGroup = group;
              const Icon = row.type === "ask" ? Sparkles : row.jump.icon;
              return (
                <Fragment key={row.type === "ask" ? `ask-${row.text}` : row.jump.id}>
                  {header && <p className="tr-pal-group">{header}</p>}
                  <div
                    id={`tr-pal-row-${index}`}
                    data-index={index}
                    role="option"
                    aria-selected={index === active}
                    className="tr-pal-row"
                    data-kind={row.type}
                    onMouseMove={() => setActive(index)}
                    onClick={() => choose(row)}
                  >
                    <Icon size={15} aria-hidden="true" />
                    <span className="tr-pal-text">
                      {row.type === "ask" ? (
                        <strong>{q ? `Ask: ${row.text}` : row.text}</strong>
                      ) : (
                        <>
                          <strong>{row.jump.label}</strong>
                          <small>{row.jump.meta}</small>
                        </>
                      )}
                    </span>
                    {index === active && <CornerDownLeft size={13} className="tr-pal-enter" aria-hidden="true" />}
                  </div>
                </Fragment>
              );
            })}
          </div>
        ) : (
          <div className="tr-pal-answer">
            <AssistantMessages messages={assistant.messages} onCite={onCite} onAction={onAction} />
          </div>
        )}
        <footer className="tr-pal-foot">
          {mode === "search" ? (
            <span>
              <kbd>↑</kbd> <kbd>↓</kbd> to move · <kbd>Enter</kbd> to open · <kbd>Esc</kbd> to close
            </span>
          ) : (
            <>
              <span>Answers read this project's runs, deliveries and logs.</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  go({ to: "ask" });
                }}
              >
                Continue in Ask <ArrowRight />
              </Button>
            </>
          )}
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/** Small status pip used on trace nodes, lanes and record lists. */
export function Pip({ tone }: { tone: "ok" | "fail" | "skip" | "warn" | "running" | "pending" }) {
  const Icon = tone === "ok" ? Check : tone === "fail" ? X : tone === "warn" ? TriangleAlert : tone === "skip" ? Minus : undefined;
  return (
    <span className="tr-pip" data-tone={tone} aria-hidden="true">
      {Icon && <Icon size={tone === "warn" ? 9 : 10} strokeWidth={3} />}
    </span>
  );
}
