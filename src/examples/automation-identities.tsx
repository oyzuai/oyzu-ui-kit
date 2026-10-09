import { useState } from "react";
import {
  Bot,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  ShieldCheck,
  KeyRound,
  GitBranch,
  Clock,
} from "lucide-react";
import { PageLayout } from "../components/patterns/page-layout";
import { IdentityFields } from "../components/patterns/identity-fields";
import {
  identifierError,
  type IdentityDraft,
} from "../components/patterns/identity";
import { useActiveContext } from "../components/patterns/active-context";
import { Button } from "../components/ui/button";

import { DirectAccessEditor, DirectSummary } from "./automation-direct-access";
import {
  newDirectEntry,
  directError,
  type DirectEntry,
} from "./automation-direct-model";
import "./access-library.css";
import "./automation-identities.css";
type Stage =
  | "Pending approval"
  | "Changes requested"
  | "Authentication required"
  | "Active";
type Identity = {
  name: string;
  identifier: string;
  purpose: string;
  entries: DirectEntry[];
  scope: string;
  stage: Stage;
  revision: number;
  reason?: string;
  repository?: string;
  events: string[];
};
const seed: Identity[] = [
  {
    name: "Release automation",
    identifier: "release-automation",
    purpose: "Read project inventory for the release workflow.",
    entries: [
      {
        id: "release-read",
        selector: {
          root: "Checkout service",
          types: ["component"],
          descendants: true,
          exact: true,
          ids: ["resource-1"],
        },
        actions: ["scope.read"],
      },
      {
        id: "release-edit",
        selector: {
          root: "Checkout service",
          types: ["component"],
          descendants: true,
          exact: true,
          ids: ["resource-4"],
        },
        actions: ["scope.read", "scope.update"],
      },
    ],
    scope: "Engineering / Checkout service",
    stage: "Pending approval",
    revision: 1,
    events: ["Alex Morgan submitted request revision 1."],
  },
  {
    name: "Inventory reporter",
    identifier: "inventory-reporter",
    purpose: "Collect a daily inventory summary.",
    entries: [
      {
        id: "inventory-read",
        selector: {
          root: "Checkout service",
          types: ["project"],
          descendants: false,
          exact: true,
          ids: ["scope-1"],
        },
        actions: ["scope.read"],
      },
    ],
    scope: "Engineering / Checkout service",
    stage: "Authentication required",
    revision: 1,
    events: [
      "Jordan Lee approved request revision 1.",
      "Alex Morgan submitted request revision 1.",
    ],
  },
];
let saved = seed;
function savePreview(items: Identity[]) {
  saved = items;
}
export function AutomationIdentities() {
  const context = useActiveContext();
  const entryRoot =
    context.project ??
    (context.organization === "Workspace"
      ? "Acme account"
      : context.organization);
  const [items, setItems] = useState(saved),
    [selected, setSelected] = useState<string | null>(null),
    [modal, setModal] = useState<"request" | "review" | "auth" | null>(null),
    [query, setQuery] = useState(""),
    [admin, setAdmin] = useState(false),
    [draft, setDraft] = useState<IdentityDraft>({
      name: "",
      identifier: "",
      identifierSource: "automatic",
    }),
    [purpose, setPurpose] = useState(""),
    [entries, setEntries] = useState<DirectEntry[]>([]),
    [error, setError] = useState(""),
    [reason, setReason] = useState(""),
    [repository, setRepository] = useState(""),
    [ref, setRef] = useState("refs/heads/main"),
    [checking, setChecking] = useState(false),
    [result, setResult] = useState<"idle" | "passed" | "failed">("idle"),
    [fail, setFail] = useState(false),
    [discard, setDiscard] = useState(false),
    [panel, setPanel] = useState("Identity");
  const item = items.find((i) => i.identifier === selected);
  const mutate = (next: Identity) => {
    const updated = items.map((i) =>
      i.identifier === next.identifier ? next : i,
    );
    savePreview(updated);
    setItems(updated);
  };
  const close = () => {
    if (checking) return;
    if (
      (modal === "request" &&
        (draft.name ||
          purpose ||
          entries.some(
            (e) =>
              e.actions.length || e.selector.ids.length || !e.selector.exact,
          ))) ||
      (modal === "auth" && repository)
    )
      setDiscard(true);
    else {
      setModal(null);
      setError("");
    }
  };
  const begin = () => {
    setDraft({ name: "", identifier: "", identifierSource: "automatic" });
    setPurpose("");
    setEntries([newDirectEntry(entryRoot)]);
    setError("");
    setPanel("Identity");
    setModal("request");
  };
  function submit() {
    const err = identifierError(draft.identifier);
    if (
      !draft.name.trim() ||
      err ||
      !purpose.trim() ||
      !!directError(entries)
    ) {
      setError(err ?? directError(entries) ?? "Complete the name and purpose.");
      return;
    }
    if (items.some((i) => i.identifier === draft.identifier)) {
      setError("This identifier already exists. Choose another.");
      return;
    }
    const next: Identity = {
      ...draft,
      purpose,
      entries: structuredClone(entries),
      scope: [context.organization, context.project]
        .filter(Boolean)
        .join(" / "),
      stage: "Pending approval",
      revision: 1,
      events: ["Alex Morgan submitted request revision 1."],
    };
    const updated = [next, ...items];
    savePreview(updated);
    setItems(updated);
    setSelected(next.identifier);
    setModal(null);
  }
  function decision(approve: boolean) {
    if (!item || item.stage !== "Pending approval" || !admin) return;
    if (!approve && !reason.trim()) {
      setError("Explain what needs to change before resubmission.");
      return;
    }
    mutate({
      ...item,
      stage: approve ? "Authentication required" : "Changes requested",
      reason: approve ? undefined : reason,
      events: [
        `Jordan Lee ${approve ? "approved" : "requested changes to"} revision ${item.revision}.${approve ? "" : ` ${reason}`}`,
        ...item.events,
      ],
    });
    setModal(null);
  }
  async function verify() {
    if (!item || item.stage !== "Authentication required") return;
    if (
      !/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repository) ||
      !ref.startsWith("refs/heads/") ||
      ref.length <= 11
    ) {
      setError(
        "Use an owner/repository and a full branch ref, such as refs/heads/main.",
      );
      return;
    }
    setError("");
    setChecking(true);
    setResult("idle");
    await new Promise((r) => setTimeout(r, 1000));
    setChecking(false);
    setResult(fail ? "failed" : "passed");
  }
  return (
    <PageLayout
      variant={item ? "entity" : "workspace"}
      eyebrow="AUTOMATION"
      title={
        modal
          ? modal === "request"
            ? "Request an automation identity"
            : modal === "auth"
              ? "Connect your workload"
              : "Review " + item?.name
          : item
            ? item.name
            : "Automation identities"
      }
      description={
        modal
          ? "Define access precisely. Administrator approval comes before authentication."
          : item
            ? item.purpose
            : "Give your workflows an identity. Review their access before connecting a workload."
      }
      actions={
        modal ? (
          <Button variant="outline" disabled={checking} onClick={close}>
            <ArrowLeft size={15} />
            Leave editor
          </Button>
        ) : item ? (
          <Button variant="outline" onClick={() => setSelected(null)}>
            <ArrowLeft size={15} />
            All identities
          </Button>
        ) : (
          <Button onClick={begin}>
            <Bot size={16} />
            Request identity
          </Button>
        )
      }
    >
      <div hidden={!!modal}>
        <div className="ai-demo">
          <span>Fictional preview · changes last until reload</span>
          <label>
            <input
              type="checkbox"
              checked={admin}
              onChange={(e) => setAdmin(e.target.checked)}
            />
            Preview as administrator · Jordan Lee
          </label>
        </div>
        {!item ? (
          <>
            <div className="ai-intro">
              <ShieldCheck size={30} />
              <div>
                <h2>Access first. Authentication after approval.</h2>
                <p>
                  Describe the work and request its permissions. An
                  administrator reviews the request before you configure how it
                  signs in.
                </p>
              </div>
              <span>
                01 Request
                <br />
                02 Approval
                <br />
                03 Authentication
              </span>
            </div>
            <div className="al-toolbar">
              <input
                aria-label="Search automation identities"
                placeholder="Find an identity…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="ai-table-wrap">
              <table className="al-table">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Authentication</th>
                    <th>Access</th>
                  </tr>
                </thead>
                <tbody>
                  {items
                    .filter((i) =>
                      i.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map((i) => (
                      <tr key={i.identifier}>
                        <td>
                          <button
                            className="ai-name"
                            onClick={() => setSelected(i.identifier)}
                          >
                            <Bot size={22} />
                            <span>
                              <strong>{i.name}</strong>
                              <small>{i.identifier}</small>
                            </span>
                            <ArrowRight size={16} />
                          </button>
                        </td>
                        <td>
                          <span className="ai-status" data-stage={i.stage}>
                            {i.stage}
                          </span>
                        </td>
                        <td>Alex Morgan</td>
                        <td>
                          {i.stage === "Active"
                            ? "GitHub Actions"
                            : i.stage === "Authentication required"
                              ? "Ready to configure"
                              : "Awaiting approval"}
                        </td>
                        <td>
                          {i.entries.length} access{" "}
                          {i.entries.length === 1 ? "entry" : "entries"}
                          <small>
                            {i.stage === "Active"
                              ? "Approved access"
                              : "Not yet usable"}
                          </small>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!items.filter((i) =>
                i.name.toLowerCase().includes(query.toLowerCase()),
              ).length && <p>No identities match your search.</p>}
            </div>
          </>
        ) : (
          <>
            <div className="ai-journey" aria-label="Identity progress">
              {[
                "Request submitted",
                "Administrator approval",
                "Authentication",
              ].map((s, n) => (
                <div
                  key={s}
                  data-current={
                    n ===
                    (item.stage === "Pending approval" ||
                    item.stage === "Changes requested"
                      ? 1
                      : 2)
                  }
                >
                  <span>
                    {n === 0 ||
                    (n === 1 &&
                      ["Authentication required", "Active"].includes(
                        item.stage,
                      )) ||
                    item.stage === "Active" ? (
                      <Check size={16} />
                    ) : (
                      n + 1
                    )}
                  </span>
                  {s}
                </div>
              ))}
            </div>
            <section className="ai-state" data-stage={item.stage}>
              <div className="ai-state-icon">
                {item.stage === "Active" ? (
                  <Check />
                ) : item.stage === "Changes requested" ? (
                  <CircleAlert />
                ) : item.stage === "Pending approval" ? (
                  <Clock />
                ) : (
                  <KeyRound />
                )}
              </div>
              <div>
                <span className="ai-kicker">{item.stage}</span>
                <h2>
                  {item.stage === "Pending approval"
                    ? "Ready for an administrator’s decision"
                    : item.stage === "Changes requested"
                      ? "Revise the request before continuing"
                      : item.stage === "Authentication required"
                        ? "Access approved. Connect your workload."
                        : "Your workflow can now sign in"}
                </h2>
                <p>
                  {item.stage === "Pending approval"
                    ? "Authentication is unavailable until the identity and requested permissions are approved."
                    : item.stage === "Changes requested"
                      ? item.reason
                      : item.stage === "Authentication required"
                        ? "Revision " +
                          item.revision +
                          " was approved by Jordan Lee. Set up authentication to finish activating this identity."
                        : "GitHub Actions authentication is configured for " +
                          item.repository +
                          "."}
                </p>
              </div>
              {item.stage === "Pending approval" && admin && (
                <Button
                  onClick={() => {
                    setReason("");
                    setError("");
                    setPanel("Review");
                    setModal("review");
                  }}
                >
                  Review request
                </Button>
              )}
              {item.stage === "Authentication required" && (
                <Button
                  onClick={() => {
                    setRepository("");
                    setResult("idle");
                    setError("");
                    setPanel("Authentication");
                    setModal("auth");
                  }}
                >
                  Set up authentication
                </Button>
              )}
              {item.stage === "Changes requested" && (
                <Button
                  onClick={() => {
                    setEntries(structuredClone(item.entries));
                    setPurpose(item.purpose);
                    setError("");
                    setPanel("Review");
                    setModal("review");
                  }}
                >
                  Revise request
                </Button>
              )}
            </section>
            <div className="ai-detail-grid">
              <section>
                <h2>
                  {item.stage === "Pending approval" ||
                  item.stage === "Changes requested"
                    ? "Requested access"
                    : "Approved access"}
                </h2>
                {<DirectSummary entries={item.entries} />}
                <dl className="ai-facts">
                  <dt>Identifier</dt>
                  <dd>
                    <code>{item.identifier}</code>
                  </dd>
                  <dt>Owner</dt>
                  <dd>Alex Morgan</dd>
                  <dt>Scope</dt>
                  <dd>{item.scope}</dd>
                  <dt>Request revision</dt>
                  <dd>{item.revision}</dd>
                </dl>
              </section>
              <section>
                <h2>Activity</h2>
                <ol className="ai-history">
                  {item.events.map((e, n) => (
                    <li key={n}>
                      <span />
                      {e}
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </div>
      {modal && (
        <div className="ai-page-editor">
          <nav
            className="ai-section-nav"
            aria-label="Automation editor sections"
          >
            <span className="ai-kicker">
              {modal === "auth" ? "APPROVED IDENTITY" : "IDENTITY REQUEST"}
            </span>
            {(modal === "request" || item?.stage === "Changes requested"
              ? ["Identity", "Requested access", "Review"]
              : modal === "auth"
                ? ["Authentication", "Approved access"]
                : ["Review"]
            ).map((section) => (
              <button
                key={section}
                aria-current={panel === section ? "page" : undefined}
                disabled={checking || discard}
                onClick={() => {
                  setPanel(section);
                  setError("");
                }}
              >
                {section}
                <ArrowRight size={14} />
              </button>
            ))}
            <p>
              {modal === "auth"
                ? "Access is approved. Configure and verify your workload to activate the identity."
                : "Authentication becomes available after administrator approval."}
            </p>
          </nav>
          <section
            className="al-editor ai-page-content"
            aria-label="Automation workspace"
          >
            {discard && <h2>Discard unsaved changes?</h2>}
            {discard ? (
              <footer className="al-editor-footer">
                <Button variant="outline" onClick={() => setDiscard(false)}>
                  Keep editing
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDiscard(false);
                    setModal(null);
                  }}
                >
                  Discard changes
                </Button>
              </footer>
            ) : (
              <>
                <div className="al-editor-body">
                  {modal === "request" ||
                  (modal === "review" &&
                    item?.stage === "Changes requested") ? (
                    <div className="ai-page-form">
                      <section hidden={panel !== "Identity"}>
                        <h2>Identity details</h2>
                        {modal === "request" && (
                          <IdentityFields
                            mode="create"
                            nameLabel="Identity name"
                            value={draft}
                            onChange={setDraft}
                          />
                        )}
                        <label className="ai-field">
                          Purpose
                          <textarea
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="What will this automation do?"
                          />
                        </label>
                      </section>
                      <section hidden={panel !== "Requested access"}>
                        <DirectAccessEditor
                          entries={entries}
                          onChange={setEntries}
                          root={entryRoot}
                        />
                      </section>
                      <aside hidden={panel !== "Review"}>
                        <h2>Review requested access</h2>
                        <p>
                          <strong>{draft.name || item?.name}</strong> ·{" "}
                          {purpose}
                        </p>
                        <span className="ai-kicker">REQUEST SUMMARY</span>
                        {<DirectSummary entries={entries} />}
                        <p>Owner: Alex Morgan</p>
                        <p>
                          Scope:{" "}
                          {item?.scope ??
                            [context.organization, context.project]
                              .filter(Boolean)
                              .join(" / ")}
                        </p>
                        <p>
                          Submitting grants no usable access. An administrator
                          must approve this revision before authentication
                          setup.
                        </p>
                      </aside>
                    </div>
                  ) : modal === "review" && item ? (
                    <>
                      <div className="ai-review-lead">
                        <ShieldCheck size={30} />
                        <div>
                          <h2>Approve the identity and its access</h2>
                          <p>
                            Requested by Alex Morgan · revision {item.revision}
                          </p>
                        </div>
                      </div>
                      <p>{item.purpose}</p>
                      <p className="ai-review-note">
                        Scope: {item.scope} · Owner: Alex Morgan
                      </p>
                      {<DirectSummary entries={item.entries} />}
                      <p className="ai-review-note">
                        Approval lets the owner configure authentication. It
                        does not create a credential or make this identity
                        active.
                      </p>
                      <label className="ai-field">
                        Changes needed{" "}
                        <span>(required when requesting changes)</span>
                        <textarea
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      {panel === "Approved access" && item && (
                        <DirectSummary entries={item.entries} />
                      )}
                      <div hidden={panel !== "Authentication"}>
                        <div className="ai-provider">
                          <GitBranch size={26} />
                          <div>
                            <h2>GitHub Actions</h2>
                            <p>
                              Federated workload identity · no stored access
                              token
                            </p>
                          </div>
                          <span>REFERENCE FLOW</span>
                        </div>
                        <div className="ai-form-grid">
                          <section>
                            <label className="ai-field">
                              Repository
                              <input
                                placeholder="acme-demo/checkout"
                                value={repository}
                                disabled={checking}
                                onChange={(e) => {
                                  setRepository(e.target.value);
                                  setResult("idle");
                                }}
                              />
                            </label>
                            <label className="ai-field">
                              Branch reference
                              <input
                                value={ref}
                                disabled={checking}
                                onChange={(e) => {
                                  setRef(e.target.value);
                                  setResult("idle");
                                }}
                              />
                            </label>
                            <div className="ai-claims">
                              <span>Expected workload subject</span>
                              <code>
                                repo:{repository || "owner/repository"}:ref:
                                {ref}
                              </code>
                            </div>
                          </section>
                          <aside>
                            <span className="ai-kicker">APPROVED BOUNDARY</span>
                            {item && <DirectSummary entries={item.entries} />}
                            <p>
                              Authentication identifies this workflow. Its
                              permissions remain those approved in revision{" "}
                              {item?.revision}.
                            </p>
                          </aside>
                        </div>
                        <section
                          className="ai-diagnostics"
                          data-result={result}
                          aria-live="polite"
                        >
                          <span className="ai-kicker">
                            WORKLOAD CHECK · SIMULATED
                          </span>
                          <h2>
                            {checking
                              ? "Checking workload trust…"
                              : result === "passed"
                                ? "Workload matches the configuration"
                                : result === "failed"
                                  ? "Workload could not be verified"
                                  : "Verify before activating"}
                          </h2>
                          {[
                            "Provider issuer and audience",
                            "Repository and branch restrictions",
                            "Approved identity revision",
                          ].map((s, n) => (
                            <div key={s}>
                              {result === "passed" ? (
                                <Check size={17} />
                              ) : result === "failed" && n === 1 ? (
                                <CircleAlert size={17} />
                              ) : (
                                <span className="ai-check-dot" />
                              )}
                              <span>{s}</span>
                              <small>
                                {checking
                                  ? "Checking"
                                  : result === "passed"
                                    ? "Matched"
                                    : result === "failed"
                                      ? "Not verified"
                                      : "Not checked"}
                              </small>
                            </div>
                          ))}
                          {result === "failed" && (
                            <p>
                              The example assertion does not match the requested
                              branch. Review the trust settings and retry.
                              Nothing has been activated.
                            </p>
                          )}
                        </section>
                        <details className="ai-prototype">
                          <summary>Prototype controls</summary>
                          <label>
                            <input
                              type="checkbox"
                              checked={fail}
                              onChange={(e) => {
                                setFail(e.target.checked);
                                setResult("idle");
                              }}
                              disabled={checking}
                            />
                            Simulate a workload mismatch
                          </label>
                        </details>
                      </div>
                    </>
                  )}
                  {error && (
                    <p role="alert" className="field-error">
                      {error}
                    </p>
                  )}
                </div>
                <footer className="al-editor-footer">
                  <Button variant="ghost" disabled={checking} onClick={close}>
                    Cancel
                  </Button>
                  <div>
                    {modal === "review" &&
                      item?.stage === "Pending approval" && (
                        <Button
                          variant="outline"
                          onClick={() => decision(false)}
                        >
                          Request changes
                        </Button>
                      )}
                    <Button
                      disabled={
                        checking ||
                        (modal === "review" &&
                          item?.stage === "Pending approval" &&
                          !admin)
                      }
                      onClick={() => {
                        if (
                          (modal === "request" ||
                            item?.stage === "Changes requested") &&
                          panel !== "Review"
                        ) {
                          setPanel(
                            panel === "Identity"
                              ? "Requested access"
                              : "Review",
                          );
                          return;
                        }
                        if (modal === "auth" && panel === "Approved access") {
                          setPanel("Authentication");
                          return;
                        }
                        if (modal === "request") submit();
                        else if (
                          modal === "review" &&
                          item?.stage === "Changes requested"
                        ) {
                          if (!purpose.trim() || !!directError(entries)) {
                            setError(
                              directError(entries) ?? "Complete the purpose.",
                            );
                            return;
                          }
                          mutate({
                            ...item,
                            purpose,
                            entries: structuredClone(entries),
                            stage: "Pending approval",
                            revision: item.revision + 1,
                            events: [
                              `Alex Morgan resubmitted revision ${item.revision + 1}.`,
                              ...item.events,
                            ],
                          });
                          setModal(null);
                        } else if (modal === "review") decision(true);
                        else if (
                          result === "passed" &&
                          item?.stage === "Authentication required"
                        ) {
                          mutate({
                            ...item,
                            stage: "Active",
                            repository,
                            events: [
                              "GitHub Actions authentication activated (simulated).",
                              ...item.events,
                            ],
                          });
                          setModal(null);
                        } else void verify();
                      }}
                    >
                      {(modal === "request" ||
                        item?.stage === "Changes requested") &&
                      panel !== "Review"
                        ? panel === "Identity"
                          ? "Continue to access"
                          : "Review request"
                        : modal === "auth" && panel === "Approved access"
                          ? "Back to authentication"
                          : modal === "request"
                            ? "Submit for approval"
                            : modal === "review"
                              ? item?.stage === "Changes requested"
                                ? "Resubmit for approval"
                                : "Approve request"
                              : checking
                                ? "Checking…"
                                : result === "passed"
                                  ? "Activate identity"
                                  : result === "failed"
                                    ? "Retry verification"
                                    : "Verify workload"}
                    </Button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      )}
    </PageLayout>
  );
}
