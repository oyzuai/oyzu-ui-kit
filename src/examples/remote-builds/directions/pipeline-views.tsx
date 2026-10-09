import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType, type ReactElement, type PointerEvent as ReactPointerEvent } from "react";
import {
  Ban,
  Boxes,
  CircleStop,
  Copy,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Hand,
  ListChecks,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Server,
  Sparkles,
  Stethoscope,
  Timer,
  TriangleAlert,
  Webhook,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { GroupIcon, LogViewer } from "../log-viewer";
import {
  ago,
  bindingById,
  clock,
  deliveryById,
  duration,
  failedRun,
  type GroupState,
  type LogEntry,
  type LogGroup,
  type Role,
  type Run,
  type RunState,
  type Stage,
  type StageStatus,
} from "../model";
import { StateChip, usePrototype } from "../shared";

// Pipeline direction, execution views: a run drawn as a stage graph (trigger,
// runner setup, one stage per target, check report), with the selected
// stage's steps and a tabbed step inspector beneath.

// ---------------------------------------------------------------- run → stages

export type StepKind = "group" | "delivery" | "check" | "placeholder";
export type PlStep = {
  id: string;
  name: string;
  sub: string;
  state: GroupState;
  durationMs: number;
  kind: StepKind;
  group?: LogGroup;
  deliveryStage?: Stage;
};
export type StageKind = "trigger" | "setup" | "target" | "report";
export type PlStage = {
  id: string;
  kind: StageKind;
  name: string;
  caption: string;
  state: GroupState;
  durationMs: number;
  steps: PlStep[];
};

const fromStatus: Record<StageStatus, GroupState> = {
  ok: "succeeded",
  fail: "failed",
  skip: "skipped",
  running: "running",
  pending: "queued",
};

export function groupState(state: RunState): GroupState {
  switch (state) {
    case "succeeded":
      return "succeeded";
    case "failed":
    case "timed_out":
      return "failed";
    case "running":
      return "running";
    case "queued":
      return "queued";
    default:
      return "skipped";
  }
}

export function rollup(states: GroupState[]): GroupState {
  if (!states.length) return "skipped";
  if (states.includes("failed")) return "failed";
  if (states.includes("running")) return "running";
  if (states.every((s) => s === "skipped")) return "skipped";
  if (states.every((s) => s === "queued" || s === "skipped")) return "queued";
  if (states.includes("queued")) return "running";
  return "succeeded";
}

const taskNames: Record<string, string> = {
  compile: "Compile",
  test: "Tests",
  lint: "Lint",
  image: "Container image",
  "policy-check": "Policy check",
  setup: "Check out and start",
  finish: "Upload results",
};
const stepTitle = (group: LogGroup) => taskNames[group.task] ?? group.task;

/** Attempt 1 of run 9012 lost its executor during ledger-client/compile. */
export function groupsForAttempt(run: Run, attempt: number): LogGroup[] {
  if (run.id === failedRun.id && attempt === 1)
    return run.groups.map((group) =>
      group.scope === "runner"
        ? { ...group, durationMs: 14_000 }
        : group.scope === "ledger-client/compile"
          ? { ...group, state: "failed", durationMs: 170_000 }
          : { ...group, state: "skipped", durationMs: 0 },
    );
  return run.groups;
}

/** The run as it stood for one attempt (state and duration come from the attempt). */
export function runForAttempt(run: Run, attempt: number): Run {
  const info = run.attempts.find((item) => item.n === attempt);
  if (!info || attempt === run.attempt) return run;
  return { ...run, state: info.state, durationMs: info.durationMs, groups: groupsForAttempt(run, attempt), outputs: [] };
}

export function triggerText(run: Run) {
  switch (run.trigger) {
    case "pull_request":
      return `PR #${run.pr}`;
    case "push":
      return `Push to ${run.ref}`;
    case "manual":
      return "Manual";
    default:
      return "Schedule";
  }
}

export function buildStages(run: Run): PlStage[] {
  const delivery = run.deliveryId ? deliveryById(run.deliveryId) : undefined;
  const binding = run.bindingId ? bindingById(run.bindingId) : undefined;
  const pre = new Set(["received", "verified", "deduplicated", "parsed", "matched", "started"]);
  const triggerSteps: PlStep[] = delivery
    ? delivery.stages
        .filter((stage) => pre.has(stage.key))
        .map((stage) => ({
          id: `trigger/${stage.key}`,
          name: stage.label,
          sub: stage.detail,
          state: fromStatus[stage.status],
          durationMs: 0,
          kind: "delivery" as const,
          deliveryStage: stage,
        }))
    : [
        {
          id: "trigger/manual",
          name: run.trigger === "manual" ? "Started by hand" : "Started on schedule",
          sub: `${run.author} ran ${run.command}`,
          state: "succeeded",
          durationMs: 0,
          kind: "placeholder",
        },
      ];
  const stages: PlStage[] = [
    {
      id: "trigger",
      kind: "trigger",
      name: "Trigger",
      caption: delivery ? `${delivery.event}${binding ? ` · ${binding.name}` : ""}` : `${run.author} · CLI`,
      state: rollup(triggerSteps.map((s) => s.state).filter((s) => s !== "queued")),
      durationMs: delivery ? Date.parse(run.createdAt) - Date.parse(delivery.receivedAt) : 0,
      steps: triggerSteps,
    },
  ];
  const groupStep = (group: LogGroup): PlStep => ({
    id: group.scope,
    name: stepTitle(group),
    sub: group.target === "runner" ? `runner · ${group.task}` : group.scope,
    state: group.state,
    durationMs: group.durationMs,
    kind: "group",
    group,
  });
  const setup = run.groups.filter((group) => group.scope === "runner");
  if (setup.length)
    stages.push({
      id: "setup",
      kind: "setup",
      name: "Set up runner",
      caption: run.attempts.find((a) => a.n === run.attempt)?.pool ?? "runner",
      state: rollup(setup.map((g) => g.state)),
      durationMs: setup.reduce((sum, g) => sum + g.durationMs, 0),
      steps: setup.map(groupStep),
    });
  const work = run.groups.filter((group) => group.target !== "runner");
  const targets = [...new Set(work.map((group) => group.target))];
  for (const target of targets) {
    const groups = work.filter((group) => group.target === target);
    stages.push({
      id: `target/${target}`,
      kind: "target",
      name: target === "task" ? groups[0].task : target,
      caption: target === "task" ? "task" : `${groups.length} ${groups.length === 1 ? "task" : "tasks"}`,
      state: rollup(groups.map((g) => g.state)),
      durationMs: groups.reduce((sum, g) => sum + g.durationMs, 0),
      steps: groups.map(groupStep),
    });
  }
  if (!run.groups.length)
    stages.push({
      id: "target/oyzu",
      kind: "target",
      name: run.operation.kind === "run" ? run.operation.task : (run.operation.targets?.join(", ") ?? "build"),
      caption: run.state === "skipped" ? "not started" : "no log in preview",
      state: groupState(run.state),
      durationMs: run.durationMs,
      steps: [
        {
          id: "oyzu",
          name: run.command,
          sub: run.reason?.message ?? "Log not included in this preview",
          state: groupState(run.state),
          durationMs: run.durationMs,
          kind: "placeholder",
        },
      ],
    });
  const finish = run.groups.filter((group) => group.scope === "runner/finish");
  const checkState: GroupState =
    run.state === "running" || run.state === "queued" ? "queued" : groupState(run.state);
  const reportSteps: PlStep[] = [
    ...finish.map(groupStep),
    {
      id: "report/check",
      name: run.check === "manual" ? "Record result" : `Report ${run.check}`,
      sub: run.check === "manual" ? "Portal only, no check run" : `Check run on ${run.commit.slice(0, 7)}`,
      state: checkState,
      durationMs: checkState === "queued" ? 0 : 600,
      kind: "check",
    },
  ];
  stages.push({
    id: "report",
    kind: "report",
    name: "Report check",
    caption: run.check,
    state: rollup(reportSteps.map((s) => s.state)),
    durationMs: reportSteps.reduce((sum, s) => sum + s.durationMs, 0),
    steps: reportSteps,
  });
  return stages;
}

/** Failed first, then running, then the first work stage. */
export function defaultSelection(stages: PlStage[]): { stage: string; step: string } {
  const pick =
    stages.find((s) => s.kind !== "trigger" && s.state === "failed") ??
    stages.find((s) => s.kind !== "trigger" && s.state === "running") ??
    stages.find((s) => s.kind === "target") ??
    stages[0];
  const step =
    pick.steps.find((s) => s.state === "failed") ?? pick.steps.find((s) => s.state === "running") ?? pick.steps[0];
  return { stage: pick.id, step: step.id };
}

const stageIcons: Record<StageKind, ComponentType<{ size?: number }>> = {
  trigger: Webhook,
  setup: Server,
  target: Boxes,
  report: ListChecks,
};

export function TriggerIcon({ run, size = 14 }: { run: Run; size?: number }) {
  const Icon =
    run.trigger === "pull_request" ? GitPullRequest : run.trigger === "push" ? GitCommitHorizontal : run.trigger === "manual" ? Hand : Timer;
  return <Icon size={size} aria-hidden="true" />;
}

/** Small coloured segments, one per stage, for the executions table. */
export function StageStrip({ run }: { run: Run }) {
  const stages = buildStages(run);
  return (
    <span className="pl-strip" role="img" aria-label={stages.map((s) => `${s.name}: ${s.state}`).join(", ")}>
      {stages.map((stage) => (
        <span key={stage.id} className="pl-strip-seg" data-state={stage.state} data-kind={stage.kind} title={`${stage.name} · ${stage.state}`} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- execution page

export type ExecutionProps = {
  run: Run;
  entriesFor: (attempt: number) => LogEntry[];
  liveElapsed: number;
  initialAttempt?: number;
  focusSeq?: number;
  role: Role;
  isPhone: boolean;
  canCancel: boolean;
  onCancel: () => void;
  onBack: () => void;
  onToast: (text: string) => void;
  onAskLine: (entry: LogEntry) => void;
  onAsk: (question?: string) => void;
  onDiagnostics: (jobId: string) => void;
  onSelection: (attempt: number, label: string) => void;
};

type Tab = "logs" | "inputs" | "outputs" | "details";

export function ExecutionPage(props: ExecutionProps) {
  const { run: base, entriesFor, liveElapsed, role, isPhone, onAskLine, onAsk, onToast, onSelection } = props;
  const [attempt, setAttempt] = useState(props.initialAttempt ?? base.attempt);
  const run = useMemo(() => runForAttempt(base, attempt), [base, attempt]);
  const entries = entriesFor(attempt);
  const stages = useMemo(() => buildStages(run), [run]);
  const running = run.state === "running";

  // A cited line picks its own stage and step.
  const cited = props.focusSeq ? entries.find((e) => e.seq === props.focusSeq) : undefined;
  const citedStage = cited && stages.find((s) => s.steps.some((step) => step.id === cited.scope));
  const [picked, setPicked] = useState<{ stage: string; step: string } | undefined>(
    citedStage && cited ? { stage: citedStage.id, step: cited.scope } : undefined,
  );
  // Until the reader picks, follow the failed or running step (so the live run advances).
  const selection = picked && stages.some((s) => s.id === picked.stage) ? picked : defaultSelection(stages);
  const stage = stages.find((s) => s.id === selection.stage) ?? stages[0];
  const step = stage.steps.find((s) => s.id === selection.step) ?? stage.steps[0];
  const [tab, setTab] = useState<Tab>("logs");
  const [scope, setScope] = useState<"step" | "run">("step");
  const attemptInfo = run.attempts.find((a) => a.n === attempt);

  useEffect(() => {
    onSelection(attempt, `Run #${run.number} · ${step.group ? step.group.scope : step.name}`);
  }, [attempt, run.number, step, onSelection]);

  const choose = (stageId: string, stepId?: string) => {
    const target = stages.find((s) => s.id === stageId)!;
    const nextStep =
      stepId ?? (target.steps.find((s) => s.state === "failed") ?? target.steps.find((s) => s.state === "running") ?? target.steps[0]).id;
    setPicked({ stage: stageId, step: nextStep });
  };

  const delivery = run.deliveryId ? deliveryById(run.deliveryId) : undefined;
  const elapsed = running ? liveElapsed : run.durationMs;
  const failedGroups = run.groups.filter((g) => g.state === "failed" && g.target !== "runner");

  return (
    <div className="pl-exec">
      <header className="pl-exec-head">
        <nav className="pl-crumbs" aria-label="Breadcrumb">
          <button type="button" onClick={props.onBack}>
            Executions
          </button>
          <span aria-hidden="true">/</span>
          <span aria-current="page">#{run.number}</span>
        </nav>
        <div className="pl-exec-title">
          <div className="pl-exec-name">
            <h1>
              {run.title} <span className="pl-num">#{run.number}</span>
            </h1>
            <StateChip state={run.state} />
          </div>
          <div className="pl-exec-actions">
            {base.attempts.length > 1 && (
              <Select
                value={String(attempt)}
                onValueChange={(value) => {
                  setAttempt(Number(value));
                  setPicked(undefined);
                }}
              >
                <SelectTrigger size="sm" aria-label="Attempt" className="pl-attempt">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {base.attempts.map((item) => (
                    <SelectItem key={item.n} value={String(item.n)}>
                      Attempt {item.n} · {item.state === "timed_out" ? "executor lost" : item.state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {props.canCancel && running && (
              <Button size="sm" variant="destructive" onClick={props.onCancel}>
                <CircleStop /> Cancel
              </Button>
            )}
            {failedGroups.length > 0 && attempt === base.attempt && (
              <Button size="sm" variant="outline" onClick={() => onToast(`Queued attempt ${base.attempts.length + 1}: re-running ${failedGroups.map((g) => g.scope).join(", ")} only.`)}>
                <RotateCcw /> Re-run failed steps
              </Button>
            )}
            {!running && (
              <Button size="sm" variant="outline" onClick={() => onToast(`Queued a new attempt of #${run.number} on ${run.commit.slice(0, 7)}.`)}>
                <RotateCcw /> Re-run
              </Button>
            )}
            <Button size="sm" onClick={() => onAsk()}>
              <Sparkles /> Ask Oyzu
            </Button>
          </div>
        </div>
        <p className="pl-exec-meta">
          <span>
            <TriggerIcon run={run} size={13} /> {triggerText(run)}
            {run.trigger === "pull_request" && delivery ? ` · ${delivery.event.split(".")[1]}` : ""} by <strong>{run.author}</strong>
          </span>
          <span>
            <GitCommitHorizontal size={13} aria-hidden="true" /> <code className="rb-mono">{run.commit.slice(0, 7)}</code>
          </span>
          <span>
            <GitBranch size={13} aria-hidden="true" /> {run.ref}
          </span>
          <span>
            Started {clock(attemptInfo?.startedAt ?? run.createdAt)} · {ago(attemptInfo?.startedAt ?? run.createdAt)}
          </span>
          <span>
            <Timer size={13} aria-hidden="true" /> {running ? `${duration(elapsed)} so far` : duration(elapsed)}
          </span>
        </p>
        {attemptInfo?.logState === "incomplete" ? (
          <p className="pl-banner" data-tone="warning">
            <TriangleAlert size={14} aria-hidden="true" /> Attempt {attempt}: {attemptInfo.reason}
          </p>
        ) : run.reason ? (
          <p className="pl-banner" data-tone={run.state === "failed" ? "failed" : "neutral"}>
            {run.state === "failed" ? <TriangleAlert size={14} aria-hidden="true" /> : <Ban size={14} aria-hidden="true" />} {run.reason.message}
          </p>
        ) : null}
      </header>

      <PipelineGraph stages={stages} selected={stage.id} onSelect={(id) => choose(id)} />

      <SplitPanels isPhone={isPhone}>
        <aside className="pl-tree" aria-label={`Steps in ${stage.name}`}>
          <header>
            <GroupIcon state={stage.state} />
            <strong>{stage.name}</strong>
            <small>{stage.steps.length} {stage.steps.length === 1 ? "step" : "steps"}</small>
          </header>
          <ol>
            {stage.steps.map((item, index) => {
              const live = item.state === "running" && item.group ? liveStepMs(item, entries, liveElapsed) : undefined;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={item.id === step.id ? "true" : undefined}
                    data-state={item.state}
                    onClick={() => choose(stage.id, item.id)}
                  >
                    <span className="pl-tree-rail" aria-hidden="true" data-last={index === stage.steps.length - 1} />
                    <GroupIcon state={item.state} />
                    <span className="pl-tree-text">
                      <strong>{item.name}</strong>
                      <small>{item.sub}</small>
                    </span>
                    <span className="pl-tree-time">
                      {item.state === "running" ? (live ? duration(live) : "running") : item.state === "queued" ? "waiting" : item.durationMs ? duration(item.durationMs) : ""}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <section className="pl-inspect" aria-label="Step details">
          <header className="pl-inspect-head">
            <div>
              <h2>
                <GroupIcon state={step.state} size={16} /> {step.name}
              </h2>
              <small>
                {stage.name} · {step.group ? step.group.scope : step.kind === "delivery" ? "delivery record" : step.kind === "check" ? "check run" : "operation"}
              </small>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onAsk(step.state === "failed" ? "Why did this fail?" : undefined)}>
              <Sparkles /> Ask about this step
            </Button>
          </header>
          <div className="pl-tabs" role="tablist" aria-label="Step tabs">
            {(["logs", "inputs", "outputs", "details"] as const).map((id) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
                {id[0].toUpperCase() + id.slice(1)}
                {id === "outputs" && run.outputs.length > 0 && <span className="pl-count">{run.outputs.length}</span>}
              </button>
            ))}
          </div>
          <div className="pl-tabpanel" role="tabpanel" aria-label={tab}>
            {tab === "logs" && (
              <StepLogs
                run={run}
                step={step}
                attempt={attempt}
                entries={entries}
                scope={scope}
                onScope={setScope}
                focusSeq={cited && cited.scope === step.id ? props.focusSeq : undefined}
                role={role}
                isPhone={isPhone}
                onAskLine={onAskLine}
                onDiagnostics={props.onDiagnostics}
                onAttemptChange={(n) => {
                  setAttempt(n);
                  setPicked(undefined);
                }}
              />
            )}
            {tab === "inputs" && <StepInputs run={run} step={step} attempt={attempt} />}
            {tab === "outputs" && <StepOutputs run={run} step={step} />}
            {tab === "details" && (
              <StepDetails run={run} step={step} attempt={attempt} role={role} onDiagnostics={props.onDiagnostics} />
            )}
          </div>
        </section>
      </SplitPanels>
    </div>
  );
}

function liveStepMs(step: PlStep, entries: readonly LogEntry[], elapsed: number) {
  const first = entries.find((e) => e.scope === step.id);
  return first ? Math.max(0, elapsed - first.t) : undefined;
}

// ---------------------------------------------------------------- graph

function PipelineGraph({ stages, selected, onSelect }: { stages: PlStage[]; selected: string; onSelect: (id: string) => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const graph = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const node = graph.current;
    if (!node) return;
    const measure = () => setSize({ w: node.offsetWidth, h: node.offsetHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const fitScale = () => {
    const pane = canvas.current;
    if (!pane || !size.w) return 1;
    return Math.max(0.4, Math.min(1.25, (pane.clientWidth - 40) / size.w));
  };
  const fit = () => setZoom(fitScale());
  // Keep the selected stage in view (the failed stage can sit off-screen on a phone).
  useEffect(() => {
    const pane = canvas.current;
    const node = pane?.querySelector<HTMLElement>('.pl-node[aria-pressed="true"]');
    if (!pane || !node) return;
    const left = node.getBoundingClientRect().left - pane.getBoundingClientRect().left + pane.scrollLeft;
    const right = left + node.getBoundingClientRect().width;
    if (left < pane.scrollLeft || right > pane.scrollLeft + pane.clientWidth)
      pane.scrollTo({ left: Math.max(0, left - 24) });
  }, [selected, zoom, size.w]);
  // Open fitted when that keeps nodes readable; otherwise scroll at 100%.
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !size.w) return;
    fitted.current = true;
    const scale = fitScale();
    if (scale < 1 && scale >= 0.78) setZoom(Math.floor(scale * 100) / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w]);
  const clamp = (z: number) => Math.round(Math.max(0.4, Math.min(1.6, z)) * 100) / 100;
  return (
    <section className="pl-canvas-wrap" aria-label="Pipeline graph">
      <div className="pl-canvas" ref={canvas}>
        <div className="pl-sizer" style={{ width: size.w * zoom, height: size.h * zoom }}>
          <div className="pl-graph" ref={graph} style={{ transform: `scale(${zoom})` }}>
            {stages.map((stage, index) => {
              const Icon = stageIcons[stage.kind];
              const isSelected = stage.id === selected;
              return (
                <div key={stage.id} className="pl-node-slot" data-kind={stage.kind}>
                  {index > 0 && <span className="pl-edge" data-state={stage.state} aria-hidden="true" />}
                  <button
                    type="button"
                    className="pl-node"
                    data-state={stage.state}
                    data-kind={stage.kind}
                    aria-pressed={isSelected}
                    onClick={() => onSelect(stage.id)}
                  >
                    <span className="pl-node-icon" aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="pl-node-body">
                      <strong>{stage.name}</strong>
                      <small>{stage.caption}</small>
                    </span>
                    <span className="pl-node-foot">
                      <GroupIcon state={stage.state} size={12} />
                      <span>
                        {stage.state === "running" ? "Running" : stage.state === "queued" ? "Waiting" : stage.durationMs ? duration(stage.durationMs) : stage.state === "skipped" ? "Skipped" : "Done"}
                      </span>
                      <span className="pl-node-dots" aria-hidden="true">
                        {stage.steps.map((step) => (
                          <i key={step.id} data-state={step.state} />
                        ))}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="pl-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => clamp(z - 0.1))}>
          <Minus size={14} />
        </button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => clamp(z + 0.1))}>
          <Plus size={14} />
        </button>
        <button type="button" aria-label="Zoom to fit" onClick={fit}>
          <Maximize2 size={13} />
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- split

function SplitPanels({ children, isPhone }: { children: [ReactElement, ReactElement]; isPhone: boolean }) {
  const [width, setWidth] = useState(300);
  const start = (event: ReactPointerEvent<HTMLDivElement>) => {
    const x0 = event.clientX;
    const w0 = width;
    const move = (e: PointerEvent) => setWidth(Math.max(220, Math.min(460, w0 + e.clientX - x0)));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="pl-split" style={isPhone ? undefined : { gridTemplateColumns: `${width}px 8px minmax(0, 1fr)` }}>
      {children[0]}
      {!isPhone && (
        <div
          className="pl-gutter"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize step list"
          tabIndex={0}
          onPointerDown={start}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") setWidth((w) => Math.max(220, w - 20));
            if (event.key === "ArrowRight") setWidth((w) => Math.min(460, w + 20));
          }}
        />
      )}
      {children[1]}
    </div>
  );
}

// ---------------------------------------------------------------- tabs

function StepLogs({
  run,
  step,
  attempt,
  entries,
  scope,
  onScope,
  focusSeq,
  role,
  isPhone,
  onAskLine,
  onDiagnostics,
  onAttemptChange,
}: {
  run: Run;
  step: PlStep;
  attempt: number;
  entries: LogEntry[];
  scope: "step" | "run";
  onScope: (scope: "step" | "run") => void;
  focusSeq?: number;
  role: Role;
  isPhone: boolean;
  onAskLine: (entry: LogEntry) => void;
  onDiagnostics: (jobId: string) => void;
  onAttemptChange: (n: number) => void;
}) {
  const { look } = usePrototype();
  if (step.kind === "delivery") return <DeliveryRecord run={run} focus={step.deliveryStage?.key} />;
  if (step.kind === "check")
    return (
      <div className="pl-note">
        <ListChecks size={18} aria-hidden="true" />
        <div>
          <strong>{step.name}</strong>
          <p>
            {run.check === "manual"
              ? "Manual runs are recorded in the portal and don't post a check run."
              : step.state === "queued"
                ? `The check on ${run.commit.slice(0, 7)} shows in progress until the run finishes.`
                : `Wrote ${run.check} = ${run.state === "succeeded" ? "success" : run.state === "failed" || run.state === "timed_out" ? "failure" : run.state} on ${run.commit.slice(0, 7)}${run.pr ? ` for pull request #${run.pr}` : ""}.`}
          </p>
        </div>
      </div>
    );
  if (!entries.length)
    return (
      <div className="pl-note">
        <FileText size={18} aria-hidden="true" />
        <div>
          <strong>{run.state === "skipped" ? "Nothing ran, so there's no log" : "Log not included in this preview"}</strong>
          <p>
            {run.state === "skipped"
              ? `Skipped before a runner was assigned: ${run.reason?.message ?? "no reason recorded"}.`
              : "This preview carries logs for runs 9012, 9013 and 9014."}{" "}
            Reproduce with <code className="rb-mono">{run.command}</code>
          </p>
        </div>
      </div>
    );
  // Summary look: the whole run's digest comes first and the log opens at this
  // step. Terminal look: the log itself, scoped to the step or the whole run.
  const summary = look === "summary";
  const scoped = !summary && scope === "step" && step.group;
  const shown = scoped ? entries.filter((e) => e.scope === step.id) : entries;
  const groups = scoped ? [step.group!] : run.groups;
  const live = run.state === "running" && (!scoped || step.state === "running" || step.state === "queued");
  const stepLines = entries.filter((e) => e.scope === step.id);
  const anchor =
    !scoped && step.state !== "running" && stepLines.length && !stepLines.some((e) => e.level === "error")
      ? stepLines[0].seq
      : undefined;
  const focus = focusSeq ?? anchor;
  return (
    <div className="pl-logs">
      {step.group && !summary && (
        <div className="pl-seg" role="group" aria-label="Log scope">
          <button type="button" aria-pressed={scope === "step"} onClick={() => onScope("step")}>
            This step
          </button>
          <button type="button" aria-pressed={scope === "run"} onClick={() => onScope("run")}>
            Whole run
          </button>
          <small>{shown.length} lines</small>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="pl-note">
          <Timer size={18} aria-hidden="true" />
          <div>
            <strong>{step.state === "queued" ? "Waiting to start" : step.state === "skipped" ? "This step didn't run" : "No output from this step"}</strong>
            <p>{step.state === "queued" ? "Output streams here as soon as the step starts." : "Switch to the whole run to see what happened around it."}</p>
          </div>
        </div>
      ) : (
        <LogViewer
          key={`${run.id}-${attempt}-${scoped ? step.id : "all"}-${focus ?? 0}`}
          run={run}
          entries={shown}
          groups={groups}
          attempt={attempt}
          onAttemptChange={onAttemptChange}
          live={live}
          role={role}
          onDiagnostics={onDiagnostics}
          onAsk={onAskLine}
          focusSeq={focus}
          compact={Boolean(scoped) || isPhone}
          height={isPhone ? "56vh" : "min(52vh, 520px)"}
        />
      )}
    </div>
  );
}

function DeliveryRecord({ run, focus }: { run: Run; focus?: string }) {
  const delivery = run.deliveryId ? deliveryById(run.deliveryId) : undefined;
  if (!delivery) return null;
  return (
    <div className="pl-delivery">
      <dl className="pl-facts">
        <div>
          <dt>Delivery</dt>
          <dd>
            <code className="rb-mono">{delivery.id}</code> · {delivery.connector}
          </dd>
        </div>
        <div>
          <dt>Event</dt>
          <dd>
            {delivery.event} by {delivery.actor} · {clock(delivery.receivedAt)}
          </dd>
        </div>
        <div>
          <dt>Changed paths</dt>
          <dd>{delivery.changedPaths.join(", ") || "—"}</dd>
        </div>
      </dl>
      <ol className="pl-timeline">
        {delivery.stages.map((stage) => (
          <li key={stage.key} data-state={fromStatus[stage.status]} data-focus={stage.key === focus || undefined}>
            <GroupIcon state={fromStatus[stage.status]} size={13} />
            <strong>{stage.label}</strong>
            <span>{stage.detail}</span>
          </li>
        ))}
      </ol>
      <h3 className="pl-subhead">Binding verdicts</h3>
      <ul className="pl-verdicts">
        {delivery.evaluations.map((evaluation) => (
          <li key={evaluation.bindingId} data-matched={evaluation.matched}>
            <span className="pl-verdict">{evaluation.matched ? "Matched" : "No match"}</span>
            <strong>{bindingById(evaluation.bindingId)?.name ?? evaluation.bindingId}</strong>
            <small>{evaluation.reason}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StepInputs({ run, step, attempt }: { run: Run; step: PlStep; attempt: number }) {
  const info = run.attempts.find((a) => a.n === attempt);
  const [copied, setCopied] = useState(false);
  const env: [string, string, boolean?][] = [
    ["CI", "true"],
    ["OYZU_REMOTE", "1"],
    ["OYZU_RUN", String(run.number)],
    ["OYZU_ATTEMPT", String(attempt)],
    ["OYZU_POOL", info?.pool ?? "—"],
    ["GIT_COMMIT", run.commit.slice(0, 12)],
    ["GIT_REF", run.ref],
    ...(step.id.endsWith("/test") ? ([["LEDGER_API_KEY", "***", true]] as [string, string, boolean][]) : []),
  ];
  return (
    <div className="pl-inputs">
      <div className="pl-command">
        <span>Command</span>
        <code>{run.command}</code>
        <button
          type="button"
          aria-label="Copy command"
          onClick={() => {
            navigator.clipboard?.writeText(run.command).catch(() => undefined);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }}
        >
          <Copy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <dl className="pl-facts">
        <div>
          <dt>Step</dt>
          <dd>{step.group ? `${step.group.target === "runner" ? "runner" : step.group.target} · ${step.group.task}` : step.name}</dd>
        </div>
        <div>
          <dt>Operation</dt>
          <dd>
            {run.operation.kind === "run"
              ? `run task ${run.operation.task}`
              : run.operation.affectedBase
                ? `build affected since ${run.operation.affectedBase}`
                : run.operation.targets
                  ? `build ${run.operation.targets.join(", ")}`
                  : "build all"}
          </dd>
        </div>
        <div>
          <dt>oyzu version</dt>
          <dd>{run.oyzuVersion} (project pin)</dd>
        </div>
        <div>
          <dt>Pool</dt>
          <dd>{info ? `${info.pool} · ${info.manager}` : "Not assigned"}</dd>
        </div>
        <div>
          <dt>Repository</dt>
          <dd>
            {run.repository} @ <code className="rb-mono">{run.commit.slice(0, 7)}</code>
          </dd>
        </div>
      </dl>
      <h3 className="pl-subhead">Environment</h3>
      <table className="pl-env">
        <tbody>
          {env.map(([key, value, secret]) => (
            <tr key={key}>
              <th scope="row">
                <code className="rb-mono">{key}</code>
              </th>
              <td>
                <code className="rb-mono">{value}</code>
                {secret && <span className="pl-tag">secret · masked</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function size(bytes: number) {
  return bytes >= 1024 ? `${(bytes / 1024).toFixed(bytes >= 10_240 ? 0 : 1)} KiB` : `${bytes} B`;
}

function StepOutputs({ run, step }: { run: Run; step: PlStep }) {
  if (!run.outputs.length)
    return (
      <div className="pl-note">
        <Boxes size={18} aria-hidden="true" />
        <div>
          <strong>{run.state === "running" ? "Outputs appear when the run finishes" : "No outputs"}</strong>
          <p>
            {run.state === "running"
              ? "The runner uploads outputs and their digests after the last task."
              : "This attempt stopped before it uploaded anything, or the command declares none."}
          </p>
        </div>
      </div>
    );
  const target = step.group?.target;
  return (
    <table className="pl-outputs">
      <thead>
        <tr>
          <th>Path</th>
          <th>Kind</th>
          <th>Size</th>
          <th>Digest</th>
        </tr>
      </thead>
      <tbody>
        {run.outputs.map((output) => (
          <tr key={output.path} data-related={Boolean(target && output.path.includes(`/${target}/`)) || undefined}>
            <td>
              <code className="rb-mono">{output.path}</code>
            </td>
            <td>{output.kind}</td>
            <td>{size(output.size)}</td>
            <td>
              <code className="rb-mono">{output.digest}</code>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function StepDetails({
  run,
  step,
  attempt,
  role,
  onDiagnostics,
}: {
  run: Run;
  step: PlStep;
  attempt: number;
  role: Role;
  onDiagnostics: (jobId: string) => void;
}) {
  const info = run.attempts.find((a) => a.n === attempt);
  return (
    <div className="pl-details">
      <dl className="pl-facts">
        <div>
          <dt>Attempt</dt>
          <dd>
            {attempt} of {run.attempts.length || 1} · {info ? (info.state === "timed_out" ? "executor lost" : info.state) : run.state}
          </dd>
        </div>
        <div>
          <dt>Pool</dt>
          <dd>{info?.pool ?? "—"}</dd>
        </div>
        <div>
          <dt>Manager</dt>
          <dd>{info?.manager ?? "—"}</dd>
        </div>
        <div>
          <dt>Job id</dt>
          <dd>
            <code className="rb-mono">{info?.jobId ?? "—"}</code>
          </dd>
        </div>
        <div>
          <dt>Started</dt>
          <dd>{info ? `${clock(info.startedAt)} · ${ago(info.startedAt)}` : clock(run.createdAt)}</dd>
        </div>
        <div>
          <dt>Log</dt>
          <dd>{info?.logState ?? "none"}</dd>
        </div>
        <div>
          <dt>Run id</dt>
          <dd>
            <code className="rb-mono">{run.id}</code>
          </dd>
        </div>
        <div>
          <dt>Step state</dt>
          <dd>
            <StateChip state={step.state} size="sm" />
          </dd>
        </div>
      </dl>
      {role === "pool-admin" && info && (
        <button type="button" className="pl-link" onClick={() => onDiagnostics(info.jobId)}>
          <Stethoscope size={14} aria-hidden="true" /> Runner diagnostics for {info.jobId}
        </button>
      )}
    </div>
  );
}
