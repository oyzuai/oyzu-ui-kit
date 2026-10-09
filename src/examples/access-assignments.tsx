import { useState } from "react";
import {
  Users,
  UserRound,
  Bot,
  ArrowRight,
  Plus,
  Search,
  Check,
  ShieldCheck,
  Clock,
  CircleX,
  GitBranch,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { PageLayout } from "../components/patterns/page-layout";
import { useActiveContext } from "../components/patterns/active-context";
import "./access-assignments.css";

import {
  useRbac,
  people,
  principalId,
  membershipStatus,
  memberGroups,
  definitionKey,
  setAssignments,
  matchingResources,
  resources,
  type Assignment,
} from "./rbac-model";
function useCatalog() {
  const model = useRbac();
  const principals = [
    ...people.map((p) => ({
      id: principalId(p),
      name: p.name,
      kind: "Member",
      detail: membershipStatus(principalId(p)),
      icon: UserRound,
    })),
    ...model.userGroups.map((g) => ({
      id: g.id,
      name: g.name,
      kind: "Group",
      detail: `${g.members.length} members`,
      icon: Users,
    })),
    {
      id: "build",
      name: "Build automation",
      kind: "Automation identity",
      detail: "Active · federated identity",
      icon: Bot,
    },
  ];
  const roles = model.roles
    .filter((r) => r.state === "Published")
    .map((r) => ({
      ...r,
      id: definitionKey(r),
      actionKeys: r.actions,
      elevated: r.actions.some(
        (a) => !a.endsWith(".read") && !a.endsWith("explain-self"),
      ),
      actions: r.actions.map((a) =>
        a === "scope.read"
          ? "Read scope metadata"
          : a === "access.explain-self"
            ? "Explain own access"
            : a,
      ),
    }));
  const targets = model.groups
    .filter((g) => g.state === "Published")
    .map((g) => ({
      ...g,
      id: definitionKey(g),
      descendants: g.selectors.some((s) => s.descendants),
      summary: g.selectors
        .map(
          (s) =>
            `${s.root}${s.descendants ? " and descendants" : " only"}: ${s.types.join(", ")} (${s.exact ? `${s.ids.length} selected` : "all current and future matches"})`,
        )
        .join("; "),
      count: new Set(g.selectors.flatMap(matchingResources).map((r) => r.id))
        .size,
    }));
  return { model, principals, roles, targets };
}
const assignmentStatus = {
  Expired: {
    title: "Access expired",
    detail: "This assignment has reached its end time. No access is granted.",
    stage: 3,
  },
  "Pending review": {
    title: "Awaiting review",
    detail:
      "No access granted yet. An independent reviewer must approve this elevated request.",
    stage: 1,
  },
  Activating: {
    title: "Activating access",
    detail: "Approved. Activation is in progress; access is not available yet.",
    stage: 2,
  },
  Active: {
    title: "Access granted",
    detail: "This assignment is active within the coverage below.",
    stage: 3,
  },
  "Activation failed": {
    title: "Activation failed",
    detail:
      "Approval succeeded, but activation did not complete. No access was granted.",
    stage: 2,
  },
  Rejected: {
    title: "Request declined",
    detail: "The reviewer declined this request. No access was granted.",
    stage: 1,
  },
  Revoked: {
    title: "Access revoked",
    detail: "This assignment has ended. Independent grants are unchanged.",
    stage: 3,
  },
} as const;
export function AccessAssignments() {
  const context = useActiveContext();
  const scope = context.project
    ? `${context.organization} / ${context.project}`
    : context.organization;
  const { model, principals, roles, targets } = useCatalog();
  const items = model.assignments;
  const setItems = setAssignments;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const scopeItems = items.filter((i) => i.scope === scope);
  const [filter, setFilter] = useState("All states");
  const [selected, setSelected] = useState<string | null>(() =>
    new URLSearchParams(window.location.hash.split("?")[1]).get("assignment"),
  );
  const [creating, setCreating] = useState(() => new URLSearchParams(location.hash.split("?")[1]).has("recipient"));
  const [explaining, setExplaining] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [reviewMode, setReviewMode] = useState("success");
  const [notice, setNotice] = useState("");
  const [migrating, setMigrating] = useState<Assignment | null>(null);
  const item = items.find((i) => i.id === selected);
  const suppressed =
    item?.state === "Active" && membershipStatus(item.principal) !== "Active";
  function update(id: string, state: Assignment["state"], event: string) {
    setItems((previous) =>
      previous.map((i) =>
        i.id === id ? { ...i, state, events: [...i.events, event] } : i,
      ),
    );
  }
  async function simulateReview() {
    if (!item) return;
    const id = item.id;
    if (reviewMode === "reject") {
      update(
        id,
        "Rejected",
        "Preview reviewer rejected the request; no access granted",
      );
      return;
    }
    update(
      id,
      "Activating",
      "Independent reviewer approved the exact request; activation in progress",
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    update(
      id,
      reviewMode === "failure" ? "Activation failed" : "Active",
      reviewMode === "failure"
        ? "Activation failed; no access granted"
        : "Activation completed after preview checks",
    );
  }
  const visible = items.filter(
    (i) =>
      i.scope === scope &&
      (filter === "All states" || i.state === filter) &&
      `${principals.find((p) => p.id === i.principal)?.name} ${roles.find((r) => r.id === i.role)?.name} ${i.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <PageLayout
      eyebrow="ACCESS"
      title="Access assignments"
      description="Who can do what, and where. Every grant has a clear source."
      actions={
        <div className="access-page-actions">
          <Button variant="outline" onClick={() => setExplaining(true)}>
            <GitBranch size={16} /> Explain access
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus size={16} />
            Assign access
          </Button>
        </div>
      }
    >
      <div className="access-intro">
        <span>ACCOUNT / ACME DEMO</span>
        <p>
          Showing assignments for <strong>{scope}</strong>. Membership alone
          grants no resource access.
        </p>
      </div>
      <div className="access-overview" aria-label="Assignment summary">
        <div>
          <ShieldCheck size={20} />
          <strong>
            {
              scopeItems.filter(
                (i) =>
                  i.state === "Active" &&
                  membershipStatus(i.principal) === "Active",
              ).length
            }
          </strong>
          <span>Active grants</span>
        </div>
        <div>
          <Clock size={20} />
          <strong>
            {scopeItems.filter((i) => i.state === "Pending review").length}
          </strong>
          <span>Awaiting review</span>
        </div>
        <div>
          <GitBranch size={20} />
          <strong>
            {
              scopeItems.filter(
                (i) =>
                  i.state === "Active" &&
                  targets.find((t) => t.id === i.target)?.descendants,
              ).length
            }
          </strong>
          <span>Cover descendants</span>
        </div>
      </div>
      <div className="access-toolbar">
        <label>
          <Search size={16} />
          <span className="sr-only">Search assignments</span>
          <input
            placeholder="Find a principal, role or assignment…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          <span className="sr-only">Assignment state</span>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
          >
            {[
              "All states",
              "Active",
              "Pending review",
              "Activating",
              "Activation failed",
              "Rejected",
              "Revoked",
              "Expired",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {notice && <p role="status">{notice}</p>}
      <div className="access-table-scroll">
        <table className="access-table">
          <thead>
            <tr>
              <th>Principal</th>
              <th>Role</th>
              <th>Resource group</th>
              <th>Expires</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {visible.slice(page * 20, page * 20 + 20).map((i) => {
              const p = principals.find((p) => p.id === i.principal)!;
              const role = roles.find((r) => r.id === i.role)!;
              const target = targets.find((t) => t.id === i.target)!;
              return (
                <tr key={i.id}>
                  <td>
                    <button
                      className="access-principal"
                      onClick={() => {
                        setSelected(i.id);
                        setConfirmRevoke(false);
                        setReviewMode("success");
                      }}
                    >
                      <p.icon size={20} />
                      <span>
                        <strong>{p.name}</strong>
                        <small>
                          {p.kind} · {i.id}
                        </small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  </td>
                  <td>
                    {role.name}
                    <small>Revision {role.revision}</small>
                  </td>
                  <td>
                    {target.name}
                    <small>
                      Revision {target.revision} ·{" "}
                      {target.descendants
                        ? "Includes future descendants"
                        : "No descendants"}
                    </small>
                  </td>
                  <td>{i.expiry}</td>
                  <td>
                    <span className="access-state" data-state={i.state}>
                      {i.state === "Active" &&
                      membershipStatus(i.principal) !== "Active"
                        ? "Suppressed"
                        : i.state}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!visible.length && (
          <div className="access-empty">
            No assignments match these filters.
          </div>
        )}
      </div>
      <div className="al-pagination">
        <span>
          {visible.length ? Math.min(page * 20 + 1, visible.length) : 0}–
          {Math.min(page * 20 + 20, visible.length)} of {visible.length}{" "}
          assignments
        </span>
        <Button
          variant="ghost"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </Button>
        <Button
          variant="ghost"
          disabled={(page + 1) * 20 >= visible.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page
        </Button>
      </div>
      <p className="access-demo">
        Interaction reference · Fictional account and memberships. Decisions and
        reviewer events are simulated.
      </p>
      {explaining && (
        <EffectiveAccess
          items={items}
          scope={scope}
          onClose={() => setExplaining(false)}
          onInspect={(id) => {
            setExplaining(false);
            setSelected(id);
            setConfirmRevoke(false);
          }}
        />
      )}
      <Dialog
        open={!!item}
        onOpenChange={(open) => {
          if (!open && item?.state !== "Activating") setSelected(null);
        }}
      >
        <DialogContent
          className="access-detail"
          data-review-state={item?.state}
        >
          <header className="access-credential-header">
            <span className="access-credential-type">
              ACCESS ASSIGNMENT / {item?.id}
            </span>
            <div className="access-recipient">
              <span className="access-recipient-mark" aria-hidden="true">
                {item?.principal === "build" ? (
                  <Bot size={32} />
                ) : item?.principal === "readers" ? (
                  <Users size={32} />
                ) : (
                  <UserRound size={32} />
                )}
              </span>
              <div>
                <DialogTitle>
                  {principals.find((p) => p.id === item?.principal)?.name}
                </DialogTitle>
                <DialogDescription>
                  {principals.find((p) => p.id === item?.principal)?.kind} ·{" "}
                  {principals.find((p) => p.id === item?.principal)?.detail}
                </DialogDescription>
              </div>
            </div>
          </header>
          {item && (
            <>
              <section
                className="assignment-status"
                data-state={item.state}
                aria-label="Assignment status"
              >
                <div
                  className="assignment-status-message"
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span className="assignment-status-symbol" aria-hidden="true">
                    {item.state === "Active" ? (
                      <Check size={22} />
                    ) : item.state === "Activating" ||
                      item.state === "Pending review" ? (
                      <Clock size={22} />
                    ) : (
                      <CircleX size={22} />
                    )}
                  </span>
                  <div>
                    <h2>
                      {suppressed
                        ? "Access suppressed"
                        : assignmentStatus[item.state].title}
                    </h2>
                    <p>
                      {suppressed
                        ? "Membership is not active. This grant is retained but provides no access."
                        : assignmentStatus[item.state].detail}
                    </p>
                  </div>
                </div>
                {item.state !== "Revoked" && (
                  <ol
                    className="assignment-lifecycle"
                    aria-label="Request progress"
                  >
                    {[
                      "Submitted",
                      roles.find((r) => r.id === item.role)?.elevated
                        ? "Review"
                        : "No review needed",
                      "Activation",
                    ].map((label, index) => (
                      <li
                        key={label}
                        data-complete={
                          index < assignmentStatus[item.state].stage
                        }
                        aria-current={
                          index === assignmentStatus[item.state].stage
                            ? "step"
                            : undefined
                        }
                      >
                        <span aria-hidden="true">
                          {index < assignmentStatus[item.state].stage ? (
                            <Check size={12} />
                          ) : (
                            index + 1
                          )}
                        </span>
                        {label}
                      </li>
                    ))}
                  </ol>
                )}
                {item.state === "Activation failed" && (
                  <div className="assignment-recovery">
                    <p>
                      Review the current definitions in a new request before
                      trying again.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(null);
                        setCreating(true);
                      }}
                    >
                      Start new assignment
                    </Button>
                  </div>
                )}
              </section>
              {item.replaces && (
                <Button
                  variant="ghost"
                  onClick={() => setSelected(item.replaces!)}
                >
                  View original assignment
                </Button>
              )}
              <section className="access-grant-layout">
                <div className="access-capabilities">
                  <span className="access-section-label">PERMISSIONS</span>
                  <h2>{roles.find((r) => r.id === item.role)?.name}</h2>
                  <ul>
                    {roles
                      .find((r) => r.id === item.role)
                      ?.actions.map((action) => (
                        <li key={action}>
                          <Check size={15} />
                          <span>{action}</span>
                        </li>
                      ))}
                  </ul>
                  {roles
                    .find((r) => r.id === item.role)
                    ?.actionKeys.includes("scope.delete") && (
                    <p className="access-risk-note">
                      Includes destructive actions on scopes.
                    </p>
                  )}
                </div>
                <dl className="access-boundaries">
                  <div>
                    <dt>
                      <GitBranch size={14} /> WHERE
                    </dt>
                    <dd>
                      {targets.find((t) => t.id === item.target)?.summary}
                      <small>Assignment created in {item.scope}</small>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Clock size={14} /> DURATION
                    </dt>
                    <dd>{item.expiry}</dd>
                  </div>
                </dl>
              </section>
              <details className="supporting-details">
                <summary>Assignment definitions and access source</summary>
                <dl className="access-facts">
                  <dt>Principal</dt>
                  <dd>
                    {principals.find((p) => p.id === item.principal)?.name}
                  </dd>
                  <dt>Role</dt>
                  <dd>
                    {roles.find((r) => r.id === item.role)?.name} · revision{" "}
                    {roles.find((r) => r.id === item.role)?.revision}
                  </dd>
                  <dt>Resource group</dt>
                  <dd>
                    {targets.find((t) => t.id === item.target)?.name} · revision{" "}
                    {targets.find((t) => t.id === item.target)?.revision}
                  </dd>
                  <dt>Coverage</dt>
                  <dd>{targets.find((t) => t.id === item.target)?.summary}</dd>
                  <dt>Expires</dt>
                  <dd>{item.expiry}</dd>
                </dl>
                <section className="access-explanation">
                  <h3>How this assignment grants access</h3>
                  <p>
                    {principals.find((p) => p.id === item.principal)?.name} →{" "}
                    {item.id} → {roles.find((r) => r.id === item.role)?.name} →{" "}
                    {targets.find((t) => t.id === item.target)?.name}
                  </p>
                  {item.principal === "readers" && (
                    <p>
                      Active members of Project readers can use this grant only
                      while the assignment and their membership are active.
                    </p>
                  )}
                  <p>
                    {item.state === "Active"
                      ? "The action and resource must match this same assignment. Other business checks still apply."
                      : "This assignment currently grants no access."}
                  </p>
                </section>
              </details>
              <details className="supporting-details">
                <summary>Activity history</summary>
                <h3>Assignment activity</h3>
                <ol className="access-events">
                  {item.events.map((event, i) => (
                    <li key={i}>{event}</li>
                  ))}
                </ol>
              </details>
              {item.state === "Active" && (
                <details className="supporting-details">
                  <summary>Prototype controls</summary>
                  <Button
                    variant="outline"
                    onClick={() =>
                      update(
                        item.id,
                        "Expired",
                        "Preview clock advanced past expiration",
                      )
                    }
                  >
                    Simulate expiration
                  </Button>
                </details>
              )}
              {item.state === "Pending review" && (
                <details className="supporting-details preview-controls">
                  <summary>Prototype controls</summary>
                  <div className="access-simulation">
                    <label>
                      Independent review preview
                      <select
                        value={reviewMode}
                        onChange={(e) => setReviewMode(e.target.value)}
                      >
                        <option value="success">Approve and activate</option>
                        <option value="reject">Reject request</option>
                        <option value="failure">
                          Approve; activation fails
                        </option>
                      </select>
                    </label>
                    <p>
                      A separate eligible reviewer is required. This control
                      simulates their response; it is not self-approval.
                    </p>
                    <Button variant="outline" onClick={simulateReview}>
                      Simulate reviewer response
                    </Button>
                  </div>
                </details>
              )}
              {item.state === "Active" && (
                <div className="access-related">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMigrating(item);
                      setSelected(null);
                    }}
                  >
                    Change pinned revisions
                  </Button>
                  <a href="#pages/access-library">View definitions →</a>
                  <a href={`#pages/access-library?role=${item.role}`}>
                    Pinned role →
                  </a>
                  <a href={`#pages/access-library?group=${item.target}`}>
                    Pinned coverage →
                  </a>
                  <a href="#pages/audit">Audit trail →</a>
                </div>
              )}
              {item.state === "Pending review" && (
                <section className="rbac-reviewer">
                  <h3>Independent review</h3>
                  <p>
                    Review as Taylor Chen, a fictional eligible reviewer. The
                    requester and beneficiary cannot approve their own request.
                  </p>
                  <label>
                    Reviewer
                    <select
                      aria-label="Reviewer"
                      value={reviewMode}
                      onChange={(e) => setReviewMode(e.target.value)}
                    >
                      <option value="success">
                        Taylor Chen · eligible reviewer
                      </option>
                      <option value="self">Requester · ineligible</option>
                      <option value="failure">
                        Taylor Chen · simulate activation failure
                      </option>
                    </select>
                  </label>
                  <div>
                    <Button
                      disabled={reviewMode === "self"}
                      onClick={simulateReview}
                    >
                      Approve request
                    </Button>
                    <Button
                      variant="outline"
                      disabled={reviewMode === "self"}
                      onClick={() =>
                        update(
                          item.id,
                          "Rejected",
                          "Taylor Chen declined the exact request",
                        )
                      }
                    >
                      Decline request
                    </Button>
                  </div>
                  {reviewMode === "self" && (
                    <p role="status">An independent reviewer is required.</p>
                  )}
                </section>
              )}
              {item.state === "Active" &&
                (confirmRevoke ? (
                  <div className="access-revoke">
                    <h3>Revoke this assignment?</h3>
                    <p>
                      {item.principal === "readers"
                        ? "Group members lose this grant. Alex Morgan retains a separate direct grant if it is still active."
                        : "Only this grant is removed. Any independent group grants remain."}
                    </p>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        update(
                          item.id,
                          "Revoked",
                          "Assignment revoked; independent grants unchanged",
                        );
                        setConfirmRevoke(false);
                        setNotice("Assignment revoked in this preview.");
                      }}
                    >
                      Confirm revoke
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmRevoke(false)}
                    >
                      Keep assignment
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmRevoke(true)}
                  >
                    Revoke assignment
                  </Button>
                ))}
            </>
          )}
        </DialogContent>
      </Dialog>
      {migrating && (
        <MigrationReview
          item={migrating}
          onClose={() => setMigrating(null)}
          onCreated={(id) => {
            setMigrating(null);
            setSelected(id);
          }}
        />
      )}
      {creating && (
        <AssignmentComposer
          scope={scope}
          onClose={() => setCreating(false)}
          onCreate={(drafts) => {
            const created = drafts.map((draft) => ({
              ...draft,
              id: `access-${crypto.randomUUID().slice(0, 8)}`,
              events: [
                draft.state === "Active"
                  ? "Assignment activated in preview"
                  : "Submitted for independent review; no access granted",
              ],
            }));
            setItems((previous) => [...created, ...previous]);
            setCreating(false);
            setReviewMode("success");
            setSelected(created[0].id);
            setNotice(
              `${created.length} assignment${created.length === 1 ? "" : "s"} ${created[0].state === "Active" ? "activated" : "submitted for review"}.`,
            );
          }}
        />
      )}
    </PageLayout>
  );
}

function AssignmentComposer({
  scope,
  onClose,
  onCreate,
}: {
  scope: string;
  onClose: () => void;
  onCreate: (items: Omit<Assignment, "id" | "events">[]) => void;
}) {
  const { principals, roles, targets } = useCatalog();
  const [recipients, setRecipients] = useState<string[]>(() => { const id = new URLSearchParams(location.hash.split("?")[1]).get("recipient"); return id && principals.some(p => p.id === id) ? [id] : []; }),
    [role, setRole] = useState(""),
    [target, setTarget] = useState(""),
    [search, setSearch] = useState(""),
    [review, setReview] = useState(false),
    [discard, setDiscard] = useState(false),
    [error, setError] = useState("");
  const r = roles.find((r) => r.id === role),
    t = targets.find((t) => t.id === target),
    selected = principals.filter((p) => recipients.includes(p.id));
  const close = () =>
    recipients.length || role || target ? setDiscard(true) : onClose();
  const toggle = (id: string) => {
    setRecipients((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
    setError("");
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="access-wizard access-assignment-composer"
        data-discard={discard}
      >
        <header className="access-wizard-heading">
          <div className="access-wizard-eyebrow">
            <ShieldCheck size={16} /> ACCESS ASSIGNMENT
          </div>
          <DialogTitle>
            {review ? "Review assignment" : "Assign access"}
          </DialogTitle>
          <DialogDescription>Acme demo account / {scope}</DialogDescription>
        </header>
        {discard ? (
          <div className="access-discard-content">
            <h2>Discard assignment draft?</h2>
            <p>No access has been granted.</p>
            <Button variant="outline" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="destructive" onClick={onClose}>
              Discard draft
            </Button>
          </div>
        ) : (
          <>
            <div className="access-wizard-body">
              <div className="access-composer-layout">
                <div className="access-wizard-content">
                  {review ? (
                    <>
                      <div className="decision-summary">
                        <h3>
                          {r?.name} for{" "}
                          {selected.length === 1
                            ? selected[0].name
                            : `${selected.length} recipients`}
                        </h3>
                        <p>{t?.summary}</p>
                      </div>
                      <section className="assignment-review-recipients">
                        <h2>Recipients</h2>
                        {selected.map((p) => (
                          <p key={p.id}>
                            <p.icon size={16} />
                            <strong>{p.name}</strong>
                            <span>{p.kind}</span>
                          </p>
                        ))}
                      </section>
                      <dl className="access-facts">
                        <dt>Role</dt>
                        <dd>
                          {r?.name} · revision {r?.revision}
                        </dd>
                        <dt>Resource coverage</dt>
                        <dd>
                          {t?.name} · revision {t?.revision}
                          <small>{t?.count} current example resources</small>
                        </dd>
                      </dl>
                      <div className="access-explanation">
                        <strong>
                          {r?.elevated
                            ? "Independent approval required"
                            : "Ready to activate"}
                        </strong>
                        <p>
                          {r?.elevated
                            ? "Each assignment requires an eligible independent reviewer before access is activated."
                            : "These assignments can be activated when you confirm."}
                        </p>
                        <p>
                          Access remains assigned until revoked. Inactive
                          memberships and scopes can suppress its use.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <section className="assignment-field-section">
                        <div className="assignment-section-heading">
                          <h2>Recipients</h2>
                          <span>{selected.length} selected</span>
                        </div>
                        <p>Select users, groups, or automation identities.</p>
                        <input
                          className="access-picker-search"
                          aria-label="Search recipients"
                          placeholder="Search by name…"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {selected.length > 0 && (
                          <div className="assignment-selected-recipients">
                            {selected.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => toggle(p.id)}
                                aria-label={`Remove ${p.name}`}
                              >
                                {p.name}
                                <span aria-hidden="true">×</span>
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="access-choices">
                          {principals
                            .filter((p) =>
                              `${p.name} ${p.kind}`
                                .toLowerCase()
                                .includes(search.toLowerCase()),
                            )
                            .map((p) => (
                              <button
                                key={p.id}
                                aria-pressed={recipients.includes(p.id)}
                                onClick={() => toggle(p.id)}
                              >
                                <p.icon size={18} />
                                <span>
                                  <strong>{p.name}</strong>
                                  <small>
                                    {p.kind} · {p.detail}
                                  </small>
                                </span>
                                {recipients.includes(p.id) && (
                                  <Check
                                    className="access-choice-check"
                                    size={16}
                                  />
                                )}
                              </button>
                            ))}
                          {!principals.some((p) =>
                            `${p.name} ${p.kind}`
                              .toLowerCase()
                              .includes(search.toLowerCase()),
                          ) && <p>No matching recipients.</p>}
                        </div>
                      </section>
                      <section className="assignment-field-section">
                        <h2>Role</h2>
                        <p>Choose a published permission definition.</p>
                        <select
                          aria-label="Role"
                          value={role}
                          onChange={(e) => {
                            setRole(e.target.value);
                            setError("");
                          }}
                        >
                          <option value="">Select a role</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name} · v{r.revision}
                            </option>
                          ))}
                        </select>
                        {r && (
                          <details className="supporting-details">
                            <summary>
                              {r.actions.length} included permissions
                            </summary>
                            <ul className="access-permissions">
                              {r.actions.map((a) => (
                                <li key={a}>
                                  <Check size={14} />
                                  {a}
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </section>
                      <section className="assignment-field-section">
                        <h2>Resource coverage</h2>
                        <p>
                          Choose which resources these permissions apply to.
                        </p>
                        <select
                          aria-label="Resource coverage"
                          value={target}
                          onChange={(e) => {
                            setTarget(e.target.value);
                            setError("");
                          }}
                        >
                          <option value="">Select a resource group</option>
                          {targets.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} · v{t.revision}
                            </option>
                          ))}
                        </select>
                        {t && (
                          <p className="assignment-coverage-description">
                            {t.summary}
                          </p>
                        )}
                      </section>
                    </>
                  )}
                  {error && (
                    <p role="alert" className="field-error">
                      {error}
                    </p>
                  )}
                </div>
                <aside
                  className="access-live-summary"
                  aria-label="Assignment preview"
                >
                  <span>ASSIGNMENT SUMMARY</span>
                  <h3>
                    {selected.length === 1
                      ? selected[0].name
                      : selected.length
                        ? `${selected.length} recipients`
                        : "Select recipients"}
                  </h3>
                  <p>
                    {r
                      ? `Receive the ${r.name} permissions.`
                      : "Select a role and resource coverage to define access."}
                  </p>
                  <dl>
                    <dt>Role</dt>
                    <dd>{r ? `${r.name} · v${r.revision}` : "Not selected"}</dd>
                    <dt>Resource coverage</dt>
                    <dd>{t ? `${t.name} · v${t.revision}` : "Not selected"}</dd>
                  </dl>
                  {t && <p>{t.count} current example resources</p>}
                  <div className="access-preview-outcome">
                    <ShieldCheck size={18} />
                    <p>
                      {r?.elevated
                        ? "Independent approval is required before activation."
                        : "Review before activating. No access has been granted yet."}
                    </p>
                  </div>
                </aside>
              </div>
            </div>
            <footer className="access-wizard-footer">
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
              <div>
                {review && (
                  <Button variant="ghost" onClick={() => setReview(false)}>
                    Edit assignment
                  </Button>
                )}
                <Button
                  onClick={() => {
                    if (!selected.length || !r || !t) {
                      setError(
                        "Select at least one recipient, a role, and resource coverage.",
                      );
                      return;
                    }
                    if (!review) {
                      setReview(true);
                      return;
                    }
                    onCreate(
                      selected.map((p) => ({
                        principal: p.id,
                        role,
                        target,
                        scope,
                        expiry: "Indefinite",
                        state: r.elevated ? "Pending review" : "Active",
                      })),
                    );
                  }}
                >
                  {review
                    ? r?.elevated
                      ? "Submit for approval"
                      : "Activate access"
                    : "Review assignment"}
                </Button>
              </div>
            </footer>
            <p className="access-demo">
              Fictional account. Each recipient receives a separate assignment
              with pinned definition revisions.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EffectiveAccess({
  items,
  scope,
  onClose,
  onInspect,
}: {
  items: Assignment[];
  scope: string;
  onClose: () => void;
  onInspect: (id: string) => void;
}) {
  const { roles, targets, principals } = useCatalog();
  const [principal, setPrincipal] = useState("alex");
  const [action, setAction] = useState("read");
  const [resource, setResource] = useState("current");
  const [evaluation, setEvaluation] = useState("available");
  const scopeName = scope.split(" / ").at(-1)!;
  const availableResources = resources.filter(
    (r) => r.root === scopeName || r.ancestors.includes(scopeName),
  );
  const targetResource =
    resource === "current"
      ? resources.find((r) => r.name === scopeName)
      : resource === "child"
        ? availableResources.find((r) => r.type === "component")
        : resources.find((r) => r.id === resource);
  // A deliberately bounded fixture: Alex belongs to Project readers.
  // Production decisions and their explanations must come from the server.
  const candidates = items.filter(
    (i) =>
      i.principal === principal ||
      memberGroups(principal).some((g) => g.id === i.principal),
  );
  const reason = (i: Assignment) =>
    evaluation === "unavailable"
      ? "Evaluation is unavailable. No decision can be made."
      : evaluation === "inactive"
        ? "The target scope is inactive; access is suppressed."
        : membershipStatus(principal) !== "Active"
          ? `Membership is ${membershipStatus(principal).toLowerCase()}; access is suppressed.`
          : i.state !== "Active"
            ? `${i.state}: this assignment grants no active access.`
            : !roles
                  .find((r) => r.id === i.role)
                  ?.actionKeys.includes(
                    action === "admin" ? "scope.update" : "scope.read",
                  )
              ? "This role does not include the requested action."
              : !targetResource ||
                  !targets
                    .find((t) => t.id === i.target)
                    ?.selectors.some((sel) =>
                      matchingResources(sel).some(
                        (r) => r.id === targetResource.id,
                      ),
                    )
                ? "The selected resource is outside this assignment’s coverage."
                : null;
  const granting = candidates.filter((i) => !reason(i));
  const person = principals.find((p) => p.id === principal)!;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="access-explorer">
        <header className="access-wizard-heading">
          <div className="access-wizard-eyebrow">
            <GitBranch size={16} /> ACCESS EXPLANATION
          </div>
          <DialogTitle>Why does this person have access?</DialogTitle>
          <DialogDescription>
            Trace an action back to its assignments · fictional preview
          </DialogDescription>
        </header>
        <div className="access-explorer-body">
          <div className="access-explorer-query">
            <label>
              Who
              <select
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
              >
                {principals
                  .filter((p) => p.kind !== "Group")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Can do what
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                <option value="read">Read scope metadata</option>
                <option value="admin">Administer scopes</option>
              </select>
            </label>
            <label>
              Where
              <select
                aria-label="Where"
                value={resource}
                onChange={(e) => setResource(e.target.value)}
              >
                <option value="current">Current scope</option>
                <option value="child">Example descendant</option>
                {availableResources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {r.type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <section
            className="access-verdict"
            data-allowed={!!granting.length}
            aria-live="polite"
          >
            <span>
              {granting.length ? (
                <ShieldCheck size={28} />
              ) : (
                <CircleX size={28} />
              )}
            </span>
            <div>
              <h2>
                {granting.length
                  ? "Access is allowed in this preview"
                  : evaluation === "unavailable"
                    ? "Unable to determine access"
                    : "No matching active grant"}
              </h2>
              <p>
                {person.name} ·{" "}
                {action === "read"
                  ? "Read scope metadata"
                  : "Administer scopes"}{" "}
                · {scope}
                {resource !== "current"
                  ? ` / ${targetResource?.name ?? "Unknown resource"}`
                  : ""}
              </p>
              <small>
                {granting.length
                  ? `${granting.length} independent access path${granting.length === 1 ? "" : "s"}. All matching grants must end to remove this access.`
                  : "Membership alone does not grant permissions."}
              </small>
            </div>
          </section>
          <h3>
            Assignment paths <span>{candidates.length}</span>
          </h3>
          {candidates.map((i) => (
            <article
              className="access-path"
              key={i.id}
              data-matching={!reason(i)}
            >
              <div className="access-path-top">
                <strong>
                  {i.principal === principal
                    ? "Direct assignment"
                    : `Through ${principals.find((p) => p.id === i.principal)?.name}`}
                </strong>
                <span>
                  {reason(i)
                    ? "Does not grant this access"
                    : "Grants this access"}
                </span>
              </div>
              <div className="access-path-chain">
                <span>{person.name}</span>
                <ArrowRight size={14} />
                {i.principal !== principal && (
                  <>
                    <span>
                      {principals.find((p) => p.id === i.principal)?.name}
                    </span>
                    <ArrowRight size={14} />
                  </>
                )}
                <span>{roles.find((r) => r.id === i.role)?.name}</span>
                <ArrowRight size={14} />
                <span>{targets.find((t) => t.id === i.target)?.name}</span>
              </div>
              <p>
                {reason(i) ??
                  (i.principal !== principal
                    ? "Active group membership connects this principal to the assignment."
                    : "This assignment names the principal directly.")}
              </p>
              <footer>
                <small>
                  {i.state} · {i.expiry} · {i.id}
                </small>
                <Button variant="ghost" onClick={() => onInspect(i.id)}>
                  View assignment <ArrowRight size={14} />
                </Button>
              </footer>
            </article>
          ))}
          {!candidates.length && (
            <p className="access-empty">
              No direct or group assignments exist for this identity in the
              example.
            </p>
          )}
          <details className="supporting-details">
            <summary>Prototype controls</summary>
            <label>
              Evaluation state{" "}
              <select
                aria-label="Evaluation state"
                value={evaluation}
                onChange={(e) => setEvaluation(e.target.value)}
              >
                <option value="available">Available</option>
                <option value="inactive">Scope inactive</option>
                <option value="unavailable">Service unavailable</option>
              </select>
            </label>
          </details>
          <p className="access-demo">
            Illustrative explanation, not a production authorization decision.
            Time passage and external policy are not evaluated in this preview.
          </p>
        </div>
        <footer className="access-wizard-footer">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

function MigrationReview({
  item,
  onClose,
  onCreated,
}: {
  item: Assignment;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { roles, targets } = useCatalog();
  const [role, setRole] = useState(item.role),
    [target, setTarget] = useState(item.target);
  const oldRole = roles.find((r) => r.id === item.role),
    newRole = roles.find((r) => r.id === role),
    oldTarget = targets.find((t) => t.id === item.target),
    newTarget = targets.find((t) => t.id === target);
  const added =
      newRole?.actionKeys.filter((a) => !oldRole?.actionKeys.includes(a)) ?? [],
    removed =
      oldRole?.actionKeys.filter((a) => !newRole?.actionKeys.includes(a)) ?? [];
  const ids = (t: typeof newTarget) =>
    new Set(t?.selectors.flatMap(matchingResources).map((r) => r.id));
  const before = ids(oldTarget),
    after = ids(newTarget);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="access-explorer">
        <header className="access-wizard-heading">
          <DialogTitle>Review revision change</DialogTitle>
          <DialogDescription>
            {item.id} · The existing grant remains until replacement activates.
          </DialogDescription>
        </header>
        <div className="access-explorer-body">
          <div className="access-explorer-query">
            <label>
              Role revision
              <select
                aria-label="Role revision"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                {roles
                  .filter((r) => r.id.split("@")[0] === item.role.split("@")[0])
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · v{r.revision}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Coverage revision
              <select
                aria-label="Coverage revision"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                {targets
                  .filter(
                    (t) => t.id.split("@")[0] === item.target.split("@")[0],
                  )
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} · v{t.revision}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <div className="access-verdict">
            <GitBranch />
            <div>
              <h2>
                {added.length} permissions added · {removed.length} removed
              </h2>
              <p>
                {[...after].filter((id) => !before.has(id)).length} current
                resources added ·{" "}
                {[...before].filter((id) => !after.has(id)).length} removed
              </p>
              <small>
                Counts reflect this fictional inventory. Future matching
                resources follow the published coverage rules.
              </small>
            </div>
          </div>
          <div className="al-review-groups">
            <section>
              <h3>Added permissions</h3>
              <p>{added.join(", ") || "None"}</p>
            </section>
            <section>
              <h3>Removed permissions</h3>
              <p>{removed.join(", ") || "None"}</p>
            </section>
          </div>
          <p className="access-demo">
            Every revision migration requires independent review in this
            preview. Declining or failing activation preserves the previous
            grant.
          </p>
        </div>
        <footer className="access-wizard-footer">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={role === item.role && target === item.target}
            onClick={() => {
              const id = `access-${crypto.randomUUID().slice(0, 8)}`;
              setAssignments((prev) => [
                ...prev,
                {
                  ...item,
                  id,
                  replaces: item.id,
                  role,
                  target,
                  state: "Pending review",
                  events: [
                    `Requested replacement of ${item.id}; original remains active`,
                  ],
                },
              ]);
              onCreated(id);
            }}
          >
            Request revision change
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
