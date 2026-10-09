import { FileDiff } from "lucide-react";
import { stringify } from "yaml";
import { useRef, useState } from "react";
import { ArrowUpRight, Search, Download, History } from "lucide-react";
import { PageLayout } from "../components/patterns/page-layout";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { useRbac } from "./rbac-model";
import { auditSamples, type AuditEvent } from "./audit-model";
import "./audit-page.css";
function timestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
export function AuditPage() {
  const [query, setQuery] = useState(""),
    [kind, setKind] = useState("All resources"),
    [outcome, setOutcome] = useState("All outcomes"),
    [source, setSource] = useState("All sources"),
    [date, setDate] = useState("All dates");
  const [diffOnly, setDiffOnly] = useState(false);
  const [selected, setSelected] = useState<AuditEvent | null>(null);
  const focus = useRef<HTMLButtonElement | null>(null);
  const model = useRbac();
  const rbac: AuditEvent[] = model.events.map((e) => ({
    id: e.id,
    time: e.time,
    actor:
      e.action === "Assignment activating" || e.action === "Assignment rejected"
        ? "Taylor Chen (preview)"
        : "Preview administrator",
    source: "Console",
    action: e.action,
    resource: e.entity,
    kind: "Access",
    scope: "Acme account",
    outcome: e.action.includes("failed")
      ? "Failed"
      : e.action.includes("rejected")
        ? "Denied"
        : "Succeeded",
    summary: e.detail,
    snapshots: { before: e.before, after: e.after },
    changes: [
      {
        field: "definition",
        before: e.before ? JSON.stringify(e.before, null, 2) : null,
        after: e.after ? JSON.stringify(e.after, null, 2) : null,
      },
    ],
  }));
  const rows = [...rbac, ...auditSamples].filter(
    (e) =>
      (kind === "All resources" || e.kind === kind) &&
      (outcome === "All outcomes" || e.outcome === outcome) &&
      (source === "All sources" || e.source === source) &&
      (date === "All dates" || e.time.startsWith(date)) &&
      `${e.id} ${e.actor} ${e.resource} ${e.action} ${e.scope}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  );
  function clear() {
    setQuery("");
    setKind("All resources");
    setOutcome("All outcomes");
    setSource("All sources");
    setDate("All dates");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "oyzu-audit-preview.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <PageLayout
      variant="ledger"
      eyebrow="ENGINEERING / GOVERNANCE"
      title="Audit trail"
      description="Every change has a story. Follow the actor, intent, and exact difference."
      actions={
        <Button variant="outline" onClick={download} disabled={!rows.length}>
          <Download size={15} />
          Export results
        </Button>
      }
    >
      <div className="audit-overview">
        <History size={20} />
        <div>
          <strong>A record you can inspect</strong>
          <p>
            Configuration changes, access decisions, and automation in one
            timeline.
          </p>
        </div>
        <span>FICTIONAL DATA / UTC</span>
      </div>
      <div className="audit-filters">
        <label className="audit-search">
          <Search size={17} />
          <input
            aria-label="Search audit events"
            placeholder="Search actor, resource, or event ID…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {[
          [
            kind,
            setKind,
            ["All resources", "Connection", "Secret", "Member", "Access"],
            "Resource type",
          ],
          [
            outcome,
            setOutcome,
            ["All outcomes", "Succeeded", "Denied", "Failed"],
            "Outcome",
          ],
          [
            source,
            setSource,
            ["All sources", "Console", "API", "Git sync"],
            "Source",
          ],
          [
            date,
            setDate,
            ["All dates", "2026-10-02", "2026-10-01", "2026-09-30"],
            "Date",
          ],
        ].map(([value, set, options, label]) => (
          <label key={label as string}>
            <span>{label as string}</span>
            <select
              aria-label={label as string}
              value={value as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
            >
              {(options as string[]).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="audit-results">
        <span role="status">{rows.length} events</span>
        <button onClick={clear}>Clear filters</button>
        <span>Newest first · Times in UTC</span>
      </div>
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Event / resource</th>
              <th>Actor</th>
              <th>Source</th>
              <th>Outcome</th>
              <th>Time (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <button
                    className="audit-event-link"
                    onClick={(event) => {
                      focus.current = event.currentTarget;
                      setDiffOnly(false);
                      setSelected(e);
                    }}
                  >
                    <strong>
                      {e.action} {e.resource}
                    </strong>
                    <ArrowUpRight size={14} />
                  </button>
                  {e.changes.length > 0 && (
                    <button
                      type="button"
                      className="audit-yaml-shortcut"
                      aria-label={`View YAML diff for ${e.resource}, ${e.id}`}
                      title="View YAML diff"
                      onClick={(event) => {
                        focus.current = event.currentTarget;
                        setDiffOnly(true);
                        setSelected(e);
                      }}
                    >
                      <FileDiff size={16} aria-hidden="true" />
                    </button>
                  )}
                  <small>
                    {e.kind} · {e.scope}
                  </small>
                </td>
                <td>{e.actor}</td>
                <td>
                  <span className="audit-source">{e.source}</span>
                </td>
                <td>
                  <span className="audit-outcome" data-outcome={e.outcome}>
                    {e.outcome}
                  </span>
                </td>
                <td>
                  <time dateTime={e.time}>{timestamp(e.time)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <div className="audit-empty">
          <h2>No matching events</h2>
          <p>Try another actor, resource, or filter.</p>
          <Button variant="outline" onClick={clear}>
            Reset filters
          </Button>
        </div>
      )}
      <p className="audit-footnote">
        Interactive reference with fictional events. No live audit records, Git
        synchronization, or rollback operations are connected.
      </p>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent
          className="audit-detail"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            focus.current?.focus();
          }}
        >
          {selected && (
            <>
              <header>
                <span className="eyebrow">AUDIT EVENT / {selected.id}</span>
                <DialogTitle>
                  {selected.action} {selected.resource}
                </DialogTitle>
                <DialogDescription>{selected.summary}</DialogDescription>
                <span className="audit-outcome" data-outcome={selected.outcome}>
                  {selected.outcome}
                </span>
              </header>
              <p className="audit-human-summary">
                {selected.actor} ·{" "}
                {selected.time.replace("T", " ").replace("Z", " UTC")}
              </p>
              {!diffOnly && (
                <details className="supporting-details">
                  <summary>Event source and scope</summary>
                  <dl className="audit-metadata">
                    <div>
                      <dt>Actor</dt>
                      <dd>{selected.actor}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{selected.source}</dd>
                    </div>
                    <div>
                      <dt>Scope</dt>
                      <dd>{selected.scope}</dd>
                    </div>
                    <div>
                      <dt>Recorded at (UTC)</dt>
                      <dd>
                        {selected.time.replace("T", " ").replace("Z", "")}
                      </dd>
                    </div>
                  </dl>
                </details>
              )}
              {diffOnly ? (
                <section className="audit-diff" aria-label="YAML diff">
                  <h2>YAML diff</h2>
                  <p>Changed fields only. Sensitive values are redacted.</p>
                  {(["before", "after"] as const).map((side) => (
                    <div className="audit-change" key={side}>
                      <h3>{side === "before" ? "Before" : "After"}</h3>
                      <pre
                        className={
                          side === "before" ? "audit-before" : "audit-after"
                        }
                      >
                        {stringify(
                          selected.snapshots
                            ? (selected.snapshots[side] ?? {})
                            : Object.fromEntries(
                                selected.changes
                                  .filter((c) => c[side] !== null)
                                  .map((c) => [c.field, c[side]]),
                              ),
                        )}
                      </pre>
                    </div>
                  ))}
                  <button
                    className="audit-event-link"
                    onClick={() => setDiffOnly(false)}
                  >
                    View event details
                  </button>
                </section>
              ) : (
                <section className="audit-diff">
                  <h2>
                    Configuration changes{" "}
                    <span>{selected.changes.length} fields</span>
                  </h2>
                  {selected.changes.length ? (
                    <>
                      <div className="audit-diff-legend">
                        <span>− Before</span>
                        <span>+ After</span>
                      </div>
                      {selected.changes.map((c) => (
                        <div className="audit-change" key={c.field}>
                          <h3>{c.field}</h3>
                          <pre className="audit-before">
                            <span aria-label="Before">− </span>
                            {c.before ?? "(not present)"}
                          </pre>
                          <pre className="audit-after">
                            <span aria-label="After">+ </span>
                            {c.after ?? "(removed)"}
                          </pre>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="audit-no-change">
                      No configuration changed. The attempted action and its
                      outcome are recorded above.
                    </p>
                  )}
                </section>
              )}
              <footer>
                History is read-only. Restoring a configuration would create a
                new revision and a new audit event.
              </footer>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
