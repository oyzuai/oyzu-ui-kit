import { useSyncExternalStore } from "react";
import {
  liveInitialLog,
  liveRun,
  liveScript,
  type GroupState,
  type LogEntry,
  type RunState,
} from "./model";

// Simulates the cursor long-poll for the one running build: entries arrive in
// order with gapless sequence numbers, and the run finishes after the script.

type LiveSnapshot = {
  entries: LogEntry[];
  state: RunState;
  groups: Record<string, GroupState>;
  elapsedMs: number;
};

let snapshot: LiveSnapshot = {
  entries: liveInitialLog,
  state: "running",
  groups: { runner: "succeeded", "api-image/compile": "running", "api-image/image": "queued" },
  elapsedMs: 11_400,
};
const listeners = new Set<() => void>();
let timer: number | undefined;
let cursor = 0;

function emit(next: LiveSnapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function tick() {
  const line = liveScript[cursor];
  if (!line) {
    window.clearInterval(timer);
    timer = undefined;
    emit({
      ...snapshot,
      state: "succeeded",
      groups: { ...snapshot.groups, "api-image/image": "succeeded" },
    });
    return;
  }
  cursor += 1;
  const groups = { ...snapshot.groups };
  if (line.text.startsWith("Task api-image/compile succeeded")) groups["api-image/compile"] = "succeeded";
  if (line.text.startsWith("Task api-image/image started")) groups["api-image/image"] = "running";
  emit({
    entries: [...snapshot.entries, { ...line, seq: snapshot.entries.length + 1 }],
    state: snapshot.state,
    groups,
    elapsedMs: line.t,
  });
}

function start() {
  if (timer === undefined && cursor < liveScript.length)
    timer = window.setInterval(tick, 900);
}

/** Restart the simulated run from the beginning (the prototype's "replay" control). */
export function restartLiveRun() {
  window.clearInterval(timer);
  timer = undefined;
  cursor = 0;
  emit({
    entries: liveInitialLog,
    state: "running",
    groups: { runner: "succeeded", "api-image/compile": "running", "api-image/image": "queued" },
    elapsedMs: 11_400,
  });
  start();
}

export function useLiveRun() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      start();
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}

export const liveRunId = liveRun.id;
