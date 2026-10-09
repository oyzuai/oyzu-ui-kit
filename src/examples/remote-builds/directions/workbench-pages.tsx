import { createContext, Fragment, useContext, useEffect, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  Cloud,
  FolderGit2,
  KeyRound,
  Laptop,
  LoaderCircle,
  Lock,
  Repeat,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Webhook,
  X,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Progress } from "../../../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Skeleton } from "../../../components/ui/skeleton";
import { Switch } from "../../../components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { CopyIdentifier } from "../../../components/patterns/copy-identifier";
import { EmptyState } from "../../../components/patterns/empty-state";
import { FeedbackBanner } from "../../../components/patterns/feedback-banner";
import { SearchField } from "../../../components/patterns/search-field";
import {
  ago,
  bindings,
  checks,
  clock,
  deliveries,
  deliveryById,
  liveRun,
  poolById,
  poolLogs,
  pools,
  runs,
  type Binding,
  type CheckConclusion,
  type Delivery,
  type Pool,
  type Role,
  type Run,
  type RunState,
  type StageStatus,
} from "../model";
import { actionResult, Mono, StateChip } from "../shared";

// Workbench pages beyond runs: checks, trigger history, delivery records,
// bindings and pools. Shared page furniture lives here too so both files use it.

// ---------------------------------------------------------------- routing + store

export type WbPage =
  | { name: "runs" }
  | { name: "run"; runId: string }
  | { name: "checks" }
  | { name: "triggers" }
  | { name: "delivery"; deliveryId: string }
  | { name: "bindings"; bindingId?: string }
  | { name: "pools" }
  | { name: "pool"; poolId: string };

export type RunTab = "logs" | "summary" | "outputs" | "trigger";
export type RunView = { tab?: RunTab; attempt?: number; focusSeq?: number; nonce: number };
export type PoolView = { tab: "managers" | "logs"; job: string; manager: string; level: string };

export type WbApi = {
  role: Role;
  go: (page: WbPage) => void;
  openRun: (runId: string, view?: Partial<RunView>) => void;
  openPoolLogs: (poolId: string, filter: { job?: string; manager?: string }) => void;
  openAssistant: () => void;
  askAbout: (question: string) => void;
  /** The run with live state merged in, for the one running build. */
  runFor: (run: Run) => Run;
  liveState: RunState;
  liveElapsed: number;
  enabled: Record<string, boolean>;
  setBindingEnabled: (id: string, value: boolean) => void;
  shipping: Record<string, boolean>;
  setShipping: (id: string, value: boolean) => void;
  drained: string[];
  drain: (managerId: string) => void;
};

export const WbContext = createContext<WbApi | null>(null);
export const useWb = () => useContext(WbContext)!;

// ---------------------------------------------------------------- furniture

export function PageHead({
  eyebrow,
  title,
  lede,
  meta,
  actions,
  back,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <header className="wb-head">
      {back}
      <div className="wb-head-row">
        <div className="wb-head-text">
          <p className="wb-eyebrow">{eyebrow}</p>
          <h1 className="wb-h1">{title}</h1>
          {lede && <p className="wb-lede">{lede}</p>}
          {meta && <div className="wb-head-meta">{meta}</div>}
        </div>
        {actions && <div className="wb-head-actions">{actions}</div>}
      </div>
    </header>
  );
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="wb-back" onClick={onClick}>
      <ArrowLeft size={13} aria-hidden="true" /> {label}
    </button>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { id: T; label: string; count?: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="wb-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === value}
          tabIndex={tab.id === value ? 0 : -1}
          onClick={() => onChange(tab.id)}
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
            onChange(next.id);
            const list = event.currentTarget.parentElement;
            window.requestAnimationFrame(() =>
              list?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus(),
            );
          }}
        >
          {tab.label}
          {tab.count !== undefined && <span className="wb-tab-count">{tab.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Inline confirmation: consequences in one sentence, then confirm or keep. */
export function ConfirmStrip({
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}) {
  return (
    <div className="wb-confirm" role="group" aria-label="Confirm action" data-danger={danger || undefined}>
      <p>{children}</p>
      <div>
        <Button size="sm" variant={danger ? "destructive" : "default"} onClick={onConfirm} autoFocus>
          {confirmLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Keep as is
        </Button>
      </div>
    </div>
  );
}

export function Done({ text, onDismiss }: { text: string; onDismiss: () => void }) {
  return (
    <div className="wb-done">
      <FeedbackBanner tone="success" title={text} onDismiss={onDismiss} />
    </div>
  );
}

const prefersReduced = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** A short skeleton beat when a list first loads, so the page reads as fetched. */
export function useBriefLoading(key: string, ms = 420) {
  const [loading, setLoading] = useState(() => !prefersReduced());
  useEffect(() => {
    if (prefersReduced()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(timer);
  }, [key, ms]);
  return loading;
}

export function SkeletonRows({ rows, cols }: { rows: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <TableRow key={row} className="wb-skeleton-row" aria-hidden="true">
          {Array.from({ length: cols }, (_, col) => (
            <TableCell key={col}>
              <Skeleton className="wb-skeleton" style={{ width: `${45 + ((row * 3 + col * 7) % 5) * 11}%` }} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function Facts({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="wb-facts">
      {rows.map(([label, value], index) => (
        <div key={index}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LinkButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="wb-link" onClick={onClick}>
      {children}
    </button>
  );
}

const outcomeState: Record<Delivery["outcome"], CheckConclusion> = {
  started: "success",
  "no-match": "skipped",
  ignored: "skipped",
  rejected: "failure",
  unregistered: "action_required",
};
export function OutcomeChip({ delivery, size = "sm" }: { delivery: Delivery; size?: "sm" | "md" }) {
  return <StateChip state={outcomeState[delivery.outcome]} label={delivery.outcomeLabel} size={size} />;
}

export function runNumber(id?: string) {
  return runs.find((run) => run.id === id)?.number;
}

// ---------------------------------------------------------------- checks

export function ChecksPage() {
  const { openRun, liveState, askAbout } = useWb();
  const list = checks.map((check) => {
    if (check.runId !== liveRun.id) return check;
    if (liveState === "succeeded") return { ...check, conclusion: "success" as const, summary: "api-image built; image index sha256:3e5a…c2d0" };
    if (liveState === "cancelled") return { ...check, conclusion: "cancelled" as const, summary: "Cancelled from the portal" };
    return check;
  });
  const failing = list.filter((check) => check.conclusion === "failure");
  const count = (c: CheckConclusion) => list.filter((check) => check.conclusion === c).length;
  return (
    <>
      <PageHead
        eyebrow="Builds · Checks"
        title={
          <>
            Checks on <Mono>9c41e2a</Mono>
          </>
        }
        lede="Each binding action reports as its own GitHub check. Required checks for targets this change didn't touch report as skipped, so they never block the merge."
        meta={
          <>
            <span className="wb-meta-item">
              <FolderGit2 size={13} aria-hidden="true" /> acme/payments-api
            </span>
            <span className="wb-meta-item">#482 Retry refunds with the original idempotency key</span>
            <span className="wb-meta-item">feat/refund-retries</span>
          </>
        }
      />
      <section className="wb-merge" data-blocked={failing.length > 0 || undefined}>
        <span className="wb-merge-icon" aria-hidden="true">
          {failing.length ? <CircleX size={18} /> : <CircleCheck size={18} />}
        </span>
        <div>
          <strong>
            {failing.length
              ? `Merging is blocked: ${failing.length} required check failed`
              : "All required checks passed or were skipped"}
          </strong>
          <p>
            {count("failure")} failing · {count("in_progress")} in progress · {count("success")} successful ·{" "}
            {count("skipped")} skipped
            {count("cancelled") ? ` · ${count("cancelled")} cancelled` : ""}
          </p>
        </div>
        {failing.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => askAbout("Why did build 9012 fail?")}>
            <Sparkles /> Ask why
          </Button>
        )}
      </section>
      <ul className="wb-checks">
        {list.map((check) => {
          const number = runNumber(check.runId);
          return (
            <li key={check.name} data-conclusion={check.conclusion}>
              <StateChip state={check.conclusion} size="sm" />
              <div className="wb-check-main">
                <div className="wb-check-name">
                  <strong>{check.name}</strong>
                  {check.required && (
                    <Badge variant="outline" className="wb-badge">
                      Required
                    </Badge>
                  )}
                </div>
                <p>
                  {check.summary}
                  {check.conclusion === "skipped" && check.required && (
                    <span className="wb-muted"> · reported as skipped so it doesn't block merging</span>
                  )}
                </p>
              </div>
              {number ? (
                <Button size="sm" variant="ghost" onClick={() => check.runId && openRun(check.runId)}>
                  Run {number} <ArrowRight />
                </Button>
              ) : (
                <span className="wb-muted wb-check-none">No run needed</span>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

// ---------------------------------------------------------------- triggers

const outcomeOptions: [string, string][] = [
  ["all", "All outcomes"],
  ["started", "Started runs"],
  ["no-match", "Nothing matched"],
  ["rejected", "Rejected"],
  ["unregistered", "Not registered"],
];

export function TriggersPage() {
  const { go, askAbout } = useWb();
  const [outcome, setOutcome] = useState("all");
  const [query, setQuery] = useState("");
  const loading = useBriefLoading("deliveries");
  const q = query.trim().toLowerCase();
  const rows = deliveries.filter(
    (d) =>
      (outcome === "all" || d.outcome === outcome) &&
      (!q ||
        [d.id, d.event, d.repository, d.ref, d.actor, d.pr ? `#${d.pr.number} ${d.pr.title}` : ""]
          .join(" ")
          .toLowerCase()
          .includes(q)),
  );
  return (
    <>
      <PageHead
        eyebrow="Builds · Triggers"
        title="Trigger history"
        lede="Every webhook GitHub sends is kept as a delivery record: each stage it passed, and every binding's verdict with the reason."
      />
      <FeedbackBanner
        tone="warning"
        title="github-acme-legacy rejected the last 12 deliveries"
        action={
          <div className="wb-banner-actions">
            <Button size="sm" variant="outline" onClick={() => go({ name: "delivery", deliveryId: "dlv-rej" })}>
              Open rejected deliveries
            </Button>
            <Button size="sm" variant="ghost" onClick={() => askAbout("Why are webhooks being rejected?")}>
              <Sparkles /> Ask Oyzu
            </Button>
          </div>
        }
      >
        Each one failed the signature check, so the webhook secret on GitHub probably doesn't match this connector's.
        Pushes to acme/web-console since 2:02 PM ET started nothing.
      </FeedbackBanner>
      <div className="wb-connectors" aria-label="Connectors">
        <span className="wb-connector">
          <Webhook size={13} aria-hidden="true" /> <strong>github-acme</strong> <span className="wb-ok-dot" /> Healthy ·
          last delivery 3:30 PM ET
        </span>
        <span className="wb-connector" data-bad>
          <Webhook size={13} aria-hidden="true" /> <strong>github-acme-legacy</strong> <span className="wb-bad-dot" /> 12
          rejected since 2:02 PM ET
        </span>
      </div>
      <section className="wb-section">
        <div className="wb-section-head">
          <h2>Deliveries</h2>
          <span className="wb-muted">Today · {deliveries.length} records</span>
        </div>
        <div className="wb-toolbar">
          <SearchField value={query} onChange={setQuery} label="Search deliveries" placeholder="Search by event, repository, PR or id…" />
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger size="sm" aria-label="Filter by outcome" className="wb-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {outcomeOptions.map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!loading && rows.length === 0 ? (
          <EmptyState
            filtered
            title="No deliveries match"
            description="Try another outcome or clear the search."
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setOutcome("all");
                  setQuery("");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <Table className="wb-table">
            <TableHeader>
              <TableRow>
                <TableHead>Received</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Repository</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Runs</TableHead>
                <TableHead>Delivery</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SkeletonRows rows={5} cols={6} />
              ) : (
                rows.map((d) => (
                  <TableRow key={d.id} className="wb-row" onClick={() => go({ name: "delivery", deliveryId: d.id })}>
                    <TableCell data-label="Received">
                      <span className="wb-cell-main">{clock(d.receivedAt)}</span>
                      <small className="wb-muted">{ago(d.receivedAt)}</small>
                    </TableCell>
                    <TableCell data-label="Event" className="wb-cell-title">
                      <button
                        type="button"
                        className="wb-row-link"
                        onClick={(event) => {
                          event.stopPropagation();
                          go({ name: "delivery", deliveryId: d.id });
                        }}
                      >
                        {d.event}
                      </button>
                      <small className="wb-muted">
                        {d.pr ? `#${d.pr.number} ${d.pr.title}${d.pr.draft ? " (draft)" : ""}` : d.ref}
                      </small>
                    </TableCell>
                    <TableCell data-label="Repository">
                      <span className="wb-cell-main">{d.repository}</span>
                      <small className="wb-muted">{d.connector}</small>
                    </TableCell>
                    <TableCell data-label="Outcome">
                      <OutcomeChip delivery={d} />
                    </TableCell>
                    <TableCell data-label="Runs">{d.runIds.length || <span className="wb-muted">—</span>}</TableCell>
                    <TableCell data-label="Delivery">
                      <Mono>{d.id}</Mono>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}

// ---------------------------------------------------------------- delivery detail

const stageIcon: Record<StageStatus, ReactNode> = {
  ok: <CircleCheck size={16} aria-label="Passed" />,
  fail: <CircleX size={16} aria-label="Failed" />,
  skip: <CircleMinus size={16} aria-label="Skipped" />,
  running: <LoaderCircle size={16} className="animate-spin" aria-label="In progress" />,
  pending: <CircleDashed size={16} aria-label="Not reached" />,
};

function headersFor(d: Delivery): [string, string][] {
  return [
    ["X-GitHub-Event", d.event.split(".")[0]],
    ["X-GitHub-Delivery", d.outcome === "rejected" ? "3 samples kept, latest 7c1e09b2-5e4f…" : d.githubDelivery],
    ["X-GitHub-Hook-ID", d.connector === "github-acme-legacy" ? "38817204" : "41827733"],
    ["X-Hub-Signature-256", d.outcome === "rejected" ? "sha256=*** (did not match)" : "sha256=*** (valid)"],
    ["User-Agent", "GitHub-Hookshot/7a1c2e9"],
    ["Content-Type", "application/json"],
  ];
}

type Verdict = { binding: Binding; matched: boolean; reason: string; changed: boolean };

function explainNow(d: Delivery, enabled: Record<string, boolean>): Verdict[] {
  return bindings.map((binding) => {
    const original = d.evaluations.find((e) => e.bindingId === binding.id);
    let matched = original?.matched ?? false;
    let reason = original?.reason ?? "Not evaluated";
    if (!enabled[binding.id]) {
      matched = false;
      reason = binding.scope.startsWith("Org") ? "Disabled for org acme" : "Disabled in project payments";
    } else if (original?.reason.startsWith("Disabled")) {
      reason = binding.filters[0].startsWith("Schedule")
        ? "Runs on a schedule; webhooks don't start it"
        : `Listens for ${binding.filters[0]}, got ${d.event.split(".")[0]}`;
    }
    return { binding, matched, reason, changed: Boolean(original) && matched !== original?.matched };
  });
}

export function DeliveryPage({ deliveryId }: { deliveryId: string }) {
  const { go, openRun, askAbout, enabled, liveState, runFor } = useWb();
  const d = deliveryById(deliveryId);
  const [confirm, setConfirm] = useState<"replay" | "explain" | "rotate">();
  const [done, setDone] = useState<string>();
  const [explained, setExplained] = useState<Verdict[]>();
  const [project, setProject] = useState("ledger");
  const [registered, setRegistered] = useState<string>();
  useEffect(() => {
    setConfirm(undefined);
    setDone(undefined);
    setExplained(undefined);
  }, [deliveryId]);
  if (!d)
    return (
      <EmptyState
        title="Delivery not found"
        description="It may be older than the 30-day retention window."
        action={
          <Button size="sm" variant="outline" onClick={() => go({ name: "triggers" })}>
            Back to trigger history
          </Button>
        }
      />
    );
  const stages = d.stages.map((stage) =>
    d.id === "dlv-7f3a" && stage.key === "ran"
      ? liveState === "running"
        ? stage
        : {
            ...stage,
            status: "ok" as const,
            detail: liveState === "cancelled" ? "1 failed, 1 succeeded, 1 cancelled" : "1 failed, 2 succeeded",
          }
      : stage,
  );
  const evaluated = d.evaluations.length > 0;
  const matchedCount = d.evaluations.filter((e) => e.matched).length;
  const title =
    d.outcome === "rejected"
      ? "12 deliveries rejected"
      : d.pr
        ? `#${d.pr.number} ${d.pr.title}`
        : `${d.event} to ${d.ref}`;
  const startedRuns = d.runIds.map((id) => runs.find((run) => run.id === id)).filter((run): run is Run => Boolean(run));
  const explainHeadline = (rows: Verdict[]) => {
    const now = rows.filter((row) => row.matched).length;
    const changed = rows.filter((row) => row.changed).length;
    if (d.id === "dlv-7f12" && now === 0) return actionResult("explain") ?? "";
    if (now === 0) return "Still no match against today's bindings.";
    return `${now} of ${rows.length} bindings would match today, ${changed ? `${changed} different from` : "the same as"} when it arrived.`;
  };
  return (
    <>
      <PageHead
        back={<BackLink label="Trigger history" onClick={() => go({ name: "triggers" })} />}
        eyebrow={
          <>
            Delivery {d.id} · {d.connector}
          </>
        }
        title={title}
        meta={
          <>
            <OutcomeChip delivery={d} size="md" />
            <span className="wb-meta-item">
              <Mono>{d.event}</Mono>
            </span>
            <span className="wb-meta-item">{d.repository}</span>
            {d.commit !== "—" && (
              <span className="wb-meta-item">
                {d.ref} · <Mono>{d.commit}</Mono>
              </span>
            )}
            {d.actor !== "—" && <span className="wb-meta-item">by {d.actor}</span>}
            <span className="wb-meta-item">
              {clock(d.receivedAt)} · {ago(d.receivedAt)}
            </span>
          </>
        }
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => askAbout(d.outcome === "rejected" ? "Why are webhooks being rejected?" : d.outcome === "started" ? "Which bindings matched?" : "Why did this start nothing?")}>
              <Sparkles /> Ask Oyzu
            </Button>
            {d.outcome === "rejected" ? (
              <Button size="sm" onClick={() => setConfirm("rotate")}>
                <KeyRound /> Rotate webhook secret
              </Button>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setConfirm("explain")}>
                  <ScrollText /> Explain
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirm("replay")}>
                  <Repeat /> Replay
                </Button>
              </>
            )}
          </>
        }
      />
      {confirm === "replay" && (
        <ConfirmStrip
          confirmLabel="Replay delivery"
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            setConfirm(undefined);
            setDone(
              `${actionResult("replay")} New delivery dlv-8a02 points back to ${d.id}.` +
                (matchedCount ? " Matching bindings start runs again, and cancel-previous applies." : ""),
            );
          }}
        >
          Replay {d.id} as a new delivery linked to this one? It goes through every stage again against today's bindings
          {matchedCount ? ", so it can start runs and write checks" : ""}.
        </ConfirmStrip>
      )}
      {confirm === "explain" && (
        <ConfirmStrip
          confirmLabel="Run dry run"
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            setConfirm(undefined);
            setExplained(explainNow(d, enabled));
          }}
        >
          Evaluate this delivery against today's bindings as a dry run? Nothing starts and no checks are written.
        </ConfirmStrip>
      )}
      {confirm === "rotate" && (
        <ConfirmStrip
          confirmLabel="Rotate secret"
          onCancel={() => setConfirm(undefined)}
          onConfirm={() => {
            setConfirm(undefined);
            setDone(actionResult("rotate-secret") ?? "Secret rotated.");
          }}
        >
          Generate a new webhook secret for github-acme-legacy? The current one keeps working for 24 hours while you paste
          the new value into GitHub.
        </ConfirmStrip>
      )}
      {done && <Done text={done} onDismiss={() => setDone(undefined)} />}
      {d.outcome === "unregistered" && (
        <FeedbackBanner
          tone={registered ? "success" : "warning"}
          title={
            registered
              ? `Registered acme/ledger-tools to project ${registered}`
              : "acme/ledger-tools isn't registered to any project"
          }
          action={
            registered ? (
              <div className="wb-banner-actions">
                <Button size="sm" variant="outline" onClick={() => setConfirm("replay")}>
                  <Repeat /> Replay this delivery
                </Button>
              </div>
            ) : (
              <div className="wb-banner-actions">
                <Select value={project} onValueChange={setProject}>
                  <SelectTrigger size="sm" aria-label="Project" className="wb-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ledger">Project ledger</SelectItem>
                    <SelectItem value="payments">Project payments</SelectItem>
                    <SelectItem value="platform">Project platform</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => setRegistered(project)}>
                  Register repository
                </Button>
              </div>
            )
          }
        >
          {registered
            ? "New deliveries from it are evaluated against that project's bindings. Replay this one to evaluate it now."
            : "The GitHub App can see it, but no project owns it, so no bindings were evaluated. Register it to a project to start building it."}
        </FeedbackBanner>
      )}
      <div className="wb-split">
        <div className="wb-split-main">
          <section className="wb-section">
            <div className="wb-section-head">
              <h2>Stages</h2>
              <span className="wb-muted">Where this delivery got to</span>
            </div>
            <ol className="wb-stepper">
              {stages.map((stage) => (
                <li key={stage.key} data-status={stage.status}>
                  <span className="wb-step-icon">{stageIcon[stage.status]}</span>
                  <div>
                    <strong>{stage.label}</strong>
                    <p>{stage.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          {explained && (
            <section className="wb-section wb-explain" aria-live="polite">
              <div className="wb-section-head">
                <h2>Dry run against today's bindings</h2>
                <Button size="icon-sm" variant="ghost" aria-label="Close dry run" onClick={() => setExplained(undefined)}>
                  <X />
                </Button>
              </div>
              <p className="wb-explain-lede">
                <ScrollText size={14} aria-hidden="true" /> {explainHeadline(explained)} Run at 3:42 PM ET; nothing started.
              </p>
              <VerdictTable rows={explained} showChange />
            </section>
          )}
          <section className="wb-section">
            <div className="wb-section-head">
              <h2>Binding verdicts</h2>
              <span className="wb-muted">
                {evaluated ? `${matchedCount} of ${d.evaluations.length} matched` : "Not evaluated"}
              </span>
            </div>
            {evaluated ? (
              <VerdictTable
                rows={d.evaluations.map((e) => ({
                  binding: bindings.find((b) => b.id === e.bindingId)!,
                  matched: e.matched,
                  reason: e.reason,
                  changed: false,
                }))}
                runsFor={(binding) => startedRuns.filter((run) => run.bindingId === binding.id)}
              />
            ) : (
              <p className="wb-note">
                {d.outcome === "rejected"
                  ? "Rejected deliveries stop at verification. The body is never read, so no binding sees them."
                  : "Bindings are only evaluated for repositories registered to a project."}
              </p>
            )}
          </section>
        </div>
        <aside className="wb-split-side">
          <section className="wb-panel">
            <h3>Correlation</h3>
            <div className="wb-copy-row">
              <Mono>{d.correlationId}</Mono>
              <CopyIdentifier value={d.correlationId} />
            </div>
            <p className="wb-note">One id links this delivery to its runs, jobs and checks. Search for it in any log.</p>
          </section>
          {startedRuns.length > 0 && (
            <section className="wb-panel">
              <h3>Runs started</h3>
              <ul className="wb-mini-list">
                {startedRuns.map((raw) => {
                  const run = runFor(raw);
                  return (
                    <li key={run.id}>
                      <StateChip state={run.state} size="sm" />
                      <LinkButton onClick={() => openRun(run.id)}>Run {run.number}</LinkButton>
                      <span className="wb-muted">{run.check}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <section className="wb-panel">
            <h3>Allowlisted headers</h3>
            <dl className="wb-headers">
              {headersFor(d).map(([name, value]) => (
                <div key={name}>
                  <dt>{name}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p className="wb-note">Only these headers are kept. Signatures stay masked.</p>
          </section>
          {d.changedPaths.length > 0 && (
            <section className="wb-panel">
              <h3>Changed paths</h3>
              <ul className="wb-paths">
                {d.changedPaths.map((path) => (
                  <li key={path}>
                    <Mono>{path}</Mono>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

function VerdictTable({
  rows,
  showChange,
  runsFor,
}: {
  rows: Verdict[];
  showChange?: boolean;
  runsFor?: (binding: Binding) => Run[];
}) {
  const { go, openRun } = useWb();
  return (
    <Table className="wb-table wb-verdicts">
      <TableHeader>
        <TableRow>
          <TableHead>Binding</TableHead>
          <TableHead>Verdict</TableHead>
          <TableHead>Reason</TableHead>
          {runsFor && <TableHead>Runs</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const started = runsFor?.(row.binding) ?? [];
          return (
            <TableRow key={row.binding.id} data-matched={row.matched}>
              <TableCell data-label="Binding" className="wb-cell-title">
                <LinkButton onClick={() => go({ name: "bindings", bindingId: row.binding.id })}>{row.binding.name}</LinkButton>
                <small className="wb-muted">{row.binding.scope}</small>
              </TableCell>
              <TableCell data-label="Verdict">
                <span className="wb-verdict" data-matched={row.matched}>
                  {row.matched ? <CircleCheck size={13} aria-hidden="true" /> : <CircleMinus size={13} aria-hidden="true" />}
                  {row.matched ? "Matched" : "Not matched"}
                </span>
                {showChange && row.changed && <span className="wb-changed">Changed</span>}
              </TableCell>
              <TableCell data-label="Reason" className="wb-reason">
                {row.reason}
              </TableCell>
              {runsFor && (
                <TableCell data-label="Runs">
                  {started.length ? (
                    <span className="wb-inline-links">
                      {started.map((run) => (
                        <LinkButton key={run.id} onClick={() => openRun(run.id)}>
                          {run.number}
                        </LinkButton>
                      ))}
                    </span>
                  ) : (
                    <span className="wb-muted">—</span>
                  )}
                </TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------- bindings

export function BindingsPage({ selected }: { selected?: string }) {
  const { go, enabled, setBindingEnabled } = useWb();
  const [scope, setScope] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>(selected ? [selected] : []);
  const [pending, setPending] = useState<string>();
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!selected) return;
    setOpen((current) => (current.includes(selected) ? current : [...current, selected]));
    window.requestAnimationFrame(() =>
      document.getElementById(`wb-binding-${selected}`)?.scrollIntoView({ block: "start", behavior: prefersReduced() ? "auto" : "smooth" }),
    );
  }, [selected]);
  const q = query.trim().toLowerCase();
  const list = bindings.filter(
    (b) =>
      (scope === "all" || b.scope.startsWith(scope)) &&
      (!q || [b.name, b.repositories, ...b.filters, ...b.actions.map((a) => a.command + a.check)].join(" ").toLowerCase().includes(q)),
  );
  return (
    <>
      <PageHead
        eyebrow="Configuration · Trigger bindings"
        title="Trigger bindings"
        lede="Bindings decide which webhook events start which oyzu commands. They live in the platform, not in the repository, and every change is audited."
      />
      <div className="wb-toolbar">
        <SearchField value={query} onChange={setQuery} label="Search bindings" placeholder="Search by name, filter or command…" />
        <Select value={scope} onValueChange={setScope}>
          <SelectTrigger size="sm" aria-label="Filter by scope" className="wb-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All scopes</SelectItem>
            <SelectItem value="Org">Org · acme</SelectItem>
            <SelectItem value="Project">Project · payments</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {list.length === 0 && (
        <EmptyState
          filtered
          title="No bindings match"
          description="Clear the search or pick another scope."
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setQuery("");
                setScope("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}
      <div className="wb-bindings">
        {list.map((binding) => {
          const on = enabled[binding.id];
          const seen = deliveries.filter((d) => d.evaluations.some((e) => e.bindingId === binding.id));
          const hits = seen.filter((d) => d.evaluations.find((e) => e.bindingId === binding.id)?.matched).length;
          const expanded = open.includes(binding.id);
          return (
            <article
              key={binding.id}
              id={`wb-binding-${binding.id}`}
              className="wb-binding"
              data-selected={selected === binding.id || undefined}
              data-enabled={on}
            >
              <header>
                <div className="wb-binding-title">
                  <h2>{binding.name}</h2>
                  <p className="wb-muted">
                    {binding.scope} · {binding.repositories}
                  </p>
                </div>
                <label className="wb-switch">
                  <Switch
                    checked={on}
                    onCheckedChange={() => setPending(binding.id)}
                    aria-label={`${binding.name} enabled`}
                  />
                  <span>{on ? "Enabled" : "Disabled"}</span>
                </label>
              </header>
              {pending === binding.id && (
                <ConfirmStrip
                  danger={on}
                  confirmLabel={on ? "Disable binding" : "Enable binding"}
                  onCancel={() => setPending(undefined)}
                  onConfirm={() => {
                    setPending(undefined);
                    setBindingEnabled(binding.id, !on);
                    setNotes({
                      ...notes,
                      [binding.id]: `${on ? "Disabled" : "Enabled"} by you at 3:42 PM ET. Recorded in the audit log.`,
                    });
                  }}
                >
                  {on
                    ? `Disable ${binding.name}? New deliveries stop matching it; runs it already started keep going.`
                    : `Enable ${binding.name}? Matching deliveries run ${binding.actions.map((a) => a.command).join(" and ")} again.`}
                </ConfirmStrip>
              )}
              {notes[binding.id] && <p className="wb-audit-note">{notes[binding.id]}</p>}
              <dl className="wb-binding-grid">
                <div>
                  <dt>Filters</dt>
                  <dd className="wb-chips">
                    {binding.filters.map((filter) => (
                      <span key={filter} className="wb-filter">
                        {filter}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Actions and checks</dt>
                  <dd>
                    {binding.actions.map((action) => (
                      <div key={action.command} className="wb-action-row">
                        <Mono>{action.command}</Mono>
                        <ArrowRight size={12} aria-hidden="true" />
                        <span className="wb-check-tag">{action.check}</span>
                      </div>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt>Behavior</dt>
                  <dd className="wb-chips">
                    {binding.mandatory ? (
                      <Badge variant="outline" className="wb-badge" title="Projects in scope can't turn this binding off">
                        <Lock /> Mandatory
                      </Badge>
                    ) : (
                      <span className="wb-muted">Optional</span>
                    )}
                    {binding.cancelPrevious ? (
                      <Badge variant="outline" className="wb-badge" title="A new push cancels this pull request's unfinished runs">
                        Cancels previous
                      </Badge>
                    ) : (
                      <span className="wb-muted">Never cancels</span>
                    )}
                  </dd>
                </div>
              </dl>
              <div className="wb-binding-recent">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => {
                    setOpen(expanded ? open.filter((id) => id !== binding.id) : [...open, binding.id]);
                    if (!expanded) go({ name: "bindings", bindingId: binding.id });
                  }}
                >
                  <ChevronDown size={14} aria-hidden="true" />
                  Recent deliveries
                  <span className="wb-muted">
                    {seen.length ? `${hits} hit, ${seen.length - hits} miss today` : "none today"}
                  </span>
                </button>
                {expanded && (
                  <ul>
                    {seen.length === 0 && <li className="wb-muted">No deliveries reached this binding today.</li>}
                    {seen.map((d) => {
                      const evaluation = d.evaluations.find((e) => e.bindingId === binding.id)!;
                      return (
                        <li key={d.id} data-hit={evaluation.matched}>
                          <span className="wb-verdict" data-matched={evaluation.matched}>
                            {evaluation.matched ? <CircleCheck size={13} aria-hidden="true" /> : <CircleMinus size={13} aria-hidden="true" />}
                            {evaluation.matched ? "Hit" : "Miss"}
                          </span>
                          <span className="wb-recent-what">
                            <Mono>{d.event}</Mono> {d.pr ? `#${d.pr.number}` : d.ref}
                          </span>
                          <span className="wb-recent-why">{evaluation.reason}</span>
                          <span className="wb-muted wb-recent-when">{clock(d.receivedAt)}</span>
                          <LinkButton onClick={() => go({ name: "delivery", deliveryId: d.id })}>{d.id}</LinkButton>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

// ---------------------------------------------------------------- pools

const kindIcon = { "Oyzu hosted": Cloud, "Customer network": Building, "Developer machine": Laptop } as const;

function PoolCard({ pool }: { pool: Pool }) {
  const { role, go, shipping, setShipping } = useWb();
  const [pending, setPending] = useState(false);
  const Icon = kindIcon[pool.kind];
  const ships = shipping[pool.id];
  const admin = role === "pool-admin";
  return (
    <article className="wb-pool" data-status={pool.status}>
      <header>
        <span className="wb-pool-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <div>
          <h2>
            <button type="button" className="wb-card-link" onClick={() => go({ name: "pool", poolId: pool.id })}>
              {pool.name}
            </button>
          </h2>
          <p className="wb-muted">
            {pool.kind} · {pool.scope}
          </p>
        </div>
        <StateChip state={pool.status} size="sm" label={pool.status === "warning" ? "Needs attention" : undefined} />
      </header>
      {admin ? (
        <div className="wb-capacity">
          <div>
            <span>
              {pool.busy} of {pool.capacity} slots busy
            </span>
            <span className="wb-muted">{pool.queued} queued</span>
          </div>
          <Progress value={(pool.busy / pool.capacity) * 100} aria-label={`${pool.name} capacity in use`} className="wb-progress" />
        </div>
      ) : (
        <p className="wb-note wb-pool-member">
          <Lock size={12} aria-hidden="true" /> Capacity and managers are visible to pool admins.
        </p>
      )}
      <div className="wb-chips">
        {pool.releaseEligible ? (
          <span className="wb-tag" data-tone="good">
            <ShieldCheck size={12} aria-hidden="true" /> Release eligible
          </span>
        ) : (
          <span className="wb-tag">Not release eligible</span>
        )}
        {admin && (
          <span className="wb-tag">
            {pool.managers.length} {pool.managers.length === 1 ? "manager" : "managers"}
          </span>
        )}
      </div>
      {admin && (
        <footer>
          <label className="wb-switch">
            <Switch
              checked={ships}
              onCheckedChange={(value) => (value ? setShipping(pool.id, true) : setPending(true))}
              aria-label={`Ship pool logs for ${pool.name}`}
            />
            <span>Ship pool logs</span>
          </label>
          <span className="wb-muted">{ships ? "Diagnostics available" : "Logs stay on the host"}</span>
        </footer>
      )}
      {pending && (
        <ConfirmStrip
          danger
          confirmLabel="Stop shipping"
          onCancel={() => setPending(false)}
          onConfirm={() => {
            setPending(false);
            setShipping(pool.id, false);
          }}
        >
          Stop shipping pool logs for {pool.name}? Runner diagnostics show nothing new until you turn it back on.
        </ConfirmStrip>
      )}
    </article>
  );
}

export function PoolsPage() {
  const { role } = useWb();
  const loading = useBriefLoading("pools");
  return (
    <>
      <PageHead
        eyebrow="Infrastructure · Pools"
        title="Pools"
        lede="Pools run build jobs through outbound-only managers: Oyzu hosted, in your network, or on a developer machine. Developer machines never build releases."
      />
      {role !== "pool-admin" && (
        <FeedbackBanner tone="info" title="You're viewing pools as a project member">
          You can see which pools builds for payments use and whether they're healthy. Managers, capacity and pool logs are
          for pool admins.
        </FeedbackBanner>
      )}
      <div className="wb-pools">
        {loading
          ? pools.map((pool) => (
              <div key={pool.id} className="wb-pool wb-pool-skeleton" aria-hidden="true">
                <Skeleton className="wb-skeleton" style={{ width: "55%" }} />
                <Skeleton className="wb-skeleton" style={{ width: "35%" }} />
                <Skeleton className="wb-skeleton" style={{ width: "90%", height: 6 }} />
              </div>
            ))
          : pools.map((pool) => <PoolCard key={pool.id} pool={pool} />)}
      </div>
    </>
  );
}

export function PoolDetail({
  poolId,
  view,
  onView,
}: {
  poolId: string;
  view: PoolView;
  onView: (view: PoolView) => void;
}) {
  const { role, go, openRun, askAbout, drained, drain, shipping } = useWb();
  const pool = poolById(poolId);
  const [pending, setPending] = useState<{ id: string; kind: "drain" | "rotate" }>();
  const [done, setDone] = useState<string>();
  if (!pool)
    return (
      <EmptyState
        title="Pool not found"
        description="It may have been removed."
        action={
          <Button size="sm" variant="outline" onClick={() => go({ name: "pools" })}>
            All pools
          </Button>
        }
      />
    );
  const back = <BackLink label="All pools" onClick={() => go({ name: "pools" })} />;
  if (role !== "pool-admin")
    return (
      <>
        <PageHead back={back} eyebrow="Infrastructure · Pool" title={pool.name} meta={<StateChip state={pool.status} />} />
        <div className="wb-panel wb-restricted">
          <EmptyState
            title="Pool details are for pool admins"
            description={`Managers, capacity and pool logs for ${pool.name} are visible to its admins. When a pool problem affects your run, the run log says so in plain words, and the admins already see the details.`}
            action={
              <Button size="sm" variant="outline" onClick={() => askAbout("Is the pool healthy?")}>
                <Sparkles /> Ask if my builds are affected
              </Button>
            }
          />
        </div>
      </>
    );
  const managerIds = pool.managers.map((m) => m.id);
  const logs = poolLogs.filter(
    (log) =>
      managerIds.includes(log.manager) &&
      (view.level === "all" || log.level === view.level) &&
      (view.manager === "all" || log.manager === view.manager) &&
      (!view.job.trim() || (log.jobId ?? "").includes(view.job.trim())),
  );
  const jobRun = view.job ? runs.find((run) => run.attempts.some((a) => a.jobId === view.job.trim())) : undefined;
  const jobAttempt = jobRun?.attempts.find((a) => a.jobId === view.job.trim());
  const late = pool.managers.find((m) => m.status === "warning" && !drained.includes(m.id));
  const ships = shipping[pool.id];
  return (
    <>
      <PageHead
        back={back}
        eyebrow={`Infrastructure · Pool · ${pool.id}`}
        title={pool.name}
        meta={
          <>
            <StateChip state={pool.status} label={pool.status === "warning" ? "Needs attention" : undefined} />
            <span className="wb-meta-item">{pool.kind}</span>
            <span className="wb-meta-item">{pool.scope}</span>
            <span className="wb-meta-item">
              {pool.busy} of {pool.capacity} busy · {pool.queued} queued
            </span>
            {pool.releaseEligible ? (
              <span className="wb-tag" data-tone="good">
                <ShieldCheck size={12} aria-hidden="true" /> Release eligible
              </span>
            ) : (
              <span className="wb-tag">Not release eligible</span>
            )}
          </>
        }
        actions={
          <Button size="sm" variant="ghost" onClick={() => askAbout(late ? `Why is ${late.id} unhealthy?` : "Is the pool healthy?")}>
            <Sparkles /> Ask Oyzu
          </Button>
        }
      />
      {late && (
        <FeedbackBanner
          tone="warning"
          title={`${late.id} is missing heartbeats`}
          action={
            <div className="wb-banner-actions">
              <Button size="sm" variant="outline" onClick={() => onView({ ...view, tab: "logs", manager: late.id, job: "", level: "all" })}>
                <Stethoscope /> Pool logs for {late.id}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPending({ id: late.id, kind: "drain" })}>
                Drain {late.id}
              </Button>
            </div>
          }
        >
          {late.note}. One job was lost today and retried on another manager.
        </FeedbackBanner>
      )}
      {!pool.releaseEligible && (
        <FeedbackBanner tone="info" title="Developer machines never build releases">
          Runs here are fine for trying things out. Release bindings skip this pool even when it's the only one free.
        </FeedbackBanner>
      )}
      {done && <Done text={done} onDismiss={() => setDone(undefined)} />}
      <Tabs
        label="Pool sections"
        value={view.tab}
        onChange={(tab) => onView({ ...view, tab })}
        tabs={[
          { id: "managers", label: "Managers", count: pool.managers.length },
          { id: "logs", label: "Pool logs" },
        ]}
      />
      {view.tab === "managers" ? (
        <Table className="wb-table wb-managers">
          <TableHeader>
            <TableRow>
              <TableHead>Manager</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Adapter</TableHead>
              <TableHead>Heartbeat</TableHead>
              <TableHead>Jobs</TableHead>
              <TableHead>Key age</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pool.managers.map((m) => {
              const isDrained = drained.includes(m.id);
              return (
                <Fragment key={m.id}>
                <TableRow data-status={m.status}>
                  <TableCell data-label="Manager" className="wb-cell-title">
                    <strong className="wb-cell-main">{m.id}</strong>
                    <small className="wb-muted">{m.host}</small>
                    {m.note && <small className="wb-manager-note">{m.note}</small>}
                  </TableCell>
                  <TableCell data-label="Status">
                    {isDrained ? <StateChip state="paused" label="Draining" size="sm" /> : <StateChip state={m.status} size="sm" />}
                  </TableCell>
                  <TableCell data-label="Version">
                    <Mono>{m.version}</Mono>
                    {m.version !== "0.4.1" && <small className="wb-warn-text"> behind 0.4.1</small>}
                  </TableCell>
                  <TableCell data-label="Adapter">{m.adapter}</TableCell>
                  <TableCell data-label="Heartbeat">
                    <span className={m.status === "warning" ? "wb-warn-text" : undefined}>{m.heartbeat}</span>
                  </TableCell>
                  <TableCell data-label="Jobs">{m.activeJobs}</TableCell>
                  <TableCell data-label="Key age">
                    <span className={m.keyAgeDays >= 30 ? "wb-warn-text" : undefined}>{m.keyAgeDays} days</span>
                  </TableCell>
                  <TableCell data-label="Actions" className="wb-row-actions">
                    <Button size="xs" variant="outline" onClick={() => onView({ ...view, tab: "logs", manager: m.id, job: "", level: "all" })}>
                      Logs
                    </Button>
                    {m.keyAgeDays >= 27 && (
                      <Button size="xs" variant="ghost" onClick={() => setPending({ id: m.id, kind: "rotate" })}>
                        Rotate key
                      </Button>
                    )}
                    {m.status !== "paused" && (
                      <Button size="xs" variant="ghost" disabled={isDrained} onClick={() => setPending({ id: m.id, kind: "drain" })}>
                        {isDrained ? "Draining" : "Drain"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {pending?.id === m.id && (
                  <TableRow className="wb-confirm-row">
                    <TableCell colSpan={8}>
                      <ConfirmStrip
                        danger={pending.kind === "drain"}
                        confirmLabel={pending.kind === "drain" ? "Drain manager" : "Rotate key"}
                        onCancel={() => setPending(undefined)}
                        onConfirm={() => {
                          setPending(undefined);
                          if (pending.kind === "drain") {
                            drain(m.id);
                            setDone(actionResult("drain-manager", m.id) ?? "");
                          } else
                            setDone(`Started key rotation on ${m.id}. Both keys stay valid for 24 hours, then the old one stops working.`);
                        }}
                      >
                        {pending.kind === "drain"
                          ? `Drain ${m.id}? It stops claiming new jobs; ${m.activeJobs ? `its ${m.activeJobs} running job finishes` : "nothing is running on it now"}.`
                          : `Rotate the key for ${m.id}? The manager picks up the new key on its next heartbeat.`}
                      </ConfirmStrip>
                    </TableCell>
                  </TableRow>
                )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      ) : !ships ? (
        <EmptyState
          title="Pool log shipping is off"
          description={`Logs for ${pool.name} stay on the host. Turn on shipping from the Pools page to see runner diagnostics here.`}
          action={
            <Button size="sm" variant="outline" onClick={() => go({ name: "pools" })}>
              Go to Pools
            </Button>
          }
        />
      ) : (
        <section className="wb-section">
          <div className="wb-toolbar wb-log-filters">
            <Select value={view.level} onValueChange={(level) => onView({ ...view, level })}>
              <SelectTrigger size="sm" aria-label="Level" className="wb-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warnings</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={view.manager} onValueChange={(manager) => onView({ ...view, manager })}>
              <SelectTrigger size="sm" aria-label="Manager" className="wb-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All managers</SelectItem>
                {pool.managers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="wb-job-filter">
              <span>Job</span>
              <Input
                value={view.job}
                placeholder="job-…"
                aria-label="Filter by job id"
                onChange={(event) => onView({ ...view, job: event.target.value })}
              />
            </label>
            {(view.job || view.manager !== "all" || view.level !== "all") && (
              <Button size="sm" variant="ghost" onClick={() => onView({ ...view, job: "", manager: "all", level: "all" })}>
                Clear filters
              </Button>
            )}
          </div>
          {jobRun && jobAttempt && (
            <p className="wb-job-context">
              <Stethoscope size={14} aria-hidden="true" />
              <span>
                Runner diagnostics for <Mono>{jobAttempt.jobId}</Mono>: run {jobRun.number}, attempt {jobAttempt.n} on{" "}
                {jobAttempt.manager}. Build output isn't in pool logs; it stays in the run log.
              </span>
              <LinkButton onClick={() => openRun(jobRun.id, { tab: "logs", attempt: jobAttempt.n })}>Open run log</LinkButton>
            </p>
          )}
          {logs.length === 0 ? (
            <EmptyState
              filtered
              title="No pool log entries match"
              description={
                pool.id === "hosted-linux"
                  ? "Hosted managers logged nothing above info level today, and no entries match these filters."
                  : "Try a different level, manager or job id."
              }
            />
          ) : (
            <ol className="wb-poollog" aria-label="Pool log entries">
              {logs.map((log, index) => (
                <li key={index} data-level={log.level}>
                  <span className="wb-poollog-time">{log.t}</span>
                  <span className="wb-level" data-level={log.level}>
                    {log.level}
                  </span>
                  <span className="wb-poollog-mgr">{log.manager}</span>
                  <span className="wb-poollog-msg">
                    <strong>{log.msg}</strong>
                    {Object.entries(log.fields).map(([key, value]) => (
                      <span key={key} className="wb-field">
                        {key}={value}
                      </span>
                    ))}
                  </span>
                  {log.jobId ? (
                    <button type="button" className="wb-poollog-job" onClick={() => onView({ ...view, job: log.jobId ?? "" })}>
                      {log.jobId}
                    </button>
                  ) : (
                    <span className="wb-poollog-job wb-muted">—</span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <p className="wb-note">Times are US Eastern. Pool logs carry manager and runner events only, never build output.</p>
        </section>
      )}
    </>
  );
}
