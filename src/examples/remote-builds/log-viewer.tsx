import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDown,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  CircleMinus,
  Clock,
  Download,
  EyeOff,
  Link2,
  LoaderCircle,
  Search,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { duration, type GroupState, type LogEntry, type LogGroup, type Role, type Run, stripAnsiText } from "./model";
import { RunDigest } from "./run-digest";
import { usePrototype } from "./shared";
import "./log-viewer.css";

// Prototype of the portal LogViewer from the "Run logs" design: groups by
// target and task, opens on the first error, follows live output, renders ANSI
// colour and masked values, and links lines by permalink.

export function GroupIcon({ state, size = 14 }: { state: GroupState; size?: number }) {
  if (state === "succeeded") return <CheckCircle2 size={size} className="lv-ok" aria-label="Succeeded" />;
  if (state === "failed") return <XCircle size={size} className="lv-bad" aria-label="Failed" />;
  if (state === "running") return <LoaderCircle size={size} className="lv-run animate-spin" aria-label="Running" />;
  if (state === "skipped") return <CircleMinus size={size} className="lv-mute" aria-label="Skipped" />;
  return <CircleDashed size={size} className="lv-mute" aria-label="Queued" />;
}

const sgr: Record<string, string> = { "1": "lv-b", "2": "lv-dim", "31": "lv-red", "32": "lv-green", "33": "lv-yellow", "36": "lv-cyan" };

/** ANSI SGR spans, then masked-value chips and file:line links inside each span. */
export function LogText({ text, commit }: { text: string; commit?: string }) {
  const parts: ReactNode[] = [];
  let classes: string[] = [];
  text.split(/\u001b\[([\d;]+)m/).forEach((chunk, index) => {
    if (index % 2 === 1) {
      chunk.split(";").forEach((code) => {
        if (code === "0") classes = [];
        else if (sgr[code]) classes = [...classes, sgr[code]];
      });
      return;
    }
    if (!chunk) return;
    const inner = chunk.split(/(\*\*\*|(?:crates|src)\/[\w\-./]+\.rs:\d+(?::\d+)?)/).map((piece, i) => {
      if (piece === "***")
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="lv-mask" tabIndex={0} aria-label="Masked secret">
                <EyeOff size={10} aria-hidden="true" />
                ***
              </span>
            </TooltipTrigger>
            <TooltipContent>A secret was masked by the runner before this line left the executor</TooltipContent>
          </Tooltip>
        );
      if (i % 2 === 1)
        return (
          <a
            key={i}
            className="lv-file"
            href={`https://github.com/acme/payments-api/blob/${commit ?? "main"}/${piece.replace(/:(\d+)(?::\d+)?$/, "#L$1")}`}
            target="_blank"
            rel="noreferrer"
          >
            {piece}
          </a>
        );
      return <Fragment key={i}>{piece}</Fragment>;
    });
    parts.push(
      <span key={index} className={classes.join(" ") || undefined}>
        {inner}
      </span>,
    );
  });
  return <>{parts}</>;
}


function stamp(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, "0")}:${(s % 60).toFixed(1).padStart(4, "0")}`;
}

export type LogViewerProps = {
  run: Run;
  entries: readonly LogEntry[];
  groups: readonly LogGroup[];
  attempt: number;
  onAttemptChange?: (attempt: number) => void;
  live?: boolean;
  role: Role;
  onDiagnostics?: (jobId: string) => void;
  onAsk?: (entry: LogEntry) => void;
  /** A citation from the assistant or a permalink: scroll to and highlight this line. */
  focusSeq?: number;
  /** Hide the group rail, for narrow panes. */
  compact?: boolean;
  height?: string;
};

export function LogViewer({
  run,
  entries,
  groups,
  attempt,
  onAttemptChange,
  live = false,
  role,
  onDiagnostics,
  onAsk,
  focusSeq,
  compact = false,
  height = "min(68vh, 640px)",
}: LogViewerProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [hit, setHit] = useState(0);
  const [times, setTimes] = useState(false);
  const [selected, setSelected] = useState<number | undefined>(focusSeq);
  const [following, setFollowing] = useState(live);
  const [copied, setCopied] = useState<string>();
  const attemptInfo = run.attempts.find((item) => item.n === attempt);
  const { look } = usePrototype();
  const summary = look === "summary";
  const [logOpen, setLogOpen] = useState(Boolean(focusSeq));
  useEffect(() => {
    if (focusSeq) setLogOpen(true);
  }, [focusSeq]);

  const byScope = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.scope) ?? [];
      list.push(entry);
      map.set(entry.scope, list);
    }
    return map;
  }, [entries]);
  const sections = useMemo(
    () =>
      groups
        .map((group) => ({ group, lines: byScope.get(group.scope) ?? [] }))
        .filter((section) => section.lines.length || section.group.state !== "queued" || live),
    [groups, byScope, live],
  );
  const firstError = entries.find((entry) => entry.level === "error");
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries.filter((entry) => stripAnsiText(entry.text).toLowerCase().includes(q)).map((entry) => entry.seq);
  }, [entries, query]);

  const isOpen = (group: LogGroup) =>
    open[group.scope] ?? (group.state === "failed" || group.state === "running" || (live && group.state !== "succeeded"));

  function reveal(seq: number, behavior: ScrollBehavior = "smooth") {
    const entry = entries.find((item) => item.seq === seq);
    if (!entry) return;
    setOpen((current) => ({ ...current, [entry.scope]: true }));
    setSelected(seq);
    setFollowing(false);
    window.requestAnimationFrame(() => {
      const row = scroller.current?.querySelector<HTMLElement>(`[data-seq="${seq}"]`);
      const pane = scroller.current;
      if (row && pane) pane.scrollTo({ top: row.offsetTop - pane.clientHeight / 3, behavior });
    });
  }

  // Open on the first failure, not the top of the log.
  useEffect(() => {
    if (focusSeq) reveal(focusSeq, "auto");
    else if (firstError && !live) reveal(firstError.seq, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id, attempt, focusSeq]);

  // Live follow: stay at the tail until the reader scrolls up.
  useEffect(() => {
    if (live && following && scroller.current)
      scroller.current.scrollTo({ top: scroller.current.scrollHeight });
  }, [entries.length, live, following]);

  useEffect(() => {
    if (matches.length) reveal(matches[Math.min(hit, matches.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hit, query]);

  function copyLink(seq: number) {
    const link = `#attempt-${attempt}-L${seq}`;
    setSelected(seq);
    navigator.clipboard?.writeText(link).catch(() => undefined);
    setCopied(link);
    window.setTimeout(() => setCopied(undefined), 1800);
  }

  const totalLines = entries.length;
  const digest = summary && (
    <RunDigest
      run={run}
      groups={groups}
      entries={entries}
      live={live}
      attempt={attemptInfo}
      role={role}
      onAsk={onAsk}
      onDiagnostics={onDiagnostics}
      logOpen={logOpen}
      onOpenLog={(seq) => {
        if (seq === -1) return setLogOpen(false);
        setLogOpen(true);
        if (seq) window.setTimeout(() => reveal(seq), 60);
      }}
    />
  );
  if (summary && !logOpen) return <TooltipProvider delayDuration={150}>{digest}</TooltipProvider>;
  return (
    <TooltipProvider delayDuration={150}>
      {digest}
      <div className={"log-viewer" + (compact || summary ? " is-compact" : "")} style={{ "--lv-height": height } as CSSProperties}>
        {!compact && !summary && (
          <nav className="lv-rail" aria-label="Targets and tasks">
            <strong>Targets and tasks</strong>
            {groups.map((group) => {
              const count = byScope.get(group.scope)?.length ?? 0;
              return (
                <button
                  key={group.scope}
                  type="button"
                  className="lv-rail-item"
                  data-state={group.state}
                  onClick={() => {
                    const first = byScope.get(group.scope)?.[0];
                    if (first) reveal(first.seq);
                  }}
                >
                  <GroupIcon state={group.state} />
                  <span className="lv-rail-name">
                    {group.target === "runner" ? `runner ${group.task}` : group.scope}
                  </span>
                  <span className="lv-rail-meta">
                    {group.state === "running" ? "live" : duration(group.durationMs)}
                    <small>{count} lines</small>
                  </span>
                </button>
              );
            })}
          </nav>
        )}
        <div className="lv-main">
          <div className="lv-toolbar">
            {run.attempts.length > 1 && onAttemptChange ? (
              <Select value={String(attempt)} onValueChange={(value) => onAttemptChange(Number(value))}>
                <SelectTrigger size="sm" aria-label="Attempt" className="lv-attempt">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {run.attempts.map((item) => (
                    <SelectItem key={item.n} value={String(item.n)}>
                      Attempt {item.n} · {item.state === "timed_out" ? "executor lost" : item.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="lv-attempt-label">Attempt {attempt}</span>
            )}
            <label className="lv-search">
              <Search size={14} aria-hidden="true" />
              <input
                id={`lv-search-${run.id}`}
                value={query}
                placeholder="Search log"
                aria-label="Search log"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHit(0);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && matches.length) setHit((hit + 1) % matches.length);
                }}
              />
              {query && (
                <small>
                  {matches.length ? `${Math.min(hit, matches.length - 1) + 1}/${matches.length}` : "0"}
                </small>
              )}
            </label>
            <div className="lv-tools">
              {firstError && (
                <Button variant="ghost" size="sm" onClick={() => reveal(firstError.seq)}>
                  <XCircle /> First error
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={times}
                onClick={() => setTimes(!times)}
                title="Show elapsed time per line"
              >
                <Clock /> <span className="lv-hide-sm">Time</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                title="Download raw log (text, ANSI or JSON Lines)"
                onClick={() => setCopied("Raw download starts from the run's archive in the real portal")}
              >
                <Download /> <span className="lv-hide-sm">Raw</span>
              </Button>
              {role === "pool-admin" && onDiagnostics && attemptInfo && (
                <Button variant="outline" size="sm" onClick={() => onDiagnostics(attemptInfo.jobId)}>
                  <Stethoscope /> Runner diagnostics
                </Button>
              )}
            </div>
          </div>
          {attemptInfo?.logState === "incomplete" && (
            <p className="lv-banner is-warning">
              <TriangleAlert size={14} aria-hidden="true" /> Incomplete log. {attemptInfo.reason}
            </p>
          )}
          {live && (
            <p className="lv-banner is-live">
              <span className="lv-pulse" aria-hidden="true" /> Live · {totalLines} lines · following{" "}
              {following ? "the tail" : "paused while you read"}
            </p>
          )}
          <div
            className="lv-scroll"
            ref={scroller}
            role="log"
            aria-live={live ? "polite" : "off"}
            onScroll={(event) => {
              if (!live) return;
              const pane = event.currentTarget;
              const atBottom = pane.scrollHeight - pane.scrollTop - pane.clientHeight < 40;
              if (atBottom !== following) setFollowing(atBottom);
            }}
          >
            {sections.map(({ group, lines }) => {
              const expanded = isOpen(group);
              return (
                <section key={group.scope} className="lv-section" data-state={group.state}>
                  <button
                    type="button"
                    className="lv-section-head"
                    aria-expanded={expanded}
                    onClick={() => setOpen({ ...open, [group.scope]: !expanded })}
                  >
                    <ChevronRight size={14} className="lv-chevron" aria-hidden="true" />
                    <GroupIcon state={group.state} />
                    <span className="lv-section-name">
                      {group.target === "runner" ? `runner · ${group.task}` : group.scope}
                    </span>
                    <span className="lv-section-meta">
                      {group.state === "running" ? "running" : duration(group.durationMs)} · {lines.length} lines
                    </span>
                  </button>
                  {expanded && (
                    <div className="lv-lines">
                      {lines.length === 0 && <p className="lv-empty">Waiting for output…</p>}
                      {lines.map((entry) => (
                        <div
                          key={entry.seq}
                          data-seq={entry.seq}
                          className={
                            "lv-line" +
                            (entry.level ? ` is-${entry.level}` : "") +
                            (entry.stream === "system" ? " is-system" : "") +
                            (selected === entry.seq ? " is-selected" : "") +
                            (matches.includes(entry.seq) ? " is-match" : "")
                          }
                        >
                          <button
                            type="button"
                            className="lv-num"
                            onClick={() => copyLink(entry.seq)}
                            aria-label={`Copy link to line ${entry.seq}`}
                          >
                            {entry.seq}
                          </button>
                          {times && <span className="lv-time">{stamp(entry.t)}</span>}
                          <code className="lv-text">
                            <LogText text={entry.text} commit={run.commit} />
                          </code>
                          {onAsk && (
                            <button
                              type="button"
                              className="lv-ask"
                              onClick={() => onAsk(entry)}
                              aria-label={`Ask the assistant about line ${entry.seq}`}
                            >
                              <Sparkles size={12} /> Ask
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          {live && !following && (
            <Button
              className="lv-jump"
              size="sm"
              onClick={() => {
                setFollowing(true);
                scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
              }}
            >
              <ArrowDown /> Jump to live
            </Button>
          )}
          {copied && (
            <p className="lv-toast" role="status">
              <Link2 size={13} aria-hidden="true" /> {copied.startsWith("#") ? `Copied link ${copied}` : copied}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
