import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ArrowRight,
  CircleStop,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Hand,
  ListChecks,
  Play,
  RotateCcw,
  Search,
  Server,
  Sparkles,
  Timer,
  Webhook,
  Workflow,
} from "lucide-react";
import { NavigationSidebar, type SidebarGroup } from "../../../components/patterns/navigation-sidebar";
import { CopyIdentifier } from "../../../components/patterns/copy-identifier";
import { EmptyState } from "../../../components/patterns/empty-state";
import { FeedbackBanner } from "../../../components/patterns/feedback-banner";
import { SearchField } from "../../../components/patterns/search-field";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { AssistantPanel, useAssistant } from "../assistant";
import type { ActionId, AssistantContext } from "../assistant-engine";
import { useLiveRun } from "../live";
import { GroupIcon, LogViewer } from "../log-viewer";
import {
  ago,
  bindingById,
  bindings,
  clock,
  deliveries,
  deliveryById,
  duration,
  failedLog,
  failedRun,
  liveRun,
  logFor,
  poolById,
  pools,
  runs,
  stateLabel,
  type LogEntry,
  type LogGroup,
  type Run,
  type RunState,
} from "../model";
import { actionResult, Mono, StateChip, usePrototype } from "../shared";
import {
  BackLink,
  BindingsPage,
  ChecksPage,
  ConfirmStrip,
  DeliveryPage,
  Done,
  Facts,
  LinkButton,
  OutcomeChip,
  PageHead,
  PoolDetail,
  PoolsPage,
  SkeletonRows,
  Tabs,
  TriggersPage,
  WbContext,
  useBriefLoading,
  useWb,
  type PoolView,
  type RunTab,
  type RunView,
  type WbApi,
  type WbPage,
} from "./workbench-pages";
import "./workbench.css";

// Workbench: the familiar portal, done well. Real app shell (sidebar, topbar,
// breadcrumb, global search), dense pages, and a docked assistant that always
// knows which run, delivery, binding or pool you're looking at.

const navGroups: SidebarGroup[] = [
  {
    id: "builds",
    label: "Builds",
    items: [
      { id: "runs", label: "Runs", href: "#workbench-runs", icon: Play },
      { id: "checks", label: "Checks", href: "#workbench-checks", icon: ListChecks },
      { id: "triggers", label: "Triggers", href: "#workbench-triggers", icon: Webhook },
    ],
  },
  {
    id: "infrastructure",
    label: "Infrastructure",
    items: [{ id: "pools", label: "Pools", href: "#workbench-pools", icon: Server }],
  },
  {
    id: "configuration",
    label: "Configuration",
    items: [{ id: "bindings", label: "Trigger bindings", href: "#workbench-bindings", icon: Workflow }],
  },
];

// ---------------------------------------------------------------- routing

function hrefFor(page: WbPage): string {
  switch (page.name) {
    case "run":
      return `#workbench-run-${runs.find((run) => run.id === page.runId)?.number ?? page.runId}`;
    case "delivery":
      return `#workbench-delivery-${page.deliveryId}`;
    case "bindings":
      return page.bindingId ? `#workbench-binding-${page.bindingId}` : "#workbench-bindings";
    case "pool":
      return `#workbench-pool-${page.poolId}`;
    default:
      return `#workbench-${page.name}`;
  }
}

const simplePages: Record<string, WbPage> = {
  runs: { name: "runs" },
  checks: { name: "checks" },
  triggers: { name: "triggers" },
  bindings: { name: "bindings" },
  pools: { name: "pools" },
};

function parseHash(hash: string): WbPage | undefined {
  const path = hash.replace(/^#/, "");
  if (!path.startsWith("workbench-")) return undefined;
  const rest = path.slice("workbench-".length);
  if (simplePages[rest]) return simplePages[rest];
  if (rest.startsWith("run-")) {
    const run = runs.find((item) => String(item.number) === rest.slice(4));
    return run ? { name: "run", runId: run.id } : { name: "runs" };
  }
  if (rest.startsWith("delivery-")) return { name: "delivery", deliveryId: rest.slice(9) };
  if (rest.startsWith("binding-")) return { name: "bindings", bindingId: rest.slice(8) };
  if (rest.startsWith("pool-")) return { name: "pool", poolId: rest.slice(5) };
  return undefined;
}

const navFor: Record<WbPage["name"], string> = {
  runs: "runs",
  run: "runs",
  checks: "checks",
  triggers: "triggers",
  delivery: "triggers",
  bindings: "bindings",
  pools: "pools",
  pool: "pools",
};

const sectionLabel: Record<WbPage["name"], string> = {
  runs: "Runs",
  run: "Runs",
  checks: "Checks",
  triggers: "Triggers",
  delivery: "Triggers",
  bindings: "Trigger bindings",
  pools: "Pools",
  pool: "Pools",
};
const sectionPage: Record<WbPage["name"], WbPage> = {
  runs: { name: "runs" },
  run: { name: "runs" },
  checks: { name: "checks" },
  triggers: { name: "triggers" },
  delivery: { name: "triggers" },
  bindings: { name: "bindings" },
  pools: { name: "pools" },
  pool: { name: "pools" },
};

function itemLabel(page: WbPage): string | undefined {
  switch (page.name) {
    case "run":
      return `Run ${runs.find((run) => run.id === page.runId)?.number ?? ""}`;
    case "delivery":
      return page.deliveryId;
    case "bindings":
      return page.bindingId ? bindingById(page.bindingId)?.name : undefined;
    case "pool":
      return poolById(page.poolId)?.name;
    case "checks":
      return "9c41e2a";
    default:
      return undefined;
  }
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

const poolOfJob = (jobId: string) =>
  runs.flatMap((run) => run.attempts).find((attempt) => attempt.jobId === jobId)?.pool ?? "acme-onprem";
const poolOfManager = (managerId: string) =>
  pools.find((pool) => pool.managers.some((m) => m.id === managerId))?.id ?? "acme-onprem";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

// ---------------------------------------------------------------- shell

export function Workbench() {
  const { role } = usePrototype();
  const [page, setPage] = useState<WbPage>(() => parseHash(window.location.hash) ?? { name: "runs" });
  const [runView, setRunView] = useState<RunView>({ nonce: 0 });
  const [poolView, setPoolView] = useState<PoolView>({ tab: "managers", job: "", manager: "all", level: "all" });
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(bindings.map((b) => [b.id, b.enabled])),
  );
  const [shipping, setShippingMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pools.map((p) => [p.id, p.shipping])),
  );
  const [drained, setDrained] = useState<string[]>([]);
  const [cancelledAt, setCancelledAt] = useState<number>();
  const isPhone = useMedia("(max-width: 760px)");
  const mainRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ---- live run 9014, with an optional cancel from the portal
  const live = useLiveRun();
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
      groups: liveRun.groups.map((g) => {
        const state = live.groups[g.scope] ?? g.state;
        return {
          ...g,
          state: cancelled && state !== "succeeded" ? ("skipped" as const) : state,
          durationMs:
            state === "succeeded" && !g.durationMs ? (g.scope === "api-image/compile" ? 26_800 : 20_700) : g.durationMs,
        };
      }),
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
  const navigate = useCallback(
    (next: WbPage, opts?: { run?: Partial<RunView>; pool?: PoolView; push?: boolean }) => {
      setPage(next);
      if (next.name === "run") setRunView((current) => ({ nonce: current.nonce + 1, ...opts?.run }));
      if (next.name === "pool") setPoolView(opts?.pool ?? { tab: "managers", job: "", manager: "all", level: "all" });
      if (opts?.push === false) return;
      const href = hrefFor(next);
      try {
        if (window.location.hash !== href) window.history.pushState(null, "", href);
      } catch {
        /* the hash is a convenience only */
      }
    },
    [],
  );
  useEffect(() => {
    const onHash = () => {
      const next = parseHash(window.location.hash);
      if (next) navigate(next, { push: false });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [navigate]);
  const go = useCallback((next: WbPage) => navigate(next), [navigate]);
  const openRun = useCallback(
    (runId: string, view?: Partial<RunView>) => navigate({ name: "run", runId }, { run: view }),
    [navigate],
  );
  const openPoolLogs = useCallback(
    (poolId: string, filter: { job?: string; manager?: string }) =>
      navigate(
        { name: "pool", poolId },
        { pool: { tab: "logs", job: filter.job ?? "", manager: filter.manager ?? "all", level: "all" } },
      ),
    [navigate],
  );

  const pageKey = page.name === "bindings" ? "bindings" : hrefFor(page);
  useEffect(() => {
    mainRef.current?.scrollTo?.({ top: 0 });
    if (window.matchMedia?.("(max-width: 760px)").matches) window.scrollTo({ top: 0 });
  }, [pageKey]);

  // ---- assistant, following the page
  const currentRun = page.name === "run" ? runs.find((run) => run.id === page.runId) : undefined;
  const currentAttempt = currentRun ? (runView.attempt ?? currentRun.attempt) : undefined;
  const context = useMemo<AssistantContext>(() => {
    switch (page.name) {
      case "run":
        return { kind: "run", runId: page.runId, attempt: currentAttempt };
      case "delivery":
        return { kind: "delivery", deliveryId: page.deliveryId };
      case "bindings":
        return page.bindingId ? { kind: "binding", bindingId: page.bindingId } : { kind: "home" };
      case "pool":
        return { kind: "pool", poolId: page.poolId };
      case "pools":
        return { kind: "pool", poolId: "acme-onprem" };
      default:
        return { kind: "home" };
    }
  }, [page, currentAttempt]);
  const contextLabel = (() => {
    switch (page.name) {
      case "run":
        return `Run ${currentRun?.number ?? ""}${currentRun && currentRun.attempts.length > 1 ? `, attempt ${currentAttempt}` : ""} · ${currentRun?.check ?? ""}`;
      case "delivery": {
        const d = deliveryById(page.deliveryId);
        return `Delivery ${page.deliveryId}${d ? ` · ${d.event}` : ""}`;
      }
      case "bindings":
        return page.bindingId ? `Binding: ${bindingById(page.bindingId)?.name ?? page.bindingId}` : "Trigger bindings in acme";
      case "pool":
        return `Pool: ${poolById(page.poolId)?.name ?? page.poolId}`;
      case "pools":
        return "Pools for payments";
      case "checks":
        return "Checks on commit 9c41e2a";
      case "triggers":
        return "Trigger history for acme";
      default:
        return "Project payments";
    }
  })();
  const assistant = useAssistant(context, role);
  const askRef = useRef(assistant.ask);
  askRef.current = assistant.ask;

  const askAbout = useCallback((question: string) => {
    setAssistantOpen(true);
    askRef.current(question);
  }, []);
  const askLine = useCallback((entry: LogEntry) => {
    setAssistantOpen(true);
    askRef.current(`Explain line ${entry.seq}`, entry);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setAssistantOpen((open) => !open);
        return;
      }
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, select, [contenteditable='true']");
      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setSearchOpen(true);
        window.requestAnimationFrame(() => searchRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const revealLog = () =>
    window.requestAnimationFrame(() =>
      document
        .querySelector(".wb-root .log-viewer")
        ?.scrollIntoView({ block: "start", behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }),
    );

  const onCite = (runId: string, attempt: number, seq: number) => {
    openRun(runId, { tab: "logs", attempt, focusSeq: seq });
    if (isPhone) setAssistantOpen(false);
    revealLog();
  };

  const drain = useCallback((managerId: string) => setDrained((current) => [...new Set([...current, managerId])]), []);

  const onAction = (id: ActionId, target?: string) => {
    let navigated = true;
    switch (id) {
      case "open-logs": {
        const first = failedLog.find((entry) => entry.level === "error");
        openRun(failedRun.id, { tab: "logs", attempt: 2, focusSeq: first?.seq });
        revealLog();
        break;
      }
      case "open-attempt-1":
        openRun(failedRun.id, { tab: "logs", attempt: 1 });
        revealLog();
        break;
      case "open-run":
        openRun(target ?? liveRun.id, { tab: "logs" });
        revealLog();
        break;
      case "diagnostics":
        if (role !== "pool-admin") {
          assistant.note("Runner diagnostics are for pool admins. The pool's admins already see this job's pool logs.");
          navigated = false;
        } else if (target?.startsWith("job-")) openPoolLogs(poolOfJob(target), { job: target });
        else openPoolLogs(poolOfManager(target ?? "mgr-onprem-02"), { manager: target ?? "mgr-onprem-02" });
        break;
      case "open-delivery":
        navigate({ name: "delivery", deliveryId: target ?? "dlv-7f12" });
        break;
      case "open-binding":
        navigate({ name: "bindings", bindingId: target ?? "pr-affected" });
        break;
      case "open-pool":
        navigate({ name: "pool", poolId: target ?? "acme-onprem" });
        break;
      case "register-repo":
        navigate({ name: "delivery", deliveryId: "dlv-7e40" });
        break;
      case "drain-manager":
        drain(target ?? "mgr-onprem-02");
        assistant.note(actionResult(id, target) ?? "Draining.");
        navigated = false;
        break;
      default: {
        const text = actionResult(id, target);
        if (text) assistant.note(text);
        navigated = false;
      }
    }
    if (navigated && isPhone) setAssistantOpen(false);
  };

  const api: WbApi = {
    role,
    go,
    openRun,
    openPoolLogs,
    openAssistant: () => setAssistantOpen(true),
    askAbout,
    runFor,
    liveState,
    liveElapsed,
    enabled,
    setBindingEnabled: (id, value) => setEnabled((current) => ({ ...current, [id]: value })),
    shipping,
    setShipping: (id, value) => setShippingMap((current) => ({ ...current, [id]: value })),
    drained,
    drain,
  };

  const item = itemLabel(page);
  const panel = (
    <AssistantPanel
      contextLabel={contextLabel}
      assistant={assistant}
      onCite={onCite}
      onAction={onAction}
      onClose={() => setAssistantOpen(false)}
    />
  );

  let content;
  switch (page.name) {
    case "runs":
      content = <RunsPage />;
      break;
    case "run":
      content = (
        <RunDetail
          runId={page.runId}
          view={runView}
          onView={setRunView}
          liveEntries={liveEntries}
          onAskLine={askLine}
          onCancelLive={() => setCancelledAt(live.entries.length)}
          logHeight={isPhone ? "68dvh" : "clamp(340px, calc(100dvh - 420px), 680px)"}
        />
      );
      break;
    case "checks":
      content = <ChecksPage />;
      break;
    case "triggers":
      content = <TriggersPage />;
      break;
    case "delivery":
      content = <DeliveryPage deliveryId={page.deliveryId} />;
      break;
    case "bindings":
      content = <BindingsPage selected={page.bindingId} />;
      break;
    case "pools":
      content = <PoolsPage />;
      break;
    case "pool":
      content = <PoolDetail poolId={page.poolId} view={poolView} onView={setPoolView} />;
      break;
  }

  return (
    <WbContext.Provider value={api}>
      <div
        className={
          "wb-root app-shell" +
          (collapsed ? " sidebar-collapsed" : "") +
          (assistantOpen && !isPhone ? " wb-has-dock" : "")
        }
      >
        <NavigationSidebar
          groups={navGroups}
          activeId={navFor[page.name]}
          location={hrefFor(page)}
          workspaceName="acme / payments"
          collapsed={collapsed}
          closedGroups={closedGroups}
          onCollapsedChange={setCollapsed}
          onGroupsChange={setClosedGroups}
          contextWidget={(compact) => (
            <div className="navigation-workspace wb-workspace" title="acme / payments">
              <span aria-hidden="true">PA</span>
              {!compact && (
                <div>
                  <strong>payments</strong>
                  <small>acme · acme/payments-api</small>
                </div>
              )}
            </div>
          )}
          accountWidget={(compact) => (
            <div className="wb-account" title={role === "pool-admin" ? "Micah, pool admin" : "Micah, project member"}>
              <span aria-hidden="true">MI</span>
              {!compact && (
                <div>
                  <strong>Micah</strong>
                  <small>{role === "pool-admin" ? "Pool admin" : "Project member"}</small>
                </div>
              )}
            </div>
          )}
        />
        <div className="main-shell wb-shell">
          <header className="wb-topbar">
            <nav className="wb-crumbs" aria-label="Breadcrumb">
              <ol>
                <li className="wb-crumb-org">acme</li>
                <li className="wb-crumb-org">payments</li>
                <li>
                  {item ? (
                    <button type="button" onClick={() => go(sectionPage[page.name])}>
                      {sectionLabel[page.name]}
                    </button>
                  ) : (
                    <span aria-current="page">{sectionLabel[page.name]}</span>
                  )}
                </li>
                {item && (
                  <li>
                    <span aria-current="page">{item}</span>
                  </li>
                )}
              </ol>
            </nav>
            <div className="wb-search" data-open={searchOpen || undefined}>
              <GlobalSearch
                inputRef={searchRef}
                onPick={(next) => {
                  go(next);
                  setSearchOpen(false);
                }}
              />
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="wb-search-toggle"
              aria-label={searchOpen ? "Close search" : "Search"}
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) window.requestAnimationFrame(() => searchRef.current?.focus());
              }}
            >
              <Search />
            </Button>
            <Button
              size="sm"
              className="wb-ask"
              aria-pressed={assistantOpen}
              aria-keyshortcuts={isMac ? "Meta+J" : "Control+J"}
              onClick={() => setAssistantOpen(!assistantOpen)}
            >
              <Sparkles /> <span className="wb-ask-label">Ask Oyzu</span>
              <kbd className="wb-kbd">{isMac ? "⌘J" : "Ctrl J"}</kbd>
            </Button>
          </header>
          <div className="wb-body">
            <main id="main" tabIndex={-1} ref={mainRef} className="wb-main">
              <div className="wb-page" key={pageKey}>
                {content}
              </div>
            </main>
            {assistantOpen && !isPhone && <aside className="wb-dock">{panel}</aside>}
          </div>
        </div>
        {isPhone && (
          <Dialog open={assistantOpen} onOpenChange={setAssistantOpen}>
            <DialogContent className="wb-sheet" showCloseButton={false}>
              <DialogTitle className="sr-only">Ask Oyzu</DialogTitle>
              <DialogDescription className="sr-only">Troubleshooting assistant about {contextLabel}</DialogDescription>
              {panel}
            </DialogContent>
          </Dialog>
        )}
      </div>
    </WbContext.Provider>
  );
}

/** Smooth per-second elapsed timer for the live run between log arrivals. */
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

// ---------------------------------------------------------------- global search

type Hit = { key: string; kind: string; label: string; meta: string; page: WbPage };

function searchAll(query: string): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Hit[] = [
    ...runs.map((run) => ({
      key: run.id,
      kind: "Run",
      label: `${run.number} · ${run.title}`,
      meta: `${run.check} · ${run.ref} · ${run.commit.slice(0, 7)}`,
      page: { name: "run", runId: run.id } as WbPage,
      text: `${run.number} ${run.title} ${run.check} ${run.ref} ${run.commit} ${run.pr ? `#${run.pr}` : ""} ${run.author}`,
    })),
    ...deliveries.map((d) => ({
      key: d.id,
      kind: "Delivery",
      label: `${d.id} · ${d.event}`,
      meta: `${d.repository}${d.pr ? ` · #${d.pr.number}` : ""} · ${d.outcomeLabel}`,
      page: { name: "delivery", deliveryId: d.id } as WbPage,
      text: `${d.id} ${d.event} ${d.repository} ${d.ref} ${d.correlationId} ${d.connector} ${d.pr ? `#${d.pr.number} ${d.pr.title}` : ""}`,
    })),
    ...bindings.map((b) => ({
      key: b.id,
      kind: "Binding",
      label: b.name,
      meta: b.scope,
      page: { name: "bindings", bindingId: b.id } as WbPage,
      text: `${b.name} ${b.id} ${b.scope} ${b.actions.map((a) => a.check).join(" ")}`,
    })),
    ...pools.map((p) => ({
      key: p.id,
      kind: "Pool",
      label: p.name,
      meta: `${p.kind} · ${p.managers.map((m) => m.id).join(", ")}`,
      page: { name: "pool", poolId: p.id } as WbPage,
      text: `${p.name} ${p.id} ${p.kind} ${p.managers.map((m) => m.id).join(" ")}`,
    })),
  ]
    .filter((hit) => hit.text.toLowerCase().includes(q))
    .map(({ key, kind, label, meta, page }) => ({ key, kind, label, meta, page }));
  return hits.slice(0, 8);
}

function GlobalSearch({
  inputRef,
  onPick,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (page: WbPage) => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const hits = useMemo(() => searchAll(query), [query]);
  const open = focused && query.trim().length > 0;
  const pick = (hit: Hit) => {
    onPick(hit.page);
    setQuery("");
    inputRef.current?.blur();
  };
  return (
    <div className="wb-gsearch">
      <Search size={14} aria-hidden="true" />
      <Input
        ref={inputRef}
        type="search"
        value={query}
        aria-label="Search runs, deliveries, bindings and pools"
        placeholder="Search runs, deliveries, bindings…"
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && hits[0]) pick(hits[0]);
          if (event.key === "Escape") {
            setQuery("");
            event.currentTarget.blur();
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".wb-gsearch-list button")?.focus();
          }
        }}
      />
      <kbd className="wb-kbd wb-gsearch-kbd" aria-hidden="true">
        /
      </kbd>
      {open && (
        <ul className="wb-gsearch-list" aria-label="Search results">
          {hits.length === 0 && <li className="wb-gsearch-empty">Nothing matches “{query.trim()}”.</li>}
          {hits.map((hit) => (
            <li key={hit.kind + hit.key}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onFocus={() => setFocused(true)}
                onBlur={() => window.setTimeout(() => setFocused(false), 150)}
                onClick={() => pick(hit)}
                onKeyDown={(event) => {
                  const li = event.currentTarget.parentElement;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    (li?.nextElementSibling?.querySelector("button") as HTMLButtonElement | null)?.focus();
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    const prev = li?.previousElementSibling?.querySelector("button") as HTMLButtonElement | null;
                    if (prev) prev.focus();
                    else inputRef.current?.focus();
                  }
                }}
              >
                <span className="wb-gsearch-kind">{hit.kind}</span>
                <span className="wb-gsearch-text">
                  <strong>{hit.label}</strong>
                  <small>{hit.meta}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- runs

const triggerLabel: Record<Run["trigger"], string> = {
  pull_request: "Pull request",
  push: "Push",
  manual: "Manual",
  schedule: "Schedule",
};
const triggerIcon = { pull_request: GitPullRequest, push: GitCommitHorizontal, manual: Hand, schedule: Timer } as const;

const stateFilters: [string, string][] = [
  ["all", "All states"],
  ["failed", "Failed"],
  ["running", "Running"],
  ["succeeded", "Succeeded"],
  ["other", "Skipped or cancelled"],
];

function matchesState(run: Run, filter: string) {
  if (filter === "all") return true;
  if (filter === "other") return run.state === "skipped" || run.state === "cancelled";
  if (filter === "failed") return run.state === "failed" || run.state === "timed_out";
  return run.state === filter;
}

function RunsPage() {
  const { openRun, runFor, liveElapsed } = useWb();
  const [state, setState] = useState("all");
  const [trigger, setTrigger] = useState("all");
  const [query, setQuery] = useState("");
  const loading = useBriefLoading("runs");
  const all = runs.map(runFor);
  const q = query.trim().toLowerCase();
  const rows = all.filter(
    (run) =>
      matchesState(run, state) &&
      (trigger === "all" || run.trigger === trigger) &&
      (!q ||
        `${run.number} ${run.title} ${run.check} ${run.ref} ${run.commit} ${run.author} ${run.pr ? `#${run.pr}` : ""}`
          .toLowerCase()
          .includes(q)),
  );
  const count = (filter: string) => all.filter((run) => matchesState(run, filter)).length;
  const stats: [string, string, number][] = [
    ["failed", "Failed", count("failed")],
    ["running", "Running", count("running")],
    ["succeeded", "Succeeded", count("succeeded")],
    ["other", "Skipped or cancelled", count("other")],
  ];
  return (
    <>
      <PageHead
        eyebrow="Builds · Runs"
        title="Runs"
        lede="Each run is one oyzu command on one exact commit. Copy the command from any run to reproduce it on your machine, or add --remote to run it here."
      />
      <div className="wb-stats" role="group" aria-label="Runs today by state">
        {stats.map(([id, label, value]) => (
          <button
            key={id}
            type="button"
            className="wb-stat"
            data-state={id}
            aria-pressed={state === id}
            onClick={() => setState(state === id ? "all" : id)}
          >
            <strong>{value}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="wb-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search runs" placeholder="Search by number, title, branch or commit…" />
        <Select value={state} onValueChange={setState}>
          <SelectTrigger size="sm" aria-label="Filter by state" className="wb-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {stateFilters.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={trigger} onValueChange={setTrigger}>
          <SelectTrigger size="sm" aria-label="Filter by trigger" className="wb-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All triggers</SelectItem>
            <SelectItem value="pull_request">Pull request</SelectItem>
            <SelectItem value="push">Push</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {!loading && rows.length === 0 ? (
        <EmptyState
          filtered
          title="No runs match these filters"
          description="Runs from the last 30 days are searchable. Try another state or trigger, or clear the search."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setState("all");
                setTrigger("all");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Table className="wb-table wb-runs">
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Run</TableHead>
              <TableHead>Check</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <SkeletonRows rows={6} cols={7} />
            ) : (
              rows.map((run) => {
                const TriggerIcon = triggerIcon[run.trigger];
                const isLive = run.state === "running";
                return (
                  <TableRow key={run.id} className="wb-row" data-live={isLive || undefined} onClick={() => openRun(run.id)}>
                    <TableCell data-label="State">
                      <StateChip state={run.state} size="sm" />
                    </TableCell>
                    <TableCell data-label="Run" className="wb-cell-title">
                      <button
                        type="button"
                        className="wb-row-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          openRun(run.id);
                        }}
                      >
                        <span className="wb-run-number">{run.number}</span> {run.title}
                      </button>
                      <small className="wb-muted">
                        {run.author} · <Mono>{run.commit.slice(0, 7)}</Mono>
                      </small>
                    </TableCell>
                    <TableCell data-label="Check">
                      <span className="wb-check-tag">{run.check}</span>
                    </TableCell>
                    <TableCell data-label="Ref">
                      <span className="wb-ref">
                        <GitBranch size={12} aria-hidden="true" /> {run.ref}
                      </span>
                      {run.pr && <small className="wb-muted">#{run.pr}</small>}
                    </TableCell>
                    <TableCell data-label="Trigger">
                      <span className="wb-trigger">
                        <TriggerIcon size={12} aria-hidden="true" /> {triggerLabel[run.trigger]}
                      </span>
                    </TableCell>
                    <TableCell data-label="Duration" className="wb-num">
                      {isLive ? (
                        <span className="wb-live-timer" aria-label={`Running for ${duration(liveElapsed)}`}>
                          <span className="wb-pulse" aria-hidden="true" />
                          {duration(liveElapsed)}
                        </span>
                      ) : (
                        duration(run.durationMs)
                      )}
                    </TableCell>
                    <TableCell data-label="Started">
                      <span className="wb-cell-main">{clock(run.createdAt)}</span>
                      <small className="wb-muted">{ago(run.createdAt)}</small>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </>
  );
}

// ---------------------------------------------------------------- run detail

function operationText(run: Run) {
  const op = run.operation;
  if (op.kind === "run") return `Run task ${op.task}`;
  if (op.targets?.length) return `Build ${op.targets.join(", ")}`;
  if (op.affectedBase) return `Build every target affected since merge base ${op.affectedBase}`;
  return "Build all targets";
}

function attemptGroups(run: Run, attempt: number, entries: readonly LogEntry[]): LogGroup[] {
  if (attempt === run.attempt) return run.groups;
  // An earlier, lost attempt: only the groups it reached, closed where it stopped.
  return run.groups
    .filter((group) => entries.some((entry) => entry.scope === group.scope))
    .map((group) => ({
      ...group,
      state: group.scope === "runner" ? ("failed" as const) : ("skipped" as const),
      durationMs: group.scope === "runner" ? run.attempts[attempt - 1]?.durationMs ?? 0 : 0,
    }));
}

function fmtBytes(size: number) {
  return size >= 1024 ? `${(size / 1024).toFixed(size >= 10_240 ? 0 : 1)} KB` : `${size} B`;
}

function RunDetail({
  runId,
  view,
  onView,
  liveEntries,
  onAskLine,
  onCancelLive,
  logHeight,
}: {
  runId: string;
  view: RunView;
  onView: (view: RunView) => void;
  liveEntries: LogEntry[];
  onAskLine: (entry: LogEntry) => void;
  onCancelLive: () => void;
  logHeight: string;
}) {
  const { role, go, runFor, liveElapsed, askAbout, openAssistant, openPoolLogs } = useWb();
  const [confirm, setConfirm] = useState<"rerun" | "cancel">();
  const [done, setDone] = useState<string>();
  const base = runs.find((item) => item.id === runId);
  if (!base)
    return (
      <EmptyState
        title="Run not found"
        description="Runs are kept for 30 days."
        action={
          <Button size="sm" variant="outline" onClick={() => go({ name: "runs" })}>
            All runs
          </Button>
        }
      />
    );
  const run = runFor(base);
  const isLiveRun = run.id === liveRun.id;
  const running = run.state === "running";
  const attempt = view.attempt ?? run.attempt;
  const attemptInfo = run.attempts.find((a) => a.n === attempt);
  const tab: RunTab = view.tab ?? (run.state === "failed" || isLiveRun ? "logs" : "summary");
  const entries = isLiveRun ? liveEntries : logFor(run.id, attempt);
  const groups = isLiveRun ? run.groups : attemptGroups(run, attempt, entries);
  const delivery = run.deliveryId ? deliveryById(run.deliveryId) : undefined;
  const binding = run.bindingId ? bindingById(run.bindingId) : undefined;
  const short = run.commit.slice(0, 7);
  const remote = `${run.command} --remote --ref ${short}`;
  const setTab = (next: RunTab) => onView({ ...view, tab: next });
  const lost = (reason?: string) => reason?.match(/(\d+) log lines/)?.[1];
  return (
    <>
      <PageHead
        back={<BackLink label="All runs" onClick={() => go({ name: "runs" })} />}
        eyebrow={
          <>
            Run {run.number} · {run.check}
          </>
        }
        title={run.title}
        meta={
          <>
            <StateChip state={run.state} />
            {run.pr && (
              <span className="wb-meta-item">
                <GitPullRequest size={13} aria-hidden="true" /> #{run.pr}
              </span>
            )}
            <span className="wb-meta-item">
              <GitBranch size={13} aria-hidden="true" /> {run.ref}
            </span>
            <span className="wb-meta-item">
              <GitCommitHorizontal size={13} aria-hidden="true" /> <Mono>{short}</Mono>
            </span>
            <span className="wb-meta-item">by {run.author}</span>
            <span className="wb-meta-item">
              {clock(run.createdAt)} · {ago(run.createdAt)}
            </span>
            <span className="wb-meta-item">
              <Timer size={13} aria-hidden="true" />{" "}
              {running ? (
                <span className="wb-live-timer">
                  <span className="wb-pulse" aria-hidden="true" />
                  {duration(liveElapsed)}
                </span>
              ) : (
                duration(run.durationMs)
              )}
            </span>
          </>
        }
        actions={
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => (run.state === "failed" ? askAbout("Why did this fail?") : openAssistant())}
            >
              <Sparkles /> {run.state === "failed" ? "Ask why it failed" : "Ask Oyzu"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirm("rerun")} disabled={running}>
              <RotateCcw /> Rerun
            </Button>
            {running && (
              <Button size="sm" variant="destructive" onClick={() => setConfirm("cancel")}>
                <CircleStop /> Cancel
              </Button>
            )}
          </>
        }
      />
      {confirm === "rerun" && (
        <ConfirmStrip
          confirmLabel="Rerun"
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            setConfirm(undefined);
            setDone(
              run.id === failedRun.id
                ? (actionResult("rerun-failed") ?? "")
                : `Queued a new attempt of ${run.check} for ${short}. The same command runs on the same commit${run.pr ? `, and the check on #${run.pr} shows queued` : ""}.`,
            );
          }}
        >
          Rerun {run.check} for <Mono>{short}</Mono>? It creates attempt {run.attempts.length + 1} with the same command and
          commit{run.pr ? `, and the check on #${run.pr} goes back to queued` : ""}.
        </ConfirmStrip>
      )}
      {confirm === "cancel" && (
        <ConfirmStrip
          danger
          confirmLabel="Cancel run"
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            setConfirm(undefined);
            onCancelLive();
            setDone(`Cancelled run ${run.number}. The executor stopped and ${run.check} reports cancelled on #${run.pr}.`);
          }}
        >
          Cancel run {run.number}? The executor stops now, outputs aren't uploaded, and {run.check} reports cancelled.
        </ConfirmStrip>
      )}
      {done && <Done text={done} onDismiss={() => setDone(undefined)} />}
      {run.reason && (
        <FeedbackBanner
          tone={run.state === "failed" ? "error" : "info"}
          title={run.reason.message}
          action={
            run.id === failedRun.id ? (
              <div className="wb-banner-actions">
                <Button size="sm" variant="outline" onClick={() => onView({ ...view, tab: "logs", attempt: 2, focusSeq: undefined, nonce: view.nonce + 1 })}>
                  Open first error
                </Button>
              </div>
            ) : undefined
          }
        >
          Reason code <Mono>{run.reason.code}</Mono>
          {run.reason.code === "SUPERSEDED" ? ". Pull request runs cancel when a newer push arrives; main never cancels." : ""}
          {run.reason.code === "TASK_NOT_DEFINED" ? ". The binding asked for a task this commit doesn't define, so nothing ran." : ""}
        </FeedbackBanner>
      )}

      <section className="wb-runinfo">
        <div className="wb-command" aria-label="Reproduce this run">
          <div className="wb-command-row">
            <span className="wb-command-label">Local</span>
            <Mono>{run.command}</Mono>
            <CopyIdentifier value={run.command} />
          </div>
          <div className="wb-command-row">
            <span className="wb-command-label">Remote</span>
            <Mono>{remote}</Mono>
            <CopyIdentifier value={remote} />
          </div>
        </div>
        <Facts
          rows={[
            [
              "Pool",
              attemptInfo ? (
                <>
                  {poolById(attemptInfo.pool)?.name ?? attemptInfo.pool} <span className="wb-muted">· {attemptInfo.manager}</span>
                </>
              ) : (
                <span className="wb-muted">Never assigned</span>
              ),
            ],
            [
              "Trigger",
              binding ? (
                <LinkButton onClick={() => go({ name: "bindings", bindingId: binding.id })}>{binding.name}</LinkButton>
              ) : (
                "Manual, from the CLI"
              ),
            ],
            [
              "Delivery",
              run.deliveryId ? (
                delivery ? (
                  <LinkButton onClick={() => go({ name: "delivery", deliveryId: delivery.id })}>{delivery.id}</LinkButton>
                ) : (
                  <Mono>{run.deliveryId}</Mono>
                )
              ) : (
                <span className="wb-muted">None</span>
              ),
            ],
            ["oyzu", <Mono key="v">{run.oyzuVersion}</Mono>],
          ]}
        />
      </section>

      {run.attempts.length > 0 && (
        <ol className="wb-attempts" aria-label="Attempts">
          {run.attempts.map((a, index) => (
            <li key={a.n}>
              <button
                type="button"
                aria-pressed={a.n === attempt}
                onClick={() => onView({ ...view, attempt: a.n, tab: "logs", focusSeq: undefined })}
              >
                <span className="wb-attempt-head">
                  <strong>Attempt {a.n}</strong>
                  <StateChip state={a.state} size="sm" label={a.state === "timed_out" ? "Executor lost" : undefined} />
                </span>
                <small>
                  {a.manager} · <Mono>{a.jobId}</Mono>
                </small>
                <small>
                  {clock(a.startedAt)} · {a.state === "running" ? "running" : duration(a.durationMs)}
                  {lost(a.reason) && <span className="wb-warn-text"> · {lost(a.reason)} lines not received</span>}
                </small>
              </button>
              {index < run.attempts.length - 1 && (
                <span className="wb-attempt-arrow" aria-hidden="true">
                  <ArrowRight size={14} />
                  <small>retried</small>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      <Tabs
        label="Run sections"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "logs", label: "Logs" },
          { id: "summary", label: "Summary", count: run.groups.length || undefined },
          { id: "outputs", label: "Outputs", count: run.outputs.length || undefined },
          { id: "trigger", label: "Trigger" },
        ]}
      />

      <div className="wb-tabpanel" role="tabpanel" aria-label={tab}>
        {tab === "logs" &&
          (entries.length === 0 ? (
            <EmptyState
              title={run.state === "skipped" ? "Nothing ran, so there's no log" : "Log not included in this preview"}
              description={
                run.state === "skipped"
                  ? `The run was skipped before a runner was assigned: ${run.reason?.message ?? "no reason recorded"}.`
                  : "This preview carries logs for runs 9012, 9013 and 9014. Copy the command above to reproduce this run locally."
              }
              action={
                <Button size="sm" variant="outline" onClick={() => setTab("summary")}>
                  View summary
                </Button>
              }
            />
          ) : (
            <LogViewer
              key={`${run.id}-${attempt}-${view.nonce}`}
              run={run}
              entries={entries}
              groups={groups}
              attempt={attempt}
              onAttemptChange={(n) => onView({ ...view, attempt: n, focusSeq: undefined })}
              live={running}
              role={role}
              onDiagnostics={(jobId) => openPoolLogs(poolOfJob(jobId), { job: jobId })}
              onAsk={onAskLine}
              focusSeq={view.focusSeq}
              height={logHeight}
            />
          ))}
        {tab === "summary" && <RunSummary run={run} />}
        {tab === "outputs" &&
          (run.outputs.length === 0 ? (
            <EmptyState
              title={running ? "Outputs appear when the run finishes" : "No outputs"}
              description={
                running
                  ? "The runner uploads outputs and their digests after the last task."
                  : run.state === "skipped" || run.state === "cancelled"
                    ? "The run stopped before it uploaded anything."
                    : "This command doesn't declare outputs."
              }
            />
          ) : (
            <Table className="wb-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Digest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.outputs.map((output) => (
                  <TableRow key={output.path}>
                    <TableCell data-label="Path" className="wb-cell-title">
                      <Mono>{output.path}</Mono>
                    </TableCell>
                    <TableCell data-label="Kind">{output.kind}</TableCell>
                    <TableCell data-label="Size" className="wb-num">
                      {fmtBytes(output.size)}
                    </TableCell>
                    <TableCell data-label="Digest">
                      <span className="wb-copy-row">
                        <Mono>{output.digest}</Mono>
                        <CopyIdentifier value={output.digest} />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ))}
        {tab === "trigger" && <RunTrigger run={run} />}
      </div>
    </>
  );
}

function RunSummary({ run }: { run: Run }) {
  const { go } = useWb();
  const first = run.attempts[0];
  const last = run.attempts[run.attempts.length - 1];
  return (
    <div className="wb-summary">
      <section className="wb-section">
        <div className="wb-section-head">
          <h2>{operationText(run)}</h2>
          <span className="wb-muted">
            <Mono>{run.command}</Mono>
          </span>
        </div>
        {run.groups.length === 0 ? (
          <p className="wb-note">
            {run.reason
              ? `No tasks ran. ${run.reason.message}.`
              : "Task details for this run aren't included in this preview."}
          </p>
        ) : (
          <Table className="wb-table">
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.groups.map((group) => (
                <TableRow key={group.scope} data-state={group.state}>
                  <TableCell data-label="Target" className="wb-cell-title">
                    <strong className="wb-cell-main">{group.target}</strong>
                  </TableCell>
                  <TableCell data-label="Task">{group.task}</TableCell>
                  <TableCell data-label="Result">
                    <span className="wb-group-state">
                      <GroupIcon state={group.state} size={13} />
                      {stateLabel[group.state as RunState] ?? group.state}
                    </span>
                  </TableCell>
                  <TableCell data-label="Duration" className="wb-num">
                    {group.state === "running" ? "running" : duration(group.durationMs)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {run.operation.kind === "build" && run.operation.affectedBase && (
          <p className="wb-note">
            Not selected: <strong>web-console</strong> and <strong>ledger-sim</strong> weren't affected by this change. Their
            required checks report as skipped.{" "}
            <LinkButton onClick={() => go({ name: "checks" })}>See checks for {run.commit.slice(0, 7)}</LinkButton>
          </p>
        )}
      </section>
      <section className="wb-section">
        <div className="wb-section-head">
          <h2>Timing</h2>
        </div>
        <Facts
          rows={[
            ["Created", clock(run.createdAt)],
            ["First attempt started", first ? clock(first.startedAt) : "—"],
            ["Attempts", String(run.attempts.length)],
            ["Final attempt", last ? `${last.state === "running" ? "running" : duration(last.durationMs)} on ${last.manager}` : "—"],
          ]}
        />
      </section>
    </div>
  );
}

function RunTrigger({ run }: { run: Run }) {
  const { go } = useWb();
  const delivery = run.deliveryId ? deliveryById(run.deliveryId) : undefined;
  const binding = run.bindingId ? bindingById(run.bindingId) : undefined;
  const action = binding?.actions.find((a) => a.check === run.check) ?? binding?.actions[0];
  if (run.trigger === "manual")
    return (
      <div className="wb-panel">
        <h3>Started manually</h3>
        <p className="wb-note">
          {run.author} ran <Mono>{run.command} --remote</Mono> from a terminal. Manual runs report to the portal only; they
          don't write a GitHub check.
        </p>
      </div>
    );
  return (
    <div className="wb-trigger-grid">
      <section className="wb-panel">
        <h3>Delivery</h3>
        {delivery ? (
          <>
            <div className="wb-panel-title">
              <Mono>{delivery.event}</Mono>
              <OutcomeChip delivery={delivery} />
            </div>
            <Facts
              rows={[
                ["Received", `${clock(delivery.receivedAt)} via ${delivery.connector}`],
                ["Pull request", delivery.pr ? `#${delivery.pr.number} ${delivery.pr.title}` : "—"],
                ["Actor", delivery.actor],
                [
                  "Correlation",
                  <span key="c" className="wb-copy-row">
                    <Mono>{delivery.correlationId}</Mono>
                    <CopyIdentifier value={delivery.correlationId} />
                  </span>,
                ],
              ]}
            />
            <Button size="sm" variant="outline" onClick={() => go({ name: "delivery", deliveryId: delivery.id })}>
              Open delivery {delivery.id} <ArrowRight />
            </Button>
          </>
        ) : (
          <p className="wb-note">
            Delivery <Mono>{run.deliveryId}</Mono> started this run. Its record is older than today's trigger history.
          </p>
        )}
      </section>
      {binding && (
        <section className="wb-panel">
          <h3>Binding</h3>
          <div className="wb-panel-title">
            <strong>{binding.name}</strong>
            <span className="wb-muted">{binding.scope}</span>
          </div>
          <Facts
            rows={[
              ["Filters", binding.filters.join(" · ")],
              [
                "Action",
                action ? (
                  <span key="a">
                    <Mono>{action.command}</Mono> → {action.check}
                  </span>
                ) : (
                  "—"
                ),
              ],
              ["Mandatory", binding.mandatory ? "Yes, projects can't turn it off" : "No"],
              ["Cancel previous", binding.cancelPrevious ? "Yes, new pushes cancel unfinished runs" : "No"],
            ]}
          />
          <Button size="sm" variant="outline" onClick={() => go({ name: "bindings", bindingId: binding.id })}>
            Open binding <ArrowRight />
          </Button>
        </section>
      )}
    </div>
  );
}
