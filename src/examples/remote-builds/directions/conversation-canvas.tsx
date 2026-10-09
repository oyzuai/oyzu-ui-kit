import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  Copy,
  FileDiff,
  FileText,
  GitBranch,
  Layers,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Server,
  Stethoscope,
  Webhook,
  Workflow,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { CopyIdentifier } from "../../../components/patterns/copy-identifier";
import { EmptyState } from "../../../components/patterns/empty-state";
import { respond } from "../assistant-engine";
import { BlockView } from "../assistant";
import { LogViewer } from "../log-viewer";
import { useLiveRun } from "../live";
import {
  bindingById,
  clock,
  deliveries,
  deliveryById,
  duration,
  liveRun,
  logFor,
  poolById,
  poolLogs,
  runById,
  runs,
  type Delivery,
  type LogEntry,
  type Role,
  type StageStatus,
} from "../model";
import { StateChip, actionResult } from "../shared";

// The right-hand "canvas" of the Conversation direction: whatever a thread
// opens (a run log, a delivery record, pool logs, a binding, a suggested diff)
// lands here as a tab, so the conversation itself stays readable.

export type Tab =
  | { kind: "log"; runId: string; attempt: number; focusSeq?: number }
  | { kind: "run"; runId: string }
  | { kind: "delivery"; deliveryId: string }
  | { kind: "pool"; poolId: string }
  | { kind: "poollogs"; filter: string }
  | { kind: "binding"; bindingId: string }
  | { kind: "diff" };

export function tabKey(tab: Tab): string {
  switch (tab.kind) {
    case "log":
      return `log:${tab.runId}`;
    case "run":
      return `run:${tab.runId}`;
    case "delivery":
      return `delivery:${tab.deliveryId}`;
    case "pool":
      return `pool:${tab.poolId}`;
    case "poollogs":
      return "poollogs";
    case "binding":
      return `binding:${tab.bindingId}`;
    default:
      return "diff";
  }
}

export function tabLabel(tab: Tab): string {
  switch (tab.kind) {
    case "log":
      return `Log · ${runById(tab.runId)?.number ?? ""}`;
    case "run":
      return `Run ${runById(tab.runId)?.number ?? ""}`;
    case "delivery":
      return tab.deliveryId === "dlv-rej" ? "Rejected deliveries" : `Delivery ${tab.deliveryId.replace("dlv-", "")}`;
    case "pool":
      return poolById(tab.poolId)?.name ?? "Pool";
    case "poollogs":
      return "Pool logs";
    case "binding":
      return bindingById(tab.bindingId)?.name ?? "Binding";
    default:
      return "Suggested diff";
  }
}

const tabIcons = {
  log: FileText,
  run: Workflow,
  delivery: Webhook,
  pool: Server,
  poollogs: Stethoscope,
  binding: GitBranch,
  diff: FileDiff,
} as const;

export const hasLog = (runId: string) => runId === liveRun.id || logFor(runId, 1).length > 0;

/** Live run 9014 with the simulated group states merged in. */
export function liveGroups(groups: Record<string, string>) {
  return liveRun.groups.map((group) => ({
    ...group,
    state: (groups[group.scope] as typeof group.state | undefined) ?? group.state,
  }));
}

// ---------------------------------------------------------------- small shared pieces

/** A consequential action that asks inline before it does anything. */
export function InlineConfirm({
  label,
  prompt,
  confirmLabel = "Confirm",
  result,
  onDone,
  variant = "outline",
  icon,
  disabled,
}: {
  label: string;
  prompt: string;
  confirmLabel?: string;
  result: string;
  onDone?: (result: string) => void;
  variant?: "default" | "outline" | "destructive" | "secondary";
  icon?: ReactNode;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "asking" | "done">("idle");
  if (state === "done")
    return (
      <p className="cv-done" role="status">
        <Check size={13} aria-hidden="true" /> {result}
      </p>
    );
  if (state === "asking")
    return (
      <div className="cv-confirm" role="group" aria-label={`Confirm: ${label}`}>
        <p>{prompt}</p>
        <div>
          <Button
            size="sm"
            variant={variant === "destructive" ? "destructive" : "default"}
            onClick={() => {
              setState("done");
              onDone?.(result);
            }}
          >
            {confirmLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setState("idle")}>
            Cancel
          </Button>
        </div>
      </div>
    );
  return (
    <Button size="sm" variant={variant} disabled={disabled} onClick={() => setState("asking")}>
      {icon}
      {label}
    </Button>
  );
}

export function CommandLine({ command, note }: { command: string; note?: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="cv-cmd">
      <code>
        <span aria-hidden="true">$ </span>
        {command}
      </code>
      <button
        type="button"
        aria-label={`Copy command ${command}`}
        onClick={() => {
          navigator.clipboard?.writeText(command).catch(() => undefined);
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        }}
      >
        {done ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {note && <small>{note}</small>}
    </div>
  );
}

const stageIcon = (status: StageStatus) =>
  status === "ok" ? (
    <CircleCheck size={14} className="cv-ok" aria-label="Done" />
  ) : status === "fail" ? (
    <CircleX size={14} className="cv-bad" aria-label="Failed" />
  ) : status === "running" ? (
    <LoaderCircle size={14} className="cv-run animate-spin" aria-label="In progress" />
  ) : status === "skip" ? (
    <CircleMinus size={14} className="cv-warn" aria-label="Nothing to do" />
  ) : (
    <CircleDashed size={14} className="cv-mute" aria-label="Not reached" />
  );

export function StageList({ delivery }: { delivery: Delivery }) {
  return (
    <ol className="cv-stages">
      {delivery.stages.map((stage) => (
        <li key={stage.key} data-status={stage.status}>
          {stageIcon(stage.status)}
          <strong>{stage.label}</strong>
          <span>{stage.detail}</span>
        </li>
      ))}
    </ol>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="cv-facts">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="cv-sec">
      <header>
        <h4>{title}</h4>
        {aside}
      </header>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- tab bodies

type Handlers = {
  role: Role;
  open: (tab: Tab) => void;
  onAsk: (entry: LogEntry) => void;
  onNote: (text: string) => void;
};

function LogTab({
  tab,
  role,
  expanded,
  open,
  onAsk,
}: Handlers & { tab: Extract<Tab, { kind: "log" }>; expanded: boolean }) {
  const live = useLiveRun();
  const run = runById(tab.runId)!;
  const isLive = run.id === liveRun.id;
  const entries = isLive ? live.entries : logFor(run.id, tab.attempt);
  if (!entries.length)
    return (
      <EmptyState
        title="No log kept in this prototype"
        description={`Run ${run.number} is here for its record only. Open its details for the command, attempts and outputs.`}
        action={
          <Button size="sm" variant="outline" onClick={() => open({ kind: "run", runId: run.id })}>
            Run details
          </Button>
        }
      />
    );
  return (
    <div className="cv-logtab">
      <LogViewer
        key={`${run.id}-${tab.attempt}`}
        run={isLive ? { ...run, state: live.state } : run}
        entries={entries}
        groups={isLive ? liveGroups(live.groups) : run.groups}
        attempt={tab.attempt}
        onAttemptChange={(attempt) => open({ kind: "log", runId: run.id, attempt })}
        live={isLive && live.state === "running"}
        role={role}
        onDiagnostics={(jobId) => open({ kind: "poollogs", filter: jobId })}
        onAsk={onAsk}
        focusSeq={tab.focusSeq}
        compact={!expanded}
        height="var(--cv-log-h, 52vh)"
      />
    </div>
  );
}

function RunTab({ runId, role, open }: Handlers & { runId: string }) {
  const live = useLiveRun();
  const run = runById(runId)!;
  const isLive = run.id === liveRun.id;
  const state = isLive ? live.state : run.state;
  const binding = run.bindingId ? bindingById(run.bindingId) : undefined;
  const groups = isLive ? liveGroups(live.groups) : run.groups;
  const longest = Math.max(1, ...groups.map((group) => group.durationMs));
  const remote = `${run.command} --remote --ref ${run.commit.slice(0, 7)}`;
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <StateChip state={state} />
        <h3>
          Run {run.number} <span>{run.check}</span>
        </h3>
        <p>{run.title}</p>
      </div>
      {run.reason && (
        <p className="cv-reason" data-state={run.state}>
          <strong>{run.reason.code}</strong> {run.reason.message}
        </p>
      )}
      <Section title="Exact command">
        <CommandLine command={run.command} note="Runs the same operation on your machine at this commit" />
        <CommandLine command={remote} note="Its --remote twin: same command on the same pool" />
      </Section>
      <Section title="Source and trigger">
        <Facts
          rows={[
            ["Repository", run.repository],
            ["Branch", run.ref],
            ...(run.pr ? ([["Pull request", `#${run.pr} · ${run.author}`]] as [string, ReactNode][]) : []),
            [
              "Commit",
              <span className="cv-inline" key="c">
                <code>{run.commit.slice(0, 12)}</code>
                <CopyIdentifier value={run.commit} />
              </span>,
            ],
            [
              "Trigger",
              run.deliveryId && deliveryById(run.deliveryId) ? (
                <button type="button" className="cv-link" onClick={() => open({ kind: "delivery", deliveryId: run.deliveryId! })}>
                  {run.trigger.replace("_", " ")} · delivery {run.deliveryId}
                </button>
              ) : (
                `${run.trigger.replace("_", " ")}${run.trigger === "manual" ? ` by ${run.author}` : ""}`
              ),
            ],
            [
              "Binding",
              binding ? (
                <button type="button" className="cv-link" onClick={() => open({ kind: "binding", bindingId: binding.id })}>
                  {binding.name}
                </button>
              ) : (
                "None (started from the CLI)"
              ),
            ],
            ["oyzu", run.oyzuVersion],
            ["Created", clock(run.createdAt)],
            ["Duration", isLive && state === "running" ? `${duration(live.elapsedMs)} so far` : duration(run.durationMs)],
          ]}
        />
      </Section>
      <Section title={`Attempts (${run.attempts.length})`}>
        {run.attempts.length === 0 ? (
          <p className="cv-quiet">No attempt ran. The run was decided before any executor was claimed.</p>
        ) : (
          <ul className="cv-attempts">
            {run.attempts.map((attempt) => (
              <li key={attempt.n}>
                <div>
                  <strong>Attempt {attempt.n}</strong>
                  <StateChip size="sm" state={isLive ? state : attempt.state} label={attempt.state === "timed_out" ? "Executor lost" : undefined} />
                </div>
                <span>
                  {poolById(attempt.pool)?.name ?? attempt.pool}
                  {role === "pool-admin" ? ` · ${attempt.manager}` : ""} · {attempt.jobId} · {clock(attempt.startedAt)} ·{" "}
                  {isLive ? "live" : duration(attempt.durationMs)} · log {attempt.logState}
                </span>
                {attempt.reason && <small>{attempt.reason}</small>}
                {hasLog(run.id) && (
                  <Button size="xs" variant="outline" onClick={() => open({ kind: "log", runId: run.id, attempt: attempt.n })}>
                    <FileText /> Open log
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {groups.length > 0 && (
        <Section title="Timings">
          <ul className="cv-timings">
            {groups.map((group) => (
              <li key={group.scope} data-state={group.state}>
                <span>{group.target === "runner" ? `runner ${group.task}` : group.scope}</span>
                <i style={{ width: `${Math.max(3, (group.durationMs / longest) * 100)}%` }} aria-hidden="true" />
                <small>{group.state === "running" ? "running" : group.state === "queued" ? "queued" : duration(group.durationMs)}</small>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title={`Outputs (${run.outputs.length})`}>
        {run.outputs.length === 0 ? (
          <p className="cv-quiet">{state === "running" ? "Outputs upload when the run finishes." : "This run uploaded no outputs."}</p>
        ) : (
          <ul className="cv-outputs">
            {run.outputs.map((output) => (
              <li key={output.path}>
                <Layers size={13} aria-hidden="true" />
                <code>{output.path}</code>
                <span>
                  {output.kind} · {(output.size / 1024).toFixed(0)} KiB · <code>{output.digest}</code>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

export function VerdictTable({ delivery }: { delivery: Delivery }) {
  return (
    <ul className="cv-verdicts">
      {delivery.evaluations.map((evaluation) => (
        <li key={evaluation.bindingId} data-matched={evaluation.matched}>
          {evaluation.matched ? (
            <CircleCheck size={14} aria-label="Matched" />
          ) : (
            <CircleMinus size={14} aria-label="Not matched" />
          )}
          <strong>{bindingById(evaluation.bindingId)?.name ?? evaluation.bindingId}</strong>
          <span>{evaluation.reason}</span>
        </li>
      ))}
    </ul>
  );
}

function DeliveryTab({ deliveryId, open, onNote }: Handlers & { deliveryId: string }) {
  const delivery = deliveryById(deliveryId)!;
  const [explained, setExplained] = useState<string>();
  const rejected = delivery.outcome === "rejected";
  const matched = delivery.evaluations.filter((evaluation) => evaluation.matched).length;
  const explainText =
    delivery.id === "dlv-7f12"
      ? actionResult("explain")!
      : delivery.evaluations.length
        ? `Explained against today's bindings: the same ${matched} of ${delivery.evaluations.length} would match. Nothing would change.`
        : "Explained against today's bindings: still not evaluated, because the repository isn't registered to a project.";
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <StateChip
          state={delivery.outcome === "started" ? "success" : delivery.outcome === "no-match" ? "skipped" : "failure"}
          label={delivery.outcomeLabel}
        />
        <h3>
          {rejected ? "Rejected deliveries" : `Delivery ${delivery.id}`} <span>{delivery.connector}</span>
        </h3>
        <p>
          {delivery.event} · {delivery.repository}
          {delivery.pr ? ` · #${delivery.pr.number}${delivery.pr.draft ? " (draft)" : ""}` : ` · ${delivery.ref}`}
        </p>
      </div>
      {!rejected && (
        <div className="cv-row-actions">
          <InlineConfirm
            label="Replay"
            prompt="Replay this delivery as a new delivery linked to the original? Bindings that match today will start runs."
            confirmLabel="Replay"
            result={actionResult("replay")!}
            onDone={onNote}
          />
          <Button size="sm" variant="outline" onClick={() => setExplained(explainText)}>
            Explain against today
          </Button>
        </div>
      )}
      {explained && (
        <p className="cv-done" role="status">
          <Check size={13} aria-hidden="true" /> {explained}
        </p>
      )}
      <Section title="Stages">
        <StageList delivery={delivery} />
      </Section>
      {delivery.evaluations.length > 0 && (
        <Section title={`Binding verdicts · ${matched} of ${delivery.evaluations.length} matched`}>
          <VerdictTable delivery={delivery} />
        </Section>
      )}
      {delivery.outcome === "unregistered" && (
        <Section title="Repository not registered">
          <p className="cv-quiet">
            acme/ledger-tools sends webhooks through this connector but isn't registered to any project, so no binding was
            evaluated. Registering it is a project admin action.
          </p>
          <InlineConfirm
            label="Register acme/ledger-tools"
            prompt="Open registration for acme/ledger-tools in project payments? Nothing runs until a binding matches."
            confirmLabel="Open registration"
            result="Registration started for acme/ledger-tools in project payments. Future pushes will be evaluated."
            onDone={onNote}
          />
        </Section>
      )}
      {rejected && (
        <Section title="Sampled headers (body never read)">
          <dl className="cv-headers">
            <div><dt>X-GitHub-Event</dt><dd>push</dd></div>
            <div><dt>X-GitHub-Hook-ID</dt><dd>418 220 671</dd></div>
            <div><dt>X-Hub-Signature-256</dt><dd>sha256=*** (did not match)</dd></div>
            <div><dt>User-Agent</dt><dd>GitHub-Hookshot/7c1e0a2</dd></div>
          </dl>
        </Section>
      )}
      <Section title="Record">
        <Facts
          rows={[
            [
              "Correlation id",
              <span className="cv-inline" key="corr">
                <code>{delivery.correlationId}</code>
                <CopyIdentifier value={delivery.correlationId} />
              </span>,
            ],
            ["GitHub delivery", delivery.githubDelivery],
            ["Received", clock(delivery.receivedAt)],
            ["Actor", delivery.actor],
            ["Changed paths", delivery.changedPaths.length ? delivery.changedPaths.join(", ") : "—"],
          ]}
        />
      </Section>
      {delivery.runIds.length > 0 && (
        <Section title="Runs started">
          <ul className="cv-linklist">
            {delivery.runIds.map((id) => {
              const run = runById(id)!;
              return (
                <li key={id}>
                  <button type="button" onClick={() => open({ kind: "run", runId: id })}>
                    <StateChip size="sm" state={run.state} />
                    <strong>Run {run.number}</strong>
                    <span>{run.check}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </div>
  );
}

function PoolTab({ poolId, role, open, onNote }: Handlers & { poolId: string }) {
  const pool = poolById(poolId)!;
  const [shipping, setShipping] = useState(pool.shipping);
  if (role !== "pool-admin")
    return (
      <div className="cv-tabbody">
        <div className="cv-tabhead">
          <StateChip state={pool.status === "warning" ? "healthy" : pool.status} label={pool.status === "paused" ? "Paused" : "Running builds"} />
          <h3>
            {pool.name} <span>{pool.kind}</span>
          </h3>
          <p>{pool.scope}</p>
        </div>
        <Facts
          rows={[
            ["Capacity", `${pool.capacity} concurrent jobs`],
            ["Queue wait", pool.queued ? "Under a minute" : "None"],
            ["Release builds", pool.releaseEligible ? "Eligible" : "Not eligible (developer machine)"],
          ]}
        />
        <p className="cv-quiet">
          Managers, heartbeats and pool logs are visible to this pool's admins. If a pool problem affects one of your runs,
          the run's thread says so in plain words.
        </p>
      </div>
    );
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <StateChip state={pool.status} />
        <h3>
          {pool.name} <span>{pool.kind}</span>
        </h3>
        <p>
          {pool.scope} · {pool.busy} of {pool.capacity} busy · {pool.queued} queued
        </p>
      </div>
      <div className="cv-setting">
        <div>
          <strong>Ship pool logs to Oyzu</strong>
          <small>Manager and runner operational logs only; build output never ships here.</small>
        </div>
        <Switch
          checked={shipping}
          aria-label="Ship pool logs"
          onCheckedChange={(value) => {
            setShipping(value);
            onNote(`Pool log shipping for ${pool.name} turned ${value ? "on" : "off"}.`);
          }}
        />
      </div>
      <Facts
        rows={[
          ["Release builds", pool.releaseEligible ? "Eligible" : "Never eligible: developer machine"],
          ["Connection", "Outbound only; managers dial Oyzu"],
        ]}
      />
      <Section
        title={`Managers (${pool.managers.length})`}
        aside={
          <Button size="xs" variant="ghost" onClick={() => open({ kind: "poollogs", filter: pool.managers[0].id })}>
            <Stethoscope /> Pool logs
          </Button>
        }
      >
        <ul className="cv-managers">
          {pool.managers.map((manager) => (
            <li key={manager.id} data-status={manager.status}>
              <div>
                <StateChip size="sm" state={manager.status} />
                <strong>{manager.id}</strong>
                <code>{manager.host}</code>
              </div>
              <span>
                v{manager.version} · {manager.adapter} · heartbeat {manager.heartbeat} · {manager.activeJobs} active · key{" "}
                {manager.keyAgeDays}d old
              </span>
              {manager.note && <small>{manager.note}</small>}
              <div className="cv-row-actions">
                <Button size="xs" variant="ghost" onClick={() => open({ kind: "poollogs", filter: manager.id })}>
                  Logs
                </Button>
                {manager.status !== "paused" && (
                  <InlineConfirm
                    label="Drain"
                    prompt={`Drain ${manager.id}? It stops claiming new jobs; jobs already running finish.`}
                    confirmLabel="Drain"
                    variant="destructive"
                    result={actionResult("drain-manager", manager.id)!}
                    onDone={onNote}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function PoolLogsTab({ filter, role, open }: Handlers & { filter: string }) {
  if (role !== "pool-admin")
    return (
      <EmptyState
        title="Pool logs are for pool admins"
        description="They hold manager and runner operations for the whole pool. Your run's own log has everything about your build."
      />
    );
  const rows = poolLogs.filter((row) => !filter || row.jobId === filter || row.manager === filter);
  const filters = ["job-5521", "job-5530", "mgr-onprem-02", ""];
  if (!filters.includes(filter)) filters.unshift(filter);
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <h3>
          Pool logs <span>Acme on-prem</span>
        </h3>
        <p>Operational logs from managers and runners. Never contains build output.</p>
      </div>
      <div className="cv-filters" role="group" aria-label="Filter pool logs">
        {filters.map((value) => (
          <button
            key={value || "all"}
            type="button"
            aria-pressed={filter === value}
            onClick={() => open({ kind: "poollogs", filter: value })}
          >
            {value || "Whole pool"}
          </button>
        ))}
      </div>
      {rows.length === 0 && (
        <EmptyState
          filtered
          title={`No pool log entries for ${filter}`}
          description="This job ran on Hosted Linux, whose pool logs aren't part of this prototype. Nothing unusual was reported for it."
        />
      )}
      <ol className="cv-plogs" hidden={rows.length === 0}>
        {rows.map((row, index) => (
          <li key={index} data-level={row.level}>
            <time>{row.t}</time>
            <b>{row.level}</b>
            <span>
              <strong>{row.msg}</strong> <em>{row.manager}</em>
              {row.jobId && <em> · {row.jobId}</em>}
            </span>
            <code>
              {Object.entries(row.fields)
                .map(([key, value]) => `${key}=${value}`)
                .join("  ")}
            </code>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BindingTab({ bindingId, open }: Handlers & { bindingId: string }) {
  const binding = bindingById(bindingId)!;
  const seen = deliveries.filter((delivery) => delivery.evaluations.some((evaluation) => evaluation.bindingId === binding.id));
  const recentRuns = runs.filter((run) => run.bindingId === binding.id);
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <StateChip state={binding.enabled ? "success" : "skipped"} label={binding.enabled ? "Enabled" : "Disabled"} />
        <h3>
          {binding.name} <span>{binding.scope}</span>
        </h3>
        <p>Platform-side and audited; it doesn't live in the repository.</p>
      </div>
      <Facts
        rows={[
          ["Repositories", binding.repositories],
          ["Filters", binding.filters.join(" · ")],
          ["Mandatory", binding.mandatory ? "Yes, projects can't opt out" : "No"],
          ["Cancel previous", binding.cancelPrevious ? "New pushes cancel unfinished runs" : "Never cancels"],
        ]}
      />
      <Section title="Actions and their checks">
        {binding.actions.map((action) => (
          <div key={action.label} className="cv-binding-action">
            <strong>
              {action.label} <span>→ {action.check}</span>
            </strong>
            <CommandLine command={action.command} />
          </div>
        ))}
      </Section>
      <Section title={`Today's verdicts (${seen.length})`}>
        <ul className="cv-verdicts">
          {seen.map((delivery) => {
            const evaluation = delivery.evaluations.find((item) => item.bindingId === binding.id)!;
            return (
              <li key={delivery.id} data-matched={evaluation.matched}>
                {evaluation.matched ? <CircleCheck size={14} aria-label="Matched" /> : <CircleMinus size={14} aria-label="Not matched" />}
                <button type="button" className="cv-link" onClick={() => open({ kind: "delivery", deliveryId: delivery.id })}>
                  {delivery.event} · {delivery.pr ? `#${delivery.pr.number}` : delivery.ref}
                </button>
                <span>{evaluation.reason}</span>
              </li>
            );
          })}
        </ul>
      </Section>
      {recentRuns.length > 0 && (
        <Section title="Runs it started">
          <ul className="cv-linklist">
            {recentRuns.map((run) => (
              <li key={run.id}>
                <button type="button" onClick={() => open({ kind: "run", runId: run.id })}>
                  <StateChip size="sm" state={run.state} />
                  <strong>Run {run.number}</strong>
                  <span>{run.ref}</span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function DiffTab({ role, open, onNote }: Handlers) {
  const reply = respond("Suggest a fix", { kind: "run", runId: runs[0].id }, role);
  const diff = reply.blocks.find((block) => block.type === "diff");
  return (
    <div className="cv-tabbody">
      <div className="cv-tabhead">
        <h3>
          Suggested diff <span>for #482</span>
        </h3>
        <p>Drafted by the assistant from the failing assertion. Review it before anything is posted.</p>
      </div>
      {diff && <BlockView block={diff} animate={false} onCite={() => undefined} onAction={() => undefined} />}
      <CommandLine command="oyzu build payments-core --full" note="Check it locally before pushing" />
      <div className="cv-row-actions">
        <InlineConfirm
          label="Post as suggested change on #482"
          prompt="Post this as a suggested change on pull request #482? dana.okafor reviews and decides."
          confirmLabel="Post suggestion"
          variant="default"
          result={actionResult("apply-fix")!}
          onDone={onNote}
        />
        <Button size="sm" variant="outline" onClick={() => open({ kind: "log", runId: runs[0].id, attempt: 2 })}>
          Back to the failure
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- canvas shell

export function Canvas({
  tabs,
  active,
  onSelect,
  onClose,
  onCloseAll,
  expanded,
  onToggleExpanded,
  onBack,
  ...handlers
}: Handlers & {
  tabs: Tab[];
  active: string;
  onSelect: (key: string) => void;
  onClose: (key: string) => void;
  onCloseAll: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  onBack: () => void;
}) {
  const current = tabs.find((tab) => tabKey(tab) === active) ?? tabs[tabs.length - 1];
  if (!current) return null;
  let body: ReactNode;
  switch (current.kind) {
    case "log":
      body = <LogTab {...handlers} tab={current} expanded={expanded} />;
      break;
    case "run":
      body = <RunTab {...handlers} runId={current.runId} />;
      break;
    case "delivery":
      body = <DeliveryTab key={current.deliveryId} {...handlers} deliveryId={current.deliveryId} />;
      break;
    case "pool":
      body = <PoolTab key={current.poolId} {...handlers} poolId={current.poolId} />;
      break;
    case "poollogs":
      body = <PoolLogsTab {...handlers} filter={current.filter} />;
      break;
    case "binding":
      body = <BindingTab {...handlers} bindingId={current.bindingId} />;
      break;
    default:
      body = <DiffTab {...handlers} />;
  }
  return (
    <aside className="cv-canvas" aria-label="Canvas">
      <header className="cv-canvas-head">
        <Button className="cv-phone-only" variant="ghost" size="icon-sm" aria-label="Back to thread" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="cv-tabs" role="tablist" aria-label="Open items">
          {tabs.map((tab) => {
            const key = tabKey(tab);
            const Icon = tabIcons[tab.kind];
            const selected = key === tabKey(current);
            return (
              <div key={key} className="cv-tab" data-selected={selected}>
                <button type="button" role="tab" aria-selected={selected} onClick={() => onSelect(key)}>
                  <Icon size={13} aria-hidden="true" />
                  <span>{tabLabel(tab)}</span>
                </button>
                <button type="button" className="cv-tab-x" aria-label={`Close ${tabLabel(tab)}`} onClick={() => onClose(key)}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
        <Button
          className="cv-desk-only"
          variant="ghost"
          size="icon-sm"
          aria-label={expanded ? "Narrow the canvas" : "Widen the canvas"}
          title={expanded ? "Narrow the canvas" : "Widen the canvas (full log view)"}
          onClick={onToggleExpanded}
        >
          {expanded ? <Minimize2 /> : <Maximize2 />}
        </Button>
        <Button className="cv-desk-only" variant="ghost" size="icon-sm" aria-label="Close canvas" title="Close canvas" onClick={onCloseAll}>
          <X />
        </Button>
      </header>
      <div className="cv-canvas-body" role="tabpanel">
        {body}
      </div>
    </aside>
  );
}

