import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
  EllipsisVertical,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Server,
  Settings,
  Sparkles,
  Webhook,
  X,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { AssistantPanel, useAssistant } from "../assistant";
import type { ActionId, AssistantContext } from "../assistant-engine";
import { useLiveRun } from "../live";
import {
  ago,
  bindings,
  checks,
  clock,
  deliveries,
  duration,
  failedLog,
  failedRun,
  liveRun,
  logFor,
  poolLogs,
  pools,
  runs,
  type Delivery,
  type LogEntry,
  type Run,
  type RunState,
} from "../model";
import { actionResult, StateChip, usePrototype } from "../shared";
import { ExecutionPage, StageStrip, TriggerIcon, triggerText } from "./pipeline-views";
import "./pipeline.css";

// Pipeline: a pipeline-execution console. Slim module rail, a dense executions
// table, and an execution page with the stage graph across the top, steps and
// logs beneath, and the assistant in a drawer.

type Page =
  | { name: "executions" }
  | { name: "run"; runId: string; attempt?: number; focusSeq?: number; nonce: number }
  | { name: "triggers" }
  | { name: "pools"; job?: string }
  | { name: "checks" }
  | { name: "settings" };

const modules = [
  { id: "executions", label: "Builds", icon: Play },
  { id: "triggers", label: "Triggers", icon: Webhook },
  { id: "pools", label: "Pools", icon: Server },
  { id: "checks", label: "Checks", icon: ListChecks },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

function hashFor(page: Page) {
  if (page.name === "run") return `#pipeline-run-${runs.find((r) => r.id === page.runId)?.number ?? ""}`;
  if (page.name === "executions") return "#pipeline";
  return `#pipeline-${page.name}`;
}

let nonce = 0;
function parseHash(hash: string): Page {
  const value = hash.replace("#", "");
  const run = value.match(/^pipeline-run-(\d+)$/);
  if (run) {
    const found = runs.find((r) => r.number === Number(run[1]));
    if (found) return { name: "run", runId: found.id, nonce: ++nonce };
  }
  const name = value.replace(/^pipeline-?/, "");
  if (name === "triggers" || name === "pools" || name === "checks" || name === "settings") return { name };
  return { name: "executions" };
}

function useMedia(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

function useLiveElapsed(elapsedMs: number, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  const changedAt = useRef(Date.now());
  useEffect(() => {
    changedAt.current = Date.now();
    setNow(Date.now());
  }, [elapsedMs]);
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [running]);
  return running ? elapsedMs + Math.min(Math.max(0, now - changedAt.current), 2000) : elapsedMs;
}

const poolOfJob = (jobId: string) =>
  pools.find((pool) => runs.some((run) => run.attempts.some((a) => a.jobId === jobId && a.pool === pool.id)))?.id;

export function Pipeline() {
  const { role } = usePrototype();
  const [page, setPage] = useState<Page>(() => parseHash(window.location.hash));
  const [drawer, setDrawer] = useState(false);
  const [toast, setToast] = useState<string>();
  const [focus, setFocus] = useState<{ attempt: number; label: string }>();
  const isPhone = useMedia("(max-width: 760px)");
  const mainRef = useRef<HTMLElement>(null);

  // ---- live run 9014 (with an optional cancel)
  const live = useLiveRun();
  const [cancelledAt, setCancelledAt] = useState<number>();
  useEffect(() => {
    if (cancelledAt !== undefined && live.entries.length < cancelledAt) setCancelledAt(undefined);
  }, [live.entries.length, cancelledAt]);
  const cancelled = cancelledAt !== undefined && live.entries.length >= cancelledAt;
  const liveState: RunState = cancelled ? "cancelled" : live.state;
  const liveEntries = useMemo<LogEntry[]>(() => {
    if (!cancelled) return live.entries;
    const kept = live.entries.slice(0, cancelledAt);
    const last = kept[kept.length - 1];
    return [
      ...kept,
      {
        seq: kept.length + 1,
        t: (last?.t ?? 0) + 300,
        scope: "runner",
        stream: "system",
        text: "Cancelled from the portal; the executor stopped and the check reports cancelled",
        level: "warn",
      },
    ];
  }, [cancelled, cancelledAt, live.entries]);
  const liveElapsed = useLiveElapsed(live.elapsedMs, liveState === "running");
  const liveMerged = useMemo<Run>(() => {
    const done = liveState !== "running";
    return {
      ...liveRun,
      state: liveState,
      durationMs: done ? live.elapsedMs : 0,
      attempts: liveRun.attempts.map((a) => ({
        ...a,
        state: liveState,
        durationMs: done ? live.elapsedMs : 0,
        logState: done ? ("complete" as const) : ("open" as const),
      })),
      groups: [
        ...liveRun.groups.map((g) => {
          const state = live.groups[g.scope] ?? g.state;
          return {
            ...g,
            state: cancelled && state !== "succeeded" ? ("skipped" as const) : state,
            durationMs:
              state === "succeeded" && !g.durationMs ? (g.scope === "api-image/compile" ? 26_800 : 20_700) : g.durationMs,
          };
        }),
        ...(liveState === "succeeded"
          ? [{ scope: "runner/finish", target: "runner", task: "finish", state: "succeeded" as const, durationMs: 1_100 }]
          : []),
      ],
      outputs:
        liveState === "succeeded"
          ? [
              { path: "dist/api-image/index.json", kind: "artifact" as const, size: 1_536, digest: "sha256:3e5a…c2d0" },
              { path: "dist/manifest.json", kind: "manifest" as const, size: 4_096, digest: "sha256:81fa…6d13" },
            ]
          : [],
    };
  }, [live.elapsedMs, live.groups, liveState, cancelled]);
  const runFor = useCallback((run: Run) => (run.id === liveRun.id ? liveMerged : run), [liveMerged]);

  // ---- navigation
  const navigate = useCallback((next: Page) => {
    setPage(next);
    mainRef.current?.scrollTo({ top: 0 });
    if (next.name !== "run") setFocus(undefined);
    try {
      const href = hashFor(next);
      if (window.location.hash !== href) window.history.pushState(null, "", href);
    } catch {
      /* the hash is a convenience only */
    }
  }, []);
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash.startsWith("#pipeline")) setPage(parseHash(window.location.hash));
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);
  const openRun = useCallback(
    (runId: string, opts?: { attempt?: number; focusSeq?: number }) =>
      navigate({ name: "run", runId, attempt: opts?.attempt, focusSeq: opts?.focusSeq, nonce: ++nonce }),
    [navigate],
  );

  const say = useCallback((text: string) => setToast(text), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(undefined), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // ---- assistant
  const context = useMemo<AssistantContext>(() => {
    if (page.name === "run") return { kind: "run", runId: page.runId, attempt: focus?.attempt };
    if (page.name === "triggers") return { kind: "delivery", deliveryId: "dlv-7f12" };
    if (page.name === "pools") return { kind: "pool", poolId: "acme-onprem" };
    return { kind: "home" };
  }, [page, focus?.attempt]);
  const contextLabel =
    page.name === "run"
      ? (focus?.label ?? `Run #${runs.find((r) => r.id === page.runId)?.number}`)
      : page.name === "triggers"
        ? "Trigger deliveries for acme"
        : page.name === "pools"
          ? "Pool Acme on-prem"
          : "Project payments";
  const assistant = useAssistant(context, role);
  const askRef = useRef(assistant.ask);
  askRef.current = assistant.ask;
  const askLine = useCallback((entry: LogEntry) => {
    setDrawer(true);
    askRef.current(`Explain line ${entry.seq}`, entry);
  }, []);
  const openAssistant = useCallback((question?: string) => {
    setDrawer(true);
    if (question) window.setTimeout(() => askRef.current(question), 0);
  }, []);
  const onSelection = useCallback((attempt: number, label: string) => setFocus({ attempt, label }), []);
  const openDiagnostics = useCallback((jobId: string) => navigate({ name: "pools", job: jobId }), [navigate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onCite = (runId: string, attempt: number, seq: number) => {
    openRun(runId, { attempt, focusSeq: seq });
    if (isPhone) setDrawer(false);
  };
  const onAction = (id: ActionId, target?: string) => {
    switch (id) {
      case "open-logs":
        openRun(failedRun.id, { attempt: 2, focusSeq: failedLog.find((e) => e.level === "error")?.seq });
        break;
      case "open-attempt-1":
        openRun(failedRun.id, { attempt: 1 });
        break;
      case "open-run":
        openRun(target ?? liveRun.id);
        break;
      case "diagnostics":
        if (role !== "pool-admin") {
          assistant.note("Runner diagnostics are for pool admins. The pool's admins already see this job's pool logs.");
          return;
        }
        navigate({ name: "pools", job: target?.startsWith("job-") ? target : "job-5521" });
        break;
      case "open-delivery":
      case "open-binding":
      case "register-repo":
        navigate({ name: "triggers" });
        break;
      case "open-pool":
        navigate({ name: "pools" });
        break;
      default: {
        const text = actionResult(id, target);
        if (text) assistant.note(text);
        return;
      }
    }
    if (isPhone) setDrawer(false);
  };

  const active = page.name === "run" ? "executions" : page.name;
  const currentRun = page.name === "run" ? runs.find((r) => r.id === page.runId) : undefined;

  let content;
  if (page.name === "run" && currentRun) {
    const run = runFor(currentRun);
    content = (
      <ExecutionPage
        key={`${page.runId}-${page.nonce}`}
        run={run}
        entriesFor={(attempt) => (run.id === liveRun.id ? liveEntries : logFor(run.id, attempt))}
        liveElapsed={liveElapsed}
        initialAttempt={page.attempt}
        focusSeq={page.focusSeq}
        role={role}
        isPhone={isPhone}
        canCancel={run.id === liveRun.id}
        onCancel={() => {
          setCancelledAt(live.entries.length);
          say("Cancelled #9014. The executor stops and the check reports cancelled.");
        }}
        onBack={() => navigate({ name: "executions" })}
        onToast={say}
        onAskLine={askLine}
        onAsk={openAssistant}
        onDiagnostics={openDiagnostics}
        onSelection={onSelection}
      />
    );
  } else if (page.name === "triggers") content = <TriggersPage onOpenRun={openRun} />;
  else if (page.name === "pools") content = <PoolsPage job={page.job} onClearJob={() => navigate({ name: "pools" })} />;
  else if (page.name === "checks") content = <ChecksPage onOpenRun={openRun} />;
  else if (page.name === "settings") content = <SettingsPage />;
  else content = <ExecutionsPage runFor={runFor} liveElapsed={liveElapsed} onOpen={openRun} onToast={say} />;

  return (
    <div className="pl-root" data-drawer={drawer}>
      <nav className="pl-rail" aria-label="Modules">
        <ProjectPicker />
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              type="button"
              className="pl-rail-item"
              aria-current={active === m.id ? "page" : undefined}
              onClick={() => navigate({ name: m.id } as Page)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{m.label}</span>
            </button>
          );
        })}
        <button type="button" className="pl-rail-item pl-rail-ask" aria-pressed={drawer} onClick={() => setDrawer(!drawer)}>
          <Sparkles size={18} aria-hidden="true" />
          <span>Ask</span>
        </button>
      </nav>
      <main className="pl-main" ref={mainRef}>
        <div className="pl-phone-project">
          <ProjectPicker />
        </div>
        <div className="pl-page">{content}</div>
      </main>
      <aside className="pl-drawer" data-open={drawer} inert={!drawer} aria-hidden={!drawer}>
        <AssistantPanel
          contextLabel={contextLabel}
          assistant={assistant}
          onCite={onCite}
          onAction={onAction}
          onClose={() => setDrawer(false)}
        />
      </aside>
      {drawer && isPhone && <button type="button" className="pl-scrim" aria-label="Close assistant" onClick={() => setDrawer(false)} />}
      {toast && (
        <p className="pl-toast" role="status">
          <Check size={14} aria-hidden="true" /> {toast}
          <button type="button" aria-label="Dismiss" onClick={() => setToast(undefined)}>
            <X size={13} />
          </button>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- chrome

function ProjectPicker() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="pl-project" aria-label="Project: acme / payments">
          <span className="pl-project-badge" aria-hidden="true">
            pa
          </span>
          <span className="pl-project-text">
            <small>acme</small>
            <strong>payments</strong>
          </span>
          <ChevronDown size={12} aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="pl-menu">
        <DropdownMenuLabel>Org acme</DropdownMenuLabel>
        <DropdownMenuItem>
          <Check /> payments
        </DropdownMenuItem>
        <DropdownMenuItem disabled>ledger (no access)</DropdownMenuItem>
        <DropdownMenuItem disabled>web-console (no access)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PageHeader({ crumbs, title, sub }: { crumbs: string[]; title: string; sub?: string }) {
  return (
    <header className="pl-head">
      <nav className="pl-crumbs" aria-label="Breadcrumb">
        {crumbs.map((crumb, index) => (
          <span key={crumb}>
            {index > 0 && <span aria-hidden="true">/ </span>}
            {crumb}
          </span>
        ))}
      </nav>
      <h1>{title}</h1>
      {sub && <p>{sub}</p>}
    </header>
  );
}

// ---------------------------------------------------------------- executions

const statusFilters = [
  { id: "all", label: "All" },
  { id: "failed", label: "Failed" },
  { id: "running", label: "Running" },
  { id: "succeeded", label: "Succeeded" },
  { id: "other", label: "Cancelled or skipped" },
] as const;
type StatusFilter = (typeof statusFilters)[number]["id"];

function matchesStatus(run: Run, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "failed") return run.state === "failed" || run.state === "timed_out";
  if (filter === "running") return run.state === "running" || run.state === "queued";
  if (filter === "succeeded") return run.state === "succeeded";
  return run.state === "cancelled" || run.state === "skipped";
}

function ExecutionsPage({
  runFor,
  liveElapsed,
  onOpen,
  onToast,
}: {
  runFor: (run: Run) => Run;
  liveElapsed: number;
  onOpen: (runId: string) => void;
  onToast: (text: string) => void;
}) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [trigger, setTrigger] = useState<"all" | Run["trigger"]>("all");
  const [query, setQuery] = useState("");
  const all = runs.map(runFor);
  const q = query.trim().toLowerCase();
  const shown = all.filter(
    (run) =>
      matchesStatus(run, status) &&
      (trigger === "all" || run.trigger === trigger) &&
      (!q || `${run.number} ${run.title} ${run.ref} ${run.author} ${run.command} ${run.commit.slice(0, 7)}`.toLowerCase().includes(q)),
  );
  return (
    <>
      <PageHeader crumbs={["acme", "payments", "Builds"]} title="Executions" sub="Every oyzu operation the project ran, newest first." />
      <div className="pl-filters">
        <div className="pl-chips" role="group" aria-label="Status">
          {statusFilters.map((f) => {
            const count = all.filter((run) => matchesStatus(run, f.id)).length;
            return (
              <button key={f.id} type="button" aria-pressed={status === f.id} onClick={() => setStatus(f.id)}>
                {f.label} <span>{count}</span>
              </button>
            );
          })}
        </div>
        <div className="pl-filter-tools">
          <Select value={trigger} onValueChange={(value) => setTrigger(value as typeof trigger)}>
            <SelectTrigger size="sm" aria-label="Trigger type" className="pl-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All triggers</SelectItem>
              <SelectItem value="pull_request">Pull request</SelectItem>
              <SelectItem value="push">Push</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="schedule">Schedule</SelectItem>
            </SelectContent>
          </Select>
          <label className="pl-search">
            <Search size={14} aria-hidden="true" />
            <input
              id="pl-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search runs, branches, people"
              aria-label="Search executions"
            />
          </label>
        </div>
      </div>
      <div className="pl-table" role="table" aria-label="Executions">
        <div className="pl-tr pl-thead" role="row">
          <span role="columnheader">Status</span>
          <span role="columnheader">Execution</span>
          <span role="columnheader">Trigger</span>
          <span role="columnheader">Commit</span>
          <span role="columnheader">Stages</span>
          <span role="columnheader">Duration</span>
          <span role="columnheader">
            <span className="sr-only">Actions</span>
          </span>
        </div>
        {shown.length === 0 && <p className="pl-empty">No executions match these filters.</p>}
        {shown.map((run) => (
          <div
            key={run.id}
            className="pl-tr"
            role="row"
            data-state={run.state}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, [role=menu]")) return;
              onOpen(run.id);
            }}
          >
            <span role="cell" className="pl-td-status">
              <StateChip state={run.state} size="sm" />
            </span>
            <span role="cell" className="pl-td-title">
              <button type="button" className="pl-row-link" onClick={() => onOpen(run.id)}>
                {run.title}
              </button>
              <small>
                #{run.number} · <code className="rb-mono">{run.command}</code>
              </small>
            </span>
            <span role="cell" className="pl-td-trigger">
              <span>
                <TriggerIcon run={run} size={13} /> {triggerText(run)}
              </span>
              <small>
                {run.author} · {ago(run.createdAt)}
              </small>
            </span>
            <span role="cell" className="pl-td-commit">
              <code className="rb-mono">{run.commit.slice(0, 7)}</code>
              <small>{run.ref}</small>
            </span>
            <span role="cell" className="pl-td-stages">
              <StageStrip run={run} />
            </span>
            <span role="cell" className="pl-td-duration">
              {run.state === "running" ? duration(liveElapsed) : duration(run.durationMs)}
              <small>{clock(run.createdAt)}</small>
            </span>
            <span role="cell" className="pl-td-menu">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Actions for #${run.number}`}>
                    <EllipsisVertical />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="pl-menu">
                  <DropdownMenuItem onSelect={() => onToast(`Queued a new attempt of #${run.number} on ${run.commit.slice(0, 7)}.`)}>
                    <RotateCcw /> Re-run
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      navigator.clipboard?.writeText(run.command).catch(() => undefined);
                      onToast(`Copied ${run.command}`);
                    }}
                  >
                    <Copy /> Copy command
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onOpen(run.id)}>Open execution</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- triggers

function bindingKind(filters: string[]) {
  const first = filters[0].toLowerCase();
  if (first.startsWith("pull request")) return "Pull request";
  if (first.startsWith("push")) return "Push";
  if (first.startsWith("tag")) return "Tag";
  if (first.startsWith("schedule")) return "Schedule";
  return "Event";
}

function verdict(delivery: Delivery) {
  const matched = delivery.evaluations.filter((e) => e.matched).length;
  if (delivery.outcome === "rejected") return { tone: "failed" as const, text: "Rejected" };
  if (delivery.outcome === "unregistered") return { tone: "warning" as const, text: "Not registered" };
  if (!matched) return { tone: "skipped" as const, text: `0 of ${delivery.evaluations.length} matched` };
  return { tone: "succeeded" as const, text: `${matched} of ${delivery.evaluations.length} matched` };
}

function TriggersPage({ onOpenRun }: { onOpenRun: (runId: string) => void }) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(bindings.map((b) => [b.id, b.enabled])));
  const [open, setOpen] = useState<string>();
  return (
    <>
      <PageHeader crumbs={["acme", "payments", "Triggers"]} title="Triggers" sub="Which events start which oyzu commands, and what each recent delivery matched." />
      <section className="pl-card">
        <h2 className="pl-card-title">Trigger bindings</h2>
        <table className="pl-grid">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th className="pl-hide-sm">Conditions</th>
              <th className="pl-hide-sm">Runs</th>
              <th>Enabled</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((b) => (
              <tr key={b.id}>
                <td>
                  <strong>{b.name}</strong>
                  <small>{b.scope}</small>
                </td>
                <td>
                  <span className="pl-pill">{bindingKind(b.filters)}</span>
                </td>
                <td className="pl-hide-sm">{b.filters.join(" · ")}</td>
                <td className="pl-hide-sm">
                  {b.actions.map((a) => (
                    <code key={a.command} className="rb-mono pl-cmd">
                      {a.command}
                    </code>
                  ))}
                </td>
                <td>
                  <Switch
                    checked={enabled[b.id]}
                    onCheckedChange={(value) => setEnabled((current) => ({ ...current, [b.id]: value }))}
                    aria-label={`Enable ${b.name}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="pl-card">
        <h2 className="pl-card-title">Recent deliveries</h2>
        <table className="pl-grid">
          <thead>
            <tr>
              <th>Received</th>
              <th>Event</th>
              <th>Match</th>
              <th className="pl-hide-sm">Result</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((d) => {
              const v = verdict(d);
              const expanded = open === d.id;
              return (
                <Fragment key={d.id}>
                  <tr className="pl-clickable" aria-expanded={expanded} onClick={() => setOpen(expanded ? undefined : d.id)}>
                    <td>
                      <strong>{clock(d.receivedAt)}</strong>
                      <small>{ago(d.receivedAt)}</small>
                    </td>
                    <td>
                      <strong>{d.event}</strong>
                      <small>
                        {d.repository} · {d.pr ? `#${d.pr.number}` : d.ref} · {d.actor}
                      </small>
                    </td>
                    <td>
                      <StateChip state={v.tone} label={v.text} size="sm" />
                    </td>
                    <td className="pl-hide-sm">{d.outcomeLabel}</td>
                  </tr>
                  {expanded && (
                    <tr className="pl-detail-row">
                      <td colSpan={4}>
                        {d.evaluations.length ? (
                          <ul className="pl-verdicts">
                            {d.evaluations.map((e) => (
                              <li key={e.bindingId} data-matched={e.matched}>
                                <span className="pl-verdict">{e.matched ? "Matched" : "No match"}</span>
                                <strong>{bindings.find((b) => b.id === e.bindingId)?.name}</strong>
                                <small>{e.reason}</small>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="pl-muted">{d.stages.find((s) => s.status === "fail")?.detail ?? "Not evaluated."}</p>
                        )}
                        {d.runIds.length > 0 && (
                          <p className="pl-runlinks">
                            Started:{" "}
                            {d.runIds.map((id) => (
                              <button key={id} type="button" className="pl-link" onClick={() => onOpenRun(id)}>
                                #{runs.find((r) => r.id === id)?.number}
                              </button>
                            ))}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

// ---------------------------------------------------------------- pools

function PoolsPage({ job, onClearJob }: { job?: string; onClearJob: () => void }) {
  const { role } = usePrototype();
  if (role !== "pool-admin")
    return (
      <>
        <PageHeader crumbs={["acme", "payments", "Pools"]} title="Pools" />
        <div className="pl-note">
          <Server size={18} aria-hidden="true" />
          <div>
            <strong>Pools are managed by pool admins</strong>
            <p>Your runs use Hosted Linux and Acme on-prem. Ask a pool admin if a run seems stuck waiting for a runner.</p>
          </div>
        </div>
      </>
    );
  const logs = job ? poolLogs.filter((l) => l.jobId === job) : [];
  const jobPool = job ? poolOfJob(job) : undefined;
  return (
    <>
      <PageHeader crumbs={["acme", "payments", "Pools"]} title="Pools" sub="Where runs execute. Visible to pool admins only." />
      {job && (
        <section className="pl-card">
          <div className="pl-card-row">
            <h2 className="pl-card-title">Runner diagnostics · {job}</h2>
            <Button size="sm" variant="ghost" onClick={onClearJob}>
              <X /> Close
            </Button>
          </div>
          <p className="pl-muted">Pool {pools.find((p) => p.id === jobPool)?.name ?? "unknown"} · manager events for this job</p>
          <ol className="pl-poollog">
            {logs.map((l, index) => (
              <li key={index} data-level={l.level}>
                <code className="rb-mono">{l.t}</code>
                <strong>{l.msg}</strong>
                <span>{l.manager}</span>
                <small>
                  {Object.entries(l.fields)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(" ")}
                </small>
              </li>
            ))}
            {logs.length === 0 && <li>No pool log events for this job in the preview.</li>}
          </ol>
        </section>
      )}
      <div className="pl-pools">
        {pools.map((pool) => (
          <section key={pool.id} className="pl-card pl-pool" data-highlight={pool.id === jobPool || undefined}>
            <div className="pl-card-row">
              <div>
                <h2 className="pl-card-title">{pool.name}</h2>
                <small className="pl-muted">
                  {pool.kind} · {pool.scope}
                </small>
              </div>
              <StateChip state={pool.status} size="sm" />
            </div>
            <div className="pl-meter" aria-label={`${pool.busy} of ${pool.capacity} busy`}>
              <span style={{ width: `${(pool.busy / pool.capacity) * 100}%` }} />
            </div>
            <p className="pl-muted">
              {pool.busy}/{pool.capacity} busy · {pool.queued} queued
            </p>
            <ul className="pl-managers">
              {pool.managers.map((m) => (
                <li key={m.id}>
                  <StateChip state={m.status} size="sm" label={m.id} />
                  <small>
                    v{m.version} · {m.heartbeat}
                    {m.note ? ` · ${m.note}` : ""}
                  </small>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function ChecksPage({ onOpenRun }: { onOpenRun: (runId: string) => void }) {
  return (
    <>
      <PageHeader crumbs={["acme", "payments", "Checks"]} title="Checks on 9c41e2a" sub="What pull request #482 shows on GitHub." />
      <section className="pl-card">
        <table className="pl-grid">
          <tbody>
            {checks.map((c) => (
              <tr key={c.name} className={c.runId ? "pl-clickable" : undefined} onClick={() => c.runId && onOpenRun(c.runId)}>
                <td>
                  <StateChip state={c.conclusion} size="sm" />
                </td>
                <td>
                  <strong>{c.name}</strong>
                  <small>{c.summary}</small>
                </td>
                <td className="pl-hide-sm">{c.required ? "Required" : "Optional"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function SettingsPage() {
  return (
    <>
      <PageHeader crumbs={["acme", "payments", "Settings"]} title="Settings" />
      <div className="pl-note">
        <Settings size={18} aria-hidden="true" />
        <div>
          <strong>Project settings aren't part of this study</strong>
          <p>The pipeline direction focuses on executions, triggers and pools.</p>
        </div>
      </div>
    </>
  );
}
