import { useState } from "react";
import { MessagesSquare, PanelsTopLeft, RotateCcw, Waypoints, Workflow } from "lucide-react";
import { restartLiveRun } from "./live";
import type { Role } from "./model";
import { PrototypeContext, type Look } from "./shared";
import { Workbench } from "./directions/workbench";
import { Conversation } from "./directions/conversation";
import { Trace } from "./directions/trace";
import { Pipeline } from "./directions/pipeline";
import "./prototype.css";

// Design study: four directions for how remote builds are shown and
// troubleshot, sharing one fictional data set, LogViewer and assistant.

const directions = [
  {
    id: "pipeline",
    label: "Pipeline",
    icon: Workflow,
    pitch: "A pipeline-execution layout: stage graph across the top, steps and logs beneath, assistant in a drawer.",
  },
  {
    id: "workbench",
    label: "Workbench",
    icon: PanelsTopLeft,
    pitch: "Familiar portal pages with a docked assistant that knows what you're looking at.",
  },
  {
    id: "conversation",
    label: "Conversation",
    icon: MessagesSquare,
    pitch: "Every run and delivery is a thread; the timeline and the assistant share one conversation.",
  },
  {
    id: "trace",
    label: "Trace",
    icon: Waypoints,
    pitch: "Follow an event from webhook to check as one path, and ask about any step inline.",
  },
] as const;
type DirectionId = (typeof directions)[number]["id"];

function initialDirection(): DirectionId {
  const hash = window.location.hash.replace("#", "");
  // Directions keep sub-pages in the hash (#workbench-runs, #pipeline-run-9012).
  const match = directions.find((d) => hash === d.id || hash.startsWith(`${d.id}-`));
  return match ? match.id : "pipeline";
}

export function RemoteBuildsPrototype() {
  const [direction, setDirection] = useState<DirectionId>(initialDirection);
  const [role, setRole] = useState<Role>("pool-admin");
  const [look, setLook] = useState<Look>("summary");
  const current = directions.find((d) => d.id === direction)!;
  return (
    <PrototypeContext.Provider value={{ role, look }}>
      <div className="rb-study" data-look={look}>
        <header className="rb-study-bar">
          <div className="rb-study-title">
            <img src="/brand/oyzu-mark-reverse.svg" alt="Oyzu" width={22} height={22} />
            <strong>Remote builds</strong>
            <span>design study</span>
          </div>
          <nav className="rb-study-switch" aria-label="Design direction">
            {directions.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.id}
                  type="button"
                  aria-pressed={d.id === direction}
                  onClick={() => {
                    setDirection(d.id);
                    try {
                      window.history.replaceState(null, "", `#${d.id}`);
                    } catch {
                      /* the hash is a convenience only */
                    }
                  }}
                >
                  <Icon size={14} aria-hidden="true" />
                  {d.label}
                </button>
              );
            })}
          </nav>
          <div className="rb-study-tools">
            <label>
              <span>Look</span>
              <select id="rb-look" value={look} onChange={(event) => setLook(event.target.value as Look)}>
                <option value="summary">Summary-first</option>
                <option value="terminal">Terminal</option>
              </select>
            </label>
            <label>
              <span>View as</span>
              <select id="rb-role" value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="pool-admin">Pool admin</option>
                <option value="member">Project member</option>
              </select>
            </label>
            <button type="button" onClick={restartLiveRun} title="Restart the live api-image run">
              <RotateCcw size={13} aria-hidden="true" /> <span>Replay live run</span>
            </button>
          </div>
        </header>
        <p className="rb-study-pitch">
          <strong>{current.label}.</strong> {current.pitch} All data is fictional.
        </p>
        <div className="rb-study-stage" data-direction={direction}>
          {direction === "pipeline" ? (
            <Pipeline />
          ) : direction === "workbench" ? (
            <Workbench />
          ) : direction === "conversation" ? (
            <Conversation />
          ) : (
            <Trace />
          )}
        </div>
      </div>
    </PrototypeContext.Provider>
  );
}
