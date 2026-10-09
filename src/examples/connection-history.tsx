import { useEffect, useState } from "react";
import { GitBranch, History, CheckCircle2, ArrowRight } from "lucide-react";
import { stringify } from "yaml";
import { PageLayout } from "../components/patterns/page-layout";
import { DocumentEditor } from "../components/patterns/document-editor";
import { TextField } from "../components/patterns/text-field";
import { Button } from "../components/ui/button";
import {
  initialRevisions,
  validateConfig,
  type ConnectionConfig,
  type Revision,
} from "./connection-history-model";
import "./connection-history.css";
export function ConnectionHistory({
  onStateChange,
}: {
  onStateChange: (dirty: boolean, busy: boolean) => void;
}) {
  const [revisions, setRevisions] = useState(initialRevisions);
  const current = revisions[revisions.length - 1];
  const [tab, setTab] = useState("Overview"),
    [draft, setDraft] = useState<ConnectionConfig>({ ...current.config }),
    [pending, setPending] = useState(false),
    [busy, setBusy] = useState(false),
    [tested, setTested] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [restore, setRestore] = useState<number | null>(null),
    [editorKey, setEditorKey] = useState(0);
  const [managed, setManaged] = useState(false),
    [sync, setSync] = useState("Synced"),
    [scenario, setScenario] = useState("Success"),
    [proposal, setProposal] = useState<ConnectionConfig | null>(null),
    [incoming, setIncoming] = useState<ConnectionConfig | null>(null);
  const [before, setBefore] = useState(2),
    [after, setAfter] = useState(3);
  const dirty =
    pending ||
    JSON.stringify(draft) !== JSON.stringify(current.config) ||
    restore !== null;
  useEffect(() => {
    onStateChange(dirty || !!proposal, busy);
  }, [dirty, proposal, busy, onStateChange]);
  useEffect(() => () => onStateChange(false, false), [onStateChange]);
  function update(next: ConnectionConfig) {
    setDraft(next);
    setTested(false);
    setError("");
    setNotice("");
  }
  function discard() {
    setDraft({ ...current.config });
    setRestore(null);
    setPending(false);
    setTested(false);
    setError("");
    setEditorKey((v) => v + 1);
  }
  function append(config: ConnectionConfig, source: string, message: string) {
    const revision: Revision = {
      number: current.number + 1,
      at: new Date().toISOString(),
      actor: source === "Git" ? "Git sync bot" : "Alex Morgan",
      source,
      message,
      config: { ...config },
    };
    setRevisions((items) => [...items, revision]);
    setDraft({ ...config });
    setBefore(current.number);
    setAfter(revision.number);
    setRestore(null);
    setTested(false);
    setPending(false);
    setEditorKey((v) => v + 1);
    setNotice(
      `Revision ${revision.number} created. Previous revisions are unchanged.`,
    );
  }
  async function primary() {
    if (busy || pending) return;
    try {
      validateConfig(draft);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    setError("");
    await new Promise((r) => setTimeout(r, 600));
    if (scenario === "Test failure" && !tested) {
      setError(
        "Authentication check failed. Review the secret reference and try again.",
      );
      setBusy(false);
      return;
    }
    if (!tested) {
      setTested(true);
      setNotice(
        "Connection test passed. Review the differences before saving.",
      );
    } else if (scenario === "Save failure") {
      setError("Save failed. Your tested draft is preserved for retry.");
    } else if (managed) {
      setProposal({ ...draft });
      setNotice(
        "Draft change request prepared. The live configuration is unchanged until simulated merge.",
      );
    } else
      append(
        draft,
        restore ? `Restore of r${restore}` : "Console",
        restore
          ? `Restored revision ${restore} as a new revision`
          : "Updated configuration",
      );
    setBusy(false);
  }
  async function merge() {
    if (!proposal || busy || incoming) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 500));
    append(
      proposal,
      "Git",
      restore
        ? `Merged restoration of revision ${restore}`
        : "Merged configuration change request",
    );
    setProposal(null);
    setSync("Synced");
    setBusy(false);
  }
  const left = revisions.find((r) => r.number === before)!,
    right = revisions.find((r) => r.number === after)!;
  const differences = Object.keys(left.config).filter(
    (k) =>
      left.config[k as keyof ConnectionConfig] !==
      right.config[k as keyof ConnectionConfig],
  );
  return (
    <PageLayout
      variant="entity"
      eyebrow="PROJECT / CHECKOUT SERVICE / CONNECTIONS"
      title={current.config.name}
      description="Configuration, revisions, and the source of every change."
    >
      <div className="history-identity">
        <img src="/brands/github.svg" width="30" height="30" alt="" />
        <div>
          <strong>GitHub</strong>
          <code>production-github</code>
        </div>
        <span>Revision {current.number}</span>
        <span className="history-healthy">
          <CheckCircle2 size={14} />
          Verified example
        </span>
      </div>
      <nav className="history-tabs" aria-label="Connection detail sections">
        {["Overview", "Configuration", "History", "Git source"].map((t) => (
          <button
            key={t}
            disabled={pending || busy}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      {notice && (
        <p className="history-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="history-error" role="alert">
          {error}
        </p>
      )}
      {tab === "Overview" && (
        <div className="history-overview">
          <section>
            <div className="decision-summary">
              <h2>Connected to GitHub</h2>
              <p>Service endpoint</p>
              <p>
                <strong>{current.config.endpoint}</strong>
              </p>
              <p>
                This is a verified example connection. Live health checks are
                not running in this preview.
              </p>
            </div>
            <details className="supporting-details">
              <summary>Configuration details</summary>
              <dl>
                {Object.entries(current.config).map(([key, value]) => (
                  <div key={key}>
                    <dt>
                      {{
                        name: "Name",
                        identifier: "Identifier",
                        endpoint: "Endpoint",
                        secretReference: "Secret reference",
                        reviewChanges: "Review changes",
                      }[key] ?? key}
                    </dt>
                    <dd>
                      {typeof value === "boolean"
                        ? value
                          ? "Required"
                          : "Not required"
                        : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>
            <Button onClick={() => setTab("Configuration")}>
              Edit configuration
            </Button>
          </section>
          <aside>
            <GitBranch size={22} />
            <h2>{managed ? "Managed in Git" : "Managed in Oyzu"}</h2>
            <p>
              {managed
                ? "UI edits become a change request. The repository remains the source of truth."
                : "Edits are reviewed and tested before a new revision is saved."}
            </p>
            <Button variant="outline" onClick={() => setTab("Git source")}>
              View source settings
            </Button>
            <h2>Latest change</h2>
            <p>{current.message}</p>
            <small>
              {current.actor} · {current.source}
            </small>
            <Button variant="ghost" onClick={() => setTab("History")}>
              View history <ArrowRight size={14} />
            </Button>
          </aside>
        </div>
      )}
      {tab === "Configuration" && (
        <section className="history-configuration">
          <header>
            <h2>
              {restore ? `Restore revision ${restore}` : "Edit configuration"}
            </h2>
            <p>
              {restore
                ? "Review this historical configuration against the current revision. Saving creates a new revision."
                : "Switch between the visual form and YAML. Both edit the same draft."}
            </p>
            {managed && (
              <p className="history-git-note">
                Git-managed · Changes are proposed to the repository before
                applying.
              </p>
            )}
          </header>
          <DocumentEditor
            key={editorKey}
            value={draft}
            saved={current.config}
            disabled={busy || !!proposal || !!incoming}
            validate={(v) => validateConfig(v as ConnectionConfig)}
            onPendingChange={setPending}
            onApply={(v) => update(v as ConnectionConfig)}
          >
            <fieldset disabled={busy || !!proposal || !!incoming}>
              <TextField
                label="Connection name"
                value={draft.name}
                onChange={(name) => update({ ...draft, name })}
              />
              <TextField
                label="Endpoint"
                value={draft.endpoint}
                onChange={(endpoint) => update({ ...draft, endpoint })}
              />
              <label>
                Secret reference
                <select
                  value={draft.secretReference}
                  onChange={(e) =>
                    update({ ...draft, secretReference: e.target.value })
                  }
                >
                  <option>org/github-token-v1</option>
                  <option>project/github-token-v2</option>
                </select>
              </label>
              <label className="history-checkbox">
                <input
                  type="checkbox"
                  checked={draft.reviewChanges}
                  onChange={(e) =>
                    update({ ...draft, reviewChanges: e.target.checked })
                  }
                />{" "}
                Require review for changes
              </label>
            </fieldset>
          </DocumentEditor>
          {!!proposal && (
            <div className="history-proposal">
              <h3>Change request ready</h3>
              <p>
                Review the proposed YAML in Git source. No real branch or pull
                request has been created.
              </p>
              <Button variant="outline" onClick={() => setTab("Git source")}>
                Review change request
              </Button>
            </div>
          )}
          <footer className="history-actions">
            <Button
              variant="ghost"
              disabled={busy || !!proposal}
              onClick={discard}
            >
              Discard draft
            </Button>
            <span>
              {tested ? "Test passed" : dirty ? "Unsaved draft" : "No changes"}
            </span>
            <Button
              disabled={!dirty || pending || busy || !!proposal || !!incoming}
              onClick={() => void primary()}
            >
              {busy
                ? "Working…"
                : tested
                  ? managed
                    ? "Propose change"
                    : `Save revision ${current.number + 1}`
                  : "Test connection"}
            </Button>
          </footer>
        </section>
      )}
      {tab === "History" && (
        <section>
          <div className="history-heading">
            <History size={20} />
            <h2>Revision history</h2>
            <span>Append-only · {revisions.length} revisions</span>
          </div>
          <div className="history-revisions">
            {[...revisions].reverse().map((r) => (
              <article key={r.number}>
                <strong>
                  r{r.number}
                  {r.number === current.number ? " · Current" : ""}
                </strong>
                <div>
                  <h3>{r.message}</h3>
                  <p>
                    {r.actor} · {r.source} ·{" "}
                    {new Date(r.at)
                      .toISOString()
                      .replace("T", " ")
                      .slice(0, 19)}{" "}
                    UTC
                  </p>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setBefore(r.number);
                    setAfter(current.number);
                  }}
                >
                  Compare to current
                </Button>
                <Button
                  variant="outline"
                  disabled={
                    r.number === current.number ||
                    dirty ||
                    busy ||
                    !!proposal ||
                    !!incoming
                  }
                  onClick={() => {
                    setDraft({ ...r.config });
                    setRestore(r.number);
                    setTested(false);
                    setTab("Configuration");
                    setNotice(
                      `Revision ${r.number} loaded as a draft. Test it before saving.`,
                    );
                  }}
                >
                  Restore
                </Button>
              </article>
            ))}
          </div>
          {dirty && (
            <p>
              Finish or discard your current draft before restoring another
              revision.
            </p>
          )}
          <div className="history-compare">
            <h2>Compare revisions</h2>
            <div className="history-compare-selects">
              <label>
                Before
                <select
                  aria-label="Before"
                  value={before}
                  onChange={(e) => setBefore(Number(e.target.value))}
                >
                  {revisions.map((r) => (
                    <option key={r.number} value={r.number}>
                      Revision {r.number}
                    </option>
                  ))}
                </select>
              </label>
              <ArrowRight size={18} />
              <label>
                After
                <select
                  aria-label="After"
                  value={after}
                  onChange={(e) => setAfter(Number(e.target.value))}
                >
                  {revisions.map((r) => (
                    <option key={r.number} value={r.number}>
                      Revision {r.number}
                    </option>
                  ))}
                </select>
              </label>
              <span>{differences.length} changed fields</span>
            </div>
            <div className="history-yaml-pair">
              <section>
                <h3>Before · revision {before}</h3>
                <pre>{stringify(left.config)}</pre>
              </section>
              <section>
                <h3>After · revision {after}</h3>
                <pre>{stringify(right.config)}</pre>
              </section>
            </div>
            {differences.map((key) => (
              <div className="history-field-diff" key={key}>
                <strong>{key}</strong>
                <del>{String(left.config[key as keyof ConnectionConfig])}</del>
                <ins>{String(right.config[key as keyof ConnectionConfig])}</ins>
              </div>
            ))}
            {!differences.length && <p>No configuration differences.</p>}
          </div>
        </section>
      )}
      {tab === "Git source" && (
        <section className="history-git">
          <header>
            <GitBranch size={24} />
            <div>
              <h2>Configuration as code</h2>
              <p>Explore how repository changes and UI drafts meet.</p>
            </div>
            <span className="history-sync">
              {managed ? sync : "Not connected"}
            </span>
          </header>
          <label className="history-checkbox">
            <input
              type="checkbox"
              checked={managed}
              disabled={dirty || busy || !!proposal || !!incoming}
              onChange={(e) => {
                setManaged(e.target.checked);
                setNotice("");
              }}
            />{" "}
            Manage this connection in Git (preview)
          </label>
          {managed && (
            <>
              <dl>
                <div>
                  <dt>Repository</dt>
                  <dd>
                    example/engineering-config{" "}
                    <small>Fictional repository</small>
                  </dd>
                </div>
                <div>
                  <dt>Branch</dt>
                  <dd>main</dd>
                </div>
                <div>
                  <dt>File</dt>
                  <dd>connections/production-github.yaml</dd>
                </div>
              </dl>
              <details>
                <summary>View repository YAML</summary>
                <pre>{stringify(incoming ?? current.config)}</pre>
              </details>
              <div className="history-git-actions">
                <Button
                  variant="outline"
                  disabled={busy || !!incoming}
                  onClick={() => {
                    setSync("Sync failed");
                    setError(
                      "Preview sync failed: repository unavailable. Configuration is unchanged.",
                    );
                  }}
                >
                  Simulate sync failure
                </Button>
                {sync === "Sync failed" && (
                  <Button
                    onClick={() => {
                      setSync("Synced");
                      setError("");
                      setNotice("Sync recovered. No new revision was found.");
                    }}
                  >
                    Retry sync
                  </Button>
                )}
                <Button
                  variant="outline"
                  disabled={busy || !!incoming}
                  onClick={() => {
                    setIncoming({
                      ...current.config,
                      reviewChanges: !current.config.reviewChanges,
                    });
                    setSync("Incoming change");
                    setNotice(
                      "A simulated repository update is available. Review it before applying.",
                    );
                  }}
                >
                  Simulate incoming commit
                </Button>
              </div>
              {incoming && (
                <div className="history-conflict">
                  <h3>
                    {dirty || proposal
                      ? "Concurrent changes need review"
                      : "Incoming repository change"}
                  </h3>
                  <p>
                    The repository changed reviewChanges from{" "}
                    {String(current.config.reviewChanges)} to{" "}
                    {String(incoming.reviewChanges)}. Local drafts are not
                    overwritten automatically.
                  </p>
                  <pre>{stringify(incoming)}</pre>
                  <Button
                    disabled={busy}
                    onClick={() => {
                      append(
                        incoming,
                        "Git",
                        "Applied incoming repository revision",
                      );
                      setIncoming(null);
                      setProposal(null);
                      setSync("Synced");
                    }}
                  >
                    Use repository version
                    {dirty || proposal ? " and discard local draft" : ""}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      setIncoming(null);
                      setSync("Diverged");
                      setNotice(
                        "Local draft retained. Repository update remains unresolved; syncing and merging are blocked.",
                      );
                    }}
                  >
                    Keep local draft
                  </Button>
                </div>
              )}
              {proposal && (
                <div className="history-proposal">
                  <h3>Proposed configuration</h3>
                  <pre>{stringify(proposal)}</pre>
                  <p>
                    Simulated review and merge. Only a merge creates a new live
                    revision.
                  </p>
                  <Button
                    disabled={
                      busy ||
                      !!incoming ||
                      sync === "Diverged" ||
                      sync === "Sync failed"
                    }
                    onClick={() => void merge()}
                  >
                    Simulate merge and sync
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setProposal(null);
                      setNotice(
                        "Change request canceled. Your draft is still editable.",
                      );
                    }}
                  >
                    Cancel change request
                  </Button>
                </div>
              )}
              {sync === "Diverged" && (
                <p role="status">
                  Simulate the incoming commit again to resolve the outstanding
                  difference.
                </p>
              )}
            </>
          )}
          <p className="history-footnote">
            Repository details and sync operations are fictional. No external
            service is contacted.
          </p>
        </section>
      )}
      <details className="history-simulation">
        <summary>Preview controls</summary>
        <label>
          Operation outcome
          <select
            value={scenario}
            disabled={busy}
            onChange={(e) => setScenario(e.target.value)}
          >
            <option>Success</option>
            <option>Test failure</option>
            <option>Save failure</option>
          </select>
        </label>
        <p>
          Changes and revision history last until refresh. No production
          connection, repository, or audit store is modified.
        </p>
      </details>
    </PageLayout>
  );
}
